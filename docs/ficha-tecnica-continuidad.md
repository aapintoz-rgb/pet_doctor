# Pet Doctor — continuidad después de módulos y ficha cliente

Fecha: 30 de octubre de 2026, America/Lima. Esta ficha describe la implementación local; no amplía el alcance ni autoriza publicación.

## Proyecto y reglas

Repositorio: https://github.com/aapintoz-rgb/pet_doctor. Copia activa: `C:/Users/Alber/Documents/Codex/2026-10-30/b/outputs/pet_doctor`.

Leer `AGENTS.md`, `README.md` y `docs/estado.md` antes de modificar. Mantener HTML/CSS/JS sin framework, captura mínima, interfaz en español, PEN e IGV configurado. Un módulo por tarea. No agregar servidor, base remota, CSV o automatizaciones sin una nueva solicitud. El login `admin / PetDoctor123` es académico y no protege datos.

## Recorrido vigente

La sección Cliente y perrito aparece antes de servicios. Búsqueda explícita por nombre, DNI, teléfono y nombre del perrito; resultados hasta 20, normalización de tildes/mayúsculas y teléfono sin separadores. Seleccionar un resultado de perrito selecciona también al dueño; seleccionar solo al dueño no presupone perrito.

Nuevo cliente abre un diálogo para nombre completo, DNI peruano de ocho dígitos y teléfono de 7 a 15 dígitos, más uno o varios perritos. Cada perrito tiene nombre; peso/rango y pelaje opcionales. DNI único, teléfono compartible, aviso no bloqueante para perritos homónimos. Agregar perrito y Editar datos reutilizan el formulario. Cancelar/Escape no aplican datos parciales.

Generar cotización solo descarga PDF y admite anonimato. Guardar atención exige cliente completo y perrito existentes con relación válida; el guardado es directo como realizada. Una mascota por atención, varios servicios. Repetir guardado actualiza por ID conservando fecha y relación. Nueva crea otro ID. Los cambios de tamaño/peso/pelaje en el cotizador no editan el registro; los nudos se vuelven a confirmar cuando corresponde.

## Datos y contratos

- `assets/workspace.js` es la capa de operaciones y persistencia. `assets/files.js` conserva los contratos previos y también exige un registro válido al construir nuevas atenciones. `assets/clients.js` controla el registro y `assets/quote.js` conecta la selección con el cotizador.
- Documento: `type: "pet-doctor.workspace"`, `version: 2`, `currency: "PEN"`, `updatedAt`, `owners`, `pets`, `quotes`, `attentions`. Clave local: `pet-doctor.workspace.v2`.
- Cliente: `id`, `name`, `dni`, `contact`. DNI y contacto vacíos se admiten al importar registros históricos; esos clientes no pueden recibir nuevas atenciones hasta completarlos.
- Perrito: `id`, `ownerId`, `name`, `weightKg`, `size`, `coat`. Peso positivo finito; rango `small/medium/large/null`, pelaje `short/long/null`. En formularios, peso y rango son excluyentes. Los datos previos con ambos priorizan peso al normalizarse.
- Atención nueva: contrato `pet-doctor.attention`, versión 1, ID, `status: "realizada"`, `performedAt`, `quote`, más `registration: {ownerId, petId}` y `ownerSnapshot`. `quote` contiene snapshot de identidad, opciones y precios; la tarifa sigue separada en catálogo y motor de cálculo. Leer archivos no recalcula los precios históricos; recuperar una cotización en el formulario sí recalcula.
- `makeAttention(state, meta, performedAt, registry)` requiere cliente y perrito válidos. `PetDoctorWorkspace.saveAttention(workspace, state, meta)` añade bloqueo de identidad, snapshots y actualización por ID. No volver a habilitar guardado por nombres libres.

## Persistencia, fallos y compatibilidad

La base anterior `pet-doctor.quotes-master.v1` se copia a v2 al iniciar, manteniendo intacta la clave antigua. Las atenciones anteriores sin `registration` se conservan como históricas, sin crear clientes ni reasignarlas. La clave v2 es la fuente activa después de migrar.

`createStore` prepara y valida el documento y actualiza su estado activo solo después de `localStorage.setItem` exitoso. Ante cuota o bloqueo conserva formulario y candidato pendiente para reintento o descarga diferenciada. Editar una atención invalida su candidato previo fallido. Los cambios de otra pestaña provocan rechazo de escritura para evitar pérdidas silenciosas; el usuario respalda y recarga. Una base v2 corrupta no se sobrescribe mediante operaciones normales; la carga explícita de un respaldo validado permite recuperarse.

