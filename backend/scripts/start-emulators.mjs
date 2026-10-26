import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = fileURLToPath(new URL('../../node_modules/firebase-tools/lib/bin/firebase.js', import.meta.url));
if (process.argv.length > 2) throw new Error('El arranque seguro solo permite demo-lazo.');
const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  cwd: root, stdio: 'inherit', shell: process.platform === 'win32',
});
if (build.status !== 0) process.exit(build.status ?? 1);
const result = spawnSync(process.execPath, [cli, 'emulators:start', '--project', 'demo-lazo', '--only', 'auth,firestore,functions,storage'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT ?? '60', LAZO_ENV: 'dev' },
});
process.exit(result.status ?? 1);
