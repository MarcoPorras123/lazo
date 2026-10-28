Paso 1 — Fundamentos: arquitectura, plataforma y contratos de datos

Rol

Actúa como un equipo senior de arquitectura de software, Flutter, Firebase, diseño de producto, seguridad y control de calidad. Ejecutas el Paso 1 de 10 del proyecto Lazo. Este prompt es autocontenido: puedes trabajar sin los demás pasos, pero tu resultado debe integrarse con ellos a través de CONTEXT.md y de los contratos que allí se registran.

Contexto común de Lazo

Lazo es una app móvil para Android e iOS de fidelización de clientes y gestión de barberías. El primer negocio es BlackAndWhite, con locales en Perú (mercado PE, moneda PEN, zona America/Lima) y España (mercado ES, moneda EUR, zona IANA real de cada local). La arquitectura admite más negocios: tenantId → marketId → locationId.

• App: Flutter y Dart estables; Riverpod para estado e inyección; go_router para navegación y redirecciones por sesión y permisos; modelos inmutables con serialización tipada; organización por funcionalidades con presentation, domain y data cuando la complejidad lo justifique.

• Servidor: Firebase Authentication, Cloud Firestore como base principal, Cloud Functions de 2.ª generación en TypeScript, FCM, Cloud Tasks y tareas programadas, Cloud Storage, Secret Manager, App Check, Crashlytics y registros estructurados. Proyectos separados dev, staging y prod. Firebase Emulator Suite para pruebas locales.

• Monolito modular: apps/mobile/lib/{app,core,features/<funcionalidad>} y backend/functions/src/{identity,authorization,bookings,payments,loyalty,wallet,notifications,waitlist,cashbox,reporting,integrations,shared}.

• Roles: Cliente, Peluquero y Dueño. El dueño es el único administrador. Los peluqueros entran por invitación. El registro público solo crea clientes.

• Invariantes que ningún paso puede romper:

  ◦ Disponibilidad, precio final, descuentos, pagos, reembolsos, estrellas, canjes, permisos y caja se deciden en el servidor. Ocultar un botón no es autorización.

  ◦ Importes como enteros en unidades mínimas más su moneda (S/ 35,00 = 3500 PEN). Nunca punto flotante para dinero.

  ◦ Instantes en UTC; horarios, fechas de negocio y cierres con la zona IANA del local.

  ◦ Toda operación que modifica datos acepta una clave de idempotencia. Los eventos de integración se guardan en un outbox junto con la operación y sus consumidores toleran duplicados y desorden.

  ◦ Perú y España nunca se mezclan, salvo en la vista General analítica del dueño.

  ◦ Toda simulación o integración incompleta se identifica visiblemente como DEMO.

  ◦ Ningún secreto en el repositorio ni en el chat.

• Fuente de verdad del proyecto: CONTEXT.md en la raíz del repositorio.

Cómo trabajar en este paso

1. Busca CONTEXT.md. En este paso normalmente no existe: lo creas tú con la plantilla de la última sección. Si ya existe, léelo completo y respeta lo registrado.

2. Inspecciona el repositorio y respeta sus convenciones y decisiones registradas en docs/adr/.

3. Antes de programar, escribe una síntesis breve del paso: archivos, colecciones, funciones, pantallas, pruebas y supuestos. Después implementa sin esperar aprobación, salvo ante decisiones comerciales no definidas o irreversibles: déjalas configurables y regístralas como pendientes.

4. Trabaja por recorridos completos que conecten interfaz, servidor, reglas y pruebas.

Objetivo de este paso

Dejar listo el esqueleto técnico completo: monorepo, entornos, app Flutter y Functions que funcionan de extremo a extremo, modelo de datos Firestore diseñado y las piezas transversales que usarán todos los pasos (dinero, tiempo, errores, idempotencia, outbox, auditoría y trabajos diferidos). No construyas funcionalidades de negocio: solo una verificación de extremo a extremo.

• Depende de: nada. Es el primer paso.

• Deja listo: estructura del repositorio, entornos, CONTEXT.md, modelo de datos, catálogo de eventos, utilidades compartidas en Dart y TypeScript, CI y datos DEMO.

1. Síntesis de arquitectura

Antes de crear código, escribe docs/architecture.md con:

• Módulos y sus límites, siguiendo las recomendaciones de arquitectura de Flutter.

• Qué decide la app y qué decide el servidor.

• Máquinas de estado en Mermaid para reserva, pago, visita, solicitud de validación, premio, oferta de horario y pase de Wallet.

• Matriz de permisos por rol (Cliente, Peluquero, Dueño) y por recurso.

