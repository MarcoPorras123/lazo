import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { executeIdempotent } from '../functions/src/shared/idempotency';

const projectId = process.env.GCLOUD_PROJECT;
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
// Both checks mandatory. No credentials fallback and no remote seeding.
if (projectId !== 'demo-lazo' || !emulatorHost || !/^(127\.0\.0\.1|localhost):\d{2,5}$/.test(emulatorHost)) {
  throw new Error('Seed rechazado: solo GCLOUD_PROJECT=demo-lazo y Firestore Emulator en loopback. Nunca producción.');
}
if (process.argv.length > 2) throw new Error('El seed no acepta otro proyecto ni flags de omisión.');
initializeApp({ projectId });
const db = getFirestore();
const tenantId = 'blackandwhite';
const definitions = [
  { marketId: 'PE' as const, currency: 'PEN', locationId: 'lima-demo', timeZone: 'America/Lima', prices: [3500, 5000, 2000, 2500] },
  { marketId: 'ES' as const, currency: 'EUR', locationId: 'madrid-demo', timeZone: 'Europe/Madrid', prices: [1800, 2800, 1000, 1200] },
];
const names = ['Corte clásico', 'Corte VIP', 'Barba', 'Exfoliación'];
const ids = ['corte-clasico', 'corte-vip', 'barba', 'exfoliacion'];
const durations = [30, 45, 15, 20]; // Ilustrativos DEMO, no promesa comercial.

async function seed(): Promise<void> {
  for (const definition of definitions) {
    const scope = { tenantId, marketId: definition.marketId, locationId: definition.locationId };
    await executeIdempotent(db, {
      actor: { uid: 'seed-demo', role: 'system' }, scope,
      action: 'system.seed', idempotencyKey: `seed-demo-v1-${definition.marketId}-0001`,
      request: { definition, names, ids, durations },
      async execute({ tx, now }) {
        const tenant = db.doc(`tenants/${tenantId}`);
        const existingTenant = await tx.get(tenant);
        const timestamps = { schemaVersion: 1, createdAt: Timestamp.fromDate(now), updatedAt: Timestamp.fromDate(now) };
        if (!existingTenant.exists) tx.create(tenant, { ...timestamps, tenantId, status: 'draft', name: 'BlackAndWhite — DEMO', demo: true });
        tx.create(db.doc(`tenants/${tenantId}/markets/${definition.marketId}`), {
          ...timestamps, tenantId, marketId: definition.marketId, currency: definition.currency,
          defaultTimeZone: definition.timeZone, enabled: false, demo: true,
        });
        tx.create(db.doc(`tenants/${tenantId}/locations/${definition.locationId}`), {
          ...timestamps, ...scope, name: `${definition.marketId === 'PE' ? 'Lima' : 'Madrid'} — DEMO`,
          timeZone: definition.timeZone, published: false, demo: true, schedule: [],
        });
        const ruleVersion = `demo-pricing-${definition.marketId}-v1`;
        tx.create(db.doc(`tenants/${tenantId}/businessRules/${ruleVersion}`), {
          ...timestamps, ...scope, kind: 'pricing', version: ruleVersion, status: 'proposed',
          effectiveFrom: Timestamp.fromDate(now), parameters: { rounding: 'halfUp' }, source: 'DEMO', demo: true,
        });
        ids.forEach((id, index) => tx.create(db.doc(`tenants/${tenantId}/services/${definition.locationId}-${id}`), {
          ...timestamps, ...scope, name: `${names[index]} — DEMO`, demo: true,
          price: { amountMinor: definition.prices[index], currency: definition.currency },
          priceLabel: 'Precio ilustrativo DEMO; no aprobado para venta', published: false,
          durationMinutes: durations[index], sortOrder: index, businessRuleVersion: ruleVersion,
        }));
        return {
          response: { demo: true, tenantId, marketId: definition.marketId, services: 4 },
          audit: { action: 'system.seed', entityType: 'locations', entityId: definition.locationId,
            before: {}, after: { demo: true, services: 4 }, reason: 'Datos locales DEMO del Paso 1' },
          events: [{ name: 'system.probe', aggregateId: `seed-demo-${definition.marketId}`, aggregateVersion: 1, payload: { demo: true, source: 'seed' } }],
        };
      },
    });
  }
  console.log('DEMO: BlackAndWhite, PE/PEN, ES/EUR, 2 locales no publicados y 8 servicios ilustrativos.');
}
void seed().then(() => db.terminate()).catch(async error => { console.error(error instanceof Error ? error.message : 'Seed failed'); await db.terminate(); process.exitCode = 1; });
