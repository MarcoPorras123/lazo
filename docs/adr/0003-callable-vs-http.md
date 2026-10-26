# ADR 0003 — Callables para app, HTTP para proveedores

Fecha: 2026-10-25 · Estado: aceptada para Paso 1.

## Contexto

La app necesita transmitir identidad y App Check, errores tipados y parámetros versionados. Proveedores externos no hablan el protocolo de funciones invocables de Firebase.

## Decisión

Comandos móviles usan Functions v2 `onCall` y el SDK FlutterFire. Cada handler valida entrada, autenticación cuando corresponda, alcance, clave de idempotencia y política de App Check. El diagnóstico lógico `system.ping` se exporta como grupo `system.ping`, cuyo identificador de despliegue/SDK es `system-ping`; se registra explícitamente para evitar tratar el punto como nombre de endpoint.

HTTP `onRequest` se reserva para webhooks firmados, protocolos Wallet y endpoints de proveedores. Las tareas usan Cloud Tasks con identidad verificable o `onTaskDispatched`; un endpoint interno no se considera seguro por ser difícil de adivinar. Entradas externas verifican firma y replay antes de guardar el evento normalizado.

## Consecuencias

Auth y App Check se integran en el transporte callable, pero no sustituyen autorización del servidor. HTTP debe definir validación, autenticación, errores y tamaño de carga explícitamente. Se conserva un único vocabulario de fallos y correlación. `system.ping` es de lectura: acepta la clave por uniformidad de transporte pero no crea un registro idempotente; su hora corresponde a cada invocación.

Referencia: [Firebase: callables](https://firebase.google.com/docs/functions/callable), [task queue functions](https://firebase.google.com/docs/functions/task-functions).
