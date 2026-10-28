# LAZO — Continuidad de sesiones

## Paso actual

Paso 1 de 10 — Fundamentos.

## Estado

Implementado (no verificado). Coincide con CONTEXT.md. Bloques A, B y C de [PLAN_CIERRE_PASO_01.md](PLAN_CIERRE_PASO_01.md) completados y aprobados. Bloque D en curso **por etapas** (D-DEV → D-STAGING → D-PROD): solo la preparación de código de D-DEV está hecha. **No hay infraestructura creada.**

## Origen

Proyecto iniciado con OpenAI Codex y migrado a Claude Code Cloud.

## Rama de referencia

migracion/codex-a-claude (no modificar main; sin force push).

## Decisiones del dueño (2026-10-28)

- Región DEV: `europe-west1`. No es una decisión para prod.
- ID DEV propuesto: `lazo-dev-bw`, sujeto a disponibilidad. Se puede publicar en `.firebaserc` una vez confirmado.
- Presupuesto DEV: USD 10/mes con alertas al 50 %, 90 % y 100 %. La cuenta de facturación y los destinatarios se confirmarán en la consola.
- **No autorizados todavía:** Blaze, creación de recursos externos, despliegues, credenciales.
- P4 (workflow y secretos contra Firebase real) aplazado.

## Sesión 2026-10-28 — D-DEV preparatorio

- P1 ✅ `45aa96d`: la guardia de despliegue permite dev sin staging/prod; prod sigue exigiendo los tres proyectos y `LAZO_PRODUCTION_RELEASE`. Pruebas de guardias 8/8.
- P2 ✅ `b1a7354`: `APP_CHECK_DEBUG_TOKEN` solo en dev debug; rechazado en staging/prod, release y si no es UUID; eliminado del binario release. Flutter 60/60.
- P3 ✅ `508e5c1`: `npm run latency:dev` (p50/p95, fallos, timeouts, primera llamada aparte). Pruebas de scripts 12/12.
- Verificación local completa: lint; 41 unitarias; 18 de integración; 3 de reglas; 12 de scripts; 60 Flutter.

## Notas de entorno (Claude Code Cloud)

- Flutter no viene instalado: se descarga la 3.47.8 al scratchpad.
- `npm run test:emulator` completo no funciona en el contenedor por el proxy: usar `firebase emulators:exec --only firestore,storage` para integración y reglas, y CI para el resto.
- Cada push a la rama cancela la CI en curso: agrupar commits.

## Próxima tarea

El dueño ejecuta la Fase A de [GUIA_FIREBASE_DEV.md](GUIA_FIREBASE_DEV.md) cuando autorice Blaze. Primero comprobar la disponibilidad del ID `lazo-dev-bw`. Con el ID confirmado, Claude actualiza `.firebaserc` y prepara las plantillas locales. No empezar el Paso 2.

## Restricciones

- No reconstruir funcionalidades verificadas.
- No comenzar el paso 2.
- No modificar producción ni crear recursos cloud sin autorización explícita.
- No marcar el paso 1 como verificado sin pruebas.
- No presentar un arranque con configuración incompleta como prueba contra Firebase real.
- Ningún token, clave ni archivo de configuración real en GitHub.
- Actualizar este archivo al finalizar cada sesión.
