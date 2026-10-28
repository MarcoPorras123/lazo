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

// Staged rollout: only the dev project exists, staging/prod are still DEMO or empty.
const devOnly = { dev: 'lazo-example-dev', staging: 'demo-lazo-staging', prod: 'demo-lazo-prod' };
const devOnlyConfig = { ...config, projects: { dev: devOnly.dev, staging: '', prod: '' } };
const devOnlyBase = { target: 'dev', aliases: devOnly, config: devOnlyConfig, envText: env('dev') };

test('dev deploys while staging and prod projects do not exist yet', () => {
  assert.equal(validateDeployment(devOnlyBase).project, devOnly.dev);
  const missing = { dev: devOnly.dev };
  assert.equal(validateDeployment({ ...devOnlyBase, aliases: missing, config: { ...config, projects: { dev: devOnly.dev } } }).project, devOnly.dev);
});
test('staging requires real dev and staging; prod still requires all three', () => {
  assert.throws(() => validateDeployment({ ...devOnlyBase, target: 'staging', envText: env('staging') }), /dev, staging/);
  const noDev = { dev: 'demo-lazo-dev', staging: aliases.staging, prod: 'demo-lazo-prod' };
  assert.throws(() => validateDeployment({ ...base, target: 'staging', aliases: noDev,
    config: { ...config, projects: { dev: '', staging: aliases.staging, prod: '' } }, envText: env('staging') }), /dev, staging/);
  const twoReal = { ...aliases, prod: 'demo-lazo-prod' };
  const twoConfig = { ...config, projects: { ...aliases, prod: '' } };
  assert.equal(validateDeployment({ ...base, target: 'staging', aliases: twoReal, config: twoConfig, envText: env('staging') }).project, aliases.staging);
  assert.throws(() => validateDeployment({ ...base, target: 'prod', aliases: twoReal, config: twoConfig,
    envText: env('prod'), productionRelease: aliases.prod }), /dev, staging, prod/);
});
test('dev-only rollout keeps alias, region, env and account protections', () => {
  assert.throws(() => validateDeployment({ ...devOnlyBase, aliases: { ...devOnly, dev: 'demo-lazo-dev' } }), /IDs reales/);
  assert.throws(() => validateDeployment({ ...devOnlyBase, aliases: { ...devOnly, staging: devOnly.dev },
    config: { ...devOnlyConfig, projects: { ...devOnlyConfig.projects, staging: devOnly.dev } } }), /diferentes/);
  assert.throws(() => validateDeployment({ ...devOnlyBase, config: { ...devOnlyConfig, projects: { ...devOnlyConfig.projects, prod: 'lazo-example-prod' } } }), /coincidir/);
  assert.throws(() => validateDeployment({ ...devOnlyBase, config: { ...devOnlyConfig, projects: { ...devOnlyConfig.projects, dev: 'lazo-other-dev' } } }), /coincidir/);
  assert.throws(() => validateDeployment({ ...devOnlyBase, config: { ...devOnlyConfig, dataRegionApproved: false } }), /región/);
  assert.throws(() => validateDeployment({ ...devOnlyBase, config: { ...devOnlyConfig, appCheckConfigured: false } }), /App Check/);
  assert.throws(() => validateDeployment({ ...devOnlyBase, envText: env('dev').replace('LAZO_ENV=dev', 'LAZO_ENV=prod') }), /no coinciden/);
  assert.throws(() => validateDeployment({ ...devOnlyBase, envText: env('dev').replaceAll(`@${devOnly.dev}`, '@lazo-other-dev') }), /cuentas de servicio/);
});
test('prod target cannot be reached through a dev-only setup', () => {
  assert.throws(() => validateDeployment({ ...devOnlyBase, target: 'prod', envText: env('dev'), productionRelease: devOnly.dev }), /dev, staging, prod/);
});
