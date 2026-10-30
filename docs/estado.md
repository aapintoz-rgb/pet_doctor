# Estado de Pet Doctor

## Alcance acordado

Repositorio de destino: https://github.com/aapintoz-rgb/pet_doctor

Aplicación web académica en HTML y tecnologías complementarias. Archivos JSON cargados/descargados por el usuario como almacenamiento del modelo. CSV para importación y exportación específicas. n8n tentativo; posible uso futuro de Google Apps Script. No se ha definido todavía la conexión ni sus contratos.

## Implementado

- Módulo 1: login académico y cierre de sesión.
- Credenciales iniciales: admin / PetDoctor123.
- Sesión por pestaña con sessionStorage; alternativa en memoria si está bloqueado.
- Pantalla de inicio con cotizador y sección de clientes y perritos.
- Diseño adaptable a móvil, etiquetas, foco de teclado y errores accesibles.
- Cotizador de seis servicios con datos mínimos, planes, componentes, ajustes por tamaño, descuentos e IGV del 18 %.
- Seis ilustraciones locales generadas para identificar los servicios.
- Carga de registro de dueños y mascotas y recuperación de cotizaciones JSON.
- PDF comercial con desglose, texto de venta, vigencia y disclaimer académico.
- Base maestra JSON de cotizaciones: persistencia local en el navegador, importación, exportación y actualización sin duplicar identificadores.

## Organización

- index.html: acceso y pantalla de inicio.
- assets/auth.js: validación y lectura de sesión.
- assets/app.js: eventos y navegación de vistas.
- assets/styles.css: presentación adaptable.
- assets/catalog.js y assets/pricing.js: catálogo de tarifas y cálculo monetario.
- assets/files.js: validación de cotizaciones, registros y base maestra.
- assets/pdf.js: generación local del PDF comercial.
- assets/quote.js y assets/quote.css: interfaz y comportamiento del cotizador.

## Decisiones

- Login en cliente autorizado expresamente para esta versión académica.
- No guardar la contraseña en la sesión.
- No implementar todavía CSV ni llamadas a servicios externos. Se autoriza el registro directo de atenciones realizadas desde el cotizador.
- Mantener las secciones futuras como información, sin botones que simulen funciones inexistentes.
- Una cotización puede contener varios servicios para una sola mascota.
- El PDF y la base maestra se generan localmente. La base persiste en el almacenamiento del navegador y se respalda mediante descarga JSON.
- Volver a guardar el mismo identificador actualiza su registro en la base maestra en vez de duplicarlo.

## Siguiente tarea

El registro básico de clientes y perritos está implementado en esta entrega local. Esperar una nueva tarea para agenda, consulta de atenciones u otro módulo; no iniciar esos módulos ni publicar sin autorización.

## Verificación

- Comprobación de sintaxis JavaScript aprobada con Node.
- Comprobaciones con DOM simulado aprobadas: credenciales correctas e incorrectas, mostrar/ocultar contraseña, restauración y cierre de sesión, sesión corrupta y almacenamiento bloqueado. También se comprobaron las referencias HTML a scripts y estilos.
- Revisión visual aprobada en navegador mediante servidor local y en la publicación de GitHub Pages.
- Estado previo a esta intervención: código sincronizado en la rama `main` de https://github.com/aapintoz-rgb/pet_doctor.
- GitHub Pages habilitado desde la raíz de `main`: https://aapintoz-rgb.github.io/pet_doctor/.
- Dieciséis pruebas automatizadas aprobadas para tarifas, límites de peso, descuentos, IGV, archivos y base maestra.
- Comprobación en navegador aprobada para cálculo, persistencia de la base al recargar y descarga PDF.
- PDF verificado con pdfinfo, extracción de texto y renderizado de todas sus páginas a PNG; sin contenido recortado ni superpuesto.

## Cambio anterior — separación de PDF y atención (superado en persistencia y requisitos de identidad por la actualización siguiente)

