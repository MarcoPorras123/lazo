import { defineSecret, defineString } from 'firebase-functions/params';

export const environment = defineString('LAZO_ENV', { default: 'dev' });
export const appVersion = defineString('LAZO_VERSION', { default: '0.1.0' });
// Provisional emulator location, not an approved physical data-residency choice.
export const region = defineString('LAZO_REGION', { default: 'europe-west1' });
export const systemServiceAccount = defineString('LAZO_SYSTEM_SERVICE_ACCOUNT', {
  default: 'lazo-system@demo-lazo.iam.gserviceaccount.com',
});
export const workerServiceAccount = defineString('LAZO_WORKER_SERVICE_ACCOUNT', {
  default: 'lazo-worker@demo-lazo.iam.gserviceaccount.com',
});
// Contract only. Bind with {secrets:[integrationSecret]} ONLY when a future integration needs it.
// No Step-1 function reads or requires this secret.
export const integrationSecret = defineSecret('LAZO_INTEGRATION_SECRET');
export const isFunctionsEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
