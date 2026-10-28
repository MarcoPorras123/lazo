import { randomUUID } from 'node:crypto';
import { logger } from 'firebase-functions';
import { Timestamp, type DocumentReference, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { z } from 'zod';
import { eventDraftSchema, scopeSchema, type EventDraft, type EventName, type Scope } from './contracts';
import { hash } from './hash';
import { systemClock, type Clock } from './time';

const timestampSchema = z.custom<Timestamp>((value) => value instanceof Timestamp);
const eventSchema = eventDraftSchema.extend({
  eventId: z.string(), schemaVersion: z.literal(1), correlationId: z.string(),
  tenantId: z.string(), marketId: z.enum(['PE', 'ES']), locationId: z.string().nullable(),
  createdAt: timestampSchema, updatedAt: timestampSchema, occurredAt: timestampSchema,
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  attempts: z.number().int().nonnegative(), nextAttemptAt: timestampSchema,
  leaseUntil: timestampSchema.nullable(), leaseToken: z.string().nullable(),
  lastErrorCode: z.string().nullable(),
}).strict();
export type OutboxEvent = Readonly<z.infer<typeof eventSchema>>;

export function appendOutbox(
  db: Firestore, tx: Transaction, eventId: string, scope: Scope,
  draft: EventDraft, correlationId: string, now: Date,
): void {
  const timestamp = Timestamp.fromDate(now);
  tx.create(db.doc(`outbox/${eventId}`), {
    ...eventDraftSchema.parse(draft), ...scopeSchema.parse(scope), eventId, correlationId,
    schemaVersion: 1, createdAt: timestamp, updatedAt: timestamp, occurredAt: timestamp,
    status: 'pending', attempts: 0, nextAttemptAt: timestamp,
    leaseUntil: null, leaseToken: null, lastErrorCode: null,
  });
}

/**
 * Every effect performed by this consumer must use this transaction.
 * Do not call HTTP, send FCM, enqueue Cloud Tasks, or mutate process state here.
 * Store an intent/job transactionally; its external worker needs provider idempotency.
 */
export interface TransactionalConsumer {
  readonly id: string;
  readonly events: readonly EventName[];
  apply(tx: Transaction, event: OutboxEvent): Promise<void>;
}

export interface OutboxOptions {
  clock?: Clock;
  maxAttempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  leaseMs?: number;
  processedRetentionDays?: number;
  onFailed?: (event: OutboxEvent) => void;
}

export class OutboxDispatcher {
  private readonly clock: Clock;
  private readonly maxAttempts: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly leaseMs: number;
  private readonly processedRetentionDays: number;

  constructor(private readonly db: Firestore, private readonly consumers: readonly TransactionalConsumer[], private readonly options: OutboxOptions = {}) {
    this.clock = options.clock ?? systemClock;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.baseBackoffMs = options.baseBackoffMs ?? 5_000;
    this.maxBackoffMs = options.maxBackoffMs ?? 3_600_000;
    this.leaseMs = options.leaseMs ?? 120_000;
    this.processedRetentionDays = options.processedRetentionDays ?? 90;
    if (new Set(consumers.map((item) => item.id)).size !== consumers.length) {
      throw new Error('Consumer IDs must be unique.');
    }
  }

  async dispatch(eventId: string): Promise<'ignored' | 'completed' | 'pending' | 'failed'> {
    const reference = this.db.doc(`outbox/${eventId}`);
    const token = randomUUID();
    const now = this.clock.now();
    const claim = await this.db.runTransaction(async (tx) => {
      const snapshot = await tx.get(reference);
      if (!snapshot.exists) return null;
      if (snapshot.get('status') === 'completed' || snapshot.get('status') === 'failed') return null;
      const parsed = eventSchema.safeParse(snapshot.data());
      if (!parsed.success) {
        tx.update(reference, { status: 'failed', lastErrorCode: 'INVALID_EVENT_SCHEMA',
          leaseToken: null, leaseUntil: null, updatedAt: Timestamp.fromDate(now) });
        return { kind: 'invalid' as const };
      }
      const event = parsed.data;
      if (event.status === 'completed' || event.status === 'failed') return null;
      if (event.status === 'pending' && event.nextAttemptAt.toMillis() > now.getTime()) return null;
      if (event.status === 'processing' && (event.leaseUntil?.toMillis() ?? 0) > now.getTime()) return null;
      // Exhausted crashed attempts also fail: no infinite restart loop after lease expiry.
      if (event.attempts >= this.maxAttempts) {
        tx.update(reference, { status: 'failed', leaseToken: null, leaseUntil: null,
          lastErrorCode: 'ATTEMPTS_EXHAUSTED', updatedAt: Timestamp.fromDate(now) });
        return { kind: 'exhausted' as const, event };
      }
      const claimed: OutboxEvent = {
        ...event, status: 'processing', attempts: event.attempts + 1,
        leaseToken: token, leaseUntil: Timestamp.fromMillis(now.getTime() + this.leaseMs),
        updatedAt: Timestamp.fromDate(now),
      };
      tx.update(reference, { status: claimed.status, attempts: claimed.attempts,
        leaseToken: token, leaseUntil: claimed.leaseUntil, updatedAt: claimed.updatedAt });
      return { kind: 'claimed' as const, event: claimed };
    });
    if (claim === null) return 'ignored';
    if (claim.kind === 'invalid') {
      logger.error('outbox.failed', { alertType: 'OUTBOX_FAILED', eventId, code: 'INVALID_EVENT_SCHEMA' });
      return 'failed';
    }
    if (claim.kind === 'exhausted') { this.alert(claim.event); return 'failed'; }
    const event = claim.event;
    const matched = this.consumers.filter((consumer) => consumer.events.includes(event.name));
    try {
      // A future business event without its consumer must not silently disappear.
      if (matched.length === 0) throw new Error('UNREGISTERED_CONSUMER');
      for (const consumer of matched) await this.consume(reference, event, consumer, token);
      const completed = await this.db.runTransaction(async (tx) => {
        const current = await tx.get(reference);
        if (current.get('leaseToken') !== token) return false;
        tx.update(reference, { status: 'completed', leaseToken: null, leaseUntil: null,
          lastErrorCode: null, updatedAt: Timestamp.fromDate(this.clock.now()) });
        return true;
      });
      return completed ? 'completed' : 'ignored';
    } catch {
      const failed = event.attempts >= this.maxAttempts;
      const changed = await this.db.runTransaction(async (tx) => {
        const current = await tx.get(reference);
        if (current.get('leaseToken') !== token) return false;
        const retry = Math.min(this.maxBackoffMs, this.baseBackoffMs * 2 ** (event.attempts - 1));
        tx.update(reference, {
          status: failed ? 'failed' : 'pending', leaseToken: null, leaseUntil: null,
          nextAttemptAt: Timestamp.fromMillis(this.clock.now().getTime() + retry),
          updatedAt: Timestamp.fromDate(this.clock.now()), lastErrorCode: 'CONSUMER_FAILED',
        });
        return true;
      });
      if (!changed) return 'ignored';
      if (failed) this.alert(event);
      else logger.warn('outbox.retry_scheduled', { eventId, attempts: event.attempts, correlationId: event.correlationId });
      return failed ? 'failed' : 'pending';
    }
  }

  private async consume(reference: DocumentReference, event: OutboxEvent, consumer: TransactionalConsumer, token: string): Promise<void> {
    const processed = this.db.doc(`processedEvents/${hash(`${consumer.id}:${event.eventId}`)}`);
    await this.db.runTransaction(async (tx) => {
      const [current, previous] = await tx.getAll(reference, processed);
      if (!current || !previous || current.get('leaseToken') !== token) throw new Error('LEASE_LOST');
      if (previous.exists) return;
      await consumer.apply(tx, event);
      const now = this.clock.now();
      tx.create(processed, {
        consumerId: consumer.id, eventId: event.eventId, schemaVersion: 1,
        tenantId: event.tenantId, marketId: event.marketId, locationId: event.locationId,
        createdAt: Timestamp.fromDate(now), updatedAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromMillis(now.getTime() + this.processedRetentionDays * 86_400_000),
      });
    });
  }

  /** Bounded sweep; requires the composite indexes committed in backend/firestore. */
  async sweep(limit = 100): Promise<number> {
    const now = Timestamp.fromDate(this.clock.now());
    const [pending, abandoned] = await Promise.all([
      this.db.collection('outbox').where('status', '==', 'pending').where('nextAttemptAt', '<=', now).orderBy('nextAttemptAt').limit(limit).get(),
      this.db.collection('outbox').where('status', '==', 'processing').where('leaseUntil', '<=', now).orderBy('leaseUntil').limit(limit).get(),
    ]);
    for (const doc of [...pending.docs, ...abandoned.docs]) {
      // One failing event must not block the rest; the next sweep picks it up again.
      try { await this.dispatch(doc.id); } catch (error) {
        logger.warn('outbox.sweep_item_failed', { eventId: doc.id, error: error instanceof Error ? error.name : 'unknown' });
      }
    }
    return pending.size + abandoned.size;
  }

  private alert(event: OutboxEvent): void {
    // Cloud Monitoring alert-policy filter: jsonPayload.alertType="OUTBOX_FAILED".
    logger.error('outbox.failed', {
      alertType: 'OUTBOX_FAILED', eventId: event.eventId, eventName: event.name,
      attempts: event.attempts, correlationId: event.correlationId,
    });
    this.options.onFailed?.(event);
  }
}