Descargar base produce `pet-doctor-base-v2.json` completo; Descargar respaldo pendiente produce `pet-doctor-respaldo-pendiente.json` e incluye una operación aún no aplicada. La carga completa valida antes de confirmar reemplazo y descarta el formulario solo después del éxito. Importar registro anterior acepta `pet-doctor.registry`, versión 1, conserva IDs e incorpora todos sus registros de forma conjunta; conflicto de ID o DNI rechaza todo sin sobrescribir. Archivos hasta 20 MB, sin garantizar esa cuota del navegador.

El almacenamiento pertenece al navegador y origen, no se sincroniza, permanece después de cerrar sesión y no sobrescribe archivos del disco. Los respaldos incluyen identificación personal: no usar datos reales en ejemplos ni subir bases personales a Git. El login sigue siendo académico.

## Verificación y pendientes

52 pruebas aprobadas: tarifas y archivos (16), workspace (9), historial/CSV (9) e interfaz con jsdom (18). Comando: `node --test tests/pricing.test.cjs tests/workspace.test.cjs tests/history.test.cjs tests/attention.test.cjs`. La interfaz requiere jsdom opcional disponible en NODE_PATH; README explica instalación temporal externa. No hay instalación necesaria para ejecutar la aplicación.

Se comprobaron creación múltiple, edición, selección, datos incompletos, búsquedas, bloqueo de relaciones inválidas, PDF sin escritura, actualización sin duplicados, snapshots, migración, respaldo, rechazo de conflictos, fallos de cuota, reintento y cancelación/foco del diálogo. jsdom no verifica geometría: queda pendiente revisión visual real de 360/768/1440 px. PDF simulado en los tests de interfaz; no se modificó el generador de PDF.

No se publicó esta entrega. Agenda, eliminación, ficha clínica, importación CSV y n8n/Google Apps Script siguen fuera de alcance. Esperar la siguiente tarea y actualizar esta ficha y el estado al terminar cada módulo.

## Historial y exportación implementados

Al final del cotizador se incluye un details inicialmente cerrado con contador de atenciones realizadas. La consulta es independiente del formulario actual. Columnas: fecha/hora, código, cliente, DNI, perrito, servicios, total PEN, estado y detalle de solo lectura. La presentación cambia a tarjetas en pantallas menores de 1000 px. No incorporar edición ni eliminación sin otra tarea.

Fuente: atenciones de la base activa, solo después de persistencia exitosa. `assets/history.js` ofrece `rows`, `select`, `filterOptions`, `dateParts`, `csv` y `filename`. `select` recibe filtros `from`, `to`, `owner`, `pet`, `search` y devuelve las filas filtradas, cantidad y suma total; no pagina ni escribe. Las claves de filtro registrado se prefijan con `id:`; `unlinked` representa históricos sin vínculo. Las opciones se derivan de snapshots y no del registro actual. `assets/history-view.js` pagina 20 filas y exporta la selección completa. `assets/quote.js` actualiza la vista después de commits exitosos. No volver a renderizar todo el historial al escribir cada dato del cotizador.

Las fechas usan siempre `performedAt`, en America/Lima, con límites de día inclusivos y orden descendente de instante. No usar createdAt de la cotización ni la zona local del equipo. No cambiar el workspace versión 2 ni agregar fechas editables. Nombres, DNI, teléfono y precios provienen de snapshots; nunca completar los datos antiguos con el dueño actual. Se mantienen registros sin vínculo y desgloses incompletos, mostrando No registrado en lugar de inventar valores.

Filtros Desde/Hasta, cliente, perrito dependiente del cliente y búsqueda por ID/nombre/DNI/perrito. Se conservan al guardar o reemplazar la base y el details conserva su estado; si un filtro ya no tiene datos, sigue seleccionado con cero coincidencias. Un cambio de filtro vuelve a página 1. Grilla, suma y CSV usan el mismo criterio de selección.

CSV: una fila por atención, UTF-8 BOM, delimitador `;`, CRLF, fecha AAAA-MM-DD, hora HH:mm:ss, zona America/Lima, cantidades con dos decimales y coma decimal sin agrupación. Cabecera exacta:

```text
atencion_id;fecha_atencion;hora_atencion;zona_horaria;cliente_id;cliente_nombre;cliente_dni;cliente_telefono;perrito_id;perrito_nombre;servicios;subtotal_pen;igv_pen;total_pen;moneda;estado;vinculo_registrado
```

