# ADR 0004 — Outbox transaccional y consumidores idempotentes

Fecha: 2026-10-25 · Estado: aceptada para Paso 1.

## Contexto

Una escritura Firestore y un envío a FCM, Wallet o Cloud Tasks no son una transacción distribuida. Los triggers pueden duplicarse o llegar desordenados.

## Decisión

La operación escribe `outbox/{eventId}` en su propia transacción. Un trigger y un barrido programado intentan despachar pendientes. El despachador toma un arrendamiento temporal, aumenta intentos y reprograma con espera exponencial; un lease vencido es recuperable. Al agotar intentos registra `failed` y un error estructurado apto para alerta.

El consumidor aplica efectos Firestore y crea `processedEvents/{hash_consumer_eventId}` atómicamente. El evento lleva `aggregateVersion`. Los consumidores de dominio deberán ignorar versiones antiguas y recuperar estado/huecos según su contrato. El registro de código y el catálogo de eventos declaran destinatarios; eventos sin consumidor implementado no se dan por entregados. El consumidor técnico inicial solo acusa recibo DEMO y no implementa una proyección de negocio.

## Consecuencias

No prometemos exactamente una entrega; garantizamos efectos idempotentes dentro de la frontera transaccional probada. Un efecto externo usa clave estable del proveedor y una máquina de estado recuperable. El operador puede inspeccionar eventos fallidos y solicitar replay conservando identificador y auditoría. La retención de marcas debe superar toda ventana de replay; borrar deduplicación y después reenviar un evento puede repetir efectos.

Referencias: [entrega al menos una vez y orden no garantizado](https://firebase.google.com/docs/functions/firestore-events), [transacciones Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions).
