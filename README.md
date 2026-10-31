# Pet Doctor

Aplicación web académica para servicios de perros, en HTML, CSS y JavaScript. No necesita servidor de aplicación, framework, compilación ni paquetes para ejecutarse. Las ilustraciones y pdf-lib están incluidas localmente; Google Fonts es opcional.

## Abrir y acceder

Abre `index.html` o sirve la carpeta con un servidor HTTP estático. Acceso académico: **admin / PetDoctor123**. Este login en el navegador no protege datos y no es autenticación de producción.

Sitio de GitHub Pages: https://aapintoz-rgb.github.io/pet_doctor/. Publicación actualizada con Clientes, Cotización y la conexión única de n8n. Esta actualización incluye el formulario de correo de 360 caracteres. Completa los nodos de Gmail siguiendo la guía antes de probar el envío.

## Navegación y ficha cliente

Después del login se abre **Clientes**. El menú lateral en escritorio y desplegable en móvil permite cambiar entre **Clientes** y **Cotización**, sin recargar ni descartar la cotización en curso. Son módulos al mismo nivel; el cotizador no funciona como menú de la aplicación.

**Clientes** contiene un listado con búsqueda por nombre, DNI, teléfono, correo o perrito. Abrir una ficha muestra los datos actuales del cliente, sus perritos, edición y alta de perritos, resumen de atenciones y un historial propio. Este historial usa IDs guardados; no atribuye registros antiguos por coincidencia de nombres. Su selección es independiente del cliente elegido para cotizar.

**Datos y respaldos** es una acción general del menú: allí se carga o descarga la base completa, se incorporan registros anteriores y se configura la única conexión con n8n. «Nueva» y «Cargar cotización» permanecen en Cotización.

## Cotizar y guardar una atención

- **Generar cotización** descarga únicamente el PDF y admite cotizar sin registro. No guarda una atención ni modifica la base.
- **Guardar atención** requiere servicios completos y seleccionar un cliente registrado con uno de sus perritos. Se registra directamente como **realizada**, sin agenda ni PDF.
- **Nueva** inicia otra atención. Volver a guardar el mismo formulario actualiza su atención, conserva la fecha de realización y no duplica el ID. Una atención guardada conserva su cliente y perrito.

El cotizador incluye consulta, vacunas, desparasitación, grooming, guardería y aprendizaje; tarifas académicas en PEN, descuentos e IGV del 18 %. El PDF conserva el desglose, la vigencia y el disclaimer académico. No constituye diagnóstico, prescripción, reserva ni comprobante de pago.

## Clientes y perritos

Dentro de Cotización, la sección contextual **Cliente y perrito** está disponible antes de los servicios. El editor que abre es el mismo que utiliza el módulo Clientes. Busca por nombre, DNI, teléfono, correo o perrito, sin distinguir tildes ni mayúsculas; el teléfono se busca sin separadores. Se muestran hasta 20 coincidencias sin seleccionar automáticamente. Elegir un resultado de perrito selecciona también al dueño.

- **Nuevo cliente** abre el formulario para registrar al dueño y uno o varios perritos juntos.
- Cliente: nombre completo, DNI peruano de ocho dígitos, teléfono de 7 a 15 dígitos y correo válido obligatorios al crear o editar. El DNI es único y conserva sus ceros iniciales; teléfono y correo pueden compartirse. Los clientes anteriores sin correo muestran «Correo pendiente», pueden recibir atenciones y agregar perritos sin modificar al dueño; para editar sus datos deben completar el correo.
- Perrito: nombre obligatorio. Peso o rango de tamaño y pelaje opcionales. Se avisa si hay nombres repetidos para el mismo dueño, sin impedir guardarlos.
- **Agregar perrito** vincula otro al cliente seleccionado. **Editar datos** permite actualizar al dueño y sus perritos, conservando IDs.
- El selector de perritos muestra solo los del cliente actual. Cambiar cliente limpia el perrito elegido; los servicios se conservan.
- **Cotizar sin registro** limpia la identidad y conserva las opciones de servicios y tarifa. Después de guardar una atención, usa **Nueva** para cambiar su identidad.
- Los datos tarifarios modificados en el cotizador afectan solo esa atención; editar el registro requiere **Editar datos**. Los nudos se confirman nuevamente cuando el servicio los requiere.