Servicios unidos por ` | `; vínculo `si/no`, campos desconocidos vacíos. Neutralizar fórmulas con apóstrofo protector en texto y escapar comillas/separadores/saltos. DNI permanece como cadena con ceros; indicar importación como texto en Excel para DNI y teléfono. Exportar todas las páginas filtradas y deshabilitar sin resultados. Nombre pet-doctor-atenciones-AAAA-MM-DD.csv con fecha de Lima. CSV es reporte, no reemplaza JSON como respaldo completo.

Pruebas nuevas: medianoche UTC/Lima, filtros inclusivos y combinados, inmutabilidad, snapshots tras cambios del registro, CSV con caracteres especiales/formulas/ceros, históricos sin vínculo o con detalle incompleto, paginación de 45 filas, exportación de todas las páginas, foco y Escape del detalle, actualización tras commit/importación y exclusión de pendientes. 52 aprobadas en total. Permanece pendiente la revisión visual real a 360/768/1440 px.

## Estado vigente: Clientes y Cotización como módulos independientes

Esta sección actualiza las responsabilidades anteriores. `assets/application.js` es la única instancia activa del workspace y el propietario de persistencia, suscripciones, respaldos, recuperación de errores, configuración y navegación. `assets/app.js` sigue manejando autenticación académica y notifica cambios de sesión a la aplicación. Los módulos se registran con funciones de ciclo de vida para cambio de vista, logout, dirty y reemplazo de base; cambiar de módulo no reinicializa el cotizador.

El menú tiene Clientes y Cotización al mismo nivel, con Clientes como inicio. Datos y respaldos es global. El cotizador conserva Nueva, Cargar cotización, selector contextual y el historial general. `assets/customer-profile.js` contiene listado/búsqueda, ficha, perritos, estadísticas e historial limitado a ownerId guardado (registration o quote.state.pet.ownerId), sin unión por nombres. Selección de ficha y selección de cotización son independientes.

`assets/clients.js` separa picker y editor; hay un único editor compartido montado fuera de ambas vistas. Abrir desde Cotización permite seleccionar el resultado; abrir desde Clientes solo actualiza su ficha. Las suscripciones actualizan selectores y resumen sin sobrescribir identidad/opciones de la cotización en curso.

Cliente incorpora email, opcional al leer datos anteriores (se normaliza a vacío), obligatorio y válido al crear/editar al dueño, no único. `completeOwner` sigue siendo el contrato de nombre/DNI/teléfono para atenciones: no agregar correo como condición retroactiva. `validEmail` valida comunicación/edición. `saveClient` acepta operation addPets para conservar al dueño sin exigir correo a los anteriores; no confundir agregar perrito con editar datos del dueño. Snapshots nuevos incluyen email por ownerSnapshot; no modificar snapshots anteriores. Workspace versión 2 permanece.

`assets/integration.js`: configuración en clave separada pet-doctor.integration-test.v1, URL vacía por defecto. prepare produce solo prueba_correo/prueba_llamada con contacto necesario, asunto/mensaje, clientId y requestId nuevo. run rechaza acciones reales, hace POST JSON/CORS con credenciales omitidas, timeout 15 s y cancelación; sin reintentos. Solo valida HTTP 400 + ok false + status solicitud_invalida + mismo requestId. Distingue HTTP, 404, red/CORS, timeout y respuesta inesperada. No transmite DNI, atenciones ni perritos.

Comunicaciones desde la ficha son modales temporales. Probar correo exige email válido; Probar llamada requiere teléfono completo con prefijo internacional sin inferir país. No hay log persistente de comunicaciones, Gmail/Twilio operativos ni configuración remota. `docs/pruebas-n8n.md` describe el contrato, Respond to Webhook y diagnóstico de CORS/preflight. Una prueba real permanece pendiente al faltar URL configurada y escucha confirmada.

67 pruebas aprobadas: 16 tarifas, 11 workspace, 9 historial, 5 integración y 26 DOM. Comando: `node --test tests/pricing.test.cjs tests/workspace.test.cjs tests/history.test.cjs tests/integration.test.cjs tests/attention.test.cjs`. jsdom opcional de desarrollo en NODE_PATH. Se comprobaron conservación entre módulos, selección independiente, editor único, correo y compatibilidad, petición mínima, respuesta esperada y errores mediante transporte simulado. La revisión visual real a 360/768/1440 px continúa pendiente; CSS y DOM no certifican geometría. No se publicó esta entrega.

