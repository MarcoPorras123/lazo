# CONTEXT.md — Lazo

Última actualización: 2026-10-26 · Paso 1

## 1. Estado por paso
| Paso | Estado | Fecha | Evidencia | Notas |
|---|---|---|---|---|
| 1 Fundamentos | implementado | 2026-10-26 | [Verificación](docs/verification.md):116 pruebas automatizadas PASS, análisis Flutter sin incidencias, compilación/lint Functions y ping/seed integrados en emuladores | Verificación local completada. Falta aceptación completa: arranque Android/iOS, humo app/dev real y CI remoto; proyectos Firebase no creados por decisión del usuario. |
| 2 Sistema de diseño | pendiente | | | |
| 3 Identidad y mercados | pendiente | | | |
| 4 Reservas | pendiente | | | |
| 5 Pagos y cambios | pendiente | | | |
| 6 Atención y fidelización | pendiente | | | |
| 7 Apple Wallet y Google Wallet | pendiente | | | |
| 8 Notificaciones y lista de espera | pendiente | | | |
| 9 Caja y reportes | pendiente | | | |
| 10 Cierre y publicación | pendiente | | | |
Estados: pendiente · en curso · implementado · verificado (solo con evidencia).

## 2. Arquitectura vigente
Monolito modular Flutter + Firebase, con proyectos separados por entorno. UI/state Riverpod, navegación go_router; presentation/domain/data donde hay responsabilidades reales. Backend Functions v2 TypeScript/Node22 y Firestore autoritativo. Android/iOS con dev/staging/prod. No existe login real ni funcionalidad comercial en Paso 1.

Jerarquía lógica tenantId → marketId → locationId. BlackAndWhite: PE/PEN/America-Lima y ES/EUR con zona IANA propia por local. El único cruce permitido es General analítica del dueño, conservando monedas y fuente/fecha de conversión. Importes enteros; instantes UTC; fechas de negocio con zona del local. Autorización, disponibilidad, precios, descuentos, pagos, reembolsos, estrellas, canjes y caja se deciden en servidor.

[Arquitectura y máquinas de estado](docs/architecture.md) · [ADR](docs/adr/) · [Modelo completo](docs/data-model.md) · [Seguridad/IAM/backups](docs/security.md). Región candidata europe-west1, todavía sin aprobación ni recursos creados. La separación de documentos por país no garantiza residencia física.

## 3. Contratos
### 3.1 Colecciones Firestore
Todas las colecciones siguientes están diseñadas; los permisos de la tabla son el objetivo futuro. Las reglas actuales deniegan todo acceso cliente. Los escritores son módulos de servidor. Campos comunes, retención R1–R10 y paginación completa en [data-model.md](docs/data-model.md). Se añadieron proyecciones privadas/públicas separadas y claves de agenda/cierre con mercado+local.