- «Generar cotización» únicamente descarga el PDF. No modifica la base ni marca los cambios como guardados.
- Nuevo botón «Guardar atención» en el resumen de escritorio y el detalle móvil. Registra los servicios directamente como `realizada`, sin agenda ni generación de PDF.
- Guardar otra vez el mismo ID actualiza la atención y conserva `performedAt`. «Nueva» inicia otro ID.
- Se mantiene el contrato del maestro versión 1 y las cotizaciones anteriores; se agrega `attentions`, opcional al importar bases antiguas. Cada registro tiene tipo `pet-doctor.attention`, versión 1, ID, estado `realizada`, fecha ISO `performedAt` e instantánea `quote` compatible con el contrato de cotización.
- La atención se persiste en localStorage y viaja en «Descargar base» / «Cargar base». Las versiones previas de la aplicación no gestionan atenciones; usar la versión actualizada para conservar este campo al trabajar con respaldos.
- Validación de servicios completos, fecha, estado, concordancia de ID y duplicados. Los datos personales continúan siendo opcionales. No se implementó consulta de historial, agenda ni ficha clínica.
- Importar la base pide confirmación antes de reemplazar datos existentes y distingue guardado persistente de conservación solo en memoria. Ante fallo de almacenamiento se mantienen cambios pendientes y se indica descargar el respaldo JSON.
- Verificación: 22 pruebas aprobadas (16 previas y 6 nuevas), con contratos, actualización sin duplicados, respaldo y recuperación, controladores reales con DOM simulado, PDF sin escritura en la base, guardado sin PDF y almacenamiento bloqueado. El generador PDF está simulado en las pruebas de controladores; no se modificó `assets/pdf.js`.
- Revisión visual pendiente: el navegador de herramientas rechazó abrir `file://` por su política de protocolos. No se realizó inspección de los anchos 360/768/1440 px.
- Cambios realizados solo en la copia local. No se publicó ni se actualizó GitHub Pages.

## Actualización anterior — clientes y perritos, 30 de octubre de 2026

- Implementado el plan de registro local: relación un cliente a varios perritos, buscador por nombre/DNI/teléfono/perrito, selectores dependientes, alta múltiple en diálogo, incorporación de perritos y edición básica sin eliminación.
- Cliente nuevo: nombre, DNI peruano de 8 dígitos único y teléfono de 7 a 15 dígitos obligatorios. Nombre del perrito obligatorio; peso/rango y pelaje opcionales. Nombres de perritos repetidos generan aviso, sin bloqueo.
- «Generar cotización» sigue siendo solo PDF y admite anonimato. «Guardar atención» exige registros existentes, dueño completo y pertenencia válida, en interfaz y capa de datos. Estado directo `realizada`; sin PDF ni agenda.
- La identidad de una atención guardada queda fija. Actualizar el mismo ID conserva fecha; modificar el registro no altera snapshots previos. Para otro perrito o una atención histórica sin relación válida se usa «Nueva».
- `assets/workspace.js`: validación, búsqueda, registro/edición, migración, importación y transacciones. `assets/clients.js` y `assets/clients.css`: selectores y diálogo. `assets/quote.js`: integración del estado de cotización con el registro.
- Fuente activa: documento `pet-doctor.workspace`, versión 2, clave `pet-doctor.workspace.v2`, con `owners`, `pets`, `quotes`, `attentions`. Mantiene IDs y agrega DNI al cliente. Las atenciones nuevas conservan `registration` con IDs y `ownerSnapshot` además de `quote`.
- La base anterior se migra sin borrar `pet-doctor.quotes-master.v1`; registros históricos anónimos se conservan sin inventar clientes. Un archivo de registro anterior se incorpora, no reemplaza; conflictos de ID o DNI rechazan la operación completa. Los clientes incompletos se corrigen en el formulario.
- Exportación completa `pet-doctor-base-v2.json`; carga validada y con confirmación antes de reemplazar. Límite de archivo: 20 MB, sin prometer esa capacidad de localStorage.
- Las escrituras se validan antes de persistir y solo se aplican a la base activa si el guardado termina. Errores mantienen formulario, reintento y respaldo pendiente diferenciado. Se detectan cambios de otra pestaña antes de sobrescribir; en ese caso se respalda el candidato y se recarga para trabajar con la base actual.
- Verificación actual: **37 pruebas aprobadas, 0 fallidas, 0 omitidas**: 16 de tarifas/archivos, 9 de workspace y 12 de controladores e interfaz con jsdom. PDF simulado en las pruebas de interfaz; `assets/pdf.js` no fue modificado. Se comprobó sintaxis y referencias locales.
- Diálogo con etiquetas, controles nativos, foco inicial, cancelación con Escape y retorno del foco comprobados con DOM. CSS adaptable para escritorio y móvil. **Pendiente revisión visual real a 360/768/1440 px**; el entorno de navegador había bloqueado abrir archivos locales, y jsdom no comprueba geometría ni renderizado.
- Sin publicación, sin sincronización ni servidor nuevo. No se agregaron dependencias de ejecución. jsdom se instaló temporalmente en `work/test-runtime`, fuera del repositorio, para verificar interfaz.