• Supuestos y decisiones pendientes.

Crea ADR en docs/adr/ para: monolito modular, Firestore como base principal, funciones invocables frente a HTTP, patrón outbox, idempotencia, separación por mercado y región de datos.

2. Estructura del repositorio

apps/mobile/            app Flutter

backend/functions/      Cloud Functions en TypeScript

backend/firestore/      reglas e índices

backend/scripts/        arranque seguro, datos DEMO y migraciones

packages/contracts/     ejemplos JSON compartidos para pruebas de contrato

docs/                   arquitectura, ADR, modelo de datos, diseño, despliegue

CONTEXT.md

Los modelos TypeScript se validan con un esquema (por ejemplo, zod) y los modelos Dart son inmutables con serialización tipada. Ambos lados leen los mismos ejemplos de packages/contracts/fixtures/ en sus pruebas, para detectar cualquier divergencia de contrato.

3. Entornos

• Tres proyectos Firebase (desarrollo, staging y producción) con alias en .firebaserc.

• Variantes Flutter dev, staging y prod con identificadores de aplicación distintos en Android e iOS y configuración Firebase propia por variante.

• Parámetros de Functions por entorno y secretos declarados con Secret Manager. Incluye .env.example sin valores reales.

• App Check con proveedor de depuración solo en desarrollo.

• Crashlytics activo en staging y producción.

4. Base de la app Flutter

• app/: arranque por variante, ProviderScope, enrutador con rutas provisionales, tema provisional (lo reemplaza el Paso 2), localización es-PE y es-ES con archivos ARB y esqueleto de sesión.

• core/money: valor Money con importe entero en unidades mínimas y moneda PEN o EUR. Suma y resta solo con la misma moneda; porcentajes con modo de redondeo explícito (medio hacia arriba al céntimo como valor inicial documentado); formato por idioma (S/ 35,00 y 35,00 €).

• core/time: reloj inyectable, base de datos de zonas IANA, conversión UTC ↔ hora del local y formato. La zona del teléfono nunca decide reglas de negocio.

• core/errors: fallos tipados y traducción de códigos del servidor a mensajes que explican qué pasó y cómo continuar.

• core/networking: cliente de funciones invocables que añade clave de idempotencia, App Check, tiempos de espera y reintentos con la misma clave.

• Fija versiones estables y compatibles de Riverpod, go_router, Firebase y generación de código.

5. Base del servidor

• TypeScript estricto, linter y pruebas contra el emulador.

• shared/money y shared/time equivalentes a los de Dart, con aritmética entera.

• Validación de entrada en cada función y modelo de error común con código, mensaje y correlación.

• Registro estructurado sin datos personales innecesarios.

• Esqueleto de autorización requireScope(...), que completa el Paso 3.

• Idempotencia: idempotencyKeys/{alcance_clave} se crea en la misma transacción que la operación. Misma clave y misma petición devuelven la misma respuesta; misma clave con contenido distinto devuelve error.

• Outbox: outbox/{eventId} se escribe en la misma transacción que el cambio de negocio. Un despachador lo procesa al crearse y un barrido programado reintenta los pendientes con espera exponencial. Cada consumidor registra processedEvents/{consumidor_eventId}. Tras el límite de reintentos, el evento queda «fallido» y genera una alerta. Los eventos de Firestore pueden repetirse o llegar desordenados.

• Auditoría: auditLogs/{id}, escrito solo por el servidor y nunca modificable: autor, rol, negocio, mercado, local, acción, entidad, resumen antes y después, motivo, correlación y fecha.

• Trabajos diferidos: utilidades para colas de Cloud Tasks y funciones programadas.

• Verificación: función system.ping que devuelve entorno, versión y hora del servidor; pantalla de diagnóstico visible solo en dev y staging.

6. Modelo de datos Firestore

Documenta en docs/data-model.md cada colección con ruta, paso responsable, campos, quién lee, quién escribe, índices, paginación y retención. Esta propuesta es orientativa; ajústala y justifica los cambios:

