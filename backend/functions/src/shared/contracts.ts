import { z } from 'zod';

export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/);
export const scopeSchema = z.object({
  tenantId: idSchema,
  marketId: z.enum(['PE', 'ES']),
  locationId: idSchema.nullable(),
}).strict();
export type Scope = Readonly<z.infer<typeof scopeSchema>>;
export const roleSchema = z.enum(['customer', 'barber', 'owner', 'system']);
export const actorSchema = z.object({ uid: idSchema, role: roleSchema }).strict();
export type Actor = Readonly<z.infer<typeof actorSchema>>;

export const pingRequestSchema = z.object({
  schemaVersion: z.literal(1),
  idempotencyKey: idempotencyKeySchema,
}).strict();
export const pingResponseSchema = z.object({
  schemaVersion: z.literal(1),
  environment: z.enum(['dev', 'staging', 'prod']),
  version: z.string().min(1).max(64),
  serverTime: z.iso.datetime({ precision: 3 }),
  correlationId: z.uuid(),
}).strict();
export type PingResponse = Readonly<z.infer<typeof pingResponseSchema>>;

export const eventNames = [
  'system.probe',
  'booking.confirmed', 'booking.rescheduled', 'booking.cancelled', 'slot.released',
  'payment.succeeded', 'payment.failed', 'payment.refunded', 'payment.disputed',
  'visit.completed', 'validation.requested', 'visit.approved', 'visit.rejected',
  'loyalty.updated', 'reward.earned', 'reward.redeemed', 'wallet.sync.requested',
  'notification.requested', 'cash.movement.requested', 'user.deleted', 'membership.changed',
] as const;
export const eventNameSchema = z.enum(eventNames);
export type EventName = z.infer<typeof eventNameSchema>;
export const jsonValueSchema: z.ZodType<unknown> = z.json();
export const eventDraftSchema = z.object({
  name: eventNameSchema,
  aggregateId: idSchema,
  aggregateVersion: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  payload: z.record(z.string(), jsonValueSchema),
}).strict();
export type EventDraft = Readonly<z.infer<typeof eventDraftSchema>>;
