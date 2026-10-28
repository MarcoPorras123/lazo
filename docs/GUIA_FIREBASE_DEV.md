# Guía D-DEV — Poner en marcha solo Firebase de desarrollo

Fecha: 2026-10-28 · Estado: **guía para revisión; nada ejecutado**. No se ha creado ningún proyecto ni activado facturación, desplegado servicios o generado credenciales. Complementa [PROPUESTA_INFRAESTRUCTURA_FIREBASE.md](PROPUESTA_INFRAESTRUCTURA_FIREBASE.md) y solo cubre la etapa **D-DEV**. D-STAGING y D-PROD vienen después, con su propia aprobación.

Reglas de esta etapa:
- Solo datos DEMO; ninguna información personal real.
- Ninguna clave, token, archivo `google-services.json`/`GoogleService-Info.plist` ni `.env.<proyecto>` en GitHub. Todos esos archivos ya están en `.gitignore`.
- `main` no se modifica.
- `europe-west1` es candidata **para DEV**, no una decisión para producción.

## 1. Decisiones que necesito antes de empezar

| # | Decisión | Propuesta |
|---|---|---|
| 1 | ID del proyecto DEV (único en todo Google; 6–30 caracteres; no se puede reutilizar) | `lazo-dev-<sufijo>`, por ejemplo `lazo-dev-bw`. Si está ocupado, la consola propone un sufijo |
| 2 | Cuenta de facturación (titular y medio de pago) | cuenta del dueño, exclusiva para Lazo |
| 3 | Presupuesto mensual de DEV y destinatarios de las alertas | USD 10, alertas al 50 %, 90 % y 100 % (real) y al 100 % (previsto) |
| 4 | Región de DEV | `europe-west1` (motivos en §2) |
| 5 | ¿Se puede publicar el ID del proyecto DEV en `.firebaserc`? No es secreto, pero identifica el proyecto | sí (lo exigen las guardias de despliegue) |
| 6 | ¿Desde dónde se despliega? | tu ordenador, con tu sesión de `firebase login` (sin cuentas de servicio con clave) |
| 7 | ¿Se autorizan los cambios de código preparatorios del §4? | P1 obligatorio; P2–P4 recomendados |

## 2. Región para DEV: `europe-west1`

- Es la única región candidata donde existen a la vez Firestore, Functions 2.ª gen, **Cloud Tasks** y Scheduler. Cloud Tasks no está disponible en Madrid (`europe-southwest1`) ni en Santiago (`southamerica-west1`), y `jobs-runDue` crea su cola en la región de las funciones.
- Es Tier 1 de precios y coincide con el valor que ya usan el código y la app (`LAZO_REGION`, `FUNCTIONS_REGION`). No requiere cambios.
- La ubicación de la base Firestore **no se puede cambiar**. En DEV es asumible: los datos son DEMO y la base o el proyecto se pueden recrear.
- La medición de latencia desde Lima en DEV (§6) alimentará la decisión de producción.

## 3. Costes de DEV

Plan **Blaze obligatorio** (Functions, bucket por defecto, Tasks y Scheduler). Tarifas públicas consultadas el 2026-10-28:

| Servicio | Uso esperado en DEV | Cuota sin coste | Coste estimado |
|---|---|---|---|
| Functions | 2 funciones programadas cada minuto ≈ 86 400 invocaciones/mes + pings manuales | 2 M invocaciones, 400 000 GB·s, 200 000 CPU·s al mes | 0 |
| Firestore (Standard) | barridos: unas 3 consultas/min ≈ 4 300 lecturas/día; datos DEMO mínimos | 50 000 lecturas/día, 20 000 escrituras/día, 1 GiB | 0 |
| Cloud Scheduler | 2 trabajos | 3 trabajos por cuenta de facturación | 0 si DEV es el único proyecto de la cuenta |
| Cloud Tasks | solo trabajos DEMO | 1 M operaciones/mes por cuenta de facturación | 0 |
| Cloud Storage | reglas desplegadas, sin archivos | en `europe-west1` no hay cuota gratuita | céntimos |
| Artifact Registry | imágenes de las funciones | 0,5 GB | céntimos si se configura la limpieza automática |
| Cloud Build | compilación en cada despliegue | 120 min/día | 0 |
| Logging | registros de 2 funciones por minuto | 50 GiB por proyecto | 0 |
| App Check, Crashlytics (apagado en dev) | — | sin coste | 0 |

