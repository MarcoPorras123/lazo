import { createHash } from 'node:crypto';
import { DomainError } from './errors';

/** Stable JSON: ordering of object keys never changes idempotency semantics. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  throw new DomainError('BAD_REQUEST', 'La petición debe contener valores JSON válidos.');
}
export function hash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