```text
users/{uid}                                   identidad y perfil privado
users/{uid}/devices/{deviceId}                tokens de notificación
users/{uid}/preferences/{tenantId}            consentimientos y preferencias
users/{uid}/notifications/{id}                centro de notificaciones
tenants/{t}                                   negocio
tenants/{t}/markets/{PE|ES}                   moneda, zona por defecto, configuración
tenants/{t}/locations/{locationId}            local, mercado, zona IANA, horario, publicación
tenants/{t}/memberships/{uid}                 rol, mercados y locales permitidos
tenants/{t}/invitations/{id}                  invitaciones de peluqueros
tenants/{t}/staff/{staffId}                   profesional vinculado a una identidad
tenants/{t}/staff/{staffId}/schedules/{id}    horarios, descansos, vacaciones, bloqueos
tenants/{t}/services/{serviceId}              servicio por local
tenants/{t}/agendaDays/{staffId_yyyymmdd}     ocupación serializada por profesional y día
tenants/{t}/holds/{holdId}                    bloqueos temporales
tenants/{t}/bookings/{bookingId}              reserva con copia de precio y condiciones
tenants/{t}/bookings/{id}/history/{eventId}   historial de cambios
tenants/{t}/payments/{paymentId}              pagos
tenants/{t}/refunds/{refundId}                reembolsos
tenants/{t}/providerEvents/{eventId}          webhooks recibidos
tenants/{t}/visits/{visitId}                  atenciones con o sin reserva
tenants/{t}/validationRequests/{visitId}      solicitudes de estrella
tenants/{t}/loyaltyPrograms/{programId}       programas
tenants/{t}/loyaltyAccounts/{accountId}       cuenta por cliente, programa y mercado
tenants/{t}/loyaltyAccounts/{id}/ledger/{id}  movimientos de estrellas
tenants/{t}/rewards/{rewardId}                premios y canjes
tenants/{t}/walletPasses/{passId}             pases de Apple y Google
walletRegistrations/{id}                      dispositivos Apple registrados
tenants/{t}/waitlistRequests/{id}             avisos de interés
tenants/{t}/slotOffers/{id}                   ofertas de horario
tenants/{t}/customerActivity/{market_uid}     último servicio, próxima cita, último aviso
tenants/{t}/cashMovements/{id}                movimientos de caja
tenants/{t}/cashClosures/{location_yyyymmdd}  cierres diarios
tenants/{t}/reportAggregates/{id}             agregados de reportes
tenants/{t}/businessRules/{rule_version}      reglas versionadas
fxRates/{base_quote_yyyymmdd}                 tipos de cambio
outbox · processedEvents · idempotencyKeys · auditLogs · jobs
```

Reglas del modelo:

• Todo documento de operación lleva tenantId, marketId, locationId cuando aplica, schemaVersion, createdAt y updatedAt. El mercado de una operación registrada es inmutable.

• Las reglas de seguridad no filtran campos al leer: separa los datos privados en documentos distintos de los que ve el peluquero.

• Define antes que las pantallas los índices compuestos, la paginación por cursor y la retención. Usa TTL solo como limpieza (bloqueos, claves de idempotencia, eventos procesados), nunca para liberar disponibilidad.

• Las reglas de precios, fidelización y cancelación viven versionadas en businessRules, protegidas en servidor. Remote Config solo controla experiencias de interfaz.

• Documenta la región de Firestore y Functions, las copias de seguridad (recuperación a un punto en el tiempo y exportaciones programadas) y el acceso a datos. Separar documentos por país no garantiza residencia física de los datos.

7. Catálogo de eventos

Registra en CONTEXT.md la tabla de eventos con productor, consumidores, carga y clave de idempotencia. Base inicial:

Evento

Productor

Consumidores

booking.confirmed, booking.rescheduled, booking.cancelled

Pasos 4 y 5

8, 9

slot.released

Pasos 4 y 5

8

payment.succeeded, payment.failed, payment.refunded, payment.disputed

Paso 5

6, 8, 9

visit.completed, validation.requested, visit.approved, visit.rejected

Paso 6

8, 9

loyalty.updated, reward.earned, reward.redeemed

Paso 6

7, 8, 9

wallet.sync.requested

Paso 6

7

notification.requested

Todos

8

cash.movement.requested

Pasos 5 y 6

9

user.deleted, membership.changed

Paso 3

7, 8

8. Seguridad base

• Reglas Firestore con denegación por defecto.

• Cuentas de servicio con permisos mínimos por grupo de funciones; documenta los roles IAM.

• Las bibliotecas de servidor omiten las reglas de Firestore: cada función valida permisos y alcance por sí misma (referencia).

9. Integración continua y datos DEMO

• CI con análisis y pruebas de Flutter, linter y pruebas de Functions con emuladores, pruebas de reglas y compilación Android; iOS cuando haya un ejecutor macOS.

• backend/scripts/seed-demo.ts: negocio BlackAndWhite, mercados PE y ES, un local DEMO por mercado y servicios DEMO (por ejemplo, Corte clásico, Corte VIP, Barba y Exfoliación) con precios marcados como DEMO. Nunca se ejecuta en producción.

Pruebas obligatorias de este paso

