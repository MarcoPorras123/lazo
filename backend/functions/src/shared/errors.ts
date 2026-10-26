import { HttpsError, type FunctionsErrorCode } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { ZodError } from 'zod';

export type ErrorCode =
  | 'BAD_REQUEST' | 'UNAUTHENTICATED' | 'FORBIDDEN'
  | 'IDEMPOTENCY_CONFLICT' | 'MONEY_CURRENCY_MISMATCH' | 'MONEY_OVERFLOW'
  | 'TIME_INVALID' | 'TIME_AMBIGUOUS' | 'TIME_NONEXISTENT'
  | 'UNAVAILABLE' | 'INTERNAL';

export class DomainError extends Error {
  constructor(readonly code: ErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

const transport: Record<ErrorCode, FunctionsErrorCode> = {
  BAD_REQUEST: 'invalid-argument', UNAUTHENTICATED: 'unauthenticated',
  FORBIDDEN: 'permission-denied', IDEMPOTENCY_CONFLICT: 'already-exists',
  MONEY_CURRENCY_MISMATCH: 'invalid-argument', MONEY_OVERFLOW: 'out-of-range',
  TIME_INVALID: 'invalid-argument', TIME_AMBIGUOUS: 'failed-precondition',
  TIME_NONEXISTENT: 'failed-precondition', UNAVAILABLE: 'unavailable', INTERNAL: 'internal',
};

/** Never expose raw exceptions, payloads, tokens, emails or SDK error messages. */
export function asHttpsError(error: unknown, correlationId: string): HttpsError {
  const safe = error instanceof DomainError ? error : error instanceof ZodError
    ? new DomainError('BAD_REQUEST', 'Revisa los datos y vuelve a intentarlo.')
    : new DomainError('INTERNAL', 'No pudimos completar la operación. Inténtalo otra vez.');
  logger[safe.code === 'INTERNAL' ? 'error' : 'warn']('operation.failed', {
    code: safe.code, correlationId,
  });
  return new HttpsError(transport[safe.code], safe.message, {
    schemaVersion: 1, code: safe.code, message: safe.message, correlationId,
  });
}
