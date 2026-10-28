# Evidencia de verificación — Paso 1

Actualizado: 2026-10-28 · Paso 1. La tabla siguiente conserva la evidencia local del 26/10/2026 en Windows: SDK Flutter3.47.8/Dart3.13.7, Node22.23.4, Java21.0.12.1, Firebase CLI15.34.1. Más abajo se registran las ejecuciones remotas de GitHub Actions. No se ejecutó un despliegue cloud. Los proyectos Firebase todavía no existen.

## Verificación local

| Comprobación | Ejecución y resultado | Límite de la evidencia |
|---|---|---|
| Functions compilación | `npm run build`: exit0, TypeScript estricto | no acredita despliegue |
| Functions lint | `npm run lint`: exit0 | ESLint del servidor |
| Functions unit/contratos | `npm test`: **41/41 PASS** (Money19, tiempo11, contratos11) | fixtures compartidos, sin proveedor externo |
| Functions Firestore integración | `npm run test:emulator --workspace @lazo/functions`: **14/14 PASS** | proyecto aislado demo-lazo-functions-tests |
| Firestore Rules | `npm run test:rules`: **2/2 PASS** | anónimo/tres roles, lectura/escritura denegada; auditoría no creable/modificable/borrable por cliente |
| Guardias despliegue | `npm run test:scripts`: **4/4 PASS** | IDs distintos, coincidencia completa, parámetros persistidos, cuentas correctas y confirmación prod |
| Callable real emulado | `npm run smoke:emulator`: PASS | system-ping devuelve dev/version/hora/correlación; petición inválida devuelve HTTP400 |
| Seed e integración outbox | `node backend/scripts/test-seed.mjs`: PASS | dos ejecuciones,2 locales/8 servicios/2 eventos completados/2 recibos; rechaza producción y host remoto |
| Suite integrada | `npm run test:emulator`: **exit0** | arranque, pruebas y apagado automáticos de emuladores |
| Flutter análisis | `flutter analyze`: **No issues found** | análisis de toda la app/tests/config Dart |
| Flutter pruebas finales | `flutter test --reporter expanded`: **55/55 PASS** | dinero, tiempo, contratos válidos/inválidos compartidos, cliente/reintentos, rutas/roles/entornos y widgets; sin dispositivo nativo |
| Contratos documentados |43 colecciones,34 índices,21 eventos,7ADR | diseño de negocio futuro, no funcionalidades implementadas |

Total: **116 pruebas automatizadas PASS** (41 backend unit/contratos +14 integración Firestore +2 reglas +4 guardias despliegue +55 Flutter), además de los scripts de humo callable y seed integrado. Todas estas verificaciones se ejecutaron localmente; no equivalen a un run de CI remoto.

Las pruebas de outbox provocan fallos intencionados y validan los registros OUTBOX_FAILED; esos ERROR esperados no son fallos de la suite. Los PERMISSION_DENIED de las pruebas de reglas también son los resultados esperados. Los scheduled triggers no se ejecutan automáticamente en esta suite: el barrido se prueba invocando su implementación contra Firestore Emulator; Cloud Scheduler sigue pendiente de nube.

La suite emulada cubre misma clave/petición bajo concurrencia, conflicto con otro contenido, cambio de rol sin duplicar, rollback de auditoría inválida, duplicados y fallo parcial de consumidores, backoff/límite de intentos, eventos malformados, desorden de revisiones, leases vencidos, barrido, autorización mercado/local y trabajo diferido DEMO. Money cubre ambas monedas, suma/resta, mezcla prohibida, porcentajes/rounding, negativos, extremos y overflow. Tiempo cubre Lima/Madrid y ambos cambios de hora del29/03/2026 y25/10/2026.

El recorrido local comprobado conecta HTTP callable con Functions y el seed con Firestore→trigger→consumidor→auditoría. La prueba Flutter nativa `integration_test/system_ping_test.dart` se ejecutó posteriormente en CI, con el resultado registrado en la sección de humo nativo. Los tests widget y una compilación para simulador no equivalen a verificar que Android/iOS arrancan.

## GitHub Actions

