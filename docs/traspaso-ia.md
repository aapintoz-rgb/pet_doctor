> Interfaz vigente del 31/10/2026: consultar [Archivos y sincronización](archivos-y-sincronizacion.md). Clientes CSV se carga desde Clientes; atenciones CSV y JSON completo desde Datos y sincronización. Analítica admite solo el CSV único exportado desde esa sección. Se retiraron cargas de cotización/registro independiente y descargas de ejemplos, plantillas y archivos analíticos. Los formatos heredados de datos y validaciones descritos aquí siguen siendo referencias; las instrucciones previas sobre controles retirados quedan sin efecto.

> Actualización local del 31/10/2026: registro ampliado y workspace v3 implementados. Consultar [modelo y compatibilidad v3](modelo-v3.md). Esta actualización sustituye las referencias previas a campos, CSV y workspace v2 como versión activa. Analítica conserva sus indicadores y diseño; publicación de esta entrega pendiente.

# Traspaso de IA — Pet Doctor

Fecha de actualización: 31 de octubre de 2026. Leer este documento antes de continuar. Las notas de `docs/estado.md` son cronológicas: los apartados más recientes sustituyen a los anteriores cuando describen el mismo módulo.

## 1. Proyecto, repositorio y sitios

- Repositorio público: https://github.com/aapintoz-rgb/pet_doctor
- Propietario: `aapintoz-rgb`. ID de repositorio: `1439175443`; ID público del propietario: `350088067`.
- Rama principal: `main`. Remoto `origin`: `https://github.com/aapintoz-rgb/pet_doctor.git`.
- Pet Doctor operativo: https://aapintoz-rgb.github.io/pet_doctor/
- Pet Doctor Analítica: https://aapintoz-rgb.github.io/pet_doctor/analitica/
- Copia de trabajo de esta entrega: `C:\Users\Alber\Documents\Codex\2026-10-30\b\outputs\pet_doctor`.
- Commit remoto anterior a esta entrega: `f837467`, correo desde la ficha. Esta entrega reúne las cargas CSV, corrección del cotizador, Analítica y este traspaso. Para el SHA definitivo consultar `git log -1` o el historial remoto: un documento no puede contener el SHA del commit que lo incluye.

El usuario autorizó subir todos los cambios pendientes de estas tareas el 31/10/2026. La publicación y su resultado exacto se informan al terminar la operación; verificar Pages y la rama antes de afirmar que un cambio nuevo ya está desplegado. No confundir tener el código en GitHub con haber terminado el build de Pages.

## 2. Preferencias y alcance

Interfaz y documentación en español; HTML/CSS/JavaScript simples, sin backend ni framework. El usuario modifica los nodos de n8n siguiendo instrucciones: **no alterar automáticamente sus workflows remotos**. Las claves las introduce él y deben conservarse solo durante la sesión. No pedir aprobaciones repetidas para acciones ya autorizadas.

Leer `AGENTS.md`, `README.md` y el final de `docs/estado.md` antes de modificar. No agregar datos personales reales, tokens, claves de comunicaciones ni credenciales de proveedores al repositorio público. Los ejemplos CSV son ficticios. El login es académico, no autenticación de producción.

## 3. Aplicación operativa

`index.html` monta dos módulos al mismo nivel: **Clientes** (pantalla inicial tras login) y **Cotización**, con menú lateral en escritorio y menú móvil. Navegar conserva la cotización y los filtros del historial. Datos y respaldos es una acción general.

Archivos principales:

| Archivo | Responsabilidad |
|---|---|
| `assets/application.js` | Instancia compartida del workspace, navegación, respaldos, commits y candidato pendiente |
| `assets/workspace.js` | Validación/operaciones de clientes, perritos y atenciones; persistencia y migración |
| `assets/clients.js`, `customer-profile.js` | Editor compartido, listado, ficha, perritos, resumen/historial y comunicaciones |
| `assets/quote.js` | Servicios, selección contextual, PDF y guardado de atención |
| `assets/catalog.js`, `pricing.js` | Catálogo versionado y precios en céntimos; IGV/reparto de redondeo |
| `assets/files.js` | Contratos y validación de archivos de cotización/atención |
| `assets/history.js`, `history-view.js` | Consulta, filtros, detalle y exportación del historial |
| `assets/registry-csv.js` | Parser CSV y preparación atómica de clientes/perritos |
| `assets/attention-csv.js` | Carga histórica agrupada por ID de atención, configuraciones, precios y conflictos |
| `assets/registry-csv-view.js` | Revisión paginada común a ambas cargas CSV |
| `assets/integration.js` | Preparación, transporte, validación de respuestas y configuración n8n |