| Ruta | Paso responsable | Campos clave | Lee | Escribe | Índices | Estado |
|---|---|---|---|---|---|---|
| `users/{uid}` | 3 | `uid`, `displayName`, `email?`, `phone?`, `locale`, `status`, `deletionRequestedAt?` | U; S identidad | identity | directo UID; sin listado cliente | diseñada |
| `users/{uid}/devices/{deviceId}` | 8 | `platform`, `fcmToken` privado, `appEnvironment`, `lastSeenAt`, `revokedAt?` | U mediante resumen; S | notifications | simple lastSeenAt DESC | diseñada |
| `users/{uid}/preferences/{tenantId}` | 3/8 | `tenantId`, consentimientos por mercado/canal, `policyVersion`, `consentedAt`, `revokedAt?` | U; S | identity/notifications | directo tenant | diseñada |
| `users/{uid}/notifications/{id}` | 8 | alcance, `type`, `title`, `body` mínimo, `route`, `entityId?`, `readAt?`, `expiresAt?` | U | notifications | I01; createdAt DESC | diseñada |
| `tenants/{t}` | 3 | `tenantId`, `name`, `status`, `demo`, `ownerUid?`; sin datos fiscales privados | Pub si publicado; D; S | identity | directo tenant | diseñada |
| `tenants/{t}/markets/{PE\|ES}` | 3 | `tenantId`, `marketId`, `currency`, `defaultTimeZone`, `enabled`, `demo` | Pub habilitado; D; S | identity | directo mercado | diseñada |
| `tenants/{t}/locations/{locationId}` | 3 | alcance, `name`, `timeZone`, dirección/horario públicos, `published`, `demo` | Pub publicado; P; D | identity | I02; name ASC | diseñada |
| `tenants/{t}/memberships/{uid}` | 3 | `tenantId`, `uid`, `role: customer/barber/owner`, `marketIds`, `locationIds`, `status: active/suspended/revoked`, `permissionVersion` | U resumen; D; S | identity/authorization | directo UID; I29 | diseñada |
| `tenants/{t}/invitations/{id}` | 3 | `tenantId`, mercados/locales otorgados, `emailHash`, `tokenHash`, `role: barber`, `status`, `expiresAt`, `acceptedUid?` | D resumen; destinatario por token verificado | identity | I30; createdAt DESC | diseñada |
| `tenants/{t}/staff/{staffId}` | 3 | `tenantId`, `uid`, `publicName`, `marketIds`, `locationIds`, `active`; sin perfil privado | Pub publicado; P; D | identity | I31; publicName ASC | diseñada |
| `tenants/{t}/staff/{staffId}/schedules/{id}` | 4 | alcance, `kind: shift/break/leave/block`, `startsAt`, `endsAt`, `timeZone`, `ruleVersion` | P propio; D; S | bookings | I03; startsAt ASC | diseñada |
| `tenants/{t}/services/{serviceId}` | 4 | alcance, `name`, `durationMinutes`, `price: Money`, `businessRuleVersion`, `published`, `sortOrder`, `demo`, `priceLabel` | Pub publicado; P; D | bookings/configuración | I04; sortOrder ASC | diseñada |
| `tenants/{t}/agendaDays/{market_location_staff_yyyymmdd}` | 4 | alcance, `staffId`, `businessDate`, `timeZone`, ocupación, `revision` | S; app recibe slots/proyección | bookings | directo clave completa | diseñada |
| `tenants/{t}/holds/{holdId}` | 4 | alcance, `customerId`, `staffId`, `startsAt`, `endsAt`, `expiresAt`, `cleanupAt`, `state`, precio/condiciones snapshot, `revision` | C resumen propio; S | bookings | directo; I05 para inspección | diseñada |
| `tenants/{t}/bookings/{bookingId}` | 4/5 | alcance, `customerId`, `staffId`, `serviceId`, `startsAt`, `endsAt`, `businessDate`, `timeZone`, `status`, precio/condiciones snapshot, `paymentId?`, `revision` | C propio; D vía servidor; S | bookings | I06 local, I07 cliente, I08 profesional | diseñada |
| `tenants/{t}/bookings/{id}/history/{eventId}` | 4/5 | alcance, `bookingId`, `eventType`, `revision`, actor mínimo, motivo/cambios permitidos, `occurredAt` | C resumen propio; D; S | bookings append-only | simple occurredAt ASC | diseñada |
| `tenants/{t}/payments/{paymentId}` | 5 | alcance, `customerId`, `bookingId?`, `provider`, `providerAccountId`, `providerPaymentId`, `status`, `amount: Money`, `refundedAmount: Money`, `revision`; sin PAN/CVV | S pagos; D solo resumen/operación | payments | directo; I09 | diseñada |
| `tenants/{t}/refunds/{refundId}` | 5 | alcance, `paymentId`, `providerRefundId?`, `amount: Money`, `reasonCode`, `status`, `requestedBy`, `revision` | C resumen propio; D; S | payments | I10; createdAt DESC | diseñada |
| `tenants/{t}/providerEvents/{eventId}` | 5 | alcance resuelto, `provider`, `providerAccountId`, `externalEventId`, `payloadDigest`, carga mínima permitida, `receivedAt`, `verifiedAt`, `processingStatus` | S integración | integrations/payments | directo hash proveedor/cuenta/ID; I28 | diseñada |
| `tenants/{t}/visits/{visitId}` | 6 | alcance, `customerId`, `staffId`, `bookingId?`, servicios, `status`, `completedAt?`, `businessDate`, `chargedAmount: Money`, `revision` | C propio; D; S; P proyección | loyalty | I11; completedAt DESC | diseñada |
| `tenants/{t}/validationRequests/{visitId}` | 6 | alcance, `visitId`, `customerId`, `staffId`, `status`, `requestedAt`, `decidedAt?`, `decidedBy?`, `reasonCode?`, `ruleVersion`, `revision` | C propio; P asignado por servidor; D | loyalty | I12; createdAt ASC | diseñada |
| `tenants/{t}/loyaltyPrograms/{programId}` | 6 | `tenantId`, `marketId`, `name`, `status`, `businessRuleVersion`, `validFrom`, `validUntil?` | C publicado; P; D | loyalty | simple marketId, lista acotada | diseñada |
| `tenants/{t}/loyaltyAccounts/{market_program_uid}` | 6 | `tenantId`, `marketId`, `programId`, `customerId`, `starsBalance` entero, `revision` | C propio; D por servidor; P resumen mínimo | loyalty | directo; I13 | diseñada |
| `tenants/{t}/loyaltyAccounts/{id}/ledger/{movementId}` | 6 | alcance origen, `accountId`, `deltaStars`, `balanceAfter`, `sourceType`, `sourceId`, `ruleVersion`, `reasonCode`, `sequence` | C propio; D; S | loyalty append-only | simple sequence DESC | diseñada |
| `tenants/{t}/rewards/{rewardId}` | 6 | `tenantId`, `marketId`, `locationId?` si restringido, `customerId`, `programId`, `accountId`, `status`, condiciones snapshot, `earnedAt`, `expiresAt?`, `redeemedAt?`, `revision` | C propio; P canje autorizado; D | loyalty | I14; expiresAt ASC | diseñada |
| `tenants/{t}/walletPasses/{passId}` | 7 | `tenantId`, `marketId`, `customerId`, `programId`, `provider: apple/google`, `status`, `serialOrObjectId`, `authTokenHash?`, `desiredVersion`, `syncedVersion`, `lastSyncedAt?` | C resumen propio; S | wallet | directo; I15 | diseñada |
| `walletRegistrations/{id}` | 7 | `tenantId`, `marketId`, `passId`, `deviceLibraryHash`, `pushToken` privado, `registeredAt`, `lastSeenAt` | S wallet | wallet, protocolo verificado | I32; lastSeenAt DESC | diseñada |
| `tenants/{t}/waitlistRequests/{id}` | 8 | alcance, `customerId`, `serviceId`, `staffId?`, intervalo/fechas interés, `status`, `expiresAt`, consentimiento/versiones | C propio; D; S | waitlist | I16; createdAt ASC | diseñada |
| `tenants/{t}/slotOffers/{id}` | 8 | alcance, `waitlistRequestId`, `customerId`, `staffId`, `startsAt`, `endsAt`, `status`, `expiresAt`, `bookingId?`, `revision` | C propio; D; S | waitlist/bookings | I17; expiresAt ASC | diseñada |
| `tenants/{t}/customerActivity/{market_uid}` | 8 | `tenantId`, `marketId`, `customerId`, `lastVisitAt?`, `nextBookingAt?`, `lastNoticeAt?`, versiones fuente | S; D agregado autorizado | notifications/proyección | directo; I33 | diseñada |
| `tenants/{t}/cashMovements/{id}` | 9 | alcance, `businessDate`, `timeZone`, `kind`, `amount: Money`, `paymentMethod`, `sourceType`, `sourceId`, `reversalOf?`, actor/motivo | D; P solo permiso expreso por servidor | cashbox append-only | I18; createdAt DESC | diseñada |
| `tenants/{t}/cashClosures/{market_location_yyyymmdd}` | 9 | alcance, `businessDate`, `timeZone`, totales por método/moneda, `status`, `closedBy`, `closedAt`, `revision`, ajustes | D | cashbox | directo; I19 businessDate DESC | diseñada |
| `tenants/{t}/reportAggregates/{id}` | 9 | alcance, `periodType`, `periodStart`, `periodEnd`, métricas enteras/moneda, `sourceVersion`, `computedAt` | D; P solo proyección aprobada | reporting | I20; periodStart DESC | diseñada |
| `tenants/{t}/businessRules/{rule_version}` | 4/5/6/9 | `tenantId`, `marketId`, `locationId?`, `kind`, `version`, `status: proposed/approved/retired`, `effectiveFrom`, parámetros tipados, `approvedBy?`, `source` | S; app recibe condiciones mínimas | módulo responsable; aprobación D | I21; effectiveFrom DESC | diseñada |
| `fxRates/{base_quote_yyyymmdd}` | 9 | `baseCurrency`, `quoteCurrency`, `rateNumerator`, `rateDenominator`, `rateDate`, `source`, `fetchedAt` | S reporting; D General | reporting/integrations | directo; simple rateDate DESC | diseñada |
| `outbox/{eventId}` | 1/todos | alcance, `eventId`, `name`, `aggregateId`, `aggregateVersion`, `payload`, `correlationId`, `occurredAt`, `status: pending/processing/completed/failed`, `attempts`, `nextAttemptAt`, `leaseUntil`, `leaseToken`, `lastErrorCode` | S despacho/operación | productor transaccional; dispatcher actualiza estado | I22 pendientes; I34 lease vencido | diseñada |
| `processedEvents/{hash_consumer_eventId}` | 1/todos | alcance, `consumerId`, `eventId`, `expiresAt`; createdAt identifica procesamiento | S consumidor | consumidor junto con sus efectos | directo; TTL no habilitar sin límite de replay | diseñada |
| `idempotencyKeys/{scope_key_hash}` | 1/todos | alcance, `actor: {uid,role}`, `action`, `requestHash`, `response` mínima, `correlationId`, `expiresAt` | S operación | servicio transaccional | directo; TTL expiresAt | diseñada |
| `auditLogs/{id}` | 1/todos | alcance, `actor: {uid,role}`, `action`, `entityType`, `entityId`, `before`, `after`, `reason`, `correlationId`; fecha createdAt | S auditoría; D por endpoint restringido futuro | servidor create-only | I24; createdAt DESC | diseñada |
| `jobs/{jobId}` | 1/todos | alcance, `jobId`, `kind: system.probe` inicial, `demo: true`, `status: pending/enqueued/completed`, `executeAt`, `correlationId`, `completedAt?` | S tareas/operación | módulo productor, runner | I23; executeAt ASC | diseñada |
| `tenants/{t}/staffBookings/{bookingId}` | 4 | alcance, `staffId`, `bookingId`, `startsAt`, `endsAt`, `status`, `serviceLabel`, `customerLabel` mínimo, `revision`; sin contacto/precio privado | P asignado; D | bookings/proyección | I25; startsAt ASC | diseñada |
| `tenants/{t}/staffVisits/{visitId}` | 6 | alcance, `staffId`, `visitId`, `serviceLabels`, `status`, `completedAt?`, `validationStatus`, `revision`; sin perfil/ledger privado | P asignado; D | loyalty/proyección | I26; completedAt DESC | diseñada |
| `tenants/{t}/paymentSummaries/{paymentId}` | 5 | alcance, `customerId`, `paymentId`, `bookingId?`, `status`, `amount: Money`, `refundedAmount: Money`, `revision`; sin payload proveedor | C propio; D | payments/proyección | I27; createdAt DESC | diseñada |