## Historial de atenciones y CSV

Al final del cotizador, antes del pie de página, despliega **Historial de atenciones realizadas**. Se inicia cerrado, muestra el número de atenciones guardadas y mantiene filtros propios, independientes del cliente y perrito de la cotización actual.

La grilla contiene **Fecha y hora, N.º de atención, Cliente, DNI, Perrito, Servicios, Total (S/), Estado y Detalle**. En pantallas pequeñas se presenta como tarjetas con la misma información. El detalle es de solo consulta e incluye el ID completo, identidad, servicios y componentes, descuentos, subtotal, IGV y total.

- Orden de más reciente a más antigua según `performedAt`, la fecha del primer guardado de la atención; no se usa la fecha de inicio de la cotización. Se muestra y filtra en **America/Lima**. Actualizar la misma atención conserva esa fecha.
- Filtros inclusivos Desde/Hasta, cliente, perrito y búsqueda por código, nombre del cliente, DNI o nombre del perrito, ignorando tildes y mayúsculas. Paginación de 20 filas, contador y suma de todos los resultados filtrados.
- El historial muestra snapshots e importes guardados, sin actualizarlos con los datos actuales del cliente ni recalcular tarifas. Registros anteriores sin vínculo se conservan como **Sin vínculo registrado**, sin inventar DNI ni identificaciones.
- Solo aparecen operaciones guardadas correctamente. Generar un PDF o mantener un guardado pendiente no añade filas. Guardar o cargar una base actualiza el historial sin cerrar su sección ni limpiar filtros.

**Descargar CSV de resultados** exporta todas las coincidencias, también las de otras páginas, con una fila por atención. Se deshabilita cuando no hay resultados. Nombre: `pet-doctor-atenciones-AAAA-MM-DD.csv`, según la fecha de Lima.

Cabecera exacta:

```text
atencion_id;fecha_atencion;hora_atencion;zona_horaria;cliente_id;cliente_nombre;cliente_dni;cliente_telefono;perrito_id;perrito_nombre;servicios;subtotal_pen;igv_pen;total_pen;moneda;estado;vinculo_registrado
```

Formato: UTF-8 con BOM, punto y coma, líneas CRLF, fecha `AAAA-MM-DD`, hora `HH:mm:ss`, importes con dos decimales y coma decimal sin separadores de miles. Los servicios se unen con ` | ` y los campos desconocidos quedan vacíos. Se escapan comillas, separadores y saltos; los campos de texto con prefijos interpretables como fórmulas reciben un apóstrofo protector, incluidos teléfonos que comienzan por `+`.

Al importar en Excel, indica que DNI y teléfono son **texto** para conservar ceros iniciales. El CSV es un reporte de atenciones; **Descargar base (JSON)** sigue siendo el respaldo completo de clientes, perritos, cotizaciones y atenciones. La copia local incorpora carga histórica de atenciones CSV; no hay edición ni eliminación desde el historial. Las cargas CSV se describen más abajo.

## Conexión única con n8n

En **Datos y respaldos → Conexión n8n** hay una sola URL: la del workflow modificado. La URL de llamadas ya configurada se conserva. La antigua configuración de pruebas se elimina al iniciar y nunca se reutiliza. Se retiraron las acciones de prueba. La copia local habilita **Enviar correo** con destinatario registrado, conexión y clave; requiere completar manualmente la rama Gmail en n8n.

## Llamar desde la ficha (demostración controlada)

**Llamar** usa exclusivamente el teléfono internacional registrado del cliente, de solo lectura en el modal. Se habilita después de configurar en Datos y respaldos una URL de llamadas y una clave Header Auth de sesión. La clave usa el encabezado `X-PetDoctor-Call-Key`, permanece solo en memoria y se pierde al cerrar sesión o recargar; únicamente la URL se guarda en `pet-doctor.calls-demo.v1`, fuera de los respaldos de clientes.

Escribe un mensaje de **1 a 120 caracteres Unicode**, normalizado con NFC y trim, sin recorte automático. Revisa cliente, teléfono y mensaje y pulsa **Confirmar llamada real**. No se añade prefijo ni se permite un destino alternativo; corrige el teléfono desde Editar datos. La aplicación vuelve a comprobar que no cambió antes de enviar.

