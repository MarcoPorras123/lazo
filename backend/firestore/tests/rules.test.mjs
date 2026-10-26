import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';

let environment;
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Se requiere Firestore Emulator.');
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  environment = await initializeTestEnvironment({
    projectId: 'demo-lazo',
    firestore: { host, port: Number(port), rules: await readFile('backend/firestore/firestore.rules', 'utf8') },
  });
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'auditLogs/rules-fixture'), { action: 'system.probe', immutable: true });
  });
});
after(async () => { await environment?.cleanup(); });

test('denegación por defecto para anónimo y los tres roles', async () => {
  const contexts = [environment.unauthenticatedContext(), ...['customer', 'barber', 'owner'].map(role =>
    environment.authenticatedContext(`rules-${role}`, { role, tenantId: 'blackandwhite' }))];
  for (const context of contexts) {
    const db = context.firestore();
    await assertFails(getDoc(doc(db, 'tenants/blackandwhite')));
    await assertFails(getDocs(collection(db, 'users')));
    await assertFails(setDoc(doc(db, 'unknown/attempt'), { role: 'owner' }));
    await assertFails(setDoc(doc(db, 'tenants/blackandwhite/bookings/attempt'), { marketId: 'PE' }));
  }
});

test('auditoría inmodificable desde la app incluso con claims de dueño', async () => {
  const db = environment.authenticatedContext('rules-owner', { role: 'owner', admin: true }).firestore();
  await assertFails(getDoc(doc(db, 'auditLogs/rules-fixture')));
  await assertFails(setDoc(doc(db, 'auditLogs/new-entry'), { action: 'forged' }));
  await assertFails(updateDoc(doc(db, 'auditLogs/rules-fixture'), { immutable: false }));
  await assertFails(deleteDoc(doc(db, 'auditLogs/rules-fixture')));
});
