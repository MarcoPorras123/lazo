import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { z } from 'zod';
import { actorSchema, scopeSchema, type Actor, type Scope } from './contracts';

const summarySchema = z.record(z.string().max(64), z.union([
  z.string().max(160), z.number().finite(), z.boolean(), z.null(),
]));
export const auditDraftSchema = z.object({
  action: z.string().regex(/^[a-z][a-zA-Z0-9_.-]{1,95}$/),
  entityType: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{1,63}$/),
  entityId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  before: summarySchema,
  after: summarySchema,
  reason: z.string().min(1).max(240),
}).strict();
export type AuditDraft = z.infer<typeof auditDraftSchema>;

/** Server-only create: never set/update/delete audit records. Summaries must exclude PII. */
export function appendAudit(
  db: Firestore, tx: Transaction, id: string, actor: Actor, scope: Scope,
  draft: AuditDraft, correlationId: string, now: Date,
): void {
  tx.create(db.doc(`auditLogs/${id}`), {
    ...auditDraftSchema.parse(draft), ...scopeSchema.parse(scope),
    actor: actorSchema.parse(actor), correlationId, schemaVersion: 1,
    createdAt: Timestamp.fromDate(now), updatedAt: Timestamp.fromDate(now),
  });
}