**Estimación: menos de 1 USD al mes en reposo.** No es una garantía. Los riesgos de desviación son despliegues muy frecuentes (Build y Artifact Registry), un bucle de errores que dispare los registros o pruebas de carga.

**Control de gasto disponible:**
- **Presupuesto con alertas** (Cloud Billing → Presupuestos y alertas): avisa, **no detiene** el gasto.
- **Límites técnicos ya presentes en el código:** `maxInstances: 2` por función, reglas que deniegan todo acceso cliente y App Check obligatorio en `system-ping`.
- **Corte automático:** Google Cloud no tiene un tope nativo. Se puede montar «presupuesto → Pub/Sub → función que desactiva la facturación», pero desactivar la facturación detiene todos los servicios y puede llevar a la eliminación de recursos. No lo recomiendo para DEV: mejor alertas y el procedimiento manual del §8.

## 4. Cambios preparatorios en el repositorio (requieren tu autorización; no tocan infraestructura)

| ID | Cambio | Por qué | Obligatorio |
|---|---|---|---|
| P1 | La guardia `deployment-config.mjs` permite desplegar **dev** con staging/prod todavía sin crear. Exige: el ID del destino real; IDs reales distintos entre sí; staging requiere dev + staging; **prod sigue exigiendo los tres** y `LAZO_PRODUCTION_RELEASE`. Con pruebas | hoy la guardia exige los tres proyectos reales antes de desplegar dev, lo que contradice la estrategia por etapas | **sí** |
| P2 | En la variante dev, `APP_CHECK_DEBUG_TOKEN` opcional vía `--dart-define` para `AndroidDebugProvider`/`AppleDebugProvider(debugToken: …)`. Rechazado en staging/prod | permite pruebas repetibles contra DEV (también en CI) sin leer el token de los registros del dispositivo | recomendado |
| P3 | `backend/scripts/latency-ping.mjs`: canjea el token de depuración de App Check (API REST `exchangeDebugToken`) y llama a `system-ping` N veces. Informa p50/p95/mín/máx y el primer arranque en frío por separado. Rechaza staging/prod; lee los valores de variables de entorno, nunca del repositorio | medición de latencia desde Lima sin modificar la app ni relajar App Check | recomendado |
| P4 | Workflow manual «Lazo DEV real smoke» (Android e iOS) que lee la configuración pública y el token de depuración desde **GitHub Actions secrets** | probar iOS contra DEV sin un Mac propio | opcional; requiere crear los secretos |

Tras P1, `npm run test:scripts` debe seguir en verde con las nuevas pruebas.

## 5. Paso a paso

Leyenda: **Tú** = acción en Firebase Console, Google Cloud o tu ordenador. **Claude** = lo hago desde Claude Code Cloud. ⚠ = irreversible o con coste.

### Fase A — Cuenta, proyecto y gasto (Tú)

1. ⚠ **Cuenta de facturación.** Google Cloud Console → Facturación → crear o elegir la cuenta. Verificación: aparece «activa».
2. ⚠ **Crear el proyecto** en Firebase Console → Añadir proyecto → nombre «Lazo DEV», ID de la decisión #1. **Desactiva Google Analytics** (no se necesita en el Paso 1 y evita tratamiento de datos adicional). Verificación: el ID mostrado coincide exactamente.
3. ⚠ **Plan Blaze.** Firebase Console → ⚙ → Uso y facturación → cambiar a Blaze → vincular la cuenta de la Fase A.1.
4. **Presupuesto.** Google Cloud → Facturación → Presupuestos y alertas → crear: ámbito = solo el proyecto DEV; importe de la decisión #3; umbrales 50/90/100 % real y 100 % previsto; avisos por correo a los administradores de facturación. Verificación: el presupuesto aparece con estado activo.