## Actualización anterior — historial y exportación CSV, 30 de octubre de 2026

- Historial desplegable al final del cotizador y antes del pie, inicialmente cerrado; muestra todas las atenciones realizadas guardadas. Conserva estado abierto/cerrado y filtros al guardar o cargar una base. No incorpora operaciones pendientes ni cotizaciones PDF.
- Columnas: Fecha y hora, N.º de atención, Cliente, DNI, Perrito, Servicios, Total (S/), Estado y Detalle. Vista de tarjetas bajo 1000 px; controles y formularios adaptables a móvil.
- Filtros propios por fechas inclusivas, cliente, perrito y búsqueda normalizada por código/cliente/DNI/perrito, sin alterar la selección del cotizador. Paginación de 20, contador y suma de todos los resultados. Opciones derivadas de snapshots del historial; incluye Sin vínculo registrado. Los filtros con valores ausentes después de reemplazar la base se conservan y muestran cero coincidencias.
- Detalle de solo lectura con identidad guardada, ID completo, componentes, descuentos, importes e IGV. Botón de cierre, Escape, foco inicial y retorno al botón de origen comprobados con DOM. Se toleran desgloses antiguos incompletos y se indican importes desconocidos sin inventarlos.
- `assets/history.js`: consulta, proyección de snapshots, fechas en America/Lima, filtrado, sumas y CSV. `assets/history-view.js` y `assets/history.css`: historial y detalle. `assets/quote.js` actualiza la vista después de escrituras exitosas, sin añadir efectos de persistencia a la consulta.
- Se usa `performedAt`, ya persistido y conservado al actualizar; no se usa `quote.createdAt`. Sin migración ni cambios al workspace versión 2. No se agregaron edición de fechas, agenda, edición/eliminación de atenciones ni importación CSV.
- CSV de todos los resultados filtrados, con una fila por atención y 17 columnas. UTF-8 BOM, punto y coma, CRLF, importes con coma decimal y dos decimales, fecha/hora de Lima, servicios unidos por ` | `. Escape de texto y neutralización de prefijos de fórmulas. Nombre pet-doctor-atenciones-AAAA-MM-DD.csv. JSON sigue siendo el respaldo completo; importar DNI/teléfono como texto en Excel.
- **52 pruebas aprobadas, 0 fallidas, 0 omitidas**: 16 de tarifas/archivos, 9 de workspace, 9 de consulta/CSV y 18 de interfaz con jsdom. Incluyen medianoche de Lima, fechas inclusivas, snapshots, datos antiguos, CSV especial, filtros combinados, 45 resultados en varias páginas, exportación completa, inmutabilidad del cotizador/base, fallo de guardado y actualización sin duplicados.
- Sintaxis JavaScript y referencias locales comprobadas. **Pendiente revisión visual real a 360/768/1440 px**; las pruebas DOM no verifican geometría ni renderizado. Se mantiene la limitación de acceso a archivos locales del navegador de herramientas documentada anteriormente.
- Cambios solo locales; sin publicación ni nuevas dependencias de ejecución.

## Actualización anterior — módulos, ficha cliente y pruebas n8n, 30 de octubre de 2026

