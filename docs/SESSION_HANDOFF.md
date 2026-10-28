# LAZO — Continuidad de sesiones

## Paso actual

Paso 1 de 10 — Fundamentos.

## Estado

Implementado (no verificado). Coincide con CONTEXT.md. Los bloques A, B y C de [PLAN_CIERRE_PASO_01.md](PLAN_CIERRE_PASO_01.md) están completados. El bloque D (Firebase real) **no está autorizado**: solo existe su [propuesta](PROPUESTA_INFRAESTRUCTURA_FIREBASE.md).

## Origen

Proyecto iniciado con OpenAI Codex y migrado a Claude Code Cloud.

## Rama de referencia

migracion/codex-a-claude (no modificar main; sin force push).

## Sesión 2026-10-28 — resultado

- A1–A5 ✅ rama sincronizada, CI #7 comprobada, suite backend reproducida en el contenedor, documentación alineada y escapes Markdown retirados.
- B1 ✅ región de Functions obligatoria en entornos reales (`12379a8`).
- B2 + B4 ✅ barridos outbox/jobs aislados por elemento; adaptador Cloud Tasks probado (`d6a0409`).
- B3 ✅ prueba de Storage rules; Storage en `test:emulator` (`d30a5c2`).
- B5 ✅ `dart format` en CI (`36b1457`).
- C1 + C2 ✅ humo iOS y arranque staging/prod sin configuración (`d3b3bfd`); [humo nativo #3](https://github.com/MarcoPorras123/lazo/actions/runs/40661071045) PASS en Android e iOS.
- [CI #12](https://github.com/MarcoPorras123/lazo/actions/runs/40661489586) 8/8 PASS sobre `99f52d3`. Pruebas base: 125; nativas: 6.
- Propuesta del bloque D redactada (región recomendada `europe-west1`: Cloud Tasks no existe en Madrid ni en Santiago).

## Notas de entorno (Claude Code Cloud)

- Flutter no viene instalado: se descarga la 3.47.8 al scratchpad (ver docs/verification.md).
- `npm run test:emulator` completo no funciona en el contenedor: `firebase-tools` envía también las peticiones locales por `HTTPS_PROXY`. Usar `firebase emulators:exec --only firestore[,storage]` para las suites de integración y reglas, y CI para el resto.
- Cada push a la rama cancela la CI en curso (concurrencia): agrupar commits antes de subir.

## Próxima tarea

Esperar la decisión del dueño sobre el bloque D (§9 de la propuesta). Sin esa autorización no quedan microtareas ejecutables del Paso 1. No empezar el Paso 2.

## Restricciones

- No reconstruir funcionalidades verificadas.
- No comenzar el paso 2.
- No modificar producción ni crear recursos cloud.
- No marcar el paso 1 como verificado sin pruebas.
- No presentar un arranque con configuración incompleta como prueba contra Firebase real.
- Actualizar este archivo al finalizar cada sesión.