El flujo de n8n valida los datos y un par autorizado `clientId → teléfono`. La lista viene vacía por defecto. Configura además la credencial Header Auth del Webhook, la de Twilio y el número Voice de origen. El correo se configura en la misma conexión; consulta la guía de correo.

**Workflow:** usa el flujo modificado que ya tienes en n8n. `workflows/pet-doctor-llamadas-demo.json` queda como referencia opcional, desactivada y sin credenciales ni From; no necesitas un segundo workflow. **Guía completa:** `docs/llamadas-demo-n8n.md`, con contrato JSON, mapeo de nodos, preflight y pasos de configuración.

Solo HTTP 202 con IDs correlacionados y Call SID válido muestra **Llamada iniciada**; no confirma que el cliente contestó. Timeout, desconexión o respuesta inesperada muestran **Resultado desconocido** y piden revisar Twilio antes de otra llamada. El cierre y los dobles clics se bloquean durante la espera de hasta 15 segundos. No hay reintentos automáticos, callbacks ni historial de comunicaciones. El resultado permanece solo en pantalla.

Esta entrega se probó con transporte y resultados simulados. Queda pendiente verificar esta versión con el workflow modificado y una llamada a un destino verificado/autorizado. No se activó ni publicó el workflow.

## Datos, respaldos y compatibilidad

El documento `pet-doctor.workspace`, versión 2, se guarda en localStorage con la clave `pet-doctor.workspace.v2`. Contiene `owners`, `pets`, `quotes` y `attentions`. Cada perrito tiene un `ownerId`; las atenciones nuevas verifican esa relación y conservan una instantánea de identidad y precios. Editar un registro no reescribe atenciones previas.

**Descargar base** exporta todo como `pet-doctor-base-v2.json`. **Cargar base** valida antes de reemplazar y pide confirmación. El respaldo completo permite trasladar los datos a otro navegador o equipo. No existe sincronización entre equipos ni escritura automática a un archivo del disco. Se admiten archivos de hasta 20 MB, pero la cuota de localStorage depende del navegador y puede ser menor.

La base anterior `pet-doctor.quotes-master.v1` se migra automáticamente sin borrar su clave original. Se conservan cotizaciones y atenciones históricas, incluidas las que no tienen identidad registrada. Esas atenciones no se convierten en clientes ni se reasignan; utiliza **Nueva** para registrar una atención válida.

**Importar registro anterior** incorpora archivos `pet-doctor.registry`, versión 1, manteniendo IDs. Los dueños sin DNI o teléfono quedan incompletos y deben completarse antes de guardar atenciones. Los conflictos de ID o DNI rechazan toda la importación sin sobrescribir datos.

El registro y guardado son completos: ante un fallo de almacenamiento, la base activa no cambia y se conserva el formulario. **Reintentar guardado** vuelve a intentarlo; **Descargar respaldo pendiente** incluye el candidato aún no aplicado, con un nombre que lo distingue del respaldo de la base actual. Cerrar el formulario descarta ese candidato. Modificar una atención después de un fallo invalida su intento pendiente para no guardar datos anteriores.

Los datos permanecen al cerrar sesión y pertenecen al navegador y origen usados. Mantén el mismo origen y puerto para acceder a la misma base. No uses datos personales reales en archivos de ejemplo ni los subas a Git.

## Pruebas y documentación

Pruebas de datos y tarifas, sin dependencias adicionales:

```sh
node --test tests/pricing.test.cjs tests/workspace.test.cjs tests/history.test.cjs tests/integration.test.cjs tests/calls.test.cjs tests/email.test.cjs tests/registry-csv.test.cjs
```

Pruebas de interfaz con DOM: `tests/attention.test.cjs`. Usan **jsdom** como dependencia opcional de desarrollo; no es parte de la aplicación. Si no está disponible, esas pruebas se omiten con un mensaje explícito. En esta entrega se ejecutaron todas mediante una instalación temporal fuera del repositorio:

```powershell
npm install --prefix ../../work/test-runtime jsdom --ignore-scripts --no-save --no-package-lock
$env:NODE_PATH = (Resolve-Path ../../work/test-runtime/node_modules).Path
node --test tests/*.test.cjs
```

Consulta `docs/estado.md` y `docs/ficha-tecnica-continuidad.md` antes de continuar. Siguen pendientes agenda, ficha clínica veterinaria, verificación real de Gmail, despliegue de comunicaciones de producción y Google Apps Script.


