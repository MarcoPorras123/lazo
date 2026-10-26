import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

if (process.argv[2] !== '--emulator') throw new Error('Script solo local; verificar dev real desde la app con App Check.');
const url = 'http://127.0.0.1:5001/demo-lazo/europe-west1/system-ping';
const before = Date.now();
const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ data: { schemaVersion: 1, idempotencyKey: randomUUID() } }), signal: AbortSignal.timeout(20000) });
assert.equal(response.status, 200, await response.clone().text());
const { result } = await response.json();
assert.equal(result.schemaVersion, 1);
assert.equal(result.environment, 'dev');
assert.equal(typeof result.version, 'string');
assert.match(result.correlationId, /^[0-9a-f-]{36}$/);
assert.ok(Date.parse(result.serverTime) >= before - 1000);
assert.ok(Date.parse(result.serverTime) <= Date.now() + 1000);
const invalid = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ data: { schemaVersion: 99, idempotencyKey: randomUUID() } }), signal: AbortSignal.timeout(20000) });
assert.equal(invalid.status, 400);
console.log(JSON.stringify({ test: 'system.ping callable emulator', status: 'passed', environment: result.environment, version: result.version }));
