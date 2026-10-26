# ADR 0005 — Idempotencia por intención y alcance

Fecha: 2026-10-25 · Estado: aceptada para Paso 1.

## Contexto

Móviles y colas reintentan cuando se pierde la respuesta. El usuario puede haber causado un commit aunque no lo haya visto. Una clave global sin actor/alcance podría filtrar respuestas o colisionar entre operaciones.

## Decisión

Toda mutación recibe `idempotencyKey` estable durante sus reintentos. El documento se identifica por hash de actor, operación, tenant, mercado, local y clave. Se compara un hash de JSON canónico de la petición semántica validada; campos de transporte como correlación no cambian la intención. Clave igual y petición igual devuelven respuesta persistida; petición distinta produce conflicto estable.

Registro de clave, mutación, outbox y auditoría pertinente se escriben en la misma transacción Firestore. El callback admite reejecución y prohíbe llamadas remotas. IDs de entidades/eventos deben ser deterministas por intención o generados una vez fuera del callback, sin cambiar entre reintentos transaccionales.

## Consecuencias

La retención técnica inicial implementada es 90 días por defecto, configurable por operación, y se documenta en cada endpoint. Dentro de esa ventana, el servidor respeta la respuesta guardada aun si un cliente insiste. TTL no es un temporizador preciso. Una operación financiera necesita además unicidad duradera del intento/proveedor para no volver a cobrar tras expirar la clave. Lecturas como ping no escriben claves ni prometen una hora congelada.

No se almacenan secretos en la petición de idempotencia; solo fingerprint y respuesta mínima. Los tests cubren replay, conflicto, concurrencia y rollback de efectos. Una futura modificación de canonicalización requiere compatibilidad con registros existentes.