### 3.2 Funciones y endpoints
| Nombre | Tipo | Entrada | Salida | Alcance requerido | Idempotente | Estado |
|---|---|---|---|---|---|---|
| system.ping → system-ping | callable v2 | schemaVersion:1, idempotencyKey (16–128 caracteres A-Z/a-z/0-9/_/-) | schemaVersion:1, environment, version, serverTime UTC, correlationId UUID | sin sesión; App Check fuera del emulador | lectura; la misma clave no congela la hora | implementado; HTTP callable local probado; dev real pendiente |
| outbox.dispatch → outbox-dispatch | Firestore onDocumentCreated | outbox/{eventId} | interna | identidad worker | ledger consumidor+evento y efecto atómicos | implementado |
| outbox.retryPending → outbox-retryPending | programada cada minuto UTC | interna | barrido acotado | identidad worker | lease, backoff, ledger | implementado; Scheduler real pendiente |
| jobs.runDue → jobs-runDue | Task Queue privada | schemaVersion:1, jobId | void | IAM worker; solo intención DEMO persistida | por jobId, transacción | implementado; Cloud Tasks real pendiente |
| jobs.enqueuePending → jobs-enqueuePending | programada cada minuto UTC | interna | cola de pendientes | identidad worker | ID estable Cloud Tasks | implementado; servicio real pendiente |