### Fase B — Bases de datos y APIs (Tú)

5. ⚠ **Firestore.** Firebase Console → Firestore Database → Crear base de datos: edición **Standard**, ID `(default)`, ubicación **`europe-west1`** (regional, no `eur3`), inicio en **modo producción**. La ubicación no se puede cambiar. La protección contra borrado puede quedar desactivada en DEV.
6. **Storage.** Firebase Console → Storage → Comenzar: ubicación `europe-west1` y reglas de producción. El despliegue sustituirá las reglas por las del repositorio, que deniegan todo.
7. **APIs.** En Cloud Shell del proyecto DEV (yo preparo el comando exacto):
   `gcloud services enable cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com eventarc.googleapis.com pubsub.googleapis.com cloudscheduler.googleapis.com cloudtasks.googleapis.com firestore.googleapis.com firebaserules.googleapis.com firebasestorage.googleapis.com firebaseappcheck.googleapis.com iam.googleapis.com iamcredentials.googleapis.com logging.googleapis.com monitoring.googleapis.com`
   Secret Manager no hace falta en el Paso 1. Verificación: `gcloud services list --enabled`.

### Fase C — Identidades e IAM mínimos (Tú, con comandos que preparo yo)

8. **Cuentas de servicio sin claves:** `lazo-system` (solo `system-ping`) y `lazo-worker` (outbox y jobs). **No crear ni descargar claves JSON.**

| Identidad | Permisos propuestos en DEV | Motivo |
|---|---|---|
| `lazo-system@<id>` | `roles/logging.logWriter` | `system-ping` no lee ni escribe Firestore |
| `lazo-worker@<id>` | `roles/datastore.user`, `roles/logging.logWriter`, `roles/eventarc.eventReceiver`, `roles/cloudtasks.enqueuer`; `roles/iam.serviceAccountUser` **sobre sí misma** | outbox, barridos, encolado con identidad OIDC propia |
| `lazo-worker@<id>` | `roles/run.invoker` sobre `jobs-runDue`, `outbox-dispatch` y las 2 funciones programadas (tras el primer despliegue) | Tasks, Eventarc y Scheduler invocan con esa identidad |
| Tu usuario | Propietario del proyecto DEV + `roles/iam.serviceAccountUser` sobre ambas cuentas | desplegar funciones que se ejecutan con esas cuentas |

Algunos enlaces (invocador de Scheduler y Eventarc) dependen de cómo el CLI configure los disparadores en el primer despliegue. Se confirman entonces con los errores o las políticas efectivas y quedan registrados en `docs/security.md`. En DEV no se conceden roles amplios a las cuentas de las funciones.

### Fase D — Apps y App Check en modo desarrollo (Tú)

