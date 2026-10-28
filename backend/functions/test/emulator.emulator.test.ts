import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeApp, deleteApp, type App } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { requireScope } from '../src/authorization/require-scope';
import { executeIdempotent } from '../src/shared/idempotency';
import { appendOutbox, OutboxDispatcher, type TransactionalConsumer } from '../src/shared/outbox';
import { FixedClock } from '../src/shared/time';
import { appendDeferredProbe, enqueueDeferredJob, enqueuePendingJobs, executeDeferredProbe } from '../src/shared/jobs';

// Cloud Tasks is not emulated here: a fake queue records enqueue calls.
const { enqueue, taskQueue } = vi.hoisted(() => {
  const enqueue = vi.fn<(data: unknown, options: { id: string; scheduleTime: Date }) => Promise<void>>();
  return { enqueue, taskQueue: vi.fn((_name: string) => ({ enqueue })) };
});
vi.mock('firebase-admin/functions', () => ({ getFunctions: () => ({ taskQueue }) }));

// Isolate tests from deployed triggers, which use project demo-lazo.
const projectId = 'demo-lazo-functions-tests';
const scope = { tenantId: 'blackandwhite-demo', marketId: 'PE' as const, locationId: 'lima-demo' };
const actor = { uid: 'owner-demo', role: 'owner' as const };
let app: App;
let db: Firestore;
const now = new Date('2026-10-25T12:00:00.000Z');

beforeAll(() => {
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? '')) {
    throw new Error('Tests require loopback FIRESTORE_EMULATOR_HOST; cloud tests forbidden.');
  }
  app = initializeApp({ projectId }, `functions-tests-${randomUUID()}`);
  db = getFirestore(app);
});
afterAll(async () => { if (app) await deleteApp(app); });

function operation(id: string, key: string, request: unknown = { value: 1 }) {
  return executeIdempotent(db, {
    actor, scope, action: 'system.probe', idempotencyKey: key, request, clock: new FixedClock(now),
    async execute({ tx, correlationId, now: date }) {
      const ref = db.doc(`jobs/${id}`);
      const doc = await tx.get(ref);
      const count = ((doc.get('count') as number | undefined) ?? 0) + 1;
      tx.set(ref, { count, schemaVersion: 1, ...scope, createdAt: Timestamp.fromDate(date), updatedAt: Timestamp.fromDate(date) });
      return { response: { count, correlationId },
        audit: { action: 'system.probe', entityType: 'jobs', entityId: id, before: {}, after: { count }, reason: 'Test DEMO' },
        events: [{ name: 'system.probe', aggregateId: id, aggregateVersion: count, payload: { demo: true } }] };
    },
  });
}

async function addEvent(eventId: string, aggregateId: string, version = 1): Promise<void> {
  await db.runTransaction(async (tx) => appendOutbox(db, tx, eventId, scope,
    { name: 'system.probe', aggregateId, aggregateVersion: version, payload: { demo: true } }, randomUUID(), now));
}

describe('Firestore atomic idempotency', () => {
  it('same key/request gives exact stored response and one effect under concurrency', async () => {
    const id = randomUUID(); const key = randomUUID();
    const results = await Promise.all(Array.from({ length: 6 }, () => operation(id, key)));
    expect(results.every((value) => JSON.stringify(value) === JSON.stringify(results[0]))).toBe(true);
    expect((await db.doc(`jobs/${id}`).get()).get('count')).toBe(1);
    expect((await db.collection('auditLogs').where('entityId', '==', id).get()).size).toBe(1);
    expect((await db.collection('outbox').where('aggregateId', '==', id).get()).size).toBe(1);
  });
  it('same key with changed content rejects without another effect', async () => {
    const id = randomUUID(); const key = randomUUID();
    await operation(id, key, { value: 1 });
    await expect(operation(id, key, { value: 2 })).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect((await db.doc(`jobs/${id}`).get()).get('count')).toBe(1);
  });
  it('canonical payload ordering is the same request', async () => {
    const id = randomUUID(); const key = randomUUID();
    expect(await operation(id, key, { b: 2, a: 1 })).toEqual(await operation(id, key, { a: 1, b: 2 }));
  });
  it('a role change does not change a principal idempotency namespace', async () => {
    const id = randomUUID(); const key = randomUUID();
    const original = await operation(id, key);
    const execute = vi.fn();
    const retried = await executeIdempotent(db, { actor: { ...actor, role: 'barber' }, scope,
      action: 'system.probe', idempotencyKey: key, request: { value: 1 }, execute });
    expect(retried).toEqual(original);
    expect(execute).not.toHaveBeenCalled();
  });
  it('rolls back operation if its audit validation fails', async () => {
    const id = randomUUID();
    await expect(executeIdempotent(db, { actor, scope, action: 'system.probe', idempotencyKey: randomUUID(), request: {},
      async execute({ tx }) {
        tx.create(db.doc(`jobs/${id}`), { demo: true });
        return { response: { ok: true }, audit: { action: '', entityType: 'jobs', entityId: id, before: {}, after: {}, reason: 'Test' }, events: [] };
      },
    })).rejects.toThrow();
    expect((await db.doc(`jobs/${id}`).get()).exists).toBe(false);
  });
});