Funciones invocables añaden Auth/App Check mediante FlutterFire. Reintentos de transporte conservan clave. Una nueva intención usa otra clave; después de error ambiguo no crear automáticamente otra. Errores exponen details {schemaVersion,code,message,correlationId}, sin stack/payload privado. Códigos: BAD_REQUEST, UNAUTHENTICATED, FORBIDDEN, IDEMPOTENCY_CONFLICT, MONEY_CURRENCY_MISMATCH, MONEY_OVERFLOW, TIME_INVALID, TIME_AMBIGUOUS, TIME_NONEXISTENT, UNAVAILABLE, INTERNAL.

Utilidades servidor: executeIdempotent escribe entidad/auditoría/outbox/clave en la misma transacción; misma petición devuelve respuesta guardada, contenido distinto rechaza. Namespace ligado a principal estable, alcance y acción, sin depender del rol mutable. requireScope verifica membresía activa y pertenencia local; Paso3 completa permisos y comprobación transaccional de revocación para comandos críticos. Retención de dedupe propuesta90 días; TTL no activado.

Money compartido: {amountMinor,currency:PEN|EUR}, máximo absoluto9007199254740991; BigInt intermedio. Formato español contractual S/ 35,00 y 35,00 €; redondeo explícito halfUp. JSON UTC ISO-Z / Firestore Timestamp. Horas inexistentes rechazadas; ambiguas requieren elegir offset temprano/tardío. Fixtures compartidos y validadores en [packages/contracts](packages/contracts/).

