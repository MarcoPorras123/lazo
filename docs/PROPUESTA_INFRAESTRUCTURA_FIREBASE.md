# Propuesta técnica — Infraestructura Firebase (bloque D del Paso 1)

Fecha: 2026-10-28 · Estado: **propuesta para aprobación del dueño**. No se ha creado ningún proyecto, base, cuenta de servicio, cola, presupuesto ni recurso facturable. Nada de este documento se ejecuta sin autorización explícita.

Relacionado: [ADR 0007](adr/0007-data-region.md) · [security.md](security.md) · [deployment.md](deployment.md) · [PLAN_CIERRE_PASO_01.md](PLAN_CIERRE_PASO_01.md).

## 1. Restricciones del código actual

Lo que la infraestructura debe respetar sin cambiar la arquitectura:

- Una sola base Firestore `(default)` por proyecto. PE y ES se separan por documentos (`marketId`), no por base.
- Todas las funciones usan el parámetro `LAZO_REGION` (hoy `europe-west1` como propuesta). `jobs-runDue` crea su cola de **Cloud Tasks en la misma región** que las funciones.
- `outbox-dispatch` es un trigger de Firestore: debe desplegarse en la región de la base o la más cercana.
- Dos funciones programadas por proyecto (`outbox-retryPending`, `jobs-enqueuePending`): **2 trabajos de Cloud Scheduler por proyecto**.
- La app exige App Check fuera del emulador y activa Crashlytics en staging/prod.
- `npm run deploy:checked` exige tres IDs distintos, parámetros persistidos por proyecto y confirmación adicional para prod.

## 2. Regiones

