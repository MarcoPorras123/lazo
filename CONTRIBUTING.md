# Colaborar en Lazo

El objetivo es que una persona pueda continuar el proyecto con lo que está registrado en el repositorio. La fuente de continuidad es [CONTEXT.md](CONTEXT.md); el README ofrece una introducción, pero no sustituye los contratos ni las decisiones vigentes.

## Antes de cambiar código

1. Leer el estado del paso, los contratos afectados y las decisiones pendientes en CONTEXT.
2. Revisar [arquitectura](docs/architecture.md), [modelo de datos](docs/data-model.md) y los [ADR](docs/adr/) relacionados.
3. Identificar el recorrido completo: interfaz, función, autorización, datos, eventos y pruebas. No abrir reglas para que una pantalla parezca funcionar.
4. Registrar como propuesta cualquier decisión comercial todavía no aprobada. Los datos DEMO no fijan precios ni condiciones reales.

## Cambios y revisión

Trabajar en una rama con un objetivo concreto y presentar el resultado en un pull request. Usar un título que describa el comportamiento final y una descripción que explique el problema, el cambio, la evidencia ejecutada y las limitaciones pendientes. No declarar una prueba o integración verificada si no se ejecutó.

La revisión debe poder distinguir código implementado, diseño futuro, demostración y dependencia externa pendiente. Si una decisión cambia límites de módulos, persistencia o seguridad, añadir un ADR y enlazarlo desde CONTEXT.

## Contratos e invariantes

- Una modificación de JSON actualiza los validadores Dart/TypeScript y los ejemplos compartidos de `packages/contracts/fixtures/`.
- Una consulta nueva registra su índice, orden, cursor, alcance y retención antes de habilitar la pantalla.
- Todas las mutaciones conservan idempotencia; auditoría y outbox se escriben junto con la operación.
- Los consumidores toleran duplicados y desorden. No introducir llamadas externas dentro de callbacks transaccionales.
- Dinero entero con moneda; instantes UTC y fechas de negocio con zona IANA del local.
- Servidor autoritativo para permisos, disponibilidad, importes, pagos, fidelización y caja.
- Perú y España no comparten operaciones. Cualquier agregación General conserva contexto y monedas.
- Datos privados se separan de las proyecciones visibles para otros roles.

## Verificación

Ejecutar las comprobaciones apropiadas según el área modificada. Los comandos completos están en [deployment.md](docs/deployment.md) y [mobile.md](docs/mobile.md).

```sh
npm run lint
npm test
npm run test:scripts
npm run test:emulator
```

Para Flutter, desde `apps/mobile`: `flutter analyze` y `flutter test`; regenerar serializers/localización si cambian sus fuentes. Las modificaciones nativas requieren además compilación y ejecución en la plataforma afectada. Un test de widget no sustituye la prueba en dispositivo ni una comprobación de App Check/IAM real.

Antes de integrar, actualizar el registro de funcionalidades, las secciones de contratos y la bitácora de CONTEXT. Conservar lo registrado por otros pasos. Añadir evidencia reproducible y enlaces a ejecuciones de CI cuando existan.

## Configuración y datos

No versionar credenciales, tokens de depuración, cuentas de servicio, claves de firma, `.env` reales, datos personales, dumps de producción ni configuraciones locales. Usar los ejemplos y los mecanismos de Secret Manager/configuración previstos. `.gitignore` ayuda, pero cada cambio debe revisar qué archivos incluye.

El seed está restringido a `demo-lazo` en loopback. No modificar esa protección para cargar datos en un proyecto real. Las migraciones y despliegues reales siguen sus procedimientos documentados y la decisión del responsable del entorno.

La licencia del código propio sigue pendiente. No añadir una licencia ni atribuir derechos sobre el proyecto sin una decisión expresa de sus titulares.