- Menú lateral/escritorio y desplegable/móvil: Clientes y Cotización al mismo nivel. Inicio en Clientes tras login. Navegación sin recarga conserva cotización, cliente/perrito seleccionados, opciones, cambios pendientes y filtros del historial.
- `assets/application.js` concentra una sola instancia del workspace, commits, suscripciones, errores y respaldos pendientes, importación/exportación general, configuración y ciclo de vida de módulos. Cotización conserva únicamente sus responsabilidades y su selector contextual; no actúa como hub.
- `assets/customer-profile.js` implementa listado/búsqueda y ficha independiente con datos, perritos, edición, resumen e historial exacto por IDs guardados. No vincula homónimos. Reutiliza el historial y su detalle con IDs prefijados y fuente filtrada por dueño. El historial general permanece en Cotización.
- Un único editor compartido en `assets/clients.js`, montado fuera de ambas vistas. Editar desde Clientes actualiza el registro y selectores sin cambiar la selección ni sobrescribir datos tarifarios en curso del cotizador.
- Correo `email` opcional al leer bases anteriores, obligatorio y válido al crear o editar al dueño. No único. Se conserva en respaldo y ownerSnapshot nuevos; no se modifica retrospectivamente. Dueños anteriores sin correo pueden recibir atenciones y agregar perritos; solo la prueba de correo queda bloqueada. `saveClient` distingue la operación `addPets` para no editar accidentalmente al dueño ni exigir correo en ese caso.
- `assets/integration.js`: acciones constantes prueba_correo/prueba_llamada, preparación de payload mínimo, URL, configuración separada y POST JSON/CORS, sin credenciales, con timeout 15 s, cancelación y sin reintentos automáticos. No existe una opción para enviar acciones correo/llamada reales.
- Modal de comunicaciones desde la ficha: asunto/mensaje, correo tomado del registro, teléfono internacional explícito, resultado y requestId, bloqueo durante petición. Solo HTTP 400 + ok false + status solicitud_invalida + requestId coincidente comprueba la rama de error. Diferencia fallos HTTP, 404, red/CORS, timeout, cancelación y respuestas inválidas. Resultado temporal, sin log persistente.
- Configuración de pruebas en Datos y respaldos: clave `pet-doctor.integration-test.v1`, inicialmente vacía, fuera del respaldo de clientes. HTTPS o HTTP localhost; sin credenciales en URL. No hay peticiones al iniciar ni al guardar configuración.
- **67 pruebas aprobadas, 0 fallidas, 0 omitidas**: 16 tarifas/archivos, 11 workspace, 9 historial/CSV, 5 integración y 26 interfaz con jsdom. Verificadas navegación/selecciones independientes, correo obligatorio y compatibilidad, snapshots, respaldos y guardados pendientes, contrato de rechazo y pruebas con transporte simulado, errores y cancelación. Se mantuvieron las regresiones anteriores.
- Prueba real de n8n **pendiente**: no se ha configurado endpoint ni confirmado escucha activa. Ningún correo o llamada real solicitado, ningún cambio remoto ni publicación realizados. `docs/pruebas-n8n.md` contiene el contrato y pasos CORS/preflight.
- Pendiente revisión visual real a 360/768/1440 px. CSS adaptable implementado y controles/foco verificados con DOM; jsdom no prueba geometría. No se eludió la restricción previa del navegador para abrir archivos locales.

## Actualización vigente — llamadas de demostración, 30 de octubre de 2026

- Llamar desde la ficha usa teléfono registrado internacional de solo lectura y mensaje inicialmente vacío, con contador 0/120. Normalización NFC/trim y conteo por puntos de código en navegador y n8n. Sin recorte ni prefijo supuesto.
- Revisión de cliente/número/mensaje antes de Confirmar llamada real. Se verifica existencia y número nuevamente al confirmar. Bloqueo durante espera de dobles clics, cierre/Escape y cambio de módulo; después solo cerrar o preparar una nueva llamada. No reintentos ni historial de comunicaciones.
- Funciones separadas prepareCall/runCall en integration.js; las funciones de prueba de rechazo se conservan. Probar correo sigue usando el flujo previo.
- URL de llamadas separada en pet-doctor.calls-demo.v1. Header X-PetDoctor-Call-Key, valor de sesión solo en memoria, nunca en workspace, localStorage o respaldos; campo vaciado al guardar/cerrar. Sin URL/clave o número internacional no se habilita la llamada. Logout y recarga olvidan la clave.
- JSON importable `workflows/pet-doctor-llamadas-demo.json`, desactivado, sin credenciales, From vacío y PERMITTED vacío. Header Auth antes del validador; 400 para datos inválidos y 403 para pares no autorizados. Twilio dinámico To/Message con Use TwiML false. Continuación de errores hacia adaptador que no revela mensajes crudos del proveedor.
- Respuesta aceptada: HTTP 202, llamada_iniciada, requestId/clientId correlacionados, Call SID y estado inicial válidos. Solo se informa aceptación, no respuesta del cliente. 502, timeout, desconexión y salida inesperada producen Resultado desconocido, sin reenvío automático. IDs de operación no equivalen a deduplicación distribuida.
- `workflows/call-contract.cjs` y `build-calls.cjs` conservan funciones y generación reproducible. `docs/llamadas-demo-n8n.md` documenta importación, credenciales, lista de destino, contratos y CORS/preflight con la nueva cabecera.
- Prueba real de n8n/Twilio pendiente: no se importó, activó ni publicó el flujo, ni se inició una llamada. Las credenciales, From y pares permitidos deben configurarse por el usuario y el trial puede imponer restricciones adicionales.
- CSS adaptable del modal y revisión agregados. La revisión visual real a 360/768/1440 px sigue pendiente; DOM no certifica geometría.

