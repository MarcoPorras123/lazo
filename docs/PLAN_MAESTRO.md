# Lazo — 10 prompts de construcción

Oct 25, 2026 · @MARCO PORRAS QUISPE

Diez prompts autocontenidos que, ejecutados en orden, construyen Lazo completo. Cada uno lee `CONTEXT.md` al empezar y lo actualiza al terminar: ese archivo central es lo que los integra.

## Cómo usarlos

1. Ejecuta un paso por sesión, del 1 al 10. Cada prompt repite el contexto común, así que funciona en una sesión nueva sin este chat.
2. Pega el prompt completo de su pestaña. Trabaja siempre sobre el mismo repositorio.
3. Al cerrar cada paso, revisa `CONTEXT.md`: estado del paso, contratos nuevos, pendientes y comandos. Es lo que permite que el siguiente paso arranque solo.
4. Si ejecutas un paso fuera de orden, el prompt crea los contratos mínimos que falten, los marca como «provisionales» en `CONTEXT.md` y el paso responsable los completa después.
5. Ningún paso se da por terminado sin actualizar `CONTEXT.md` y sin pasar sus criterios de aceptación.
6. Para pegar con formato Markdown exacto, exporta el doc a Markdown desde su menú o copia la pestaña completa.

## Mapa de pasos

Cada paso entrega un recorrido completo (interfaz, servidor, reglas y pruebas) y deja contratos que usan los siguientes. Los números de sección remiten al prompt original.

| Paso | Construye | Secciones originales | Usa contratos de | Deja listo para |
| --- | --- | --- | --- | --- |
| 1 · Fundamentos | Monorepo, entornos, modelo de datos, dinero, tiempo, idempotencia, outbox, auditoría, CI, `CONTEXT.md` | 2, 5, 22, 25 | — | Todos |
| 2 · Sistema de diseño | Tokens, temas claro y oscuro, componentes con estados, guía de textos, protocolo de auditoría | 23 | 1 | 3 a 10 |
| 3 · Identidad y mercados | Autenticación, roles, invitaciones, reglas, selector Perú · España · General, eliminación de cuenta | 3, 4 | 1, 2 | 4 a 10 |
| 4 · Reservas | Catálogo, horarios, motor de disponibilidad, bloqueos atómicos, precios y descuento VIP, Mis reservas | 6, 7, 13 | 1 a 3 | 5, 6, 8 |
| 5 · Pagos y cambios | Proveedores por mercado, webhooks, pagos tardíos, Yape manual, reprogramar, cancelar, reembolsos | 8, 9 | 1 a 4 | 8, 9 |
| 6 · Atención y fidelización | Espacio del peluquero, visitas, QR, aprobación, estrellas, tramos, niveles, premios, canjes, aliados | 11, 12, 13, 14, 19 | 1 a 5 | 7, 8, 9 |
| 7 · Wallet | Pases de Apple con servicio web y APNs, clases y objetos de Google Wallet, enlaces verificados | 10 | 1, 3, 6 | 8, 10 |
| 8 · Notificaciones y lista de espera | FCM y APNs, centro de notificaciones, preferencias, regreso a 21 días, lista de espera, campaña de 30 días | 15, 16, 17, 18 | 1 a 6 | 9 |
| 9 · Caja y reportes | Libro de caja, anticipos, gastos, cierres, agregados, gráficos, tipo de cambio, vista General | 5, 20, 21 | 1 a 6, 8 | 10 |
| 10 · Cierre | Recorrido real de punta a punta, pruebas obligatorias, seguridad, auditoría final, tiendas y publicación | 23, 24, 25 | 1 a 9 | Publicación |

Los pasos se comunican mediante eventos del outbox (por ejemplo, `slot.released` del Paso 5 activa la lista de espera del Paso 8) y funciones internas documentadas en `CONTEXT.md`.

## CONTEXT.md

El Paso 1 lo crea en la raíz del repositorio con esta estructura; cada paso lo lee al empezar y lo actualiza al terminar sin borrar lo que registraron los demás. Si un paso se ejecuta y el archivo no existe, lo crea con esta misma plantilla.

