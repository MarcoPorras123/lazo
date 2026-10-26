import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { businessDate, FixedClock, formatLocationTime, inLocation, localToUtc, parseUtc } from '../src/shared/time';
import { fixture } from './fixtures';

const examples = z.object({ schemaVersion: z.literal(1), cases: z.array(z.object({
  name: z.string(), utc: z.string(), zone: z.string(), local: z.string(), offsetMinutes: z.number(),
})) }).parse(fixture('time.json'));

describe('IANA time contracts shared with Dart', () => {
  for (const example of examples.cases) it(example.name, () => {
    const local = inLocation(example.utc, example.zone);
    expect(local.toFormat("yyyy-MM-dd'T'HH:mm:ss")).toBe(example.local);
    expect(local.offset).toBe(example.offsetMinutes);
  });
  it('round-trips Lima without the host timezone', () => {
    expect(localToUtc('2026-03-29T01:30:00', 'America/Lima').toISOString()).toBe('2026-03-29T06:30:00.000Z');
    expect(businessDate('2026-03-29T03:00:00.000Z', 'America/Lima')).toBe('2026-03-28');
    expect(formatLocationTime('2026-03-29T03:00:00.000Z', 'America/Lima')).toBe('28/03/2026 22:00');
  });
  it('rejects the skipped Madrid hour on 29/03/2026', () => {
    expect(() => localToUtc('2026-03-29T02:30:00', 'Europe/Madrid')).toThrow('no existe');
  });
  it('requires disambiguation for Madrid 25/10/2026', () => {
    expect(() => localToUtc('2026-10-25T02:30:00', 'Europe/Madrid')).toThrow('dos veces');
    expect(localToUtc('2026-10-25T02:30:00', 'Europe/Madrid', 'earlier').toISOString()).toBe('2026-10-25T00:30:00.000Z');
    expect(localToUtc('2026-10-25T02:30:00', 'Europe/Madrid', 'later').toISOString()).toBe('2026-10-25T01:30:00.000Z');
  });
  it('rejects missing UTC marker, invalid date and zone', () => {
    expect(() => parseUtc('2026-03-29T03:00:00')).toThrow();
    expect(() => parseUtc('2026-02-30T03:00:00Z')).toThrow();
    expect(() => inLocation('2026-03-29T03:00:00.000Z', 'Phone/Local')).toThrow();
  });
  it('uses an injectable clock with defensive Date copies', () => {
    const clock = new FixedClock(new Date('2026-10-25T00:00:00.000Z'));
    clock.now().setFullYear(2000);
    clock.advance(1000);
    expect(clock.now().toISOString()).toBe('2026-10-25T00:00:01.000Z');
  });
});