Verificación de esta entrega de llamadas: **82 pruebas aprobadas, 0 fallidas, 0 omitidas** (16 tarifas, 11 workspace, 9 historial/CSV, 5 integración de pruebas, 9 llamadas/workflow y 32 interfaz DOM). Comando completo: `node --test tests/*.test.cjs` con jsdom disponible en NODE_PATH. Sintaxis de JS y generador comprobada; 21 referencias locales sin archivos faltantes. Se conserva pendiente la verificación real de importación/autenticación/preflight y llamada autorizada en n8n/Twilio, además de revisión visual real.


## Estado vigente: una sola conexión n8n — 30 de octubre de 2026

La aplicación tiene una única URL en Datos y respaldos → Conexión n8n, para el workflow modificado existente. Se conserva pet-doctor.calls-demo.v1 y se elimina al iniciar pet-doctor.integration-test.v1; nunca se reutiliza la URL antigua, incluso si el almacenamiento impide borrarla. Las notas anteriores sobre dos conexiones y pruebas de rechazo son históricas y quedan sustituidas por este apartado.

Se retiraron prepare/run y las acciones de prueba de la aplicación. La ficha conserva Llamar, revisión y confirmación real, mensaje de hasta 120 caracteres, correlación y control de errores. Enviar correo · Pendiente está deshabilitado hasta integrar Gmail. La clave sigue solo en memoria; ni claves ni configuración se exportan con los clientes. No se modifica ni ejecuta el workflow remoto ni se genera una llamada con esta actualización.

Verificación: **79 pruebas aprobadas, 0 fallidas, 0 omitidas** (16 tarifas, 11 workspace, 9 historial/CSV, 3 configuración, 9 llamadas/workflow y 31 interfaz DOM). Se verifica la retirada de la URL antigua, conservación de la actual y del workspace, correo inactivo, y regresiones. La revisión visual real y la llamada autorizada con el flujo remoto siguen pendientes.


## Entrega para GitHub Pages — 30 de octubre de 2026

Preparada publicación de la copia local en main para https://aapintoz-rgb.github.io/pet_doctor/. Clave Header Auth introducida por el usuario y mantenida solo en memoria; verificado que no aparece en almacenamiento, respaldo ni tras logout. No se suben datos locales, claves reales ni endpoints personales. Credenciales de proveedores exclusivamente en n8n. Datos de negocio aislados por navegador/origen; trasladar mediante JSON. Origen CORS a permitir: https://aapintoz-rgb.github.io, incluyendo preflight del encabezado X-PetDoctor-Call-Key. No se altera el n8n remoto.

Usuario confirmó llamada real y respuesta llamada_iniciada usando HTTP Request con Url de plantilla. El mensaje personalizado no está comprobado y se muestra la limitación del trial en la revisión. JSON de workflow de referencia no sustituye al flujo remoto ya modificado. Gmail pendiente. 79 pruebas automatizadas aprobadas antes de publicar; comprobación de la publicación se realiza por separado.

Publicación comprobada por HTTPS: HTTP 200, módulo Clientes y única conexión n8n presentes, configuración anterior ausente. Código y assets publicados; 79 pruebas aprobadas. No se realizó ninguna comunicación ni se cambió el workflow remoto durante la publicación.
