import { getFunctions } from 'firebase-admin/functions';
import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { z } from 'zod';
import { idSchema, scopeSchema, type Scope } from './contracts';
import { DomainError } from './errors';
import { hash } from './hash';

export const deferredRequestSchema = z.object({ schemaVersion: z.literal(1), jobId: idSchema }).strict();
export interface DeferredJob {
  idempotencyKey: string;
  scope: Scope;
  executeAt: Date;
  correlationId: string;
}

/** Record in the same transaction as the originating operation/outbox consumer. */
export function appendDeferredProbe(db: Firestore, tx: Transaction, job: DeferredJob, now: Date): string {
  const jobId = hash(`system.probe:${job.scope.tenantId}:${job.scope.marketId}:${job.scope.locationId}:${job.idempotencyKey}`);
  tx.create(db.doc(`jobs/${jobId}`), {
    ...scopeSchema.parse(job.scope), jobId, kind: 'system.probe', schemaVersion: 1,
    demo: true, status: 'pending', correlationId: job.correlationId,
    executeAt: Timestamp.fromDate(job.executeAt),
    createdAt: Timestamp.fromDate(now), updatedAt: Timestamp.fromDate(now),
  });
  return jobId;
}

/** Stable Cloud Tasks task ID closes crash/retry duplication at enqueue. */
export async function enqueueDeferredJob(db: Firestore, jobId: string, region: string): Promise<void> {
  idSchema.parse(jobId);
  const reference = db.doc(`jobs/${jobId}`);
  const snapshot = await reference.get();
  if (!snapshot.exists || snapshot.get('status') !== 'pending') return;
  const executeAt: unknown = snapshot.get('executeAt');
  if (!(executeAt instanceof Timestamp)) throw new DomainError('BAD_REQUEST', 'Fecha del trabajo inválida.');
  try {
    await getFunctions().taskQueue(`locations/${region}/functions/jobs-runDue`).enqueue(
      { schemaVersion: 1, jobId },
      { id: jobId, scheduleTime: executeAt.toDate(), dispatchDeadlineSeconds: 60 },
    );
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (code !== 'functions/task-already-exists' && code !== 6) throw error;
  }
  await db.runTransaction(async (tx) => {
    const current = await tx.get(reference);
    if (current.get('status') === 'pending') tx.update(reference, { status: 'enqueued', updatedAt: Timestamp.now() });
  });
}

/** DEMO worker only: the durable job record is the deduplication boundary. */
export async function executeDeferredProbe(db: Firestore, data: unknown, now: Date): Promise<void> {
  const { jobId } = deferredRequestSchema.parse(data);
  await db.runTransaction(async (tx) => {
    const reference = db.doc(`jobs/${jobId}`);
    const snapshot = await tx.get(reference);
    if (!snapshot.exists) throw new DomainError('BAD_REQUEST', 'El trabajo no existe.');
    if (snapshot.get('status') === 'completed') return;
    if (!['pending', 'enqueued'].includes(snapshot.get('status') as string)) {
      throw new DomainError('FORBIDDEN', 'El estado del trabajo no permite su ejecución.');
    }
    if (snapshot.get('kind') !== 'system.probe' || snapshot.get('demo') !== true) {
      throw new DomainError('FORBIDDEN', 'Este trabajador solo admite la prueba DEMO.');
    }
    const executeAt: unknown = snapshot.get('executeAt');
    if (!(executeAt instanceof Timestamp) || executeAt.toMillis() > now.getTime()) {
      throw new DomainError('UNAVAILABLE', 'El trabajo todavía no está disponible.');
    }
    tx.update(reference, { status: 'completed', completedAt: Timestamp.fromDate(now), updatedAt: Timestamp.fromDate(now) });
  });
}
