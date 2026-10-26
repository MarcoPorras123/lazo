# Migraciones

No existe migración de negocio en Paso 1. Las futuras migraciones validan proyecto/entorno, aceptan idempotencyKey, ejecutan primero un informe sin escrituras, usan lotes pequeños con cursor reanudable y registran auditoría/outbox junto a cada mutación. No sobrescribir historia ni cambiar marketId. Una exportación verificada y un plan de reversión preceden cualquier ejecución real.
