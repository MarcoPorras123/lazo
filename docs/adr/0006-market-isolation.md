# ADR 0006 — Aislamiento por tenant, mercado y local

Fecha: 2026-10-25 · Estado: aceptada para Paso 1.

## Contexto

BlackAndWhite opera en Perú y España; monedas, fechas de negocio y permisos no se pueden mezclar. Se admitirán otros tenants. El dueño necesita una vista General analítica, sin convertirla en permiso de escritura cruzada.

## Decisión

El alcance lógico es `tenantId → marketId → locationId`. Conservamos las colecciones operativas bajo `tenants/{t}` para consultas e índices consistentes; cada documento registra el mercado inmutable y el local cuando corresponda. El servidor obtiene la membresía y verifica que el local pertenece al mismo tenant/mercado. Las consultas operativas exigen filtro de mercado y, cuando procede, local.

Las claves de agenda incluyen mercado/local/profesional/fecha; las cuentas de fidelización incluyen mercado/programa/cliente. Las monedas PE=PEN y ES=EUR se validan en servidor. La zona horaria del local es obligatoria; `Europe/Madrid` solo es el ejemplo DEMO español, no una regla para Canarias u otros territorios.

## Consecuencias

Cambiar un documento de mercado está prohibido. Si existe una transferencia comercial futura, se registra una operación compensada con ambos alcances explícitos y un diseño específico; no se modifica el mercado antiguo. General devuelve agregados por moneda y solo convierte con tipo/fecha/fuente publicados. El aislamiento lógico no acredita residencia física: véase ADR 0007.

Los perfiles privados y proyecciones de agenda/atención se separan para que peluqueros no lean datos privados completos. La pertenencia a un tenant no concede acceso global.
