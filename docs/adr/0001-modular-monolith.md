# ADR 0001 — Monolito modular

Fecha: 2026-10-25 · Estado: aceptada para Paso 1.

## Contexto

Lazo inicia con un negocio en dos mercados y necesita reservar, cobrar y conceder beneficios sin dispersar invariantes. No existe evidencia de equipos o cargas que justifiquen servicios independientes.

## Decisión

Un monorepo contiene app Flutter, Functions v2 TypeScript, contratos, reglas, scripts y documentación. Los módulos son los de `docs/architecture.md`; cada módulo controla sus escrituras. Separamos adaptadores, lógica pura e infraestructura donde la complejidad lo justifica. Eventos versionados conectan efectos diferidos.

## Consecuencias

Las transacciones locales coordinan cambios con idempotencia, auditoría y outbox. Una entrega puede desplegar funciones de un grupo sin convertirlo en microservicio. Los módulos no importan presentación móvil ni escriben colecciones ajenas arbitrariamente. Los tests de contratos evitan divergencia Dart/TypeScript. Se podrá extraer un módulo si aparecen razones medidas, preservando contratos.

## Alternativas

Microservicios desde el inicio aumentan coordinación y consistencia distribuida. Un único archivo de funciones carecería de límites revisables. Ninguna de esas alternativas se adopta.

Referencia: [Flutter: separación UI y datos](https://docs.flutter.dev/app-architecture/guide).