```markdown
# CONTEXT.md — Lazo

Última actualización: AAAA-MM-DD · Paso N

## 1. Estado por paso
| Paso | Estado | Fecha | Evidencia | Notas |
|---|---|---|---|---|
| 1 Fundamentos | pendiente | | | |
| 2 Sistema de diseño | pendiente | | | |
| 3 Identidad y mercados | pendiente | | | |
| 4 Reservas | pendiente | | | |
| 5 Pagos y cambios | pendiente | | | |
| 6 Atención y fidelización | pendiente | | | |
| 7 Apple Wallet y Google Wallet | pendiente | | | |
| 8 Notificaciones y lista de espera | pendiente | | | |
| 9 Caja y reportes | pendiente | | | |
| 10 Cierre y publicación | pendiente | | | |
Estados: pendiente · en curso · implementado · verificado (solo con evidencia).

## 2. Arquitectura vigente
Resumen breve y enlaces a docs/architecture.md y docs/adr/.

## 3. Contratos
### 3.1 Colecciones Firestore
| Ruta | Paso responsable | Campos clave | Lee | Escribe | Índices | Estado |
|---|---|---|---|---|---|---|
### 3.2 Funciones y endpoints
| Nombre | Tipo | Entrada | Salida | Alcance requerido | Idempotente | Estado |
|---|---|---|---|---|---|---|
### 3.3 Eventos del outbox
| Evento | Productor | Consumidores | Carga | Clave de idempotencia | Estado |
|---|---|---|---|---|---|
### 3.4 Rutas de la app y enlaces verificados
| Ruta | Rol | Pantalla | Origen (app, notificación, Wallet) |
|---|---|---|---|
### 3.5 Sistema de diseño
Tokens, componentes y su ubicación.

## 4. Reglas de negocio
| Regla | Mercado | Valor | Versión | Aprobada o propuesta | Fuente |
|---|---|---|---|---|---|

## 5. Registro de funcionalidades
| Funcionalidad | Implementada | Verificada (cómo) | Pendiente |
|---|---|---|---|

## 6. Integraciones externas
| Integración | Estado (real, sandbox, DEMO, pendiente) | Requisito faltante | Responsable |
|---|---|---|---|

## 7. Decisiones pendientes y supuestos
| Tema | Supuesto vigente | Qué falta decidir | Paso afectado |
|---|---|---|---|

## 8. Auditorías visuales
| Fecha | Alcance | Hallazgos abiertos (bloqueante, alta, media, baja) | Informe |
|---|---|---|---|

## 9. Cómo ejecutar
Emuladores, pruebas, variantes, datos DEMO y despliegue por entorno.

## 10. Bitácora
| Fecha | Paso | Resumen | Contratos tocados |
|---|---|---|---|
```

## Supuestos y decisiones pendientes

El prompt original no define estos puntos. Los prompts los dejan configurables, con un valor inicial marcado como propuesta, y los registran en `CONTEXT.md` hasta que el negocio decida.

| Tema | Qué falta decidir | Tratamiento en los prompts | Paso |
| --- | --- | --- | --- |
| Región de datos | Ubicación de Firestore y Functions | ADR; separar por país no garantiza residencia física | 1 |
| Métodos de inicio de sesión | Teléfono, correo, Google, Apple | Propuesta en ADR; si hay acceso con terceros en iOS, comprobar si se exige Sign in with Apple | 3 |
| Eliminación de cuenta | Alcance y retención | Incluida, porque App Store y Google Play la exigen | 3 |
| Peluquero desactivado | Qué pasa con sus citas futuras | Se registra como pendiente | 3 |
| Zona horaria de España | `Europe/Madrid` o `Atlantic/Canary` según el local | Configurable por local | 4 |
| Redondeo del 5 % VIP | Importes que no dan céntimos exactos (S/ 35,10 da S/ 33,345) | Medio hacia arriba al céntimo, como propuesta | 4 |
| Umbral VIP en España | Importe en euros | Descuento desactivado hasta aprobarlo | 4 |
| Política de cancelación, inasistencia y reprogramación | Plazos y porcentajes | Configurable, sin penalizaciones definitivas | 5 |
| Proveedores de pago | Cuál admite a la entidad, país y moneda | Capa de integración, proveedor DEMO y evaluación en ADR | 5 |
| Yape manual | Plazo para confirmar el cobro | Configurable; sin confirmación se libera el horario | 5 |
| Contracargo de una visita acreditada | Si se retira la estrella | Evento preparado, sin acción automática | 5, 6 |
| Cobro en el local | Si lo registra el peluquero o solo el dueño | Lo registra el peluquero y el dueño lo confirma; desactivable | 6 |
| QR de otra persona en una cita | Rechazar o permitir | Rechazo por defecto; el dueño puede forzarlo con motivo auditado | 6 |
| Ciclo de premios después de la visita 34 | Si se repite 6, 8, 14 (premios en 42, 56…) y qué premio toca en la 34 | Se asume la repetición del ciclo; las pruebas fijan 6, 14, 28 y 34 | 6 |
| Dominio para enlaces verificados | Dominio propio | Requisito externo para Wallet y enlaces profundos | 7 |
| Recordatorio de 21 días | Si es comunicación operativa o comercial | Tratado como comercial, con consentimiento propio | 8 |
| Límites de campañas | Frecuencia, franja y destinatarios por vacante | Una comunicación cada 7 días y franja nocturna, como propuesta | 8 |
| Tipo de cambio | Proveedor y metodología | Adaptador y ADR; por defecto, tasa de referencia común | 9 |
| Anticipo retenido y cierre diario | Tratamiento contable y bloqueo del día cerrado | Propuesta registrada; sin presentarlo como beneficio | 9 |
| Textos legales | Privacidad y términos (RGPD y LOPDGDD; Ley 29733) | Pendiente de redacción legal | 10 |
