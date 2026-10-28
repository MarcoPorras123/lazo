# Plan de cierre del Paso 1 — Fundamentos

Creado: 2026-10-28 · Auditoría técnica de continuidad (Codex → Claude Code). Aprobado por el dueño el 2026-10-28 para los bloques A, B y C (incluida A5). El bloque D **no está autorizado**: solo se prepara su propuesta técnica ([PROPUESTA_INFRAESTRUCTURA_FIREBASE.md](PROPUESTA_INFRAESTRUCTURA_FIREBASE.md)).

Este documento es la fuente recuperable de la planificación. Cada microtarea actualiza su columna «Estado» y su evidencia al completarse.

## 1. Punto de partida verificable

- El código de app, backend y paquetes no cambió desde `300c79b`. Los commits `327a3dc`, `8bc0ea0` y `2b1ae3d` solo modifican documentación.
- Evidencia remota disponible:
  - [CI #4](https://github.com/MarcoPorras123/lazo/actions/runs/40537922488) sobre `300c79b` (main): 8/8 PASS, 119 pruebas.
  - [Humo nativo Android dev](https://github.com/MarcoPorras123/lazo/actions/runs/40611649473) sobre `300c79b`: PASS contra emuladores DEMO.
  - [CI #5](https://github.com/MarcoPorras123/lazo/actions/runs/40650160496) (`327a3dc`), [CI #6](https://github.com/MarcoPorras123/lazo/actions/runs/40652709661) (`8bc0ea0`) y [CI #7](https://github.com/MarcoPorras123/lazo/actions/runs/40656592927) (`2b1ae3d`) en `migracion/codex-a-claude`: PASS. La #7 se comprobó job a job: 8/8.
- Entorno de Claude Code Cloud: Node 22.22.0 (el repositorio fija 22.23.4) y Java disponibles; Flutter **no** instalado, por lo que la parte Flutter se valida en CI.
- Escaneo de secretos (claves API, claves privadas): sin coincidencias.

## 2. Matriz de cumplimiento frente a `docs/prompts/PASO_01_FUNDAMENTOS.md`

Leyenda: ✅ cumplido · 🟡 parcial · ⛔ bloqueado por recurso externo o decisión del dueño.

| § | Requisito | Estado | Evidencia y brecha |
|---|---|---|---|
| 1 | architecture.md: módulos, autoridad app/servidor, 7 máquinas Mermaid, matriz de permisos, supuestos | ✅ | docs/architecture.md (7 `stateDiagram-v2`) |
| 1 | 7 ADR | ✅ | docs/adr/0001–0007 |
| 2 | Estructura del monorepo y 12 módulos backend | ✅ | apps/mobile, backend/{functions,firestore,scripts}, packages/contracts |
| 2 | zod en TS, Dart inmutable tipado, fixtures compartidos | ✅ | shared/contracts.ts, json_serializable, packages/contracts/fixtures (válidos e inválidos) |
| 3 | Tres proyectos con alias en .firebaserc | 🟡⛔ | alias `demo-lazo-*`; proyectos reales no creados por decisión del dueño |
| 3 | Variantes dev/staging/prod con IDs y configuración propios | ✅ | flavors Android, schemes iOS, config/*.example.json |
| 3 | Parámetros por entorno, Secret Manager, .env.example | ✅ | shared/config.ts, backend/functions/.env.example |
| 3 | App Check con depuración solo en dev | ✅ código / ⛔ consola | apps/mobile/lib/app/bootstrap.dart |
| 3 | Crashlytics activo en staging/prod | 🟡⛔ | código preparado; sin proyecto real ni crash de prueba |
| 4 | app/: arranque, ProviderScope, rutas, tema, ARB es-PE/es-ES, sesión | ✅ | lib/app, features/session |
| 4 | core/money, time, errors, networking | ✅ | lib/core/*; CallableClient reintenta con la misma clave |
| 5 | TS estricto, linter, pruebas contra emulador | ✅ | 41 unitarias + 14 emulador |
| 5 | Validación, error común, logs sin PII, requireScope | ✅ | shared/errors.ts, authorization/require-scope.ts |
| 5 | Idempotencia, outbox (dispatch, sweep, backoff, fallido + alerta), auditoría, jobs | ✅ código / ⛔ alerta cloud | idempotency.ts, outbox.ts, audit.ts, jobs.ts; alerta = log ERROR `OUTBOX_FAILED` sin política de Monitoring |
| 5 | system.ping y diagnóstico solo en dev/staging | ✅ | functions/src/index.ts, apps/mobile/lib/app/router.dart |
| 6 | data-model.md: 43 colecciones, índices, paginación, retención, región, backups | ✅ | data-model.md, security.md, 34 índices |
| 7 | Catálogo de eventos | ✅ | CONTEXT.md §3.3, `eventNames` |
| 8 | Reglas con denegación por defecto; IAM documentado | ✅ | Firestore y Storage con pruebas negativas (B3) |
| 9 | CI (Flutter, Functions, emulador, reglas, Android, iOS) y seed DEMO | ✅ | .github/workflows/ci.yml, backend/scripts/seed-demo.ts |
| Pruebas | Money, Tiempo (29/03 y 25/10/2026), Idempotencia, Outbox, Reglas, Contratos | ✅ | docs/verification.md |
| Pruebas | Humo app → system.ping en emulador | ✅ Android e iOS | humo nativo #3 (C1) |
| Pruebas | Humo app → system.ping en dev | ⛔ | proyecto dev inexistente |

### Criterios de aceptación originales

| # | Criterio | Estado |
|---|---|---|
| 1 | La app arranca en Android e iOS en las tres variantes, cada una contra su proyecto | 🟡⛔ las 6 variantes compilan y arrancan; dev contra emuladores DEMO; staging/prod fallan cerrados sin configuración (C2). Falta arrancar contra proyectos reales (D7) |
| 2 | system.ping responde desde el emulador y desde dev | 🟡⛔ emulador sí; dev inexistente |
| 3 | CI en verde | ✅ CI #12 8/8 PASS sobre `99f52d3` |
| 4 | Modelo de datos, catálogo de eventos y ADR documentados | ✅ |
| 5 | CONTEXT.md creado y completo | ✅ migración y bloques A–C registrados |

**Conclusión:** el Paso 1 está «implementado», no «verificado». Con A, B y C completados, lo que falta de los criterios 1 y 2 depende solo del bloque D (Firebase real).

## 3. Hallazgos técnicos

| # | Severidad | Hallazgo | Microtarea |
|---|---|---|---|
| H1 | baja | `AppConfig.validate()` no rechaza `FUNCTIONS_REGION` vacío o con marcador `REPLACE_…` | B1 |
| H2 | baja | `OutboxDispatcher.sweep()` y `jobs.enqueuePending` procesan en serie: una excepción de un elemento corta el resto del barrido | B2 |
| H3 | baja | Storage rules sin prueba; `test:emulator` no levanta Storage | B3 |
| H4 | baja | docs/mobile.md exige `dart format --set-exit-if-changed`; CI no lo ejecuta | B5 |
| H5 | baja | Sin prueba de `enqueueDeferredJob` (ID estable, `task-already-exists`, estado `enqueued`) | B4 |
| H6 | documental | Estados desalineados entre CONTEXT y SESSION_HANDOFF; bitácora sin migración; escapes Markdown | A4, A5 |

## 4. Microtareas

### Bloque A — Higiene y evidencia (autorizado)

| ID | Tarea | Depende de | Criterio de aceptación | Estado |
|---|---|---|---|---|
| A1 | Sincronizar la rama local con origin (fast-forward a `2b1ae3d`) | — | `git status` al día; los 5 documentos en local | ✅ 2026-10-28, fast-forward sin conflictos |
| A2 | Confirmar CI #7 sobre `2b1ae3d` | A1 | 8/8 jobs PASS | ✅ 2026-10-28, 8/8 PASS |
| A3 | Reproducir la suite backend en el contenedor | A1 | 41 + 14 + 2 + 4 PASS, humo callable y seed PASS, o limitación documentada | ✅ 2026-10-28: 41 + 14 + 2 + 4 PASS en contenedor; humo callable y seed no ejecutables aquí (proxy, ver verification.md), cubiertos por CI #7 |
| A4 | Reconciliar el estado documental (CONTEXT, HANDOFF, bitácora) | A2 | Mismo estado en ambos; bitácora con la migración sin borrar entradas | ✅ 2026-10-28 |
| A5 | Quitar escapes Markdown de CLAUDE.md, SESSION_HANDOFF.md y PASO_01 sin cambiar el contenido | A1 | Diff solo de escapes | ✅ 2026-10-28: texto normalizado idéntico; además se agrupó en bloques de código el listado de rutas y la plantilla de CONTEXT del prompt |

### Bloque B — Brechas de código del Paso 1 (autorizado)

| ID | Tarea | Depende de | Criterio de aceptación | Estado |
|---|---|---|---|---|
| B1 | Validar `functionsRegion` en `AppConfig.validate()` con test | A2 | Test nuevo; `flutter analyze` limpio; Flutter PASS en CI | ✅ 2026-10-28 `12379a8`: Flutter 3.47.8 instalado en el contenedor, analyze limpio, 59/59 PASS |
| B2 | Aislar errores por elemento en `sweep()` y `enqueuePending` | A3 | Prueba emulador: un evento que lanza no impide procesar el siguiente; previas PASS | ✅ 2026-10-28 `d6a0409`: sweep y `enqueuePendingJobs()` aislados; emulador 18/18 |
| B3 | Prueba de Storage rules y Storage en `test:emulator` | A3 | Lectura/escritura denegadas a anónimo y roles; CI verde | ✅ 2026-10-28 `d30a5c2`: reglas 3/3; falla si las reglas se vuelven permisivas |
| B4 | Prueba del adaptador `enqueueDeferredJob` con cola simulada | A3 | Cubre ID estable, `task-already-exists`, estado `enqueued` | ✅ 2026-10-28 `d6a0409`: cola Cloud Tasks simulada |
| B5 | Comprobación `dart format` en CI | A2 | Código ya formateado; CI verde | ✅ 2026-10-28 `36b1457`: formateado `test/money_test.dart`; paso de formato PASS en CI #11 |

### Bloque C — Aceptación nativa sin nube (autorizado)

| ID | Tarea | Depende de | Criterio de aceptación | Estado |
|---|---|---|---|---|
| C1 | Job manual de humo iOS Simulator dev contra emuladores DEMO (macOS) en mobile-smoke.yml | A2 | `system_ping_test.dart` PASS en iOS Simulator; evidencia en verification.md | ✅ 2026-10-28 `d3b3bfd`: [humo nativo #3](https://github.com/MarcoPorras123/lazo/actions/runs/40661071045), job ios-dev PASS (iPhone Simulator) |
| C2 | Prueba de arranque staging/prod sin configuración real: pantalla de «configuración incompleta» sin fallo nativo | A2 | Integration test PASS. **No equivale** a arrancar contra Firebase real | ✅ 2026-10-28 `d3b3bfd`: staging y prod PASS en Android e iOS (falla cerrado en `configuration`) |

### Bloque D — Infraestructura Firebase (por etapas: D-DEV → D-STAGING → D-PROD)

Guía de la primera etapa: [GUIA_FIREBASE_DEV.md](GUIA_FIREBASE_DEV.md). Preparación sin infraestructura completada el 2026-10-28: P1 `45aa96d` (guardia por etapas), P2 `b1a7354` (token App Check solo dev), P3 `508e5c1` (latencia). P4 aplazado. Blaze y creación de recursos externos **no autorizados** todavía.

| ID | Tarea | Depende de | Criterio de aceptación | Estado |
|---|---|---|---|---|
| D1 | Aprobar región de datos (ADR 0007) | — | ADR «aceptada» | DEV: `europe-west1` aprobada por el dueño el 2026-10-28. Prod: pendiente |
| D2 | Crear proyectos por etapas (DEV primero: `lazo-dev-bw` sujeto a disponibilidad, presupuesto USD 10); actualizar .firebaserc y config local | D1 | `npm run test:scripts` PASS con IDs reales; sin secretos en Git | DEV: pendiente de autorizar Blaze y cuenta de facturación; staging/prod: después de validar DEV |
| D3 | Registrar 6 apps; App Check; Crashlytics | D2 | Crash de prueba de staging visible en consola | bloqueado |
| D4 | IAM, Cloud Tasks, Scheduler, alerta `OUTBOX_FAILED`, PITR, backups | D2 | Checklist de security.md con evidencia | bloqueado |
| D5 | Desplegar dev con `npm run deploy:checked -- dev` | D2–D4 | `smoke-ping` contra dev PASS | bloqueado: requiere autorización |
| D6 | Humo app → system.ping contra dev real en Android e iOS | D3, D5, C1 | Integration test con dev.local.json PASS en ambos | bloqueado |
| D7 | Arranque staging y prod contra sus proyectos | D3 | 4 combinaciones observadas | bloqueado |
| D8 | Paso 1 «verificado» en CONTEXT y HANDOFF | D6, D7, A–C | 5 criterios con evidencia enlazada | bloqueado |

Orden: A1 → A2 → A3 → A4/A5 → B1–B5 → C1/C2 → D cuando el dueño lo autorice.

## 5. Verificación

- Backend: desde la raíz, `npm run lint && npm test && npm run test:scripts && npm run test:emulator`.
- Flutter: jobs `flutter`, `android` e `ios` de CI.
- Nativo: workflow manual «Lazo native DEMO smoke».
- Tras cada push: CI verde en la rama y evidencia en docs/verification.md y CONTEXT.md.

## 6. Reglas

No reconstruir módulos verificados · no tocar producción ni recursos cloud · no borrar archivos sin aprobación · no avanzar al Paso 2 · no marcar «verificado» sin evidencia · no presentar un arranque con configuración incompleta como prueba contra Firebase real · actualizar docs/SESSION_HANDOFF.md al cerrar cada unidad.
