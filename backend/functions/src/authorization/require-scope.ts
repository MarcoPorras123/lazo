import type { Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { DomainError } from '../shared/errors';
import { scopeSchema, type Actor, type Scope } from '../shared/contracts';

const membershipSchema = z.object({
  tenantId: z.string(), uid: z.string(), role: z.enum(['customer', 'barber', 'owner']),
  status: z.enum(['active', 'suspended', 'revoked']),
  marketIds: z.array(z.enum(['PE', 'ES'])), locationIds: z.array(z.string()),
}).passthrough();
export interface AuthIdentity { uid: string }

/** Step 3 completes membership creation/revocation. No role is accepted from client input. */
export async function requireScope(
  db: Firestore, auth: AuthIdentity | undefined, requested: Scope,
  allowedRoles: readonly Actor['role'][],
): Promise<Actor> {
  if (!auth) throw new DomainError('UNAUTHENTICATED', 'Inicia sesión para continuar.');
  const scope = scopeSchema.parse(requested);
  const doc = await db.doc(`tenants/${scope.tenantId}/memberships/${auth.uid}`).get();
  const parsed = membershipSchema.safeParse(doc.data());
  if (!parsed.success) throw new DomainError('FORBIDDEN', 'No tienes acceso a este negocio.');
  const member = parsed.data;
  if (member.uid !== auth.uid || member.tenantId !== scope.tenantId || member.status !== 'active'
      || !allowedRoles.includes(member.role) || !member.marketIds.includes(scope.marketId)
      || (scope.locationId !== null && !member.locationIds.includes(scope.locationId))) {
    throw new DomainError('FORBIDDEN', 'No tienes permiso en este mercado o local.');
  }
  if (scope.locationId !== null) {
    const location = await db.doc(`tenants/${scope.tenantId}/locations/${scope.locationId}`).get();
    if (!location.exists || location.get('tenantId') !== scope.tenantId || location.get('marketId') !== scope.marketId) {
      throw new DomainError('FORBIDDEN', 'El local no pertenece al mercado indicado.');
    }
  }
  return Object.freeze({ uid: auth.uid, role: member.role });
}