• Money: suma, error con monedas distintas, porcentaje con redondeo, formato PEN y EUR e importes grandes, en Dart y en TypeScript.

• Tiempo: conversiones en Lima y en Madrid, incluidos el 29/03/2026 y el 25/10/2026 (cambios de hora en España).

• Idempotencia: misma clave devuelve el mismo resultado; misma clave con otro contenido se rechaza.

• Outbox: un evento duplicado se procesa una sola vez; un fallo se reintenta y queda «fallido» al superar el límite.

• Reglas: denegación por defecto y auditoría inmodificable desde la app.

• Contratos: Dart y TypeScript leen los mismos ejemplos.

• Prueba de humo: la app llama a system.ping en el emulador y en dev.

Fuera de alcance

Inicio de sesión real (Paso 3), sistema visual definitivo (Paso 2) y cualquier funcionalidad de negocio.

Criterios de aceptación

• La app arranca en Android e iOS en las tres variantes, cada una contra su proyecto.

• system.ping responde desde el emulador y desde dev.

• CI en verde.

• Modelo de datos, catálogo de eventos y ADR documentados.

• CONTEXT.md creado con todas sus secciones y completado con este paso.

Al terminar: crea y actualiza CONTEXT.md

Este paso no está terminado hasta que CONTEXT.md exista en la raíz y refleje lo construido. Créalo con esta estructura exacta; los pasos siguientes la mantienen y nunca borran lo que registraron otros:

```markdown
# CONTEXT.md — Lazo
Última actualización: AAAA-MM-DD · Paso N

## 1. Estado por paso
| Paso | Estado | Fecha | Evidencia | Notas |
|---|---|---|---|---|
| 1 Fundamentos | pendiente | | | |
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
Resumen breve y enlaces a docs/architecture.md y docs/adr/.

## 3. Contratos

### 3.1 Colecciones Firestore
| Ruta | Paso responsable | Campos clave | Lee | Escribe | Índices | Estado |
|---|---|---|---|---|---|---|

### 3.2 Funciones y endpoints
| Nombre | Tipo | Entrada | Salida | Alcance requerido | Idempotente | Estado |
|---|---|---|---|---|---|---|

### 3.3 Eventos del outbox
| Evento | Productor | Consumidores | Carga | Clave de idempotencia | Estado |
|---|---|---|---|---|---|

### 3.4 Rutas de la app y enlaces verificados
| Ruta | Rol | Pantalla | Origen (app, notificación, Wallet) |
|---|---|---|---|

### 3.5 Sistema de diseño
Tokens, componentes y su ubicación.

## 4. Reglas de negocio
| Regla | Mercado | Valor | Versión | Aprobada o propuesta | Fuente |
|---|---|---|---|---|---|

## 5. Registro de funcionalidades
| Funcionalidad | Implementada | Verificada (cómo) | Pendiente |
|---|---|---|---|

## 6. Integraciones externas
| Integración | Estado (real, sandbox, DEMO, pendiente) | Requisito faltante | Responsable |
|---|---|---|---|

## 7. Decisiones pendientes y supuestos
| Tema | Supuesto vigente | Qué falta decidir | Paso afectado |
|---|---|---|---|

## 8. Auditorías visuales
| Fecha | Alcance | Hallazgos abiertos (bloqueante, alta, media, baja) | Informe |
|---|---|---|---|

## 9. Cómo ejecutar
Emuladores, pruebas, variantes, datos DEMO y despliegue por entorno.

## 10. Bitácora
| Fecha | Paso | Resumen | Contratos tocados |
|---|---|---|---|
```

Completa en este paso:

• Estado por paso: Paso 1 como «implementado» o «verificado», con fecha. «Verificado» exige evidencia: prueba automatizada, captura revisada o prueba en dispositivo real.

• Arquitectura vigente: resumen y enlaces a la síntesis y a los ADR.

• Contratos: todas las colecciones del modelo con su paso responsable y estado «diseñada»; system.ping; el catálogo de eventos completo; las rutas provisionales.

• Reglas de negocio: redondeo monetario inicial como propuesta.

• Registro de funcionalidades: utilidades transversales, entornos y CI.

• Integraciones externas: proyectos Firebase creados y lo que falte configurar.

• Decisiones pendientes: región de datos y cualquier supuesto que hayas tomado.

• Cómo ejecutar: comandos de emuladores, pruebas, variantes, datos DEMO y despliegue.

• Bitácora: fecha · Paso 1 · resumen · contratos creados.

CONTEXT.md debe permitir que otra sesión continúe el proyecto sin acceso a esta conversación.