9. **Android:** Firebase Console → Añadir app → Android → paquete `app.lazo.mobile.dev`. Descarga `google-services.json` en `apps/mobile/android/app/src/dev/` (ignorado por Git). Para el proveedor de depuración no se necesita la huella SHA.
10. **iOS:** Añadir app → iOS → bundle `app.lazo.mobile.dev`. Descarga `GoogleService-Info.plist` en `apps/mobile/ios/config/dev/` (ignorado).
11. **Configuración local de la app:** copia `apps/mobile/config/dev.example.json` a `dev.local.json` (ignorado) y rellena: `FIREBASE_PROJECT_ID`, `FUNCTIONS_REGION=europe-west1`, `FIREBASE_API_KEY`, `FIREBASE_ANDROID_APP_ID`, `FIREBASE_IOS_APP_ID`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_STORAGE_BUCKET`, con `USE_FIREBASE_EMULATORS=false`. Son identificadores públicos del SDK, pero según tu regla no van a GitHub.
12. **Restringir la clave de API** (Google Cloud → APIs y servicios → Credenciales): limitarla a las apps Android/iOS registradas y a las APIs de Firebase usadas.
13. **App Check (modo desarrollo):**
    - Firebase Console → App Check → registrar ambas apps.
    - Si la consola exige un proveedor antes de gestionar tokens de depuración: en Android, Play Integrity con la SHA-256 de tu keystore de depuración; en iOS, App Attest, que requiere el Team ID de una cuenta Apple Developer. Es un punto a confirmar en la consola: si no tienes cuenta Apple, iOS contra DEV queda bloqueado en ese punto.
    - Al ejecutar la app dev, el SDK escribe un **token de depuración** en logcat o en la consola de Xcode. Regístralo en App Check → app → Gestionar tokens de depuración. Con P2 puedes fijar tú el token.
    - **El token es secreto:** ni repositorio ni chat. Revócalo si se expone.
    - No activar la aplicación obligatoria de App Check para Firestore/Storage en DEV (las reglas ya deniegan todo). `system-ping` ya la exige por código.

### Fase E — Despliegue (Tú en tu ordenador; Claude prepara)

14. **Claude**, tras tu autorización: P1, la entrada `dev` de `.firebaserc` con el ID real y las plantillas exactas de los dos archivos locales siguientes.
15. **Tú** creas, sin subirlos:
    - `config/deployment.local.json` con `projects.dev` = ID real, `dataRegionApproved: true` (significa «aprobada **para DEV**»), `firestoreLocation` y `functionsRegion` = `europe-west1`, y `appCheckConfigured`/`iamConfigured` en `true` solo cuando estén hechos de verdad.
    - `backend/functions/.env.<ID-DEV>` con `LAZO_ENV=dev`, `LAZO_REGION=europe-west1`, `LAZO_VERSION=0.1.0` y las dos cuentas `@<ID-DEV>.iam.gserviceaccount.com`.
16. ⚠ **Desplegar:** `firebase login`, `npm ci` y `npm run deploy:checked -- dev`. En Windows u OneDrive, `FUNCTIONS_DISCOVERY_TIMEOUT=60`. Si el CLI pregunta por la limpieza de Artifact Registry, acepta 1 día.
17. **Verificación del despliegue:**
    - 5 funciones en `europe-west1`.
    - 2 trabajos de Scheduler.
    - Cola `jobs-runDue` en Cloud Tasks.
    - Reglas Firestore/Storage del repositorio.
    - Índices en construcción o listos.
    - Registros de `outbox-retryPending` cada minuto sin errores.

Desde Claude Code Cloud **no** puedo desplegar: no tengo credenciales de Google Cloud (no las has autorizado) y la red del contenedor no está pensada para operar tu nube. Más adelante podría hacerlo un workflow de GitHub con Workload Identity Federation (sin claves), como etapa aparte que también requeriría tu aprobación.

### Fase F — Pruebas reales (Tú y Claude)

18. **`system.ping` desde la app contra DEV real (Android):**
    `flutter test integration_test/system_ping_test.dart --flavor dev --dart-define-from-file=config/dev.local.json -d <dispositivo>`
    Con P2 añade el token de depuración como `--dart-define`. Criterio: «All tests passed!» y en los registros de la función `verifications.app = VALID`.
19. **iOS contra DEV real:** en un Mac propio con la misma orden, o con P4 en CI (macOS) usando secretos. Criterio: el mismo.
20. **Prueba negativa:** sin token de depuración registrado, la llamada debe rechazarse (App Check obligatorio).
21. **Latencia desde Lima** (P3, en tu ordenador en Lima): 1 llamada en frío registrada aparte, después 50 llamadas en caliente. Registrar p50/p95/mín/máx, fecha y tipo de conexión. Como referencia opcional, el mismo script desde un runner de GitHub (EE. UU.).
22. **Alerta `OUTBOX_FAILED`:** Monitoring → alerta basada en registros con filtro `jsonPayload.alertType="OUTBOX_FAILED"` y canal de correo. La prueba de disparo queda para staging (§4 de security.md) salvo que la quieras también en DEV.
23. **Claude** registra la evidencia (enlaces, resultados y límites) en `docs/verification.md`, `CONTEXT.md` y el plan de cierre, y actualiza `docs/security.md` con los permisos IAM efectivos.

**Criterio de cierre de D-DEV:** pasos 17, 18 y 20 en verde; 19 en verde o bloqueado con el motivo documentado; latencia medida; presupuesto activo; ningún secreto en Git. El Paso 1 sigue «implementado» hasta completar también staging y prod (criterio 1 del prompt original).

## 6. Qué haces tú y qué automatizo yo

| Tarea | Tú | Claude Code Cloud |
|---|---|---|
| Facturación, proyecto, Blaze, presupuesto | ✔ | guía y revisión |
| Firestore, Storage, APIs, IAM | ✔ (consola/Cloud Shell) | comandos exactos y verificación posterior |
| Registro de apps, archivos de configuración, App Check, tokens | ✔ | plantillas y comprobación de que nada entra en Git |
| P1–P4 (código, pruebas, workflow) | autorizar | ✔ implementar, probar y subir a la rama |
| `.firebaserc` con el ID DEV | autorizar | ✔ |
| Despliegue | ✔ (`npm run deploy:checked -- dev`) | revisar la salida que me compartas, sin secretos |
| Prueba Android contra DEV | ✔ (tu dispositivo o emulador) | ✔ en CI si autorizas P2 + P4 y los secretos |
| Prueba iOS contra DEV | Mac propio o autorizar P4 | ✔ en CI con P4 |
| Medición desde Lima | ✔ (ejecutar P3) | ✔ análisis y registro |
| Documentación y evidencia | — | ✔ |

## 7. Archivos que nunca deben ir a GitHub

`google-services.json`, `GoogleService-Info.plist`, `apps/mobile/config/*.local.json`, `config/deployment.local.json`, `backend/functions/.env.<proyecto>`, tokens de depuración de App Check, claves de cuentas de servicio y capturas que muestren alguno de ellos. Antes de cada commit compruebo `git status` y `git check-ignore`.

## 8. Recuperación ante errores

| Problema | Acción |
|---|---|
| El despliegue falla por API no habilitada o permiso | leer el error, habilitar la API o el rol indicado y repetir `deploy:checked` (es repetible) |
| Una función queda mal desplegada | volver a desplegar el commit anterior verificado o borrar esa función con `firebase functions:delete <nombre> --project <ID-DEV>` |
| Ubicación de Firestore equivocada | no se puede mover: en DEV, borrar la base (datos DEMO) y crearla de nuevo, o crear otro proyecto. Por esto el paso 5 se revisa antes de confirmar |
| Token de depuración o archivo de configuración expuesto | revocar el token en App Check, restringir o rotar la clave de API, y retirar el archivo del historial si llegó a un commit |
| Alerta de presupuesto | pausar los trabajos de Scheduler (`gcloud scheduler jobs pause …`), revisar Facturación → Informes y, si hace falta, borrar las funciones |
| Gasto descontrolado o abuso | desactivar la facturación del proyecto (detiene todos los servicios) |
| Abandonar DEV | borrar el proyecto: queda 30 días en eliminación pendiente y su ID no se puede reutilizar |

Fuentes de precios y disponibilidad: [Firebase pricing](https://firebase.google.com/pricing), [Cloud Scheduler pricing](https://cloud.google.com/scheduler/pricing), [Cloud Tasks pricing](https://cloud.google.com/tasks/pricing), [ubicaciones Cloud Tasks](https://docs.cloud.google.com/tasks/docs/locations), [ubicaciones Firestore](https://firebase.google.com/docs/firestore/locations), [ubicaciones Functions](https://firebase.google.com/docs/functions/locations).
