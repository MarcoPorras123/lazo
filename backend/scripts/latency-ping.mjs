// Measures real system.ping latency against Firebase DEV only (e.g. from Lima).
// Usage: node backend/scripts/latency-ping.mjs [--count 50] [--timeout-ms 10000]
//        [--interval-ms 250] [--region europe-west1] [--label "Lima fibra"] [--json]
// Secrets come only from environment variables and are never printed:
//   LAZO_DEV_PROJECT_ID, LAZO_FIREBASE_API_KEY, LAZO_FIREBASE_APP_ID, LAZO_APPCHECK_DEBUG_TOKEN
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const realProject = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

/** Only the real dev alias of .firebaserc is accepted; staging/prod/DEMO are refused. */
export function resolveDevProject(projectId, aliases) {
  if (!realProject.test(projectId ?? '') || projectId.startsWith('demo-')) {
    throw new Error('LAZO_DEV_PROJECT_ID debe ser un ID real de Firebase.');
  }
  if (projectId === aliases.staging || projectId === aliases.prod) {
    throw new Error('La medición solo se permite contra DEV; staging y prod están excluidos.');
  }
  if (projectId !== aliases.dev) throw new Error('LAZO_DEV_PROJECT_ID no coincide con el alias dev de .firebaserc.');
  return projectId;
}

export function parseOptions(argv) {
  const options = { count: 50, timeoutMs: 10_000, intervalMs: 250, region: 'europe-west1', label: '', json: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--json') { options.json = true; continue; }
    const value = argv[++i];
    if (value === undefined) throw new Error(`Falta el valor de ${flag}.`);
    if (flag === '--count') options.count = Number(value);
    else if (flag === '--timeout-ms') options.timeoutMs = Number(value);
    else if (flag === '--interval-ms') options.intervalMs = Number(value);
    else if (flag === '--region') options.region = value;
    else if (flag === '--label') options.label = value;
    else throw new Error(`Opción desconocida: ${flag}`);
  }
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 500) throw new Error('--count entre 1 y 500.');
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 100 || options.timeoutMs > 60_000) throw new Error('--timeout-ms entre 100 y 60000.');
  if (!Number.isInteger(options.intervalMs) || options.intervalMs < 0 || options.intervalMs > 10_000) throw new Error('--interval-ms entre 0 y 10000.');
  if (!/^[a-z]+-[a-z]+\d$/.test(options.region)) throw new Error('--region inválida.');
  if (options.label.length > 80) throw new Error('--label de 80 caracteres como máximo.');
  return options;
}

/** Nearest-rank percentile over durations in ms. */
export function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
}

export function summarize(samples) {
  const ok = samples.filter(sample => sample.outcome === 'ok').map(sample => sample.ms);
  const failures = {};
  for (const sample of samples) if (sample.outcome !== 'ok') failures[sample.outcome] = (failures[sample.outcome] ?? 0) + 1;
  const round = value => (value === null ? null : Math.round(value * 10) / 10);
  return {
    attempts: samples.length, ok: ok.length, failed: samples.length - ok.length,
    timeouts: failures.timeout ?? 0, failures,
    minMs: round(ok.length ? Math.min(...ok) : null), p50Ms: round(percentile(ok, 50)),
    p95Ms: round(percentile(ok, 95)), maxMs: round(ok.length ? Math.max(...ok) : null),
    meanMs: round(ok.length ? ok.reduce((sum, value) => sum + value, 0) / ok.length : null),
  };
}

/** One timed callable request; never throws, classifies the outcome instead. */
async function timedPing(functionUrl, appCheckToken, timeoutMs) {
  const started = performance.now();
  try {
    const response = await fetch(functionUrl, {
      method: 'POST', signal: AbortSignal.timeout(timeoutMs),
      headers: { 'content-type': 'application/json', 'x-firebase-appcheck': appCheckToken },
      body: JSON.stringify({ data: { schemaVersion: 1, idempotencyKey: randomUUID() } }),
    });
    const body = await response.json().catch(() => null);
    const ms = performance.now() - started;
    if (!response.ok) return { outcome: `http-${response.status}`, ms };
    const result = body?.result;
    const valid = result?.schemaVersion === 1 && result?.environment === 'dev' && typeof result?.correlationId === 'string';
    return { outcome: valid ? 'ok' : 'invalid-response', ms };
  } catch (error) {
    const ms = performance.now() - started;
    return { outcome: error?.name === 'TimeoutError' ? 'timeout' : 'network-error', ms };
  }
}