Guardar una atención exige cliente completo y perrito existente de ese dueño; escribir nombres no basta. Se guarda como `realizada`, sin generar PDF. Actualizar conserva ID y primer `performedAt`; no duplica. Una atención guardada mantiene su asociación; iniciar otra para otro perrito. Generar PDF permite cotización anónima y no registra una atención. Cambios tarifarios en el cotizador no reescriben el registro del perrito.

Datos: workspace `type: pet-doctor.workspace`, versión `2`, moneda `PEN`; `owners`, `pets`, `quotes`, `attentions`. Dueño: `id,name,dni,contact,email`; perrito: `id,ownerId,name,weightKg,size,coat`. DNI de ocho dígitos único, teléfonos compartibles, nombre/DNI/teléfono/correo requeridos para nuevos clientes. Los anteriores sin correo pueden seguir recibiendo atenciones si cumplen los demás requisitos. Cada atención conserva `registration`, `ownerSnapshot`, `quote.state.pet` y `quote.pricing`; no completar sus datos desde identidades actuales.

Claves operativas:

- `pet-doctor.workspace.v2`: workspace actual en localStorage.
- `pet-doctor.quotes-master.v1`: respaldo de migración anterior, no borrarlo automáticamente.
- `pet-doctor.calls-demo.v1`: única URL de comunicaciones; el nombre es heredado y la conexión también sirve para correo.
- `pet-doctor.integration-test.v1`: clave de configuración retirada; nunca reutilizar su URL.
- `pet-doctor.session.v1`: sesión académica.

La persistencia es completa o ninguna, con detección de cambios entre pestañas y candidato pendiente ante cuota/bloqueo. El respaldo pendiente es distinto de una base guardada con éxito. Preservar estos contratos al modificar importaciones o navegación.

## 4. Historial y cargas CSV

Historial general desplegable al final de Cotización; fecha/hora de Lima, selección independiente de cliente/perrito, búsqueda sin tildes, filtros inclusivos, 20 filas por página, suma de resultados y detalle de consulta. Ficha cliente relaciona por IDs, jamás por nombres. El CSV resumido del historial exporta una fila por atención; es un reporte, no una carga detallada.

Clientes/perritos: una fila por perrito, dueños agrupados por DNI. DNI existente permite incorporar perritos sin sobrescribir datos del dueño. Datos contradictorios o IDs cruzados bloquean el archivo completo; mismo ID de perrito idéntico se omite. Sin ID, nombre homónimo del mismo dueño es ambiguo y bloquea. Revisión genera IDs una vez, conserva candidato al fallar y rechaza bases cambiadas desde revisión. [Guía de clientes CSV](carga-clientes-perritos-csv.md).

Atenciones: una fila por servicio, agrupada por `atencion_id`. Cliente y perrito deben existir y relacionarse; fecha/hora estricta en Lima, sin futuro, configuraciones/atributos coherentes. Se rechazan servicios repetidos o combinaciones incompatibles. Importe de servicio opcional: vacío calcula con catálogo actual con aviso; explícito conserva histórico y añade ajuste de desglose si hace falta. Cero se admite con aviso. Importes en céntimos seguros, sin negativos, máximo dos decimales; controles opcionales de subtotal/IGV/total deben conciliar exactamente. IGV 18 %, usando `pricing.totalize()` y reparto común. IDs existentes iguales se omiten; diferencias explícitas bloquean sin sobrescribir; valores omitidos se comparan con el snapshot guardado. [Guía de atenciones CSV](carga-atenciones-csv.md).

