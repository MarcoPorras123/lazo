# Lazo — Modelo de datos Firestore

Diseño inicial: 2026-10-25 · revisión: 2026-10-26 · versión inicial `schemaVersion: 1` · todas las colecciones: **diseñadas**.

El estado de implementación y las pruebas se registran en [CONTEXT.md](../CONTEXT.md). Esta especificación no autoriza acceso: en Paso 1 las reglas deniegan todas las lecturas y escrituras desde clientes. La columna «Lee» describe permisos objetivo para pasos posteriores; los servicios de servidor son los únicos escritores de operaciones.

## Convenciones

- Todo documento incluye `schemaVersion`, `createdAt: Timestamp` y `updatedAt: Timestamp`. Los registros inmutables conservan ambas fechas iguales. Toda operación lleva `tenantId`, `marketId: PE|ES` y `locationId` cuando aplica; en los contratos transversales actuales `locationId` es `string|null` y `marketId` es obligatorio. Identidad/configuración global no recibe un mercado inventado.
- Una operación registrada nunca cambia de mercado. El servidor verifica pertenencia de local y membresía; la forma de una ruta no concede autorización. El alcance lógico es tenant → mercado → local aunque las colecciones operativas se ubiquen bajo tenant.
- `Money = {amountMinor: integer, currency: PEN|EUR}`; rango seguro común ±9007199254740991, cálculos intermedios exactos. PE exige PEN; ES exige EUR. Porcentajes en puntos básicos; no importes flotantes.
- Instantes en Firestore `Timestamp` y en JSON ISO 8601 UTC con `Z`. `businessDate: YYYY-MM-DD` se calcula en `timeZone` IANA del local. Las operaciones históricas guardan copia de zona y reglas aplicadas.
- IDs compuestos se codifican o hashean desde componentes normalizados; se conservan campos de alcance para comprobarlos. No concatenar entrada arbitraria con separadores ambiguos.
- Las reglas autorizan documentos completos. Un peluquero recibe proyecciones separadas sin teléfono, email, tokens ni payloads privados. Dueño no significa lectura libre de identidades privadas.
- Paginación: 25 resultados por defecto, máximo 100, orden explícito y `startAfter` con snapshot/cursor completo; `__name__` es desempate estable. El cursor del servidor se liga a actor, tenant, mercado, filtros y orden. Cambiar filtro invalida el cursor. No usar offsets ni descargar colecciones completas.
- Una consulta collection-group necesita su propio contrato, autorización e índice antes de habilitarse. Los índices de esta versión son de ámbito COLLECTION.
- `businessRules` contiene reglas aprobadas/versionadas; la operación guarda la versión y snapshots necesarios. Remote Config no decide precios, fidelización, cancelaciones ni permisos.

## Lectores y retención

**U**: usuario dueño del documento. **C**: cliente de la operación. **P**: peluquero asignado dentro de su alcance. **D**: dueño del tenant/mercado/local autorizado. **S**: servidor autorizado. **Pub**: catálogo publicado del mercado. Todos los escritores de la tabla son servicios del servidor; los roles originan comandos, no escrituras directas.

Los siguientes plazos son propuestas técnicas, no plazos legales aprobados. No habilitar una limpieza destructiva solo por esta tabla. Antes de producción deben aprobarse por mercado, categoría y obligaciones de conservación.

| Código | Política propuesta |
|---|---|
| R1 identidad | conservar mientras exista cuenta; baja mediante eliminación/anonimización y excepciones aprobadas; sin TTL automático |
| R2 configuración | conservar versiones referenciadas por operaciones; archivar, sin modificar condiciones históricas |
| R3 operación | plazo comercial/fiscal por mercado pendiente; después anonimizar o eliminar según política; sin TTL |
| R4 efímero | vence por reloj/lógica del servidor; `cleanupAt` para limpieza TTL posterior, propuesta 7 días después de vencer |
| R5 notificación | propuesta 90 días para el centro; revocación inmediata de token inválido; confirmar antes de borrar |
| R6 integración | propuesta 90 días de payload mínimo; conservar IDs de deduplicación durante toda ventana financiera/replay |
| R7 idempotencia | código actual: `expiresAt` 90 días por defecto; cada endpoint documenta su ventana; unicidad financiera duradera aparte |
| R8 evento/job | pendientes/fallidos hasta resolución; completados archivables tras 90 días; marcas de consumidor sobreviven cualquier replay permitido |
| R9 auditoría | append-only; retención por mercado pendiente; eliminación solo por proceso privilegiado aprobado, nunca app |
| R10 agregado | regenerable desde fuentes conservadas; propuesta 24 meses, por confirmar; moneda original preservada |

