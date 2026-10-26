# Lazo — Seguridad, IAM y operación

Diseño inicial: 2026-10-25 · revisión: 2026-10-26 · Paso 1.

Este documento registra controles implementables y configuración pendiente; no certifica infraestructura real. Los proyectos Firebase todavía no existen y no se han creado cuentas de servicio, políticas IAM, canales de alerta, backups ni recursos facturables. El desarrollo local usa emuladores.

## Fronteras de confianza

1. La app es entrada no confiable. Cada comando valida esquema, identidad de Firebase Authentication, App Check cuando corresponde y alcance de la operación. IDs, roles, precios, descuentos, saldos y estados enviados por cliente no son autoridad.
2. Firestore y Storage deniegan acceso cliente por defecto en Paso 1. Las aperturas de Paso 3 y posteriores deben limitar documentos y consultas completos, añadir pruebas negativas y preservar las colecciones internas sin acceso directo.
3. El SDK Admin del servidor omite las reglas Firestore. La función exige autorización por sí misma y no debe aceptar un rol del payload. `requireScope` comprueba membresía activa, rol permitido, mercado, local y pertenencia del local. Paso 3 completa alta/revocación, permisos por recurso y la comprobación de vigencia dentro de transacciones críticas. [Referencia de Firebase](https://firebase.google.com/docs/firestore/security/rules-conditions).
4. `system.ping` es una excepción explícita sin sesión: no lee ni modifica datos de usuario, devuelve versión/entorno/hora/correlación y exige App Check fuera del emulador. No habilita un bypass para otros endpoints.
5. Jobs y consumidores tienen identidades de servicio, validan sus mensajes y vuelven a comprobar el alcance necesario. Un evento firmado o una tarea autenticada no concede por sí sola permiso para una acción de negocio.

## IAM propuesto por grupo

Crear identidades independientes por entorno. Sustituir los nombres ilustrativos por cuentas reales en parámetros `LAZO_SYSTEM_SERVICE_ACCOUNT` y `LAZO_WORKER_SERVICE_ACCOUNT`. Las cuentas de `demo-lazo` son marcadores locales; no existen en nube.

| Identidad / grupo | Permisos mínimos previstos | Alcance y límites |
|---|---|---|
| `lazo-system` — ping | sin roles de lectura/escritura Firestore, Storage, Auth, Tasks o Secret Manager | ejecutar ping no necesita datos; usar stdout estructurado; `logging.logWriter` solo si una futura implementación invoca la API de logs directamente |
| `lazo-worker` — outbox y jobs DEMO | `roles/datastore.user`; `roles/cloudtasks.enqueuer` en la cola objetivo; `roles/iam.serviceAccountUser` sobre la identidad usada para la tarea | Firebase Admin encola con la cuenta indicada; no conceder permiso para actuar como cuentas ajenas |
| identidad de invocación Tasks | permiso de invocación solo en `jobs-runDue`; para servicio Cloud Run de gen2, `roles/run.invoker`, y permiso Firebase Functions de invocación que requiera el flujo desplegado | nunca `allUsers`; verificar la política efectiva del recurso y audience/identidad de cada tarea |
| `lazo-identity` — Paso 3 | permisos Auth de usuarios estrictamente usados, más Firestore | evaluar rol personalizado; `roles/firebaseauth.admin` es un rol predefinido amplio, no asignarlo a workers generales |
| `lazo-bookings`, `lazo-loyalty`, `lazo-cashbox` — futuros | Firestore para sus operaciones; sin secretos/proveedores ajenos | la separación de cuentas reduce privilegios de APIs, pero no produce aislamiento automático por colección |
| `lazo-payments`, `lazo-wallet`, `lazo-notifications` — futuros | Firestore y acceso a secretos concretos; APIs particulares solo al grupo que las usa | `roles/secretmanager.secretAccessor` en cada secreto, no en todo el proyecto; FCM/Storage solo donde se necesiten |
| `lazo-export` — respaldo futuro | `roles/datastore.importExportAdmin`; permiso de exportación/escritura en el bucket de respaldo aprobado | cuenta separada del runtime; revisar permisos del agente de servicio Firestore que ejecuta la exportación |
| Scheduler / Eventarc | identidades de invocación/transporte administradas con permisos que necesita cada trigger | mantener service agents oficiales; no sustituirlos por Owner/Editor ni abrir workers al público |
| despliegue CI | identidad federada con permisos de despliegue de recursos aprobados y `actAs` solo de runtimes necesarios | separar de runtime; revisar roles de Cloud Functions, Cloud Run, Artifact Registry, Eventarc, Scheduler y APIs efectivamente desplegadas; no clave JSON persistente |
| auditor/soporte | lectura de logs/agregados mínimos; elevación temporal y auditada para incidentes | no acceso permanente a tokens, secretos o respaldos completos |

`roles/datastore.user` permite operaciones de datos amplias en su ámbito: **no restringe documentos por tenant, mercado o colección**. La autorización de servidor, límites de módulos, revisión y pruebas siguen siendo obligatorios. Si se exige aislamiento duro entre módulos o países, hacen falta fronteras de proyecto/base y un diseño adicional, no solo nombres de cuentas.

El flujo Firebase Task Queue exige permiso para crear tareas y para actuar como la cuenta de la tarea, además del permiso de invocar el destino. Antes de habilitarlo en nube, verificar los bindings de la cola y el servicio desplegado; no inferir éxito de permisos a partir del emulador. [Permisos de Task Queue Functions](https://firebase.google.com/docs/functions/task-functions).

## Secretos, App Check y telemetría

- Secret Manager contiene credenciales de proveedores. `defineSecret('LAZO_INTEGRATION_SECRET')` es un contrato sin valor: ninguna función del Paso 1 lo lee o necesita. Solo vincular un secreto a una función que realmente lo consume.
- No copiar secretos a repositorio, chat, logs, fixtures, capturas ni `.env.example`. Los archivos de ejemplo contienen únicamente nombres y marcadores. Usar identidad de usuario local o federación CI; no guardar credenciales de cuenta de servicio en la app.
- La configuración Firebase móvil y sus identificadores no reemplazan autorización; guardar los archivos por variante y comprobar que apuntan al proyecto correcto. Los tokens App Check de depuración se registran mediante la consola de desarrollo y nunca en staging/prod.
- App Check usa proveedor debug solo en dev; en staging/prod se registra el proveedor real de cada plataforma. Exención de emulador basada en configuración del proceso confiable, nunca un campo de petición o header elegido por cliente.
- Crashlytics en staging/prod debe registrar fallos sin contenido privado. No asociar email, teléfono, token FCM, tarjeta, documento de identidad o texto de atención a logs ni custom keys.
- Logs estructurados: nombre de acción, entorno, versión, correlación, código de error, intento y duración. IDs técnicos solo cuando se necesitan para diagnóstico; no payload bruto, request completo ni excepciones que puedan incluir secretos. Los mensajes al cliente omiten stack traces y detalles internos.

## Idempotencia, outbox y auditoría

Cada mutación autorizada conserva una clave por intención. La respuesta y fingerprint se escriben con la operación, auditoría y outbox en una transacción. El mismo alcance/actor/acción/clave con otra petición devuelve conflicto. El callback no envía emails, cobra, encola tareas ni hace otra llamada remota; puede repetirse.

El dispatcher actual usa cinco intentos por defecto, espera inicial de 5 segundos, tope de una hora y lease de 120 segundos. Un barrido recupera pendientes listos y leases vencidos. Cada consumidor aplica efectos Firestore y marca el evento en su propia transacción; las marcas conservan el progreso si otro consumidor falla. La selección de consumidores reside en el registro de código y el catálogo de CONTEXT. Actualmente solo existe el consumidor técnico `system.probe.receipt.v1`; eventos comerciales sin consumidor fallan explícitamente.

El modelo de dominio obliga a sus futuros consumidores a manejar `aggregateVersion`: ignorar revisiones obsoletas y resolver huecos recargando estado autoritativo o reprogramando. La infraestructura de outbox no inventa una política de orden para un dominio no implementado.

`processedEvents` deduplica efectos Firestore; no garantiza una sola entrega ni una sola ejecución remota. Un proveedor remoto requiere clave estable y reconciliación. Antes de habilitar TTL en marcas, fijar la edad máxima aceptable de replay y rechazar/archivar eventos anteriores. De otro modo borrar la marca permitiría repetir un efecto.

`auditLogs` se escribe con `create`, nunca `update/set/delete` desde los servicios de negocio. Guarda actor, rol, alcance, entidad, acción, motivo, resúmenes mínimos y correlación. Los resúmenes usan lista permitida y no copian documentos privados completos. Las reglas impiden que la app cree, modifique o borre auditoría; Admin y un operador privilegiado aún pueden hacerlo, por lo que inmutabilidad absoluta requeriría además almacenamiento/controles de conservación específicos.

## Alertas y recuperación

El código emite un registro de nivel ERROR con `jsonPayload.alertType="OUTBOX_FAILED"` tras agotar intentos. **El registro existe como señal; un canal de alerta en nube todavía no está configurado.** Al aprovisionar:

1. Crear alerta basada en logs con filtro de servicio/entorno y `jsonPayload.alertType="OUTBOX_FAILED"`; asignar canal y responsable real.
2. Crear alertas de errores/latencia de Functions, fallos de Scheduler, edad de outbox pendiente, tareas agotadas y fallos/ausencia de exportación.
3. Probar un fallo controlado en staging y registrar recepción de la alerta, sin usar datos personales.
4. Para recuperar un evento: identificar error y correlación, corregir consumidor/configuración, comprobar estado de efectos remotos y marcas, autorizar replay auditado preservando `eventId`. No borrar marcas para forzar reejecución.

Los jobs actuales son una prueba técnica DEMO. El worker completa una intención una sola vez dentro de Firestore y el encolado usa ID estable. La configuración Cloud Tasks reintenta fallos; el diseño de compensaciones, cancelación y alerta de agotamiento de trabajos comerciales corresponde a sus pasos responsables. El emulador no valida permisos IAM, entrega real Cloud Tasks ni tiempos de Scheduler en nube.

## Residencia, backups y restauración

La ubicación candidata es `europe-west1` para Firestore regional y Functions. Es una propuesta; antes de crear la base hay que confirmar requisitos PE/ES, latencia, presupuesto, RPO/RTO y localización de buckets/colas/respaldos. Una base no cambia su ubicación in situ. La separación lógica por mercado no garantiza residencia. [Ubicaciones Firestore](https://firebase.google.com/docs/firestore/locations).

| Control | Propuesta | Evidencia necesaria | Estado |
|---|---|---|---|
| PITR | habilitar en staging/prod al crear la base | descripción de base con estado activo y ventana disponible | pendiente |
| backup programado | política de frecuencia/retención acordada para staging/prod | política guardada y backup completado | pendiente |
| exportación independiente | diaria a bucket privado de ubicación aprobada; retención/lifecycle por acordar | operación de exportación completada y manifiesto accesible | pendiente |
| restauración | ensayo antes de producción y después de cambios de esquema críticos | base aislada restaurada, recuentos, integridad y pruebas de app | pendiente |
| control de acceso | cuentas de exportación/restauración separadas; acceso auditado | bindings revisados y prueba de acceso negativo | pendiente |

PITR habilitado permite recuperar dentro de su ventana disponible, hasta siete días según la antigüedad de activación. Registrar el timestamp más antiguo real; no asumir siete días inmediatamente después de habilitarlo. [PITR](https://firebase.google.com/docs/firestore/use-pitr).

Un job Scheduler exitoso solo prueba que inició su destino. Para afirmar que hay respaldo se debe comprobar que la **operación de exportación terminó**, revisar los objetos/manifiesto y ensayar una restauración. La documentación oficial describe los permisos de exportación y bucket; reducirlos a recursos dedicados, sin roles de Storage a nivel de proyecto. [Exportaciones programadas](https://firebase.google.com/docs/firestore/solutions/schedule-export).

Las restauraciones se hacen en recurso aislado; no sobreescribir producción durante un ensayo. Tras restaurar, no activar automáticamente triggers, pagos, notificaciones ni outbox histórico: aislar integraciones, revisar marcas/ventanas y comprobar que no se repiten efectos externos.

## Verificación de acceso y operación antes de nube

Los tests del Paso 1 deben comprobar denegación de lectura/escritura incluso con sesión simulada, auditoría inmodificable desde cliente, replay/conflicto idempotente, duplicados y agotamiento de outbox, dinero/tiempo y contratos compartidos. La evidencia ejecutada se guarda en CONTEXT; este documento no declara resultados de tests.

Para activar dev real quedan: IDs de tres proyectos, facturación y región aprobadas, APIs habilitadas, cuentas/roles, registros Android/iOS por variante, App Check real o debug dev registrado, configuración móvil propia, despliegue y humo contra dev. Para afirmar CI en verde hace falta una ejecución publicada del workflow, no solo el archivo YAML. Para afirmar arranque Android/iOS hace falta compilación y ejecución observada en simulador/dispositivo con la variante correspondiente.
