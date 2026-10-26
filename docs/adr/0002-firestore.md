# ADR 0002 — Firestore como base principal

Fecha: 2026-10-25 · Estado: aceptada para Paso 1.

## Contexto

El stack solicitado usa Firebase y requiere transacciones, suscripciones y control de acceso. Reservas, pagos y ledger necesitan consistencia explícita; una consulta de disponibilidad seguida por una escritura sin transacción no basta.

## Decisión

Cloud Firestore Native es la base principal. Las operaciones críticas se realizan en servidor dentro de transacciones. La ocupación se serializa por profesional, local y fecha de negocio; los límites de tamaño, duración y contención se medirán en Paso 4. Las lecturas operativas usan proyecciones mínimas con índices definidos antes de construir pantallas.

Cada documento operativo incluye alcance y versión de esquema. Dinero entero y timestamps UTC se validan mediante esquemas TypeScript y modelos Dart. `businessRules` conserva versiones; la operación guarda su versión aplicada.

## Consecuencias

Se aceptan duplicación controlada y agregados materializados. No hay joins ni filtros de campos en reglas. El diseño de consultas condiciona el esquema; consultas no acotadas y offsets quedan prohibidos. Toda paginación usa cursor y desempate estable. TTL limpia registros vencidos pero no decide disponibilidad. No se trata Firestore como un ledger modificable por clientes.

## Alternativas

Una base relacional facilitaría algunas restricciones y reportes pero cambia el stack solicitado. Exportaciones analíticas futuras pueden complementar Firestore sin cambiar la autoridad de las operaciones.

Referencias: [transacciones](https://firebase.google.com/docs/firestore/manage-data/transactions), [TTL](https://firebase.google.com/docs/firestore/ttl).