La [ejecución inicial #1](https://github.com/MarcoPorras123/lazo/actions/runs/40342750706), sobre el commit `26038a9`, terminó con cinco jobs aprobados, uno fallido y dos cancelados:

| Job | Resultado observado | Alcance |
|---|---|---|
| `functions` | PASS | instalación, lint, pruebas y suite de emuladores |
| `flutter` | PASS | instalación con lockfile, generación, análisis y pruebas |
| `ios (dev)`, `ios (staging)`, `ios (prod)` | PASS | compilación debug para iOS Simulator en macOS; no arranque ni firma de distribución |
| `android (prod)` | FAIL | AGP 9 exigía habilitar `buildFeatures.resValues` para los nombres de app definidos por variante |
| `android (dev)`, `android (staging)` | CANCELLED | cancelación por `fail-fast` de la matriz después del fallo Android |

El commit `eacb53f` habilita `resValues` y permite completar cada variante de las matrices aunque otra falle. La [ejecución #2](https://github.com/MarcoPorras123/lazo/actions/runs/40416257815) aprobó Functions y Flutter, pero Android detectó que la reducción de recursos estaba habilitada mientras la reducción de código estaba deshabilitada. El commit `5f0d57d` alinea ambas opciones y adopta el SDK mínimo de Flutter, compatible con los plugins FlutterFire.

La [ejecución #3](https://github.com/MarcoPorras123/lazo/actions/runs/40446860817), sobre `5f0d57d`, terminó **8/8 jobs PASS**: Functions, Flutter, Android dev/staging/prod e iOS dev/staging/prod. Por tanto, el workflow de fundamentos está verificado en verde para ese commit. Android genera APK debug e iOS compila para Simulator; no hay firma ni publicación en tiendas, y los builds no conectan a proyectos Firebase reales.

La [ejecución #4](https://github.com/MarcoPorras123/lazo/actions/runs/40537922488), sobre `300c79b`, también terminó **8/8 jobs PASS** después de corregir la inicialización DEMO. El job Flutter registró `No issues found` y **58 pruebas aprobadas**. La base actual suma **119 pruebas automatizadas aprobadas** (41 utilidades/contratos backend +14 integración Firestore +2 reglas +4 guardias +58 Flutter). Este total sustituye al anterior para el código vigente y conserva las 116 locales del 26/10 como evidencia histórica; no incluye el humo nativo separado.

## Humo nativo Android DEMO

El commit `d4ef036` añade un workflow manual de humo nativo Android dev contra emuladores DEMO, sin modificar la app ni el backend. La [primera ejecución de humo](https://github.com/MarcoPorras123/lazo/actions/runs/40447198850) **falló**: compiló e instaló el APK, pero la prueba no encontró la entrada «Diagnóstico» y no completó el recorrido app → `system.ping`. Este intento se conserva como fallido; la corrección y nueva comprobación se registran a continuación. Los comandos de repetición y límites del recorrido están en [configuración móvil](mobile.md#humo-nativo-manual-en-github-actions).

La corrección `300c79b` inicializa explícitamente la app Firebase predeterminada DEMO antes de usar Firestore y comprueba que el proyecto inicializado coincide con la variante. También registra fallos de arranque mediante metadatos saneados y añade tres pruebas para esa clasificación. El análisis y las 58 pruebas Flutter pasaron en CI #4. La [segunda ejecución de humo](https://github.com/MarcoPorras123/lazo/actions/runs/40611649473), sobre ese mismo commit, terminó **PASS** el 27/10/2026 a las 20:00:55 de Lima (28/10 a las 01:00:55 UTC).

El [job Android dev](https://github.com/MarcoPorras123/lazo/actions/runs/40611649473/job/122564356554) compiló e instaló el APK en Android Emulator API 34, arrancó la app, abrió Diagnóstico y comprobó una respuesta correcta del callable emulado. Extracto del registro:

```text
✓ Built build/app/outputs/flutter-apk/app-dev-debug.apk
Installing build/app/outputs/flutter-apk/app-dev-debug.apk... 532ms
00:00 +0: app -> callable system-ping -> typed diagnostic result
00:04 +1: All tests passed!
Script exited successfully (code 0)
```

El artefacto `android-dev-demo-smoke`, ID `12782739480`, conserva el log Flutter durante siete días (vence el 04/11/2026 a las 01:00:57 UTC). El enlace al run y este extracto registran la evidencia aunque expire el artefacto. Resultado conjunto: **119 pruebas de base + 1 prueba nativa = 120 aprobadas**. El alcance nativo es Android dev contra emuladores DEMO, sin credenciales de producción ni proyecto Firebase real.

## Aceptación externa pendiente

Crear los tres proyectos después de aprobar región; registrar seis apps; configurar App Check/Crashlytics/IAM/CloudTasks/Scheduler/alertas/PITR/backups; ejecutar ping desde app contra Firebase dev real; observar el arranque iOS y staging/prod en ambos sistemas. Android dev ya tiene arranque y humo aprobados en emulador. El CI de fundamentos verde acredita análisis, pruebas y compilaciones, con los límites descritos; no acredita conectividad a Firebase real ni una app preparada para distribución.

Reproducir en este equipo: preparar PATH portable según deployment.md y ejecutar `npm run lint`, `npm test`, `npm run test:scripts`, `npm run test:emulator`. El directorio OneDrive puede ralentizar discovery; establecer `FUNCTIONS_DISCOVERY_TIMEOUT=60` si se ejecuta el CLI manualmente. El workflow y el arranque seguro ya lo configuran.