export async function measure({ project, apiKey, appId, debugToken, options,
  appCheckBase = 'https://firebaseappcheck.googleapis.com', functionsBase, sleep }) {
  const wait = sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const exchangeStarted = performance.now();
  const exchange = await fetch(`${appCheckBase}/v1/projects/${project}/apps/${encodeURIComponent(appId)}:exchangeDebugToken`, {
    method: 'POST', signal: AbortSignal.timeout(options.timeoutMs),
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ debugToken }),
  });
  if (!exchange.ok) throw new Error(`App Check rechazó el token de depuración (HTTP ${exchange.status}). ¿Está registrado en el proyecto DEV?`);
  const { token } = await exchange.json();
  if (typeof token !== 'string' || !token) throw new Error('App Check no devolvió un token.');
  const exchangeMs = performance.now() - exchangeStarted;
  const functionUrl = `${functionsBase ?? `https://${options.region}-${project}.cloudfunctions.net`}/system-ping`;
  // The first call may include a cold start: reported apart, excluded from p50/p95.
  const first = await timedPing(functionUrl, token, options.timeoutMs);
  const samples = [];
  for (let i = 0; i < options.count; i++) {
    if (options.intervalMs > 0) await wait(options.intervalMs);
    samples.push(await timedPing(functionUrl, token, options.timeoutMs));
  }
  return {
    measuredAt: new Date().toISOString(), label: options.label, project, region: options.region,
    count: options.count, timeoutMs: options.timeoutMs,
    appCheckExchangeMs: Math.round(exchangeMs * 10) / 10,
    firstCall: { outcome: first.outcome, ms: Math.round(first.ms * 10) / 10 },
    warm: summarize(samples),
  };
}

function format(report) {
  const warm = report.warm;
  return [
    `Lazo system.ping DEV · ${report.measuredAt}${report.label ? ` · ${report.label}` : ''}`,
    `Proyecto ${report.project} · región ${report.region} · timeout ${report.timeoutMs} ms`,
    `Canje App Check: ${report.appCheckExchangeMs} ms`,
    `Primera llamada (puede incluir arranque en frío): ${report.firstCall.outcome} en ${report.firstCall.ms} ms`,
    `En caliente: ${warm.ok}/${warm.attempts} correctas · fallos ${warm.failed} · timeouts ${warm.timeouts}`,
    `  mín ${warm.minMs} · p50 ${warm.p50Ms} · p95 ${warm.p95Ms} · máx ${warm.maxMs} · media ${warm.meanMs} ms`,
    ...(warm.failed ? [`  detalle de fallos: ${JSON.stringify(warm.failures)}`] : []),
  ].join('\n');
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const aliases = JSON.parse(readFileSync(new URL('../../.firebaserc', import.meta.url), 'utf8')).projects;
  const project = resolveDevProject(process.env.LAZO_DEV_PROJECT_ID, aliases);
  const apiKey = process.env.LAZO_FIREBASE_API_KEY;
  const appId = process.env.LAZO_FIREBASE_APP_ID;
  const debugToken = process.env.LAZO_APPCHECK_DEBUG_TOKEN;
  if (!apiKey || !appId || !debugToken) {
    throw new Error('Definir LAZO_FIREBASE_API_KEY, LAZO_FIREBASE_APP_ID y LAZO_APPCHECK_DEBUG_TOKEN en el entorno (nunca en archivos versionados).');
  }
  const report = await measure({ project, apiKey, appId, debugToken, options });
  console.log(options.json ? JSON.stringify(report, null, 2) : format(report));
  if (report.warm.ok === 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