## Publicación y claves de sesión

En GitHub Pages, abre Datos y respaldos → Conexión n8n e introduce la URL y tu clave de sesión. La clave se mantiene solo en memoria, no se guarda en localStorage ni en respaldos, y se olvida al cerrar sesión o recargar. Las credenciales de Gmail y Twilio permanecen exclusivamente en n8n. No se incluye ninguna clave real ni endpoint personal en el código publicado.

El sitio es público y su login es académico. La autorización de comunicaciones se aplica en el Webhook de n8n con Header Auth y los destinos permitidos. Configura CORS para el origen https://aapintoz-rgb.github.io (sin /pet_doctor/) y comprueba OPTIONS para Content-Type y X-PetDoctor-Call-Key. No se ha cambiado la configuración remota.

El navegador publicado tiene un almacenamiento distinto al de la copia local: descarga el respaldo JSON local y cárgalo en Pages si deseas trasladar tus datos. La clave se introduce nuevamente y no viaja con ese respaldo.

Estado comunicado por el usuario: llamada y respuesta llamada_iniciada comprobadas con HTTP Request y Url de plantilla. El trial rechazó los parámetros del nodo Twilio original. La locución personalizada del mensaje sigue pendiente; el flujo operativo actual reproduce la plantilla. El workflow JSON del repositorio conserva una referencia para llamadas con Twiml y no debe reemplazar automáticamente el flujo remoto que ya funciona. La interfaz de correo está implementada localmente; configuración manual y prueba real de Gmail pendientes.


## Enviar correo desde la ficha

Enviar correo usa la dirección de la ficha, de solo lectura, asunto de 1–200 caracteres y mensaje de 1–360 (triple que la llamada). Normalización NFC/trim y conteo Unicode con Array.from, sin truncar. Revisa y confirma el envío real. Se vuelve a comprobar cliente y destinatario; sin URL/clave o dirección única válida no se habilita. No admite adjuntos, HTML, CC ni BCC.

Una sola URL y clave de sesión para correo y llamada. El webhook autoriza el par cliente–correo antes de Gmail. HTTP 200, correo_enviado, IDs correlacionados y messageId verificable confirman la aceptación por Gmail, no la entrega/lectura. Timeout/red/respuesta inesperada: resultado desconocido; revisar Gmail/n8n antes de repetir. Sin reintentos ni persistencia de mensajes/resultados. Workspace sigue en versión 2.

**Tú actualizas n8n:** [guía paso a paso con los códigos completos](docs/correo-n8n.md). El fragmento de validación se antepone al código vigente sin borrar llamadas ni sus destinos; un adaptador Gmail nuevo comparte Respond to Webhook. No importar el workflow antiguo encima del remoto operativo. Las listas reales se configuran solo en n8n.

95 pruebas aprobadas sin omitidas. No se enviaron correos ni llamadas reales ni se modificó n8n. Esta entrega se publica en Pages por solicitud del usuario. Pendientes configuración/prueba de Gmail por el usuario y revisión visual real a 360/768/1440.


## Carga masiva de clientes y perritos CSV — entrega local

En Datos y respaldos puedes descargar una plantilla CSV, descargar un ejemplo de **25 clientes y 45 perritos**, e importar un archivo con revisión previa. Una fila representa un perrito; las filas del dueño se agrupan por DNI. Se detecta punto y coma o coma mediante la cabecera; los archivos descargados son UTF-8 con BOM y CRLF.

Se incorporan clientes nuevos y se reutilizan existentes por DNI solo cuando sus datos coinciden, sin sobrescribirlos. Los IDs evitan duplicados y permiten vincular una futura carga de atenciones. Conflictos y errores bloquean todo el archivo; homónimos con IDs distintos generan aviso. Peso y tamaño son excluyentes. La confirmación valida que la base no cambió, guarda todo o nada y conserva candidato/IDs ante fallo para reintentar o respaldar.

[Guía y reglas de carga](docs/carga-clientes-perritos-csv.md) · [Plantilla](examples/clientes-perritos-plantilla.csv) · [Ejemplo de 25 clientes](examples/clientes-perritos-ejemplo-25.csv).