### 3.3 Eventos del outbox
Sobre común: schemaVersion:1, eventId, name, tenantId, marketId, locationId nullable, aggregateId, aggregateVersion, payload, occurredAt UTC, correlationId; estado/reintentos/lease de entrega separados. Payloads siguientes son contratos iniciales a validar por el módulo responsable antes de activarlos. Nunca tokens, PAN, email o payload bruto de proveedor.

| Evento | Productor | Consumidores | Carga | Clave de idempotencia | Estado |
|---|---|---|---|---|---|
| booking.confirmed | 4/5 | 8, 9 | bookingId, customerId, staffId, startsAt, endsAt, price, ruleVersion | bookingId:revision:confirmed | diseñado; productor/consumidores pendientes |
| booking.rescheduled | 4/5 | 8, 9 | bookingId, previousSlot, currentSlot, customerId | bookingId:revision:rescheduled | diseñado; productor/consumidores pendientes |
| booking.cancelled | 4/5 | 8, 9 | bookingId, customerId, releasedSlot, reasonCode | bookingId:revision:cancelled | diseñado; productor/consumidores pendientes |
| slot.released | 4/5 | 8 | staffId, startsAt, endsAt, sourceId | sourceId:revision:slot | diseñado; productor/consumidores pendientes |
| payment.succeeded | 5 | 6, 8, 9 | paymentId, bookingId?, customerId, amount:Money | paymentId:revision:succeeded | diseñado; productor/consumidores pendientes |
| payment.failed | 5 | 6, 8, 9 | paymentId, bookingId?, reasonCode | paymentId:revision:failed | diseñado; productor/consumidores pendientes |
| payment.refunded | 5 | 6, 8, 9 | paymentId, refundId, amount:Money | refundId:revision:refunded | diseñado; productor/consumidores pendientes |
| payment.disputed | 5 | 6, 8, 9 | paymentId, disputeId, status, amount:Money | disputeId:revision:disputed | diseñado; productor/consumidores pendientes |
| visit.completed | 6 | 8, 9 | visitId, bookingId?, customerId, staffId, completedAt | visitId:revision:completed | diseñado; productor/consumidores pendientes |
| validation.requested | 6 | 8, 9 | visitId, customerId, staffId, requestedAt | visitId:revision:validation | diseñado; productor/consumidores pendientes |
| visit.approved | 6 | 8, 9 | visitId, customerId, accountId, ruleVersion | visitId:revision:approved | diseñado; productor/consumidores pendientes |
| visit.rejected | 6 | 8, 9 | visitId, customerId, reasonCode | visitId:revision:rejected | diseñado; productor/consumidores pendientes |
| loyalty.updated | 6 | 7, 8, 9 | accountId, customerId, programId, balance, ledgerId | accountId:revision:updated | diseñado; productor/consumidores pendientes |
| reward.earned | 6 | 7, 8, 9 | rewardId, accountId, customerId, expiresAt? | rewardId:revision:earned | diseñado; productor/consumidores pendientes |
| reward.redeemed | 6 | 7, 8, 9 | rewardId, customerId, visitId, redeemedAt | rewardId:revision:redeemed | diseñado; productor/consumidores pendientes |
| wallet.sync.requested | 6 | 7 | passId, customerId, desiredVersion | passId:desiredVersion:sync | diseñado; productor/consumidores pendientes |
| notification.requested | todos | 8 | notificationId, recipientUid, templateId, variables mínimas, channels, route | sourceEventId:recipientUid:templateId | diseñado; productor/consumidores pendientes |
| cash.movement.requested | 5/6 | 9 | sourceType, sourceId, amount:Money, paymentMethod, businessDate | sourceType:sourceId:movementKind | diseñado; productor/consumidores pendientes |
| user.deleted | 3 | 7, 8 | uid, deletionId, affectedResources mínimos | deletionId:tenantId:marketId | diseñado; productor/consumidores pendientes |
| membership.changed | 3 | 7, 8 | uid, permissionVersion, role, status, locationIds | uid:tenantId:marketId:permissionVersion | diseñado; productor/consumidores pendientes |
| system.probe | 1 | system.probe.receipt.v1 | demo:true, source técnico | operación idempotente + índice del evento | implementado, DEMO |