## Actualización vigente: llamadas reales de demostración

La ficha ahora usa Llamar para llamadas reales controladas; Probar correo conserva el rechazo anterior. No asumir que todas las comunicaciones siguen en modo de rechazo. Llamada: número tomado del registro, sin editar en el modal; exigir formato internacional, corregible solo en Editar datos. Mensaje vacío inicialmente, entre 1 y 120 puntos de código después de NFC/trim (Array.from), sin truncar ni usar maxlength UTF-16. Dos pasos: revisión y confirmación; comprobar que aún existe el cliente y no cambió el número.

integration.js expone prepareCall/runCall independientes de prepare/run. JSON mínimo exactamente action llamada, phone, message, clientId, requestId. URL en pet-doctor.calls-demo.v1, separada de la anterior de pruebas. Clave Header Auth X-PetDoctor-Call-Key solo en memoria de application.js, nunca persistirla ni exportarla. Logout/recarga la olvidan. No habilitar Llamar sin URL y clave.

Workflow de entrega: workflows/pet-doctor-llamadas-demo.json, desactivado, sin credenciales, From vacío y lista PERMITTED vacía. Importar como copia, configurar Header Auth en Webhook y credencial/número Voice en Twilio. Validar invocación aplica tipos, tamaño, formato y par permitido clientId/teléfono; datos inválidos 400, par no autorizado 403, siempre antes de Twilio. To y Message usan el JSON validado, Use TwiML false. Adaptar respuesta Twilio recupera IDs desde Validar invocación, normaliza 202 con SID/estado inicial válidos o 502 con resultado desconocido. Nunca devolver errores crudos de Twilio ni aceptar From/TwiML del navegador.

Fuente reproducible workflows/call-contract.cjs y workflows/build-calls.cjs. Los tests ejecutan funciones y los Code nodes del propio JSON con datos simulados. Guía completa en docs/llamadas-demo-n8n.md. Revisar CORS y OPTIONS para Content-Type y X-PetDoctor-Call-Key; no usar no-cors. Una lista de destino en n8n no sustituye la verificación ni las condiciones del trial de Twilio.

Durante envío (hasta 15 segundos) bloquear confirmación doble, cierre/Escape y cambio de módulo. Timeout/desconexión/respuesta inesperada = Resultado desconocido; no reintentar automáticamente, puede existir llamada. Después solo cerrar o preparar otra llamada. No se añade historial persistente, callbacks, grabación ni deduplicación distribuida. Solo se muestra aceptación, no contestación.

No se ejecutó llamada ni se importó/activó/publicó el flujo remotamente. Pendiente comprobación real con credenciales y destino autorizado. Continúa pendiente la revisión visual real a 360/768/1440 px.

Verificación de esta entrega de llamadas: **82 pruebas aprobadas, 0 fallidas, 0 omitidas** (16 tarifas, 11 workspace, 9 historial/CSV, 5 integración de pruebas, 9 llamadas/workflow y 32 interfaz DOM). Comando completo: `node --test tests/*.test.cjs` con jsdom disponible en NODE_PATH. Sintaxis de JS y generador comprobada; 21 referencias locales sin archivos faltantes. Se conserva pendiente la verificación real de importación/autenticación/preflight y llamada autorizada en n8n/Twilio, además de revisión visual real.


## Estado vigente: una sola conexión n8n — 30 de octubre de 2026

La aplicación tiene una única URL en Datos y respaldos → Conexión n8n, para el workflow modificado existente. Se conserva pet-doctor.calls-demo.v1 y se elimina al iniciar pet-doctor.integration-test.v1; nunca se reutiliza la URL antigua, incluso si el almacenamiento impide borrarla. Las notas anteriores sobre dos conexiones y pruebas de rechazo son históricas y quedan sustituidas por este apartado.

Se retiraron prepare/run y las acciones de prueba de la aplicación. La ficha conserva Llamar, revisión y confirmación real, mensaje de hasta 120 caracteres, correlación y control de errores. Enviar correo · Pendiente está deshabilitado hasta integrar Gmail. La clave sigue solo en memoria; ni claves ni configuración se exportan con los clientes. No se modifica ni ejecuta el workflow remoto ni se genera una llamada con esta actualización.

