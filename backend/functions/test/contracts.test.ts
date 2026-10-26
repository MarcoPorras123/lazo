import { describe, expect, it } from 'vitest';
import { pingRequestSchema, pingResponseSchema } from '../src/shared/contracts';
import { canonicalJson, hash } from '../src/shared/hash';
import { createPingResponse } from '../src/shared/ping';
import { FixedClock } from '../src/shared/time';
import { fixture } from './fixtures';

describe('system.ping and JSON contracts', () => {
  const invalid = fixture('invalid-ping.json') as { cases: { name: string; response: unknown }[] };
  for (const item of invalid.cases) {
    it(`rejects the shared invalid response: ${item.name}`, () => {
      expect(pingResponseSchema.safeParse(item.response).success).toBe(false);
    });
  }
  it('matches the Dart response fixture', () => {
    const expected = pingResponseSchema.parse(fixture('ping-response.json'));
    expect(createPingResponse({ schemaVersion: 1, idempotencyKey: 'contract-key-00001' }, expected.environment,
      expected.version, new FixedClock(new Date(expected.serverTime)), expected.correlationId)).toEqual(expected);
  });
  it('validates every callable request, including unknown properties', () => {
    expect(pingRequestSchema.safeParse({ schemaVersion: 1, idempotencyKey: 'short' }).success).toBe(false);
    expect(pingRequestSchema.safeParse({ schemaVersion: 1, idempotencyKey: 'contract-key-00001', role: 'owner' }).success).toBe(false);
    expect(() => createPingResponse(null, 'dev', '0.1.0')).toThrow();
  });
  it('canonicalizes nested key ordering without changing arrays', () => {
    expect(hash(canonicalJson({ b: 1, a: { y: 2, x: 1 } }))).toBe(hash(canonicalJson({ a: { x: 1, y: 2 }, b: 1 })));
    expect(canonicalJson([2, 1])).not.toBe(canonicalJson([1, 2]));
    expect(() => canonicalJson({ missing: undefined })).toThrow();
    expect(() => canonicalJson({ infinite: Infinity })).toThrow();
  });
});
