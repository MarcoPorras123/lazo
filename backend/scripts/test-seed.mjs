import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Emulador requerido.');
const seed = () => spawnSync(process.execPath, ['--import', 'tsx', 'backend/scripts/seed-demo.ts'], {
  encoding: 'utf8', env: { ...process.env, GCLOUD_PROJECT: 'demo-lazo' },
});
const first = seed();
assert.equal(first.status, 0, first.stderr);
const second = seed();
assert.equal(second.status, 0, second.stderr);
const refused = spawnSync(process.execPath, ['--import', 'tsx', 'backend/scripts/seed-demo.ts'], {
  encoding: 'utf8', env: { ...process.env, GCLOUD_PROJECT: 'production-must-fail' },
});
assert.notEqual(refused.status, 0);
const remoteRefused = spawnSync(process.execPath, ['--import', 'tsx', 'backend/scripts/seed-demo.ts'], {
  encoding: 'utf8', env: { ...process.env, GCLOUD_PROJECT: 'demo-lazo', FIRESTORE_EMULATOR_HOST: 'example.com:8080' },
});
assert.notEqual(remoteRefused.status, 0);
initializeApp({ projectId: 'demo-lazo' });
const db = getFirestore();
try {
  const locations = await db.collection('tenants/blackandwhite/locations').get();
  const services = await db.collection('tenants/blackandwhite/services').get();
  assert.equal(locations.size, 2);
  assert.equal(services.size, 8);
  for (const service of services.docs) {
    assert.equal(service.get('demo'), true);
    assert.equal(service.get('published'), false);
    assert.equal(service.get('price.currency'), service.get('marketId') === 'PE' ? 'PEN' : 'EUR');
    assert.match(service.get('name'), /DEMO/);
    assert.ok(Number.isSafeInteger(service.get('sortOrder')));
    assert.ok(service.get('durationMinutes') > 0);
    const rule = await db.doc(`tenants/blackandwhite/businessRules/${service.get('businessRuleVersion')}`).get();
    assert.equal(rule.get('status'), 'proposed');
    assert.equal(rule.get('demo'), true);
  }
  const events = await db.collection('outbox').where('name', '==', 'system.probe').get();
  assert.equal(events.size, 2, 'Seed repetido no debe duplicar eventos');
  const deadline = Date.now() + 20000;
  let completed = false;
  while (Date.now() < deadline) {
    const current = await db.getAll(...events.docs.map(event => event.ref));
    completed = current.every(event => event.get('status') === 'completed');
    if (completed) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(completed, 'El trigger real de outbox debe procesar ambos eventos');
  const receipts = await db.collection('auditLogs').where('action', '==', 'system.probe.processed').get();
  assert.equal(receipts.size, 2, 'Un único recibo por evento técnico');
  console.log('PASS: seed DEMO dos veces, 2 locales, 8 servicios, 2 eventos procesados/recibos; rechaza producción/host remoto.');
} finally { await db.terminate(); }
