import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { ref, uploadString, getBytes, getMetadata, deleteObject, listAll } from 'firebase/storage';

let environment;
before(async () => {
  if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) throw new Error('Se requiere Storage Emulator.');
  const [host, port] = process.env.FIREBASE_STORAGE_EMULATOR_HOST.split(':');
  environment = await initializeTestEnvironment({
    projectId: 'demo-lazo',
    storage: { host, port: Number(port), rules: await readFile('backend/firestore/storage.rules', 'utf8') },
  });
  await environment.withSecurityRulesDisabled(async context => {
    await uploadString(ref(context.storage(), 'tenants/blackandwhite/fixture.txt'), 'DEMO');
  });
});
after(async () => { await environment?.cleanup(); });

test('Storage deniega por defecto a anónimo y a los tres roles', async () => {
  const contexts = [environment.unauthenticatedContext(), ...['customer', 'barber', 'owner'].map(role =>
    environment.authenticatedContext(`storage-${role}`, { role, tenantId: 'blackandwhite', admin: role === 'owner' }))];
  for (const context of contexts) {
    const storage = context.storage();
    const existing = ref(storage, 'tenants/blackandwhite/fixture.txt');
    await assertFails(getBytes(existing));
    await assertFails(getMetadata(existing));
    await assertFails(listAll(ref(storage, 'tenants/blackandwhite')));
    await assertFails(uploadString(ref(storage, 'tenants/blackandwhite/attempt.txt'), 'forged'));
    await assertFails(uploadString(existing, 'overwrite'));
    await assertFails(deleteObject(existing));
  }
});
