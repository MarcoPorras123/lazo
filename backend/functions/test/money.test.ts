import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { addMoney, formatMoney, MAX_MONEY, money, moneySchema, percentage, subtractMoney } from '../src/shared/money';
import { fixture } from './fixtures';

const examples = z.object({
  schemaVersion: z.literal(1),
  cases: z.array(z.object({ name: z.string(), money: moneySchema, formatted: z.string() })),
  percentages: z.array(z.object({ amountMinor: z.number(), currency: z.enum(['PEN', 'EUR']), basisPoints: z.number(), expectedMinor: z.number() })),
}).parse(fixture('money.json'));
const invalid = z.object({ schemaVersion: z.literal(1), cases: z.array(z.object({ name: z.string(), money: z.unknown() })) }).parse(fixture('invalid-money.json'));

describe('Money: integer contracts shared with Dart', () => {
  for (const example of examples.cases) {
    it(`formats and serializes ${example.name}`, () => {
      const value = moneySchema.parse(example.money);
      expect(formatMoney(value)).toBe(example.formatted);
      expect(JSON.parse(JSON.stringify(value))).toEqual(example.money);
    });
  }
  for (const example of examples.percentages) {
    it(`half-up ${example.amountMinor} x ${example.basisPoints} basis points`, () => {
      expect(percentage(money(example.amountMinor, example.currency), example.basisPoints, 'halfUp').amountMinor).toBe(example.expectedMinor);
    });
  }
  for (const example of invalid.cases) it(`rejects ${example.name}`, () => expect(moneySchema.safeParse(example.money).success).toBe(false));
  it('adds and subtracts same currency', () => {
    expect(addMoney(money(3500, 'PEN'), money(500, 'PEN'))).toEqual(money(4000, 'PEN'));
    expect(subtractMoney(money(3500, 'EUR'), money(500, 'EUR'))).toEqual(money(3000, 'EUR'));
  });
  it('rejects mixing markets through currency', () => {
    expect(() => addMoney(money(1, 'PEN'), money(1, 'EUR'))).toThrow('misma moneda');
    expect(() => subtractMoney(money(1, 'PEN'), money(1, 'EUR'))).toThrow('misma moneda');
  });
  it('guards overflow without first losing precision', () => {
    expect(() => addMoney(money(MAX_MONEY, 'EUR'), money(1, 'EUR'))).toThrow('máximo');
    expect(() => percentage(money(MAX_MONEY, 'EUR'), 20000, 'halfUp')).toThrow('máximo');
    expect(subtractMoney(money(MAX_MONEY, 'EUR'), money(MAX_MONEY, 'EUR'))).toEqual(money(0, 'EUR'));
  });
  it('requires explicit rounding and supports toward zero', () => {
    expect(percentage(money(-1, 'EUR'), 5000, 'towardZero')).toEqual(money(0, 'EUR'));
    expect(() => percentage(money(1, 'EUR'), 1.5, 'halfUp')).toThrow('inválido');
  });
});
