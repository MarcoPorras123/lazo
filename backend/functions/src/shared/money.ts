import { z } from 'zod';
import { DomainError } from './errors';

export const MAX_MONEY = Number.MAX_SAFE_INTEGER;
export const moneySchema = z.object({
  amountMinor: z.number().int().min(-MAX_MONEY).max(MAX_MONEY),
  currency: z.enum(['PEN', 'EUR']),
}).strict();
export type Money = Readonly<z.infer<typeof moneySchema>>;
export type RoundingMode = 'halfUp' | 'towardZero';

export function money(amountMinor: number, currency: Money['currency']): Money {
  return Object.freeze(moneySchema.parse({ amountMinor, currency }));
}

function checked(amount: bigint, currency: Money['currency']): Money {
  if (amount > BigInt(MAX_MONEY) || amount < -BigInt(MAX_MONEY)) {
    throw new DomainError('MONEY_OVERFLOW', 'El importe supera el máximo admitido.');
  }
  return money(Number(amount), currency);
}

function sameCurrency(left: Money, right: Money): void {
  moneySchema.parse(left);
  moneySchema.parse(right);
  if (left.currency !== right.currency) {
    throw new DomainError('MONEY_CURRENCY_MISMATCH', 'Los importes deben tener la misma moneda.');
  }
}

export function addMoney(left: Money, right: Money): Money {
  sameCurrency(left, right);
  return checked(BigInt(left.amountMinor) + BigInt(right.amountMinor), left.currency);
}

export function subtractMoney(left: Money, right: Money): Money {
  sameCurrency(left, right);
  return checked(BigInt(left.amountMinor) - BigInt(right.amountMinor), left.currency);
}

/** 100 basis points = 1%. Half-up ties round away from zero, including refunds. */
export function percentage(value: Money, basisPoints: number, rounding: RoundingMode): Money {
  moneySchema.parse(value);
  if (!Number.isSafeInteger(basisPoints)) throw new DomainError('BAD_REQUEST', 'Porcentaje inválido.');
  if (rounding !== 'halfUp' && rounding !== 'towardZero') {
    throw new DomainError('BAD_REQUEST', 'Indica el modo de redondeo.');
  }
  const numerator = BigInt(value.amountMinor) * BigInt(basisPoints);
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  let result = absolute / 10_000n;
  if (rounding === 'halfUp' && absolute % 10_000n >= 5_000n) result += 1n;
  return checked(sign * result, value.currency);
}

/** Explicit Lazo es-PE/es-ES product format; does not depend on host locale. */
export function formatMoney(value: Money, locale: 'es-PE' | 'es-ES' = value.currency === 'PEN' ? 'es-PE' : 'es-ES'): string {
  moneySchema.parse(value);
  if (locale !== 'es-PE' && locale !== 'es-ES') throw new DomainError('BAD_REQUEST', 'Idioma no admitido.');
  const absolute = BigInt(value.amountMinor < 0 ? -value.amountMinor : value.amountMinor);
  const whole = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimal = (absolute % 100n).toString().padStart(2, '0');
  const amount = `${value.amountMinor < 0 ? '-' : ''}${whole},${decimal}`;
  return value.currency === 'PEN' ? `S/ ${amount}` : `${amount} €`;
}