describe('Outbox at-least-once, retries and ordering', () => {
  it('duplicates and concurrent dispatch apply an effect once transactionally', async () => {
    const id = randomUUID(); const projection = randomUUID();
    const consumer: TransactionalConsumer = { id: `test-${id}`, events: ['system.probe'], async apply(tx) {
      const ref = db.doc(`jobs/${projection}`); const doc = await tx.get(ref);
      tx.set(ref, { count: ((doc.get('count') as number | undefined) ?? 0) + 1 });
    } };
    await addEvent(id, projection);
    const dispatcher = new OutboxDispatcher(db, [consumer], { clock: new FixedClock(now) });
    await Promise.all([dispatcher.dispatch(id), dispatcher.dispatch(id), dispatcher.dispatch(id)]);
    await dispatcher.dispatch(id);
    expect((await db.doc(`jobs/${projection}`).get()).get('count')).toBe(1);
    expect((await db.doc(`outbox/${id}`).get()).get('status')).toBe('completed');
    expect((await db.collection('processedEvents').where('eventId', '==', id).get()).size).toBe(1);
  });
  it('retries exponentially then fails with structured alert after limit', async () => {
    const id = randomUUID(); const clock = new FixedClock(now); const alert = vi.fn();
    const consumer: TransactionalConsumer = { id: `fail-${id}`, events: ['system.probe'], async apply() { throw new Error('Simulated failure'); } };
    await addEvent(id, id);
    const dispatcher = new OutboxDispatcher(db, [consumer], { clock, maxAttempts: 3, baseBackoffMs: 1000, onFailed: alert });
    expect(await dispatcher.dispatch(id)).toBe('pending');
    expect(await dispatcher.dispatch(id)).toBe('ignored');
    expect((await db.doc(`outbox/${id}`).get()).get('nextAttemptAt').toMillis()).toBe(now.getTime() + 1000);
    clock.advance(1000);
    expect(await dispatcher.dispatch(id)).toBe('pending');
    clock.advance(2000);
    expect(await dispatcher.dispatch(id)).toBe('failed');
    expect(await dispatcher.dispatch(id)).toBe('ignored');
    expect(alert).toHaveBeenCalledOnce();
    expect((await db.doc(`outbox/${id}`).get()).get('attempts')).toBe(3);
    expect((await db.collection('processedEvents').where('eventId', '==', id).get()).empty).toBe(true);
  });
  it('retains successful consumer marker when a later consumer must retry', async () => {
    const id = randomUUID(); const projection = randomUUID(); const clock = new FixedClock(now);
    let fail = true;
    const consumers: TransactionalConsumer[] = [
      { id: `first-${id}`, events: ['system.probe'], async apply(tx) {
        const ref = db.doc(`jobs/${projection}`); const doc = await tx.get(ref);
        tx.set(ref, { count: ((doc.get('count') as number | undefined) ?? 0) + 1 });
      } },
      { id: `second-${id}`, events: ['system.probe'], async apply() { if (fail) throw new Error('Retry'); } },
    ];
    await addEvent(id, projection);
    const dispatcher = new OutboxDispatcher(db, consumers, { clock, baseBackoffMs: 1 });
    expect(await dispatcher.dispatch(id)).toBe('pending');
    fail = false; clock.advance(1);
    expect(await dispatcher.dispatch(id)).toBe('completed');
    expect((await db.doc(`jobs/${projection}`).get()).get('count')).toBe(1);
    expect((await db.collection('processedEvents').where('eventId', '==', id).get()).size).toBe(2);
  });
  it('recovers expired lease and handles out-of-order aggregate versions', async () => {
    const newer = randomUUID(); const older = randomUUID(); const projection = randomUUID();
    const consumer: TransactionalConsumer = { id: `version-${projection}`, events: ['system.probe'], async apply(tx, event) {
      const ref = db.doc(`jobs/${projection}`); const doc = await tx.get(ref);
      if (((doc.get('version') as number | undefined) ?? 0) < event.aggregateVersion) tx.set(ref, { version: event.aggregateVersion });
    } };
    await addEvent(newer, projection, 2); await addEvent(older, projection, 1);
    await db.doc(`outbox/${newer}`).update({ status: 'processing', attempts: 1,
      leaseToken: 'crashed-worker', leaseUntil: Timestamp.fromMillis(now.getTime() - 1) });
    const dispatcher = new OutboxDispatcher(db, [consumer], { clock: new FixedClock(now) });
    expect(await dispatcher.dispatch(newer)).toBe('completed');
    expect(await dispatcher.dispatch(older)).toBe('completed');
    expect((await db.doc(`jobs/${projection}`).get()).get('version')).toBe(2);
  });
  it('exhausted crashed leases fail instead of retrying forever', async () => {
    const id = randomUUID(); const alert = vi.fn();
    await addEvent(id, id);
    await db.doc(`outbox/${id}`).update({ status: 'processing', attempts: 5,
      leaseToken: 'crashed-worker', leaseUntil: Timestamp.fromMillis(now.getTime() - 1) });
    const dispatcher = new OutboxDispatcher(db, [], { clock: new FixedClock(now), onFailed: alert });
    expect(await dispatcher.dispatch(id)).toBe('failed');
    expect(alert).toHaveBeenCalledOnce();
  });
  it('malformed stored events are failed without an infinite trigger retry', async () => {
    const id = randomUUID();
    await db.doc(`outbox/${id}`).create({ status: 'pending', schemaVersion: 99 });
    const dispatcher = new OutboxDispatcher(db, [], { clock: new FixedClock(now) });
    expect(await dispatcher.dispatch(id)).toBe('failed');
    expect((await db.doc(`outbox/${id}`).get()).get('lastErrorCode')).toBe('INVALID_EVENT_SCHEMA');
    expect(await dispatcher.dispatch(id)).toBe('ignored');
  });
  it('the scheduled sweep picks a due pending event with cursor-bounded work', async () => {
    const id = randomUUID();
    await addEvent(id, id);
    await db.doc(`outbox/${id}`).update({ nextAttemptAt: Timestamp.fromMillis(now.getTime() - 10_000) });
    const consumer: TransactionalConsumer = { id: `sweep-${id}`, events: ['system.probe'], async apply() {} };
    const dispatcher = new OutboxDispatcher(db, [consumer], { clock: new FixedClock(new Date(now.getTime() - 1000)) });
    expect(await dispatcher.sweep(1)).toBe(1);
    expect((await db.doc(`outbox/${id}`).get()).get('status')).toBe('completed');
  });
  it('a sweep keeps dispatching after one event throws', async () => {
    // Timestamps far in the past isolate this sweep from events of other tests.
    const past = new Date('2000-01-01T00:00:00.000Z');
    const [broken, healthy] = [randomUUID(), randomUUID()];
    for (const [index, id] of [broken, healthy].entries()) {
      await addEvent(id, id);
      await db.doc(`outbox/${id}`).update({ nextAttemptAt: Timestamp.fromMillis(past.getTime() + index) });
    }
    const consumer: TransactionalConsumer = { id: `sweep-isolation-${healthy}`, events: ['system.probe'], async apply() {} };
    class FlakyDispatcher extends OutboxDispatcher {
      override async dispatch(eventId: string) {
        if (eventId === broken) throw new Error('TRANSIENT');
        return super.dispatch(eventId);
      }
    }
    const dispatcher = new FlakyDispatcher(db, [consumer], { clock: new FixedClock(new Date(past.getTime() + 1000)) });
    expect(await dispatcher.sweep(2)).toBe(2);
    expect((await db.doc(`outbox/${broken}`).get()).get('status')).toBe('pending');
    expect((await db.doc(`outbox/${healthy}`).get()).get('status')).toBe('completed');
  });
});

