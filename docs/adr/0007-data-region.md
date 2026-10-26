# ADR 0007 — Región de datos y servicios

Fecha: 2026-10-25 · Estado: propuesta pendiente; bloquea aprovisionamiento y despliegue real.

## Contexto

La elección de ubicación Firestore no se cambia in situ después de crear la base. PE y ES en diferentes documentos comparten la ubicación física de la base. Identidad, logs, backups, notificaciones y proveedores pueden tener políticas de tratamiento distintas.

## Propuesta

Evaluar `europe-west1` para Firestore regional y Functions, manteniendo colas, buckets y exportaciones en ubicación aprobada compatible. El emulador puede usar este nombre como configuración local sin crear infraestructura. No se afirma que esta región esté creada o aprobada. También se debe comparar latencia de clientes PE, coste, disponibilidad y necesidad de multi-región o separación por país.

## Decisión requerida

El responsable del producto debe confirmar residencia y transferencias, necesidades regulatorias y contractuales, RPO/RTO, presupuesto/facturación, ubicación de respaldos y cuentas/proyectos. Si se exige residencia por país, evaluar proyectos/bases separadas y un agregador General explícito; el diseño actual no satisface por sí solo esa exigencia.

## Consecuencias

El bootstrap de despliegue debe rechazar la configuración no aprobada. `dev`, `staging` y `prod` se crean como proyectos diferentes cuando se resuelve la decisión. Cambiar de región más adelante requiere una migración planificada, validación, corte y nueva evidencia; no basta editar una constante.

Referencias: [ubicaciones Firestore](https://firebase.google.com/docs/firestore/locations), [ubicaciones Functions](https://firebase.google.com/docs/functions/locations).