Límites: 5 MB y 5.000 filas. Importa DNI, teléfono e IDs como texto en Excel; no se reparan automáticamente ceros que Excel haya eliminado. Los registros de ejemplo son ficticios y no autorizan comunicaciones. JSON sigue siendo el respaldo completo y conserva su importación anterior. La nueva carga histórica de atenciones se describe a continuación; no se modifica n8n.

Verificación: **113 pruebas aprobadas, 0 fallidas, 0 omitidas**. Archivo de ejemplo contrastado con el generado por la interfaz, con ceros iniciales, comillas y relaciones conservadas. La nueva carga CSV está en la copia local; aún no se publicó en Pages. Revisión visual real a 360/768/1440 pendiente; CSS adaptable y teclado/foco comprobados con DOM.

Corrección local de presentación: las reglas generales de campos excluyen radios y casillas para conservar las tarjetas del cotizador. Suite actual: 114 pruebas aprobadas, incluida regresión de estilos computados; revisión visual real aún pendiente.


## Carga histórica de 150 atenciones — entrega local

Datos y respaldos incorpora una segunda carga CSV: una fila por servicio, agrupada por ID de atención. Se exigen cliente/perrito existentes y relacionados, fecha/hora válida de Lima, servicios completos y coherencia de importes. Importes de servicio opcionales: vacíos usan catálogo actual con aviso; informados conservan su precio histórico y ajuste de desglose. IGV 18 % y controles exactos en céntimos. Sin cambios a workspace versión 2.

El mismo ID coincidente se omite; diferencias bloquean sin sobrescribir. Datos/precios omitidos en existentes se conservan del snapshot. La escritura es completa o ninguna, con revisión, detección de cambios y recuperación ante cuota. Los filtros e importes de la cotización se mantienen. No se generan PDFs ni comunicaciones.

Carga primero [25 clientes y 45 perritos](examples/clientes-perritos-ejemplo-25.csv) y después [150 atenciones / 200 filas de servicios](examples/atenciones-ejemplo-150.csv). [Plantilla de atenciones](examples/atenciones-plantilla.csv) y [guía con códigos, validaciones y precios](docs/carga-atenciones-csv.md). Los primeros 10 clientes/15 perritos conservan IDs y datos; el nuevo archivo amplía esa base sin duplicar.

132 pruebas aprobadas sin fallos ni omitidas. Archivos UTF-8 con BOM/CRLF comprobados. Nueva entrega solo local: sin publicar Pages ni modificar n8n. Revisión visual real a 360/768/1440 pendiente; DOM y regresión de estilos comprobados.

## Pet Doctor Analítica — entrega independiente local

Nuevo sitio en [analitica/index.html](analitica/index.html), preparado para `/pet_doctor/analitica/`, con estilos y almacenamiento propios. Incluye carga revisada de JSON/CSV, demostración 25/45/150/200, seis indicadores, cinco gráficos interactivos ECharts 6.0.0 locales, filtros combinados, detalle histórico, reporte CSV por servicio y respaldos propios. La base analítica está en IndexedDB `pet-doctor.analytics`; no accede automáticamente al workspace operativo ni a n8n.

[Guía de carga, métricas, arquitectura y licencias](analitica/README.md). Sincronización reproducible de módulos puros/ejemplos: `node scripts/sync-analytics.cjs`. Los snapshots y precios se conservan; la selección suma solo los servicios coincidentes y cuenta atenciones una vez. La demostración concilia S/ 21.346,79 con IGV.

Comprobaciones: 156 pruebas aprobadas, sin fallos ni omitidas, incluidas las 132 regresiones anteriores. Revisión real de **Analítica** en Chrome por HTTP local a 360/768/1440 px, cinco SVG locales y página sin desbordamiento horizontal. Las notas anteriores de revisión visual pendiente del cotizador operativo siguen vigentes. Entrega local, sin commit/push/publicación. No se han modificado el flujo n8n ni los datos operativos para esta tarea.

## Traspaso y subida a GitHub — 31/10/2026

El usuario autoriza subir las entregas pendientes: cargas CSV, corrección del cotizador y Analítica. Esta indicación sustituye las notas anteriores que las limitaban a la copia local. [Documento completo para continuar con otra IA](docs/traspaso-ia.md): arquitectura, IDs de demostración, contratos, ejecución, pruebas y límites. 156 pruebas aprobadas; sin claves reales ni datos de negocio privados incluidos. El build de Pages se comprueba tras actualizar main.
