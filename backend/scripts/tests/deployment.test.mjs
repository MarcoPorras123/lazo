import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDeployment } from '../deployment-config.mjs';

const aliases = { dev: 'lazo-example-dev', staging: 'lazo-example-staging', prod: 'lazo-example-prod' };
const config = { projects: aliases, dataRegionApproved: true, functionsRegion: 'europe-west1', firestoreLocation: 'europe-west1', appCheckConfigured: true, iamConfigured: true };
const env = target => `LAZO_ENV=${target}\nLAZO_REGION=europe-west1\nLAZO_VERSION=0.1.0\nLAZO_SYSTEM_SERVICE_ACCOUNT=lazo-system@${aliases[target]}.iam.gserviceaccount.com\nLAZO_WORKER_SERVICE_ACCOUNT=lazo-worker@${aliases[target]}.iam.gserviceaccount.com`;
const base = { target: 'dev', aliases, config, envText: env('dev') };

test('accepts distinct approved projects and matching persisted parameters', () => {
  assert.equal(validateDeployment(base).project, aliases.dev);
});
test('cannot deploy production through a duplicated dev alias', () => {
  const duplicated = { ...aliases, dev: aliases.prod };
  assert.throws(() => validateDeployment({ ...base, aliases: duplicated, config: { ...config, projects: duplicated } }), /diferentes/);
});
test('checks every alias, approved region, env and project service accounts', () => {
  assert.throws(() => validateDeployment({ ...base, config: { ...config, projects: { ...aliases, staging: 'different-project' } } }));
  assert.throws(() => validateDeployment({ ...base, config: { ...config, dataRegionApproved: false } }));
  assert.throws(() => validateDeployment({ ...base, envText: env('staging') }));
  assert.throws(() => validateDeployment({ ...base, envText: env('dev').replaceAll('europe-west1', 'us-central1') }));
  assert.throws(() => validateDeployment({ ...base, envText: env('dev').replaceAll(aliases.dev, aliases.prod) }));
  assert.throws(() => validateDeployment({ ...base, envText: `${env('dev')}\nLAZO_ENV=prod` }));
});
test('production requires the exact release confirmation even with valid config', () => {
  const prod = { ...base, target: 'prod', envText: env('prod') };
  assert.throws(() => validateDeployment(prod));
  assert.equal(validateDeployment({ ...prod, productionRelease: aliases.prod }).project, aliases.prod);
});