Verificación: **79 pruebas aprobadas, 0 fallidas, 0 omitidas** (16 tarifas, 11 workspace, 9 historial/CSV, 3 configuración, 9 llamadas/workflow y 31 interfaz DOM). Se verifica la retirada de la URL antigua, conservación de la actual y del workspace, correo inactivo, y regresiones. La revisión visual real y la llamada autorizada con el flujo remoto siguen pendientes.


## Entrega para GitHub Pages — 30 de octubre de 2026

Preparada publicación de la copia local en main para https://aapintoz-rgb.github.io/pet_doctor/. Clave Header Auth introducida por el usuario y mantenida solo en memoria; verificado que no aparece en almacenamiento, respaldo ni tras logout. No se suben datos locales, claves reales ni endpoints personales. Credenciales de proveedores exclusivamente en n8n. Datos de negocio aislados por navegador/origen; trasladar mediante JSON. Origen CORS a permitir: https://aapintoz-rgb.github.io, incluyendo preflight del encabezado X-PetDoctor-Call-Key. No se altera el n8n remoto.

Usuario confirmó llamada real y respuesta llamada_iniciada usando HTTP Request con Url de plantilla. El mensaje personalizado no está comprobado y se muestra la limitación del trial en la revisión. JSON de workflow de referencia no sustituye al flujo remoto ya modificado. Gmail pendiente. 79 pruebas automatizadas aprobadas antes de publicar; comprobación de la publicación se realiza por separado.

Publicación comprobada por HTTPS: HTTP 200, módulo Clientes y única conexión n8n presentes, configuración anterior ausente. Código y assets publicados; 79 pruebas aprobadas. No se realizó ninguna comunicación ni se cambió el workflow remoto durante la publicación.


## Estado vigente: correo desde la ficha — entrega local, 30 de octubre de 2026

Implementado Enviar correo: destinatario registrado de solo lectura, asunto 1–200, mensaje 1–360, NFC/trim y Array.from, revisión y confirmación real, bloqueo durante envío, 15 s y sin reintentos. El cliente y correo se verifican al confirmar. Una dirección simple, IDs obligatorios y payload mínimo action correo/email/subject/message/clientId/requestId. Una sola URL y X-PetDoctor-Call-Key; etiqueta de clave generalizada y secreto únicamente en memoria. Sin migración ni persistencia de comunicaciones.

HTTP 200 + correo_enviado + ambos IDs + messageId no vacío es aceptación Gmail, no entrega/lectura. Error/red/CORS/timeout/JSON inválido/correlación incorrecta producen resultado desconocido; revisar Gmail y n8n antes de repetir. 400 datos, 403 par cliente-correo no autorizado, 401/403 autenticación, 502 proveedor/no confirmable.

Cambios de n8n a cargo del usuario: docs/correo-n8n.md incluye instrucciones y códigos completos. workflows/validar-correo.snippet.js se ANTEPONE al validador existente; intercepta correo y conserva el recorrido original para llamada, incluidas sus listas reales. CORREOS_PERMITIDOS vacía por defecto. workflows/adaptar-gmail.code.js es un nodo NUEVO, conectado a Respond to Webhook existente. Fuentes reproducibles en email-contract.cjs y build-email-snippets.cjs. No sustituir el remoto con el JSON viejo de llamadas. No se modificó n8n ni se enviaron comunicaciones.

95 pruebas aprobadas, 0 fallidas, 0 omitidas: 16 tarifas/archivos, 11 workspace, 9 historial/CSV, 3 configuración, 9 llamadas, 9 correo/n8n y 38 DOM. Verificados los fragmentos ejecutables y sus contratos, conservación del flujo de llamadas, secreto fuera de respaldo, teclado/foco y conservación de cotización. Revisión visual real a 360/768/1440 pendiente. Gmail real pendiente de configuración y prueba por el usuario. Esta nueva entrega es LOCAL; Pages sigue con el commit publicado anteriormente. Las notas anteriores que dicen que el botón de correo sigue pendiente son históricas.


## Publicación de correo solicitada — 30 de octubre de 2026

El usuario solicita subir la entrega porque está fuera de su PC. Se publica el formulario de correo de 360 caracteres, validaciones y guía docs/correo-n8n.md en main/GitHub Pages. 95 pruebas aprobadas, ninguna omitida. Se conservan la conexión única, clave solo en memoria y rama de llamada. Ninguna clave, credencial real ni backup de clientes se incluye. El usuario debe aplicar los cambios de n8n y realizar la prueba de Gmail; no se envían comunicaciones ni se modifica el workflow remoto durante esta publicación. Las menciones anteriores a entrega solo local corresponden al estado previo a esta solicitud.
