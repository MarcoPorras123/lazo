import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateDeployment } from './deployment-config.mjs';

const target = process.argv[2];
if (!['dev', 'staging', 'prod'].includes(target)) throw new Error('Uso: npm run deploy:checked -- dev|staging|prod');
const root = fileURLToPath(new URL('../../', import.meta.url));
const aliases = JSON.parse(readFileSync(new URL('../../.firebaserc', import.meta.url), 'utf8')).projects;
const project = aliases[target];
if (!project || project.startsWith('demo-')) throw new Error('No hay proyecto Firebase real registrado. Ver docs/deployment.md.');
const config = JSON.parse(readFileSync(new URL('../../config/deployment.local.json', import.meta.url), 'utf8'));
// Firebase CLI deploys values loaded from dotenv files, not arbitrary shell vars.
// Use a single per-project source to prevent alias/base precedence surprises.
for (const name of ['.env', '.env.dev', '.env.staging', '.env.prod']) {
  if (existsSync(new URL(`../functions/${name}`, import.meta.url))) throw new Error('Usar solo .env.<PROJECT_ID> para parámetros de despliegue.');
}
const envText = readFileSync(new URL(`../functions/.env.${project}`, import.meta.url), 'utf8');
validateDeployment({ target, aliases, config, envText, productionRelease: process.env.LAZO_PRODUCTION_RELEASE });
const cli = fileURLToPath(new URL('../../node_modules/firebase-tools/lib/bin/firebase.js', import.meta.url));
const result = spawnSync(process.execPath, [cli, 'deploy', '--project', project, '--only', 'functions,firestore,storage'], {
  cwd: root, stdio: 'inherit',
});
process.exit(result.status ?? 1);
