# Evidencia de verificación — Paso 1

Fecha: 2026-10-26 · entorno local Windows · SDK Flutter3.47.8/Dart3.13.7, Node22.23.4, Java21.0.12.1, Firebase CLI15.34.1. No se ejecutó un despliegue cloud ni workflow GitHub Actions. Los proyectos Firebase todavía no existen.

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

El recorrido local comprobado conecta HTTP callable con Functions y el seed con Firestore→trigger→consumidor→auditoría. La prueba Flutter nativa `integration_test/system_ping_test.dart` está preparada, pero **no ejecutada**: faltan AndroidSDK/dispositivo o macOS/Xcode, y dev real aún no existe. Los tests widget no equivalen a verificar que Android/iOS arrancan.

Pendientes de aceptación externa: crear los tres proyectos después de aprobar región; registrar seis apps; configurar App Check/Crashlytics/IAM/CloudTasks/Scheduler/alertas/PITR/backups; ejecutar ping desde app en emulador y dev; compilar/arrancar las tres variantes en Android/iOS; ejecutar CI remoto y guardar enlace a run verde. No se afirma ninguno de estos resultados.

Reproducir en este equipo: preparar PATH portable según deployment.md y ejecutar `npm run lint`, `npm test`, `npm run test:scripts`, `npm run test:emulator`. El directorio OneDrive puede ralentizar discovery; establecer `FUNCTIONS_DISCOVERY_TIMEOUT=60` si se ejecuta el CLI manualmente. El workflow y el arranque seguro ya lo configuran.
