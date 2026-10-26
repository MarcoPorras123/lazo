import { DateTime, IANAZone } from 'luxon';
import { DomainError } from './errors';

export interface Clock { now(): Date }
export const systemClock: Clock = { now: () => new Date() };
export class FixedClock implements Clock {
  private instant: Date;
  constructor(instant: Date) { this.instant = new Date(instant); }
  now(): Date { return new Date(this.instant); }
  advance(milliseconds: number): void { this.instant = new Date(this.instant.getTime() + milliseconds); }
}

function requireZone(zone: string): void {
  if (!IANAZone.isValidZone(zone)) throw new DomainError('TIME_INVALID', 'Selecciona una zona IANA válida.');
}

export function parseUtc(iso: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(iso)) {
    throw new DomainError('TIME_INVALID', 'El instante debe usar UTC y terminar en Z.');
  }
  const value = DateTime.fromISO(iso, { zone: 'UTC' });
  if (!value.isValid) throw new DomainError('TIME_INVALID', 'La fecha no es válida.');
  return value.toJSDate();
}

export function inLocation(instant: Date | string, zone: string): DateTime {
  requireZone(zone);
  const date = typeof instant === 'string' ? parseUtc(instant) : instant;
  const value = DateTime.fromJSDate(date, { zone });
  if (!value.isValid) throw new DomainError('TIME_INVALID', 'La fecha no es válida.');
  return value;
}

/** Reject skipped local times; repeated times require an explicit earlier/later choice. */
export function localToUtc(local: string, zone: string, ambiguity: 'reject' | 'earlier' | 'later' = 'reject'): Date {
  requireZone(zone);
  if (!['reject', 'earlier', 'later'].includes(ambiguity)) {
    throw new DomainError('TIME_INVALID', 'Indica una política válida para horas repetidas.');
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(local)) {
    throw new DomainError('TIME_INVALID', 'Usa fecha y hora local sin zona ni desplazamiento.');
  }
  const value = DateTime.fromISO(local, { zone });
  if (!value.isValid) throw new DomainError('TIME_INVALID', 'La fecha no es válida.');
  if (value.toFormat("yyyy-MM-dd'T'HH:mm:ss") !== local) {
    throw new DomainError('TIME_NONEXISTENT', 'Esa hora no existe por el cambio de horario. Elige otra.');
  }
  const possible = value.getPossibleOffsets().sort((a, b) => a.toMillis() - b.toMillis());
  if (possible.length > 1 && ambiguity === 'reject') {
    throw new DomainError('TIME_AMBIGUOUS', 'Esa hora ocurre dos veces. Indica cuál deseas.');
  }
  return (ambiguity === 'later' ? possible[possible.length - 1]! : possible[0]!).toUTC().toJSDate();
}

export function businessDate(instant: Date | string, zone: string): string {
  return inLocation(instant, zone).toFormat('yyyy-MM-dd');
}

export function formatLocationTime(instant: Date | string, zone: string, locale = 'es-PE'): string {
  return inLocation(instant, zone).setLocale(locale).toFormat('dd/MM/yyyy HH:mm');
}