Límites CSV: 5 MB, 5.000 filas, UTF-8/BOM, detección de coma o punto y coma por cabecera, comillas escapadas y saltos internos válidos. Descargas con punto y coma, BOM y CRLF. Máximo 10.000 atenciones. Confirmación bloqueada si hay errores o no hay novedades; cancelación sin escrituras. Las cargas no generan comunicaciones ni PDFs.

## 5. Datos de demostración e IDs estables

- `examples/clientes-perritos-ejemplo-10.csv`: 10 clientes/15 perritos originales, conservados como referencia.
- `examples/clientes-perritos-ejemplo-25.csv`: 25 clientes/45 perritos. Los 10/15 iniciales mantienen datos y relaciones; sobre esa base se añaden solo 15 clientes y 30 perritos.
- `examples/atenciones-ejemplo-150.csv`: 150 atenciones, 200 filas de servicios; 100 con un servicio y 50 con dos. Primeros 15 perritos: cuatro atenciones; otros 30: tres. Fechas 22/08/2026–30/10/2026.
- IDs de clientes: `csv-demo-cliente-01` a `csv-demo-cliente-25`.
- IDs de perritos: `csv-demo-perrito-01` a `csv-demo-perrito-45`.
- IDs de atenciones: `csv-demo-atencion-001` a `csv-demo-atencion-150`.
- DNI de prueba con ceros iniciales y correos `example.com`; teléfonos sintéticos sin autorización de comunicación.
- Totales de control: subtotal `1809050`, IGV `325629`, total `2134679` céntimos PEN: **S/ 21.346,79**.

Importar primero identidades y luego atenciones. No añadir estos teléfonos a listas permitidas de n8n. La demostración no representa la base real del usuario.

## 6. Pet Doctor Analítica

Sitio autocontenido en `analitica/`, CSS propio, seis indicadores y cinco gráficos interactivos. **ECharts 6.0.0 local**, licencia Apache 2.0 y NOTICE en `analitica/vendor/`, sin CDN ni claves externas. No incluye cotización, comunicaciones, edición de catálogo o atenciones.

IndexedDB independiente: base `pet-doctor.analytics`, versión de almacenamiento `1`, almacén `datasets`, registro `active` con `{revision,data:{workspace,meta}}`. Nunca lee automáticamente localStorage operativo ni la configuración n8n. La separación es funcional: dos rutas de Pages comparten origen, por lo que no es una barrera de seguridad frente a código del mismo origen.

`data.js` prepara cargas, valida conciliación financiera estricta y normaliza una fila por servicio. `query()` es la única selección que alimenta KPIs, gráficos, tabla y CSV; no recalcula tarifas ni escribe. `storage.js` aplica candidato completo y revisión esperada en una transacción; `BroadcastChannel`/foco detectan cambios y la transacción impide sobrescritura aunque el aviso no llegue. `charts.js` genera gráficos y tablas accesibles. `app.js` controla revisión, filtros, detalle, descargas y recuperación.

Entradas: JSON completo v2 o respaldo propio (`type: pet-doctor.analytics`, versión `1`) reemplazan tras revisión; CSV usa los validadores copiados y exige identidades primero. JSON máximo 20 MB. CSV conserva límites y reglas del operativo. No aceptar CSV de reporte del historial/dashboard como carga detallada. Ante fallo, candidato retenido, respaldo `PENDIENTE` y reintento. Vaciar requiere confirmación y revisión; no toca al cotizador. Los datos cargados no se escriben en los archivos del sitio o repositorio.

Métricas: importe sin IGV y desglose IGV/total, atenciones únicas, ticket medio neto, clientes/perritos identificados, recurrencia (clientes ≥2 atenciones / clientes identificados). Mostrar cantidad de servicios y registros sin vínculo. Estos últimos suman importes y atenciones, pero no inventan identidades. Sin denominador: `—`. Importes no equivalen a cobros ni utilidades.