TTL es limpieza asíncrona: no libera disponibilidad ni dispara tareas. Un hold vencido deja de bloquear al comparar su `expiresAt` con reloj servidor, aunque siga físicamente presente. Las marcas `processedEvents` actuales tienen `expiresAt` a 90 días; **no activar su TTL hasta definir y restringir la ventana de replay de cada consumidor**. [Referencia TTL](https://firebase.google.com/docs/firestore/ttl).

## Colecciones

Los campos siguientes se suman a los comunes. `?` indica opcional dentro del esquema concreto. «Directo» es lectura por ID; «simple» usa índice automático y cursor cuando hay lista. Las colecciones de negocio son contratos futuros; los nombres/estados no implican funcionalidad habilitada.

| Ruta | Paso | Campos clave | Lee | Escribe | Índices / paginación | Retención |
|---|---|---|---|---|---|---|
| `users/{uid}` | 3 | `uid`, `displayName`, `email?`, `phone?`, `locale`, `status`, `deletionRequestedAt?` | U; S identidad | identity | directo UID; sin listado cliente | R1 |
| `users/{uid}/devices/{deviceId}` | 8 | `platform`, `fcmToken` privado, `appEnvironment`, `lastSeenAt`, `revokedAt?` | U mediante resumen; S | notifications | simple lastSeenAt DESC | R1/R5 |
| `users/{uid}/preferences/{tenantId}` | 3/8 | `tenantId`, consentimientos por mercado/canal, `policyVersion`, `consentedAt`, `revokedAt?` | U; S | identity/notifications | directo tenant | R1 |
| `users/{uid}/notifications/{id}` | 8 | alcance, `type`, `title`, `body` mínimo, `route`, `entityId?`, `readAt?`, `expiresAt?` | U | notifications | I01; createdAt DESC | R5 |
| `tenants/{t}` | 3 | `tenantId`, `name`, `status`, `demo`, `ownerUid?`; sin datos fiscales privados | Pub si publicado; D; S | identity | directo tenant | R2 |
| `tenants/{t}/markets/{PE\|ES}` | 3 | `tenantId`, `marketId`, `currency`, `defaultTimeZone`, `enabled`, `demo` | Pub habilitado; D; S | identity | directo mercado | R2 |
| `tenants/{t}/locations/{locationId}` | 3 | alcance, `name`, `timeZone`, dirección/horario públicos, `published`, `demo` | Pub publicado; P; D | identity | I02; name ASC | R2 |
| `tenants/{t}/memberships/{uid}` | 3 | `tenantId`, `uid`, `role: customer/barber/owner`, `marketIds`, `locationIds`, `status: active/suspended/revoked`, `permissionVersion` | U resumen; D; S | identity/authorization | directo UID; I29 | R1/R9 |
| `tenants/{t}/invitations/{id}` | 3 | `tenantId`, mercados/locales otorgados, `emailHash`, `tokenHash`, `role: barber`, `status`, `expiresAt`, `acceptedUid?` | D resumen; destinatario por token verificado | identity | I30; createdAt DESC | R4; auditoría R9 |
| `tenants/{t}/staff/{staffId}` | 3 | `tenantId`, `uid`, `publicName`, `marketIds`, `locationIds`, `active`; sin perfil privado | Pub publicado; P; D | identity | I31; publicName ASC | R2/R1 |
| `tenants/{t}/staff/{staffId}/schedules/{id}` | 4 | alcance, `kind: shift/break/leave/block`, `startsAt`, `endsAt`, `timeZone`, `ruleVersion` | P propio; D; S | bookings | I03; startsAt ASC | R3 |
| `tenants/{t}/services/{serviceId}` | 4 | alcance, `name`, `durationMinutes`, `price: Money`, `businessRuleVersion`, `published`, `sortOrder`, `demo`, `priceLabel` | Pub publicado; P; D | bookings/configuración | I04; sortOrder ASC | R2 |
| `tenants/{t}/agendaDays/{market_location_staff_yyyymmdd}` | 4 | alcance, `staffId`, `businessDate`, `timeZone`, ocupación, `revision` | S; app recibe slots/proyección | bookings | directo clave completa | R3; compactación Paso 4 |
| `tenants/{t}/holds/{holdId}` | 4 | alcance, `customerId`, `staffId`, `startsAt`, `endsAt`, `expiresAt`, `cleanupAt`, `state`, precio/condiciones snapshot, `revision` | C resumen propio; S | bookings | directo; I05 para inspección | R4 |
| `tenants/{t}/bookings/{bookingId}` | 4/5 | alcance, `customerId`, `staffId`, `serviceId`, `startsAt`, `endsAt`, `businessDate`, `timeZone`, `status`, precio/condiciones snapshot, `paymentId?`, `revision` | C propio; D vía servidor; S | bookings | I06 local, I07 cliente, I08 profesional | R3 |
| `tenants/{t}/bookings/{id}/history/{eventId}` | 4/5 | alcance, `bookingId`, `eventType`, `revision`, actor mínimo, motivo/cambios permitidos, `occurredAt` | C resumen propio; D; S | bookings append-only | simple occurredAt ASC | R3 |
| `tenants/{t}/payments/{paymentId}` | 5 | alcance, `customerId`, `bookingId?`, `provider`, `providerAccountId`, `providerPaymentId`, `status`, `amount: Money`, `refundedAmount: Money`, `revision`; sin PAN/CVV | S pagos; D solo resumen/operación | payments | directo; I09 | R3 |
| `tenants/{t}/refunds/{refundId}` | 5 | alcance, `paymentId`, `providerRefundId?`, `amount: Money`, `reasonCode`, `status`, `requestedBy`, `revision` | C resumen propio; D; S | payments | I10; createdAt DESC | R3 |
| `tenants/{t}/providerEvents/{eventId}` | 5 | alcance resuelto, `provider`, `providerAccountId`, `externalEventId`, `payloadDigest`, carga mínima permitida, `receivedAt`, `verifiedAt`, `processingStatus` | S integración | integrations/payments | directo hash proveedor/cuenta/ID; I28 | R6 |
| `tenants/{t}/visits/{visitId}` | 6 | alcance, `customerId`, `staffId`, `bookingId?`, servicios, `status`, `completedAt?`, `businessDate`, `chargedAmount: Money`, `revision` | C propio; D; S; P proyección | loyalty | I11; completedAt DESC | R3 |
| `tenants/{t}/validationRequests/{visitId}` | 6 | alcance, `visitId`, `customerId`, `staffId`, `status`, `requestedAt`, `decidedAt?`, `decidedBy?`, `reasonCode?`, `ruleVersion`, `revision` | C propio; P asignado por servidor; D | loyalty | I12; createdAt ASC | R3 |
| `tenants/{t}/loyaltyPrograms/{programId}` | 6 | `tenantId`, `marketId`, `name`, `status`, `businessRuleVersion`, `validFrom`, `validUntil?` | C publicado; P; D | loyalty | simple marketId, lista acotada | R2 |
| `tenants/{t}/loyaltyAccounts/{market_program_uid}` | 6 | `tenantId`, `marketId`, `programId`, `customerId`, `starsBalance` entero, `revision` | C propio; D por servidor; P resumen mínimo | loyalty | directo; I13 | R3 |
| `tenants/{t}/loyaltyAccounts/{id}/ledger/{movementId}` | 6 | alcance origen, `accountId`, `deltaStars`, `balanceAfter`, `sourceType`, `sourceId`, `ruleVersion`, `reasonCode`, `sequence` | C propio; D; S | loyalty append-only | simple sequence DESC | R3 |
| `tenants/{t}/rewards/{rewardId}` | 6 | `tenantId`, `marketId`, `locationId?` si restringido, `customerId`, `programId`, `accountId`, `status`, condiciones snapshot, `earnedAt`, `expiresAt?`, `redeemedAt?`, `revision` | C propio; P canje autorizado; D | loyalty | I14; expiresAt ASC | R3 |
| `tenants/{t}/walletPasses/{passId}` | 7 | `tenantId`, `marketId`, `customerId`, `programId`, `provider: apple/google`, `status`, `serialOrObjectId`, `authTokenHash?`, `desiredVersion`, `syncedVersion`, `lastSyncedAt?` | C resumen propio; S | wallet | directo; I15 | R1/R6 |
| `walletRegistrations/{id}` | 7 | `tenantId`, `marketId`, `passId`, `deviceLibraryHash`, `pushToken` privado, `registeredAt`, `lastSeenAt` | S wallet | wallet, protocolo verificado | I32; lastSeenAt DESC | R1; revocar con pase/usuario |
| `tenants/{t}/waitlistRequests/{id}` | 8 | alcance, `customerId`, `serviceId`, `staffId?`, intervalo/fechas interés, `status`, `expiresAt`, consentimiento/versiones | C propio; D; S | waitlist | I16; createdAt ASC | R4/R5 |
| `tenants/{t}/slotOffers/{id}` | 8 | alcance, `waitlistRequestId`, `customerId`, `staffId`, `startsAt`, `endsAt`, `status`, `expiresAt`, `bookingId?`, `revision` | C propio; D; S | waitlist/bookings | I17; expiresAt ASC | R4; resultado R3 |
| `tenants/{t}/customerActivity/{market_uid}` | 8 | `tenantId`, `marketId`, `customerId`, `lastVisitAt?`, `nextBookingAt?`, `lastNoticeAt?`, versiones fuente | S; D agregado autorizado | notifications/proyección | directo; I33 | R1/R5 |
| `tenants/{t}/cashMovements/{id}` | 9 | alcance, `businessDate`, `timeZone`, `kind`, `amount: Money`, `paymentMethod`, `sourceType`, `sourceId`, `reversalOf?`, actor/motivo | D; P solo permiso expreso por servidor | cashbox append-only | I18; createdAt DESC | R3 |
| `tenants/{t}/cashClosures/{market_location_yyyymmdd}` | 9 | alcance, `businessDate`, `timeZone`, totales por método/moneda, `status`, `closedBy`, `closedAt`, `revision`, ajustes | D | cashbox | directo; I19 businessDate DESC | R3 |
| `tenants/{t}/reportAggregates/{id}` | 9 | alcance, `periodType`, `periodStart`, `periodEnd`, métricas enteras/moneda, `sourceVersion`, `computedAt` | D; P solo proyección aprobada | reporting | I20; periodStart DESC | R10 |
| `tenants/{t}/businessRules/{rule_version}` | 4/5/6/9 | `tenantId`, `marketId`, `locationId?`, `kind`, `version`, `status: proposed/approved/retired`, `effectiveFrom`, parámetros tipados, `approvedBy?`, `source` | S; app recibe condiciones mínimas | módulo responsable; aprobación D | I21; effectiveFrom DESC | R2 |
| `fxRates/{base_quote_yyyymmdd}` | 9 | `baseCurrency`, `quoteCurrency`, `rateNumerator`, `rateDenominator`, `rateDate`, `source`, `fetchedAt` | S reporting; D General | reporting/integrations | directo; simple rateDate DESC | R3/R10 |
| `outbox/{eventId}` | 1/todos | alcance, `eventId`, `name`, `aggregateId`, `aggregateVersion`, `payload`, `correlationId`, `occurredAt`, `status: pending/processing/completed/failed`, `attempts`, `nextAttemptAt`, `leaseUntil`, `leaseToken`, `lastErrorCode` | S despacho/operación | productor transaccional; dispatcher actualiza estado | I22 pendientes; I34 lease vencido | R8 |
| `processedEvents/{hash_consumer_eventId}` | 1/todos | alcance, `consumerId`, `eventId`, `expiresAt`; createdAt identifica procesamiento | S consumidor | consumidor junto con sus efectos | directo; TTL no habilitar sin límite de replay | R8 |
| `idempotencyKeys/{scope_key_hash}` | 1/todos | alcance, `actor: {uid,role}`, `action`, `requestHash`, `response` mínima, `correlationId`, `expiresAt` | S operación | servicio transaccional | directo; TTL expiresAt | R7 |
| `auditLogs/{id}` | 1/todos | alcance, `actor: {uid,role}`, `action`, `entityType`, `entityId`, `before`, `after`, `reason`, `correlationId`; fecha createdAt | S auditoría; D por endpoint restringido futuro | servidor create-only | I24; createdAt DESC | R9 |
| `jobs/{jobId}` | 1/todos | alcance, `jobId`, `kind: system.probe` inicial, `demo: true`, `status: pending/enqueued/completed`, `executeAt`, `correlationId`, `completedAt?` | S tareas/operación | módulo productor, runner | I23; executeAt ASC | R8 |
| `tenants/{t}/staffBookings/{bookingId}` | 4 | alcance, `staffId`, `bookingId`, `startsAt`, `endsAt`, `status`, `serviceLabel`, `customerLabel` mínimo, `revision`; sin contacto/precio privado | P asignado; D | bookings/proyección | I25; startsAt ASC | R3 minimizada |
| `tenants/{t}/staffVisits/{visitId}` | 6 | alcance, `staffId`, `visitId`, `serviceLabels`, `status`, `completedAt?`, `validationStatus`, `revision`; sin perfil/ledger privado | P asignado; D | loyalty/proyección | I26; completedAt DESC | R3 minimizada |
| `tenants/{t}/paymentSummaries/{paymentId}` | 5 | alcance, `customerId`, `paymentId`, `bookingId?`, `status`, `amount: Money`, `refundedAmount: Money`, `revision`; sin payload proveedor | C propio; D | payments/proyección | I27; createdAt DESC | R3 |

## Ajustes respecto de la propuesta inicial

1. `agendaDays` incluye mercado/local/profesional/fecha: el mismo profesional puede trabajar en más de un local o zona. `cashClosures` incluye mercado/local/fecha; `loyaltyAccounts`, mercado/programa/cliente. Los campos de alcance siguen siendo obligatorios.
2. Cada servicio pertenece a un local/mercado y tiene un precio en su moneda. Una futura familia de servicios puede vincular varias publicaciones sin compartir importe.
3. Se agregan `staffBookings`, `staffVisits` y `paymentSummaries` para evitar que una lectura operativa exponga documentos privados completos. `staff.publicName` cubre la identidad publicada; no se crea un perfil público global innecesario.
4. `providerEvents` se persiste tras verificar firma y resolver alcance. Un evento no asignable se rechaza o va a cuarentena operacional que Paso 5 debe diseñar; no se inventa mercado.
5. General es una composición del servidor de agregados por mercado; conserva moneda original e indica tipo/fecha/fuente si convierte. No modifica importes registrados.
6. El sobre de eventos actual exige tenant/mercado. Paso 3 emitirá `user.deleted` y `membership.changed` por cada alcance afectado, con clave determinista por mercado; la baja global de Auth se coordina aparte. Si se necesita un sobre global, debe versionarse antes de usarlo.

## Índices compuestos

Todos tienen `queryScope: COLLECTION`. `__name__` es el desempate implícito en la dirección del último campo ordenado; el cursor debe respetarlo. Los IDs Ixx identifican esta tabla y no son nombres asignados por Firestore.

| ID | Collection ID | Campos en orden | Consulta |
|---|---|---|---|
| I01 | notifications | `tenantId ASC, marketId ASC, createdAt DESC` | centro personal por tenant/mercado |
| I02 | locations | `marketId ASC, published ASC, name ASC` | locales publicados |
| I03 | schedules | `marketId ASC, locationId ASC, startsAt ASC` | horario profesional/local |
| I04 | services | `marketId ASC, locationId ASC, published ASC, sortOrder ASC` | catálogo local |
| I05 | holds | `marketId ASC, locationId ASC, expiresAt ASC` | inspección de holds |
| I06 | bookings | `marketId ASC, locationId ASC, startsAt ASC` | agenda local |
| I07 | bookings | `marketId ASC, customerId ASC, startsAt DESC` | reservas propias |
| I08 | bookings | `marketId ASC, staffId ASC, startsAt ASC` | consulta interna profesional |
| I09 | payments | `marketId ASC, locationId ASC, createdAt DESC` | conciliación local |
| I10 | refunds | `marketId ASC, paymentId ASC, createdAt DESC` | reembolsos de pago |
| I11 | visits | `marketId ASC, locationId ASC, completedAt DESC` | atenciones local |
| I12 | validationRequests | `marketId ASC, locationId ASC, status ASC, createdAt ASC` | cola de validación |
| I13 | loyaltyAccounts | `marketId ASC, customerId ASC, programId ASC` | cuentas cliente/mercado |
| I14 | rewards | `marketId ASC, customerId ASC, status ASC, expiresAt ASC` | premios con caducidad |
| I15 | walletPasses | `marketId ASC, customerId ASC, provider ASC` | pases propios |
| I16 | waitlistRequests | `marketId ASC, locationId ASC, status ASC, createdAt ASC` | candidatos locales |
| I17 | slotOffers | `marketId ASC, locationId ASC, status ASC, expiresAt ASC` | ofertas activas/vencidas |
| I18 | cashMovements | `marketId ASC, locationId ASC, businessDate ASC, createdAt DESC` | movimientos día local |
| I19 | cashClosures | `marketId ASC, locationId ASC, businessDate DESC` | cierres locales |
| I20 | reportAggregates | `marketId ASC, locationId ASC, periodStart DESC` | reportes local |
| I21 | businessRules | `marketId ASC, kind ASC, effectiveFrom DESC` | versiones regla |
| I22 | outbox | `status ASC, nextAttemptAt ASC` | pending listos para retry |
| I23 | jobs | `status ASC, executeAt ASC` | trabajos pendientes |
| I24 | auditLogs | `tenantId ASC, marketId ASC, createdAt DESC` | auditoría mercado |
| I25 | staffBookings | `marketId ASC, locationId ASC, staffId ASC, startsAt ASC` | agenda peluquero |
| I26 | staffVisits | `marketId ASC, locationId ASC, staffId ASC, completedAt DESC` | atenciones peluquero |
| I27 | paymentSummaries | `marketId ASC, customerId ASC, createdAt DESC` | pagos propios |
| I28 | providerEvents | `marketId ASC, processingStatus ASC, receivedAt ASC` | conciliación eventos |
| I29 | memberships | `status ASC, role ASC, createdAt DESC` | administración tenant |
| I30 | invitations | `status ASC, createdAt DESC` | invitaciones tenant |
| I31 | staff | `locationIds ARRAY_CONTAINS, active ASC, publicName ASC` | catálogo profesional de local verificado |
| I32 | walletRegistrations | `passId ASC, lastSeenAt DESC` | dispositivos del pase |
| I33 | customerActivity | `marketId ASC, lastVisitAt ASC` | segmento actividad mercado |
| I34 | outbox | `status ASC, leaseUntil ASC` | recuperar processing con lease vencido |

I20 consulta agregados de local; los de mercado se leen por ID determinista sin inventar local. I14 solo consulta premios con `expiresAt` presente: Paso 6 definirá otra consulta para premios sin caducidad. Campos opcionales ausentes no aparecen en consultas que los ordenan. I31 primero verifica el local y su mercado en servidor; no usa una localización de otro alcance.

Exenciones de indexación para mapas grandes: `outbox.payload`, `auditLogs.before`, `auditLogs.after`, `idempotencyKeys.response`, `providerEvents.payload`. Excluir campos TTL sin consultas reduce trabajo de índices; conservar índices que utilicen barridos. Nuevas consultas deben actualizar este catálogo, `firestore.indexes.json`, pruebas y CONTEXT antes de su pantalla.

## Consistencia, región y operación

Una mutación verifica alcance/estado y clave; calcula revisión; escribe entidad, auditoría, outbox y clave/respuesta en la misma transacción. Las lecturas preceden escrituras y no hay llamadas de red dentro del callback. `processedEvents` y efectos Firestore del consumidor también comparten transacción. Para pagos, Wallet, FCM y Cloud Tasks se exige además deduplicación/recuperación específica del proveedor.

Auditoría, ledger, historial y movimientos de caja son append-only. Corregir crea compensación referenciada. Admin omite reglas Firestore: los servicios y permisos operativos deben mantener las mismas restricciones. [Referencia SDK servidor y reglas](https://firebase.google.com/docs/firestore/security/rules-conditions).

Región candidata `europe-west1`, pendiente de aprobación (ADR 0007). Los proyectos dev/staging/prod reales no están creados; la configuración de emulador no demuestra residencia ni disponibilidad en nube. Separar documentos por mercado no separa ubicación física.

PITR, exportaciones diarias programadas, bucket privado de respaldo y ensayos de restauración están propuestos, no habilitados. Sus roles, política y evidencia requerida se detallan en [security.md](security.md).
