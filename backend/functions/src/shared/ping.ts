import { randomUUID } from 'node:crypto';
import { pingRequestSchema, pingResponseSchema, type PingResponse } from './contracts';
import { systemClock, type Clock } from './time';

export function createPingResponse(data: unknown, environment: string, version: string, clock: Clock = systemClock, correlationId = randomUUID()): PingResponse {
  pingRequestSchema.parse(data);
  return Object.freeze(pingResponseSchema.parse({
    schemaVersion: 1, environment, version,
    serverTime: clock.now().toISOString(), correlationId,
  }));
}