El eventId técnico se deriva de la operación idempotente + posición de evento; el dominio usará las claves semánticas de la tabla. Consumidores guardan processedEvents/{hash(consumerId:eventId)} junto con efectos Firestore. Repeticiones se ignoran; revisiones obsoletas no sobrescriben estado y huecos requieren recargar fuente o reprogramar. Cada módulo completa esa política. Eventos sin consumidor registrado fallan explícitamente. Fallo final produce log ERROR OUTBOX_FAILED; falta canal Cloud Monitoring real. Efectos externos requieren deduplicación/reconciliación del proveedor. user.deleted/membership.changed se emiten por mercado afectado; no inventar alcance global dentro del sobre1.

### 3.4 Rutas de la app y enlaces verificados
| Ruta | Rol | Pantalla | Origen (app, notificación, Wallet) |
|---|---|---|---|
| / | todos | Fundamentos provisional; indicador DEMO local y selector es-PE/es-ES | app |
| /session | todos | Sesión pendiente Paso3 | app |
| /diagnostics | dev/staging únicamente | Ping y resultado tipado | app; ausente en prod |
| /client | Cliente; sesión requerida | Provisional | app |
| /staff | Peluquero; sesión requerida | Provisional | app |
| /owner | Dueño; sesión requerida | Provisional | app |

No existen enlaces universales/App Links/Wallet/notificación verificados. Ocultar/redirect de rutas solo controla UI; servidor autoriza independientemente.

### 3.5 Sistema de diseño
Tema Material3 provisional en apps/mobile/lib/app/theme.dart, color semilla #183E3B. Sin sistema visual aprobado ni activos comerciales. ARB en apps/mobile/lib/app/l10n/ para es/es_PE/es_ES. Paso2 sustituye tokens/componentes y documenta accesibilidad. Esqueleto y diagnóstico no constituyen auditoría visual final.

## 4. Reglas de negocio
| Regla | Mercado | Valor | Versión | Aprobada o propuesta | Fuente |
|---|---|---|---|---|---|
| Redondeo monetario | PE/ES | halfUp al céntimo; empate alejándose de cero; porcentaje en puntos básicos | propuesta1 | propuesta | prompt Paso1 / ADR y shared money |
| Moneda operativa | PE | PEN, importe entero | contrato1 | aprobada por alcance del proyecto | prompt Paso1 |
| Moneda operativa | ES | EUR, importe entero | contrato1 | aprobada por alcance del proyecto | prompt Paso1 |
| Reloj/reglas | PE/ES | servidor UTC; fecha/horario con IANA local | contrato1 | aprobada por alcance del proyecto | prompt Paso1 |
| Precios y servicios seed | PE/ES | ilustrativos, DEMO, no publicados | demo1 | propuesta; no precios de venta | seed-demo.ts |
| Cancelación, estrellas, canjes, impuestos, cierres | PE/ES | sin valores inventados; businessRules versionadas | pendiente | pendiente | pasos4/5/6/9 |

