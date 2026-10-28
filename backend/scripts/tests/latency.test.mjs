import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { measure, parseOptions, percentile, resolveDevProject, summarize } from '../latency-ping.mjs';

const aliases = { dev: 'lazo-dev-bw', staging: 'lazo-staging-bw', prod: 'lazo-prod-bw' };

test('only the real dev alias can be measured', () => {
  assert.equal(resolveDevProject('lazo-dev-bw', aliases), 'lazo-dev-bw');
  assert.throws(() => resolveDevProject('lazo-staging-bw', aliases), /solo se permite contra DEV/);
  assert.throws(() => resolveDevProject('lazo-prod-bw', aliases), /solo se permite contra DEV/);
  assert.throws(() => resolveDevProject('demo-lazo-dev', { ...aliases, dev: 'demo-lazo-dev' }), /ID real/);
  assert.throws(() => resolveDevProject('lazo-other-dev', aliases), /no coincide/);
  assert.throws(() => resolveDevProject(undefined, aliases), /ID real/);
});

test('options are bounded and percentiles use nearest rank', () => {
  assert.deepEqual(parseOptions([]), { count: 50, timeoutMs: 10_000, intervalMs: 250, region: 'europe-west1', label: '', json: false });
  assert.equal(parseOptions(['--count', '5', '--label', 'Lima fibra', '--json']).label, 'Lima fibra');
  assert.throws(() => parseOptions(['--count', '0']));
  assert.throws(() => parseOptions(['--timeout-ms', '50']));
  assert.throws(() => parseOptions(['--region', 'europe west1']));
  assert.throws(() => parseOptions(['--unknown', 'x']));
  const values = Array.from({ length: 20 }, (_, i) => i + 1);
  assert.equal(percentile(values, 50), 10);
  assert.equal(percentile(values, 95), 19);
  assert.equal(percentile([], 50), null);
  const summary = summarize([{ outcome: 'ok', ms: 100 }, { outcome: 'timeout', ms: 200 }, { outcome: 'http-500', ms: 5 }]);
  assert.deepEqual([summary.ok, summary.failed, summary.timeouts, summary.p50Ms], [1, 2, 1, 100]);
  assert.deepEqual(summary.failures, { timeout: 1, 'http-500': 1 });
});

test('measures against a local fake: exchange, cold call, failures and timeouts', async () => {
  let call = 0;
  const seenTokens = new Set();
  const server = createServer((request, response) => {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      if (request.url.endsWith(':exchangeDebugToken')) {
        assert.equal(request.headers['x-goog-api-key'], 'public-key');
        assert.equal(JSON.parse(body).debugToken, '00000000-0000-4000-8000-000000000000');
        response.end(JSON.stringify({ token: 'app-check-token', ttl: '3600s' }));
        return;
      }
      seenTokens.add(request.headers['x-firebase-appcheck']);
      call += 1;
      if (call === 3) { response.statusCode = 500; response.end('{}'); return; }
      if (call === 4) return; // never answers: client timeout
      response.end(JSON.stringify({ result: { schemaVersion: 1, environment: 'dev', correlationId: 'c' } }));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const report = await measure({
      project: 'lazo-dev-bw', apiKey: 'public-key', appId: '1:1:android:1',
      debugToken: '00000000-0000-4000-8000-000000000000',
      options: { ...parseOptions(['--count', '5', '--timeout-ms', '300', '--interval-ms', '0']) },
      appCheckBase: base, functionsBase: base,
    });
    assert.equal(report.firstCall.outcome, 'ok');
    assert.deepEqual([report.warm.attempts, report.warm.ok, report.warm.failed, report.warm.timeouts], [5, 3, 2, 1]);
    assert.deepEqual(report.warm.failures, { 'http-500': 1, timeout: 1 });
    assert.ok(report.warm.p50Ms >= 0 && report.warm.p95Ms >= report.warm.p50Ms);
    assert.deepEqual([...seenTokens], ['app-check-token']);
    assert.ok(!JSON.stringify(report).includes('00000000-0000-4000-8000-000000000000'), 'debug token must not be reported');
    assert.ok(!JSON.stringify(report).includes('public-key'), 'API key must not be reported');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('a rejected debug token stops before any ping', async () => {
  const server = createServer((request, response) => { response.statusCode = 403; response.end('{}'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await assert.rejects(measure({ project: 'lazo-dev-bw', apiKey: 'k', appId: 'a', debugToken: 't',
      options: parseOptions(['--count', '1']), appCheckBase: base, functionsBase: base }), /HTTP 403/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