Gráficos: evolución diaria/semanal desde lunes/mensual (periodos con registros), servicios relevantes, mapa día/hora (actividad, no agenda), Top 10 clientes sin contactos y grupos de frecuencia 1/2/3/4+. Cada uno tiene tabla y filtros equivalentes por controles. Fechas inclusivas Lima, accesos rápidos anclados a la fecha real, filtros visibles y retirables. Servicios usa OR y suma solo filas coincidentes, sin duplicar atenciones. Frecuencia se calcula con los demás filtros antes de aplicar su propio grupo. Categoría desconocida: Sin clasificar, conservando snapshot e importe.

Tabla de 20 atenciones, diferenciando neto filtrado de total original. CSV descarga todos los servicios coincidentes de todas las páginas, BOM/punto y coma/CRLF, coma decimal, escape y protección de fórmulas. JSON es el respaldo restaurable. Primera carga usa todo el intervalo; posteriores conservan filtros compatibles y avisan al retirar valores inexistentes. Filtros no persisten entre recargas.

Sincronización reproducible: `node scripts/sync-analytics.cjs`, desde raíz. Copia siete módulos puros y cuatro CSV en `analitica/lib/` y `analitica/examples/`; actualiza SHA-256 en `dependencies.json`. No modifica las fuentes operativas. Sincronizar deliberadamente tras cambiar catálogo/validadores: puede afectar futuras importaciones sin precio explícito, nunca snapshots ya guardados. [Guía completa](../analitica/README.md), [continuidad específica](analitica-estado.md).

## 7. Correo, llamada y n8n

El usuario informó de llamada iniciada y correo aceptado, pero este entorno no contiene una comprobación reciente del workflow remoto. Los archivos `workflows/` son plantillas/contratos versionados, no garantía de la configuración remota actual. No ejecutar pruebas reales sin solicitud explícita del usuario y destino autorizado.

Una URL de webhook compartida para ambos canales, definida en Datos y respaldos por el usuario; inicialmente sin credenciales empaquetadas. HTTPS, o HTTP únicamente para localhost. Header Auth: **`X-PetDoctor-Call-Key`**; clave solo en memoria, borrada al recargar/cerrar sesión, nunca en JSON/localStorage/respaldos. CORS normal, preflight con ese encabezado y Content-Type; no usar `no-cors` ni introducir proxy sin acuerdo. `webhook-test` necesita Listen for test event; producción requiere flujo publicado por el usuario.

- Llamada: `action: llamada`, `phone`, `message`, `clientId`, `requestId`; mensaje 1–120 puntos de código, NFC y trim; destinatario de ficha internacional y solo lectura. Revisión y confirmación explícita. n8n valida lista permitida de pares cliente/teléfono; Twilio queda configurado solo en n8n.
- Correo: `action: correo`, `email`, `subject`, `message`, `clientId`, `requestId`; cuerpo 1–360 puntos de código, asunto hasta 200 sin saltos de línea, destinatario de ficha. Validar lista permitida cliente/correo antes de Gmail. La cuenta trial de Twilio tuvo restricciones de parámetros: no revertir a una configuración antigua suponiendo que sea equivalente.
- Tiempo máximo 15 segundos, bloqueo de doble clic y cierre durante envío, sin reintentos automáticos. Resultado desconocido exige revisar proveedor/n8n antes de repetir; `requestId` correlaciona, no garantiza deduplicación distribuida.
- Llamada aceptada: HTTP 202, `ok:true`, `status:llamada_iniciada`, mismo `requestId/clientId`, `callSid` válido. No afirmar contestación ni mensaje escuchado.
- Correo aceptado: HTTP 200, `ok:true`, `status:correo_enviado`, mismo `requestId/clientId`, `messageId` válido. No equivale a lectura/entrega final.
- Errores: 400 inválida, 403 destino no autorizado, 401/403 autenticación, 502 proveedor/no confirmable. No devolver respuestas completas de proveedor ni secretos.
- Nodos adaptadores devuelven sobre interno `{statusCode,response}`. **Respond to Webhook** debe enviar solo `{{ $json.response }}` como cuerpo y `{{ $json.statusCode }}` como código; Webhook en Using Respond to Webhook Node. No enviar el sobre ni el input original. Switch debe separar correctamente válido/fallback y no ejecutar dos ramas para una solicitud. Ante discrepancias comparar requestId de la misma ejecución.
- Para Code de n8n pegar el snippet ejecutable indicado por la guía, en JavaScript/Run Once for All Items. Un cuerpo de función pegado fuera de contexto produjo antes Illegal return statement; no reemplazar validaciones previas al adaptar el correo.