describe('Authorization and delayed jobs foundations', () => {
  it('fails closed on unauthenticated, missing membership and wrong market/location', async () => {
    await expect(requireScope(db, undefined, scope, ['owner'])).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    const uid = randomUUID();
    await expect(requireScope(db, { uid }, scope, ['owner'])).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await db.doc(`tenants/${scope.tenantId}/memberships/${uid}`).set({ tenantId: scope.tenantId, uid, role: 'owner', status: 'active', marketIds: ['PE'], locationIds: [scope.locationId] });
    await db.doc(`tenants/${scope.tenantId}/locations/${scope.locationId}`).set({ tenantId: scope.tenantId, marketId: 'PE' });
    expect(await requireScope(db, { uid }, scope, ['owner'])).toEqual({ uid, role: 'owner' });
    await expect(requireScope(db, { uid }, { ...scope, marketId: 'ES' }, ['owner'])).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(requireScope(db, { uid }, scope, ['barber'])).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await db.doc(`tenants/${scope.tenantId}/memberships/${uid}`).update({ status: 'revoked' });
    await expect(requireScope(db, { uid }, scope, ['owner'])).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('runs durable DEMO job once and rejects execution before schedule', async () => {
    let jobId = '';
    await db.runTransaction(async (tx) => { jobId = appendDeferredProbe(db, tx, {
      scope, executeAt: new Date(now.getTime() + 1000), correlationId: randomUUID(), idempotencyKey: randomUUID(),
    }, now); });
    const request = { schemaVersion: 1, jobId };
    await expect(executeDeferredProbe(db, request, now)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    await executeDeferredProbe(db, request, new Date(now.getTime() + 1000));
    const first = (await db.doc(`jobs/${jobId}`).get()).get('updatedAt');
    await executeDeferredProbe(db, request, new Date(now.getTime() + 2000));
    expect((await db.doc(`jobs/${jobId}`).get()).get('updatedAt')).toEqual(first);
  });

  // Year-2000 schedules isolate these jobs from other tests' pending jobs.
  const past = new Date('2000-01-01T00:00:00.000Z');
  async function pastJob(offsetMs = 0): Promise<string> {
    let jobId = '';
    await db.runTransaction(async (tx) => { jobId = appendDeferredProbe(db, tx, {
      scope, executeAt: new Date(past.getTime() + offsetMs), correlationId: randomUUID(), idempotencyKey: randomUUID(),
    }, past); });
    return jobId;
  }

  it('enqueues with the stable job ID and schedule, then only once', async () => {
    enqueue.mockReset(); taskQueue.mockClear();
    enqueue.mockResolvedValue(undefined);
    const jobId = await pastJob();
    await enqueueDeferredJob(db, jobId, 'europe-west1');
    await enqueueDeferredJob(db, jobId, 'europe-west1');
    expect(taskQueue).toHaveBeenCalledWith('locations/europe-west1/functions/jobs-runDue');
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith({ schemaVersion: 1, jobId },
      expect.objectContaining({ id: jobId, scheduleTime: past }));
    expect((await db.doc(`jobs/${jobId}`).get()).get('status')).toBe('enqueued');
  });

  it('treats an existing task as enqueued and keeps other failures pending', async () => {
    enqueue.mockReset();
    const existing = await pastJob();
    enqueue.mockRejectedValueOnce(Object.assign(new Error('exists'), { code: 'functions/task-already-exists' }));
    await enqueueDeferredJob(db, existing, 'europe-west1');
    expect((await db.doc(`jobs/${existing}`).get()).get('status')).toBe('enqueued');
    const failing = await pastJob();
    enqueue.mockRejectedValueOnce(Object.assign(new Error('unavailable'), { code: 14 }));
    await expect(enqueueDeferredJob(db, failing, 'europe-west1')).rejects.toThrow('unavailable');
    expect((await db.doc(`jobs/${failing}`).get()).get('status')).toBe('pending');
    await db.doc(`jobs/${failing}`).update({ status: 'completed' });
  });

  it('the scheduled enqueue keeps going after one job fails', async () => {
    enqueue.mockReset();
    const [broken, healthy] = [await pastJob(1), await pastJob(2)];
    enqueue.mockImplementation(async (_data, options) => {
      if (options.id === broken) throw Object.assign(new Error('unavailable'), { code: 14 });
    });
    expect(await enqueuePendingJobs(db, 'europe-west1', past)).toBe(2);
    expect((await db.doc(`jobs/${broken}`).get()).get('status')).toBe('pending');
    expect((await db.doc(`jobs/${healthy}`).get()).get('status')).toBe('enqueued');
  });
});