## 5. Registro de funcionalidades
| Funcionalidad | Implementada | Verificada (cómo) | Pendiente |
|---|---|---|---|
| Money/tiempo TypeScript | sí |41 pruebas unit/contratos del backend; incluye Madrid29/03/2026 y25/10/2026 | política comercial aprobada |
| Money/tiempo Dart | sí | suite Flutter55/55 PASS; mismos fixtures, límites, rounding, Lima/Madrid | política comercial aprobada |
| Idempotencia/auditoría/outbox | sí |14 pruebas emulador backend incl concurrencia, conflicto, rollback, duplicado, backoff, fallo, lease/desorden | alertas cloud y consumidores comerciales |
| requireScope | esqueleto cerrado | tests alcance/mercado/local | identidad/permisos finales Paso3 |
| Deferred jobs | DEMO transaccional + adaptador Tasks | test del worker/dedupe local | IAM/cola/Scheduler reales |
| Reglas Firestore/Storage | denegación por defecto |2 pruebas Firestore negativas, incluso dueño simulado | nuevas reglas por recurso Paso3; pruebas Storage futuras |
| system.ping | sí | callable HTTP emulador responde y rechaza contrato inválido | humo app/dispositivo y dev real |
| App Flutter/variantes | código y configuración | flutter analyze sin incidencias y55/55 tests unit/widget PASS | compilación/arranque nativo Android e iOS |
| Entornos | aliases DEMO, ejemplos, parámetros, guardias | arranque local; seed rechaza otro proyecto/host | crear dev/staging/prod y registrar apps |
| Seed DEMO | sí |2 ejecuciones:2 locales/8 servicios/2 eventos procesados/2 recibos; sin duplicar; rechaza producción/host remoto | nada para emulador |
| Guardias despliegue | sí |4/4 tests: aliases distintos, parámetros persistidos, cuentas por proyecto y protección prod | aprobación/configuración de recursos reales |
| CI | workflow preparado | verificación local completada; estado remoto en [GitHub Actions](https://github.com/MarcoPorras123/lazo/actions) | primera ejecución remota y compilaciones Android/macOS |
| Modelo/ADR/eventos | sí |43 colecciones,34 índices,7 ADR,21 eventos incluidos probe | mantener contratos al avanzar |

## 6. Integraciones externas
| Integración | Estado (real, sandbox, DEMO, pendiente) | Requisito faltante | Responsable |
|---|---|---|---|
| Firebase dev | pendiente | proyecto no creado; ID, región, facturación, apps, IAM y deploy | dueño + plataforma |
| Firebase staging | pendiente | proyecto no creado; config propia y App Check real | dueño + plataforma |
| Firebase prod | pendiente | proyecto no creado; config propia y controles publicación | dueño + plataforma |
| Emulator Suite | DEMO | disponible local; puertos9099/8080/5001/9199/4000 | Paso1 |
| Firebase Auth | pendiente | habilitar proveedores/reglas de alta en Paso3 | Paso3 |
| App Check | pendiente | código preparado; registrar proveedores/token dev en consola | plataforma/Paso3 |
| Crashlytics | pendiente | código staging/prod; configuración nativa, símbolos y prueba real | plataforma/Paso10 |
| Cloud Tasks/Scheduler | pendiente | cola/identidad/permisos y ejecución cloud | plataforma |
| Secret Manager | pendiente | declaración sin valor; no se necesita secreto en Paso1 | módulo futuro |
| FCM/Wallet/pagos | pendiente | proveedores, credenciales y contratos específicos | pasos5/7/8 |
| PITR/exportaciones/alertas | pendiente | políticas, canales, bucket y restauración comprobada | plataforma/dueño |
| GitHub / Actions | real / CI pendiente | repositorio público [MarcoPorras123/lazo](https://github.com/MarcoPorras123/lazo); comprobar resultados de cada ejecución | plataforma |

## 7. Decisiones pendientes y supuestos
| Tema | Supuesto vigente | Qué falta decidir | Paso afectado |
|---|---|---|---|
| Región de datos | europe-west1 solo propuesta/local | requisitos PE/ES, latencia, residencia, costes antes crear Firestore |1/10 |
| Proyectos Firebase | usuario confirmó que no existen; pidió preparar config/emuladores | IDs/cuenta/organización/facturación |1/10 |
| Apps registradas | app.lazo.mobile.dev / .staging / prod sin sufijo | titularidad/IDs finales y registro Android/iOS |1/10 |
| Locales España | Madrid solo DEMO; cada local guarda IANA real | ubicaciones reales (incluye Canarias si aplica) |3/4 |
| Política dinero | halfUp propuesto, rango común seguro | aprobación redondeo/descuentos/impuestos |4/5/9 |
| Retención y replay | expiraciones90d no activan TTL | ventanas por endpoint/proveedor, conservación y baja |3/5/7/8/9/10 |
| Datos personales de staff | proyecciones separadas diseñadas | campos mínimos permitidos por recorrido |3/4/6 |
| Reglas comerciales | sin precios/premios/cancelaciones aprobadas | configuración versionada y fuente |4/5/6/9 |
| Firma y ejecución nativa | Windows sin AndroidSDK configurado, sin Xcode | SDK/licencias/dispositivo Android; macOS/Xcode/iOS runner |1/10 |
| CI remoto | repositorio público MarcoPorras123/lazo, workflow versionado | revisar primera ejecución y corregir incidencias nativas si aparecen |1/10 |

## 8. Auditorías visuales
| Fecha | Alcance | Hallazgos abiertos (bloqueante, alta, media, baja) | Informe |
|---|---|---|---|
| 2026-10-26 | esqueleto/diagnóstico | no se realizó auditoría visual en dispositivo; pendiente Paso2 | pruebas widget no equivalen a inspección visual nativa |

## 9. Cómo ejecutar
Guía completa: [docs/deployment.md](docs/deployment.md). Node22.23.4, Java21, Flutter3.47.8/Dart3.13.7. Versiones exactas y locks; SDKs portables locales en .tools excluidos de Git.

Repositorio compartido: https://github.com/MarcoPorras123/lazo · rama principal main. Clonar con git clone https://github.com/MarcoPorras123/lazo.git. La lectura es pública; modificar requiere permiso del dueño o un pull request. README.md y CONTRIBUTING.md guían la colaboración. No se ha elegido licencia de reutilización; la visibilidad pública no debe interpretarse como concesión de una licencia abierta.

Desde raíz: npm ci; npm run lint; npm test; npm run test:scripts; npm run test:emulator. Este último levanta/cierra Auth/Firestore/Functions para pruebas backend/reglas/ping/seed. Para sesión interactiva npm run emulators. No iniciar dos suites en los mismos puertos. Si discovery es lento (por ejemplo OneDrive), FUNCTIONS_DISCOVERY_TIMEOUT=60; CI y arranque seguro ya lo configuran.

Seed local: GCLOUD_PROJECT=demo-lazo y FIRESTORE_EMULATOR_HOST=127.0.0.1:8080, luego npm run seed:demo. Rechaza nube/prod y host remoto.

Desde apps/mobile: flutter pub get --enforce-lockfile; dart run build_runner build --delete-conflicting-outputs; flutter gen-l10n; flutter analyze; flutter test.
Ejecutar Android dev: flutter run --flavor dev -t lib/main_dev.dart --dart-define-from-file=config/dev.emulator.json. iOS Simulator usa dev.emulator.ios.json. Staging/prod usan sus entradas y config/*.local.json completas; no apuntan por defecto a otro proyecto.

Prueba app real: flutter test integration_test/system_ping_test.dart --flavor dev --dart-define-from-file=config/dev.emulator.json -d <dispositivo>. Contra dev real usar config/dev.local.json con USE_FIREBASE_EMULATORS=false y App Check configurado. Estas pruebas nativas quedan pendientes de dispositivo/SDK/proyecto.

Despliegue: completar pasos/guardias de deployment.md, luego npm run deploy:checked -- dev (o staging/prod). No ejecutar con IDs demo. Nunca pegar secretos; Secret Manager y configuración por proveedor. El emulador no acredita IAM, App Check real, backups o CI verde.

## 10. Bitácora
| Fecha | Paso | Resumen | Contratos tocados |
|---|---|---|---|
| 2026-10-25 |1 | arquitectura previa al código, monorepo, ADR, fundamentos Flutter/Functions y fixtures compartidos | Money, tiempo, ping, errores, scope, idempotencia/outbox/auditoría/jobs |
| 2026-10-26 |1 | continuación tras interrupciones de herramientas; emuladores y tests backend/reglas/ping/seed comprobados; CI/documentación y contexto creados |43 colecciones,34 índices,21 eventos,6 rutas; nube pendiente confirmada por usuario |
| 2026-10-26 |1 | cierre local:116 pruebas PASS, Flutter analyze limpio; corrección aliases/params despliegue y seed completo; emuladores apagados automáticamente | ping UTC milisegundos/UUID, roles customer/barber/owner, fixtures inválidos compartidos; aceptación externa pendiente |
| 2026-10-26 |1 | publicación solicitada por el dueño: repositorio público MarcoPorras123/lazo, documentación ampliada para el socio y configuración local excluida | contratos sin cambios; README, contribución, roadmap y enlace público |