Guías: `docs/correo-n8n.md`, `docs/llamadas-demo-n8n.md`, `docs/pruebas-n8n.md`; contratos/plantillas en `workflows/`. No se reproducen aquí tokens, claves de Header Auth, credenciales OAuth/Twilio ni destinatarios reales.

## 8. Pruebas, ejecución y publicación

**156 pruebas aprobadas, cero fallos y cero omitidas**: 132 regresiones operativas y 24 nuevas de Analítica. Incluyen tarifas/IGV, vínculos, snapshots, CSV conflictivos y límites, fechas de Lima, reimportación, cuota simulada, concurrencia, recuperación, aislamiento, contratos de comunicaciones y DOM/teclado/foco. fake-indexeddb simula almacenamiento en pruebas; la demostración se guardó también en IndexedDB real de Chrome.

Desde raíz: `node --test tests/*.test.cjs`. Para ejecutar todas deben estar disponibles `jsdom` y `fake-indexeddb` como dependencias de desarrollo. En esta máquina:

```powershell
$env:NODE_PATH='C:\Users\Alber\Documents\Codex\2026-10-30\b\work\analytics-runtime\node_modules;C:\Users\Alber\Documents\Codex\2026-10-30\b\work\test-runtime\node_modules'
node --test tests/*.test.cjs
```

En otro equipo instalar ambas en una carpeta de desarrollo externa y configurar NODE_PATH; no son dependencias del sitio en producción. No añadir node_modules a Git.

Servidor local operativo: `python -m http.server 8765 --bind 127.0.0.1`; Analítica sola: `python -m http.server 8766 --bind 127.0.0.1 --directory analitica`. Servir por HTTP local/HTTPS evita diferencias de persistencia de file://.

Analítica se revisó realmente en Chrome a 360, 768 y 1440 px: cinco gráficos SVG locales, filtros y página sin desbordamiento horizontal. Tablas pueden desplazarse dentro de su contenedor. Captura de entrega fuera del repositorio: `outputs/pet-doctor-analitica.png`. No afirmar certificación multibrowser o de lectores de pantalla.

La corrección del cotizador está en `assets/application.css` y `assets/quote-controls.css` (cargada al final): excluir radio/checkbox de dimensiones de campos de texto; tamaños/base flex compactos y textos flexibles. Regresión de estilos aprobada. Su inspección original file:// fue bloqueada por política del navegador; no se eludió y su revisión geométrica completa sigue pendiente. La revisión de Analítica no demuestra la del cotizador.

GitHub Pages sirve la raíz, con `.nojekyll`; Analítica tiene index propio en la subcarpeta. No cambiar configuración/credenciales para desplegar ni publicar respaldos privados. Antes de publicar: verificar diff, archivos, pruebas, ausencia de claves y HEAD remoto. Mantener actualizada la documentación vigente en vez de presentar notas históricas como estado actual.

## 9. Pendientes y límites reales

No hay backend, sincronización ni usuarios/permisos de producción. Cada navegador conserva su base; JSON privado es el respaldo. No se incluyeron costos, pagos, agenda, ficha clínica, eliminación desde historial ni comunicaciones persistentes. n8n depende de la cuenta, vigencia y configuración del usuario. El proyecto no guarda ni despliega sus claves.

Próximas tareas solo a solicitud: comprobar la configuración real de Gmail/Twilio, revisar cotizador en viewport real autorizado, mejorar cobertura multibrowser/accesibilidad, o diseñar backend/sincronización. No automatizar llamadas, correos ni nuevas publicaciones solo porque existan botones o endpoints.

Publicación reproducible: .gitattributes preserva bytes de analitica/ y examples/*.csv; scripts/sync-analytics.cjs normaliza módulos copiados a LF. Así se conservan BOM/CRLF de descargas CSV y huellas SHA-256 al clonar en otros sistemas.
