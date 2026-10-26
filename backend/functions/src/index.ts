import { randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { logger } from 'firebase-functions';
import { appVersion, environment, isFunctionsEmulator, region, systemServiceAccount, workerServiceAccount } from './shared/config';
import { asHttpsError } from './shared/errors';
import { hash } from './shared/hash';
import { enqueueDeferredJob, executeDeferredProbe } from './shared/jobs';
import { OutboxDispatcher, type TransactionalConsumer } from './shared/outbox';
import { createPingResponse } from './shared/ping';

initializeApp();
const db = getFirestore();
const runtime = { region, maxInstances: 2, memory: '256MiB' as const };

/** Logical contract system.ping => exported callable system-ping. No user data or writes. */
export const system = {
  ping: onCall({ ...runtime, serviceAccount: systemServiceAccount, enforceAppCheck: !isFunctionsEmulator,
    timeoutSeconds: 15, cors: false }, (request) => {
    const correlationId = randomUUID();
    try {
      const response = createPingResponse(request.data, environment.value(), appVersion.value(), undefined, correlationId);
      logger.info('system.ping', { correlationId, environment: response.environment, version: response.version });
      return response;
    } catch (error) { throw asHttpsError(error, correlationId); }
  }),
};

/** Foundation consumer demonstrates only a technical receipt, visibly DEMO. */
const probeConsumer: TransactionalConsumer = {
  id: 'system.probe.receipt.v1', events: ['system.probe'],
  async apply(tx, event) {
    tx.create(db.doc(`auditLogs/${hash(`probe:${event.eventId}`)}`), {
      schemaVersion: 1, tenantId: event.tenantId, marketId: event.marketId, locationId: event.locationId,
      actor: { uid: 'system', role: 'system' }, action: 'system.probe.processed', entityType: 'outbox',
      entityId: event.eventId, before: {}, after: { demo: true }, reason: 'Verificación técnica DEMO',
      correlationId: event.correlationId, createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
  },
};
const dispatcher = new OutboxDispatcher(db, [probeConsumer]);

export const outbox = {
  dispatch: onDocumentCreated({ ...runtime, serviceAccount: workerServiceAccount,
    document: 'outbox/{eventId}', timeoutSeconds: 60, retry: true }, async (event) => {
    await dispatcher.dispatch(event.params.eventId);
  }),
  retryPending: onSchedule({ ...runtime, serviceAccount: workerServiceAccount,
    schedule: 'every 1 minutes', timeZone: 'UTC', timeoutSeconds: 120 }, async () => {
    await dispatcher.sweep();
  }),
};

export const jobs = {
  runDue: onTaskDispatched({ ...runtime, serviceAccount: workerServiceAccount,
    invoker: 'private', timeoutSeconds: 60,
    retryConfig: { maxAttempts: 5, minBackoffSeconds: 5, maxBackoffSeconds: 3600 },
    rateLimits: { maxConcurrentDispatches: 2, maxDispatchesPerSecond: 5 },
  }, async (request) => {
    await executeDeferredProbe(db, request.data, new Date());
  }),
  enqueuePending: onSchedule({ ...runtime, serviceAccount: workerServiceAccount,
    schedule: 'every 1 minutes', timeZone: 'UTC', timeoutSeconds: 120 }, async () => {
    const pending = await db.collection('jobs').where('status', '==', 'pending')
      .where('executeAt', '<=', Timestamp.fromMillis(Date.now() + 86_400_000))
      .orderBy('executeAt').limit(100).get();
    for (const job of pending.docs) await enqueueDeferredJob(db, job.id, region.value());
  }),
};
