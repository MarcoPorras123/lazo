# Contratos compartidos — versión 1

Los tests Dart y TypeScript leen directamente `fixtures/`; no copiar los JSON a cada plataforma. Cambiar un campo exige actualizar ambos validadores, los ejemplos y `CONTEXT.md`.

- Money: `{amountMinor: integer, currency: "PEN" | "EUR"}`, magnitud máxima `9007199254740991`. Rechaza strings, fracciones, monedas desconocidas y campos adicionales.
- Porcentajes: puntos básicos enteros (`10000` = 100 %), multiplicación con BigInt, redondeo halfUp (empates se alejan de cero). Es propuesta comercial inicial; el servidor aplica la versión aprobada de businessRules.
- Tiempo: UTC explícito y hora local sin offset, zona IANA y offset esperado. Una hora inexistente se rechaza; una repetida exige resolver explícitamente temprano/tardío.
- Ping: contrato lógico `system.ping`, callable `system-ping`. `serverTime` UTC canónico con tres dígitos de milisegundos y `correlationId` UUID. `invalid-ping.json` comprueba rechazos en ambos lados. Es lectura; cada llamada puede devolver una hora/correlación nueva aunque se reenvíe la misma clave.
- JSON usa ISO 8601 UTC; Firestore usa Timestamp. schemaVersion es obligatorio en envoltorios y documentos operativos.
- Eventos: `eventId`, `name`, `aggregateId`, `aggregateVersion`, alcance y correlación. Catálogo en CONTEXT.md. Ningún consumidor asume orden global.
