import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** These inputs are also read by apps/mobile tests. */
export function fixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../../packages/contracts/fixtures', name), 'utf8')) as unknown;
}
