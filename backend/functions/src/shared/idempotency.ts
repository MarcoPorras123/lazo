import { randomUUID } from 'node:crypto';
import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { appendAudit, type AuditDraft } from './audit';
import { actorSchema, idempotencyKeySchema, scopeSchema, type Actor, type EventDraft, type Scope } from './contracts';
import { DomainError } from './errors';
import { canonicalJson, hash } from './hash';
import { appendOutbox } from './outbox';
import { systemClock, type Clock } from './time';

export interface OperationResult<T> { response: T; audit: AuditDraft; events: readonly EventDraft[] }
export interface OperationContext { tx: Transaction; now: Date; correlationId: string }
export interface Mutation<T> {
  actor: Actor;
  scope: Scope;
  action: string;
  idempotencyKey: string;
  request: unknown;
  execute(context: OperationContext): Promise<OperationResult<T>>;
  clock?: Clock;
  retentionDays?: number;
}

/**
 * Trusted server API, after input validation and requireScope. Firestore may rerun
 * execute: ALL effects must use context.tx and all reads precede writes.
 * Caller must not put idempotencyKey/correlationId into request business payload.
 */
export async function executeIdempotent<T>(db: Firestore, mutation: Mutation<T>): Promise<T> {
  const actor = actorSchema.parse(mutation.actor);
  const scope = scopeSchema.parse(mutation.scope);
  idempotencyKeySchema.parse(mutation.idempotencyKey);
  if (!/^[a-z][a-zA-Z0-9_.-]{1,95}$/.test(mutation.action)) {
    throw new DomainError('BAD_REQUEST', 'Acción inválida.');
  }
  // Role changes must never turn a retry by the same identity into a new mutation.
  const namespace = canonicalJson({ principalId: actor.uid, scope, action: mutation.action });
  const id = hash(`${namespace}:${mutation.idempotencyKey}`);
  const requestHash = hash(canonicalJson(mutation.request));
  const keyRef = db.doc(`idempotencyKeys/${id}`);
  const now = (mutation.clock ?? systemClock).now();
  const correlationId = randomUUID();
  return db.runTransaction(async (tx) => {
    const previous = await tx.get(keyRef);
    if (previous.exists) {
      if (previous.get('requestHash') !== requestHash) {
        throw new DomainError('IDEMPOTENCY_CONFLICT', 'La clave ya se usó con otros datos. Inicia una operación nueva.');
      }
      return previous.get('response') as T;
    }
    const result = await mutation.execute({ tx, now, correlationId });
    // Forbid undefined/Date/non-JSON responses before attempting persistence.
    canonicalJson(result.response);
    appendAudit(db, tx, id, actor, scope, result.audit, correlationId, now);
    result.events.forEach((draft, index) => {
      appendOutbox(db, tx, hash(`${id}:${index}`), scope, draft, correlationId, now);
    });
    tx.create(keyRef, {
      ...scope, actor, action: mutation.action, requestHash, response: result.response,
      correlationId, schemaVersion: 1, createdAt: Timestamp.fromDate(now), updatedAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromMillis(now.getTime() + (mutation.retentionDays ?? 90) * 86_400_000),
    });
    return result.response;
  });
}