Disponibilidad comprobada el 2026-10-28 en la documentación oficial ([Firestore](https://firebase.google.com/docs/firestore/locations), [Functions](https://firebase.google.com/docs/functions/locations), [Cloud Tasks](https://docs.cloud.google.com/tasks/docs/locations)):

| Región | Firestore | Functions 2.ª gen | Cloud Tasks | Nivel de precio Functions |
|---|---|---|---|---|
| `europe-west1` (Bélgica) | sí | sí | **sí** | Tier 1 |
| `europe-southwest1` (Madrid) | sí | sí | **no** | Tier 1 |
| `eur3` (multirregión UE) | sí | — (funciones en `europe-west1`) | — | — |
| `southamerica-west1` (Santiago) | sí | sí | **no** | Tier 2 |
| `southamerica-east1` (São Paulo) | sí | sí | sí | Tier 2 |
| Perú | no existe región | — | — | — |

La ubicación de Firestore **no se puede cambiar** después de crear la base.

### Opciones

| Opción | Descripción | Ventajas | Inconvenientes |
|---|---|---|---|
| **A (recomendada)** | Firestore regional, Functions, Tasks, Scheduler y bucket de exportaciones en `europe-west1` | Sin cambios de código; todos los servicios en la misma región; Tier 1; datos en la UE (favorable para RGPD en ES) | Mayor latencia para clientes de Perú; los datos de clientes peruanos se almacenan fuera de Perú (transferencia internacional, ver §3) |
| B | Firestore y Functions en Madrid | Menor latencia para los locales de España | Cloud Tasks no existe en Madrid: `jobs` tendría que ir a otra región (cambio de código y llamadas entre regiones). No recomendada para el Paso 1 |
| C | `eur3` multirregión | Mayor disponibilidad para prod | Coste por operación y almacenamiento superior al regional; misma latencia PE. Valorar solo si el RTO/SLA lo exige |
| D | Separación por país: base o proyecto PE en `southamerica-east1` y ES en la UE | Menor latencia PE; residencia por país | **Cambio de arquitectura**: dos bases u ocho proyectos, outbox y funciones por base, agregador explícito para la vista General. Solo si la asesoría legal exige residencia por país |

## 3. Residencia de datos (no es asesoría legal)

- Separar documentos por `marketId` **no** garantiza residencia física: toda la base vive en la región elegida.
- Con la opción A, los datos de clientes de España quedan en la UE. Los de Perú se almacenan en Bélgica: es un flujo transfronterizo regulado por la Ley 29733 y su reglamento. Hay que validar con asesoría legal las condiciones aplicables (información y consentimiento, nivel de protección, comunicaciones a la autoridad) antes de tratar datos reales.
- Authentication, Crashlytics, FCM, Cloud Logging y los proveedores futuros (pagos, Wallet) no necesariamente siguen la región de Firestore. Hay que revisar los términos de ubicación de cada servicio antes de activarlo.
- Los textos legales (privacidad y términos) siguen pendientes (Paso 10).

## 4. Latencia

No hay mediciones. Estimación orientativa, **a medir**:

| Origen | `europe-west1` | Observación |
|---|---|---|
| Madrid | baja (decenas de ms) | adecuada |
| Lima | alta (del orden de 150–250 ms por ida y vuelta) | aceptable para reservas y consultas si cada pantalla hace pocas llamadas; vigilar en el flujo de reserva |

Plan de medición, una vez exista dev: ejecutar `system.ping` desde un dispositivo en Lima y otro en Madrid (al menos 50 llamadas), registrar p50/p95 en `docs/verification.md` y decidir si basta con la opción A antes de crear prod.

## 5. Servicios necesarios

| Servicio | Paso 1 | Uso | Plan |
|---|---|---|---|
| Firestore (Standard, modo nativo) | sí | base principal | Blaze recomendado |
| Cloud Functions 2.ª gen | sí | `system-ping`, outbox, jobs | **requiere Blaze** |
| Cloud Tasks | sí | `jobs-runDue` | requiere facturación |
| Cloud Scheduler | sí | 2 funciones programadas por proyecto | requiere facturación |
| Cloud Storage | sí (reglas, bucket de exportaciones) | archivos futuros y backups | bucket por defecto **requiere Blaze** |
| App Check | sí | Play Integrity, App Attest/DeviceCheck y depuración en dev | sin coste, con cuotas por proveedor |
| Crashlytics | sí (staging/prod) | fallos | sin coste |
| Secret Manager | declarado, sin valor | integraciones futuras | por uso |
| Cloud Logging y Monitoring | sí | alerta `OUTBOX_FAILED` | por volumen |
| Authentication | Paso 3 | inicio de sesión | sin coste salvo SMS (teléfono) |
| FCM | Paso 8 | notificaciones | sin coste |

## 6. Costes y facturación

Datos de las tarifas públicas consultadas el 2026-10-28 ([Firebase](https://firebase.google.com/pricing), [Cloud Scheduler](https://cloud.google.com/scheduler/pricing)). Hay que verificarlos en la consola antes de aprobar:

- **Plan Blaze obligatorio** en los tres proyectos (Functions, bucket por defecto, Tasks, Scheduler). Requiere una cuenta de facturación con medio de pago.
- **Firestore, cuota sin coste por proyecto** (base por defecto): 1 GiB almacenado, 50 000 lecturas, 20 000 escrituras y 20 000 borrados al día, 10 GiB/mes de salida.
- **Functions, sin coste al mes:** 2 M invocaciones, 400 000 GB·s, 200 000 CPU·s, 5 GB de salida.
  - Las dos funciones programadas cada minuto suman unas 86 400 invocaciones al mes por proyecto: dentro de la cuota.
  - Las imágenes de Functions ocupan Artifact Registry (500 MB sin coste); configurar política de limpieza.
- **Cloud Scheduler:** 3 trabajos gratis **por cuenta de facturación**, después USD 0,10 por trabajo al mes. Con 3 proyectos × 2 trabajos = 6, si comparten cuenta: unos USD 0,30/mes.
- **Cloud Storage:** la cuota sin coste de los buckets nuevos solo aplica en regiones de EE. UU. En `europe-west1` se paga desde el primer GB (importes pequeños en el Paso 1).
- **PITR, backups y exportaciones:** coste de almacenamiento adicional proporcional al tamaño de la base; despreciable con datos DEMO.
- **Estimación del Paso 1** (sin usuarios reales): cerca de cero, del orden de **pocos dólares al mes** entre los tres proyectos. No es un presupuesto garantizado.
- **Control:** crear un presupuesto con alertas por proyecto (por ejemplo al 50 %, 90 % y 100 %). Las alertas **no bloquean** el gasto; solo avisan.

## 7. Configuración propuesta por entorno

| Aspecto | dev | staging | prod |
|---|---|---|---|
| ID de proyecto (único global; a confirmar) | `lazo-dev-<sufijo>` | `lazo-staging-<sufijo>` | `lazo-prod-<sufijo>` |
| Región | `europe-west1` | `europe-west1` | `europe-west1` |
| Firestore | Standard regional | Standard regional | Standard regional + protección contra borrado |
| PITR | no | sí | sí |
| Backups programados | no | semanal (retención a decidir) | diario (retención a decidir) + exportación independiente |
| App Check | proveedor de depuración; tokens solo en consola | supervisión → obligatorio tras validar | obligatorio |
| Crashlytics | desactivado | activo + crash de prueba | activo |
| `maxInstances` | 2 (actual) | 2 | revisar antes de publicar |
| Cuentas de servicio | `lazo-system`, `lazo-worker` según security.md | ídem | ídem; sin claves descargadas |
| Acceso | dueño + desarrolladores | dueño + desarrolladores | dueño; mínimo privilegio |
| Presupuesto | alerta baja | alerta baja | alerta según negocio |
| Apps registradas | `app.lazo.mobile.dev` (Android/iOS) | `app.lazo.mobile.staging` | `app.lazo.mobile` |

## 8. Secuencia de ejecución (solo cuando se autorice)

1. **D1** Aprobar región y opción → actualizar ADR 0007 a «aceptada».
2. **D2** Crear la cuenta de facturación y los presupuestos; crear los 3 proyectos; plan Blaze; crear Firestore en la región aprobada. Actualizar `.firebaserc`, `config/deployment.json` local y `backend/functions/.env.<PROJECT_ID>` (sin secretos).
3. **D3** Registrar las 6 apps; descargar la configuración pública a rutas ignoradas por Git; App Check y Crashlytics.
4. **D4** Cuentas de servicio e IAM; habilitar las APIs de Tasks y Scheduler; alerta `OUTBOX_FAILED`; PITR, backups y prueba de restauración en staging.
5. **D5** `npm run deploy:checked -- dev` → `smoke-ping` contra dev.
6. **D6** Humo app → `system.ping` contra dev real en Android e iOS, más la medición de latencia (§4).
7. **D7** Arranque de staging y prod contra sus proyectos.
8. **D8** Con las 5 evidencias, marcar el Paso 1 como «verificado».

Cada paso deja evidencia en `docs/verification.md` y `CONTEXT.md`. Prod se crea al final y no recibe despliegue hasta la aprobación de una entrega.

## 9. Decisiones que requieren aprobación del dueño

1. Región y opción (A recomendada) y aceptación de la latencia para Perú, pendiente de medir.
2. Validación legal de la transferencia internacional de datos de Perú (Ley 29733) y de los datos de España (RGPD) con la opción elegida.
3. Titular y cuenta de facturación; medio de pago; umbrales de presupuesto.
4. IDs definitivos de los proyectos y titularidad de los identificadores de app (Apple Developer y Google Play).
5. Quién tiene acceso Owner/Editor en cada proyecto.
6. RPO/RTO: retención de PITR y backups, y frecuencia de exportaciones.
7. Canal y responsable de las alertas (correo, etc.).
8. Momento de crear prod (recomendado: después de validar dev y staging).

## 10. Irreversibles o costosos de revertir

- Región de la base Firestore: no se puede cambiar; requiere migrar a una base nueva.
- IDs de proyecto: no se pueden reutilizar tras borrarlos.
- Identificadores de app en las tiendas.
- Ubicación de recursos ligada al proyecto (por ejemplo, buckets heredados `*.appspot.com`).
