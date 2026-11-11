# Estado de Pet Doctor

## Publicación autorizada — 11/11/2026

El usuario solicita subir y publicar la última versión con demostración guiada en operativo y Analítica. Se conservan main y Pages desde raíz, con /analitica/. Incluye también los scripts locales pendientes de validación sin listas de IDs; publicar esos archivos no modifica el workflow de n8n. Las notas de entrega local siguientes son antecedentes. Verificar Actions para el commit exacto y los botones nuevos servidos por HTTPS antes de declarar terminada la publicación.


## Primer uso con demostración integrada — 11/11/2026, LOCAL

A petición del usuario se recupera la demostración como opción visible sin archivos. Clientes vacío ofrece acceso a Datos y sincronización; «Cargar datos de prueba» prepara 25 clientes, 45 perros, 150 atenciones y 200 servicios con los generadores v3 existentes. Confirmación explícita informa reemplazo de base/cotización y total S/ 21.346,79. Cancelar conserva el trabajo; fallos usan recuperación centralizada; repetir reemplaza sin duplicar. Analítica ofrece su demostración independiente mediante la revisión y transacción existentes, etiqueta ficticia y restablecimiento de filtros al confirmar. Sin nuevas operaciones de archivos ni llamadas/correos automáticos. Esta decisión sustituye la retirada de demostración descrita en notas de octubre. Paquete local actualizado, sin publicación remota. Verificación: 195 pruebas aprobadas; Chrome con cancelación, carga/repetición, fichas e historial, exportación, persistencia analítica y revisión visual a 360/768/1440 px. Ninguna petición externa durante el recorrido.


## Webhook compartido sin listas de IDs — 31/10/2026, LOCAL

Por petición del usuario se retiran las listas clientId→teléfono/correo en los contratos y scripts generados. Nuevo workflows/validar-invocacion.code.js reemplaza el nodo compartido completo para ambas acciones. Conserva Header Auth en Webhook, IDs obligatorios para correlación, límites, campos admitidos y respuestas; adaptadores y proveedores sin cambios. Guía docs/webhook-compartido.md sustituye las instrucciones antiguas de listas. Las restricciones de Twilio/Gmail siguen aplicando. Verificación: 190 pruebas aprobadas, incluidas 20 de comunicaciones; sin comunicaciones reales ni modificación de n8n remoto. No publicado en esta intervención.


## Publicación autorizada — 31/10/2026

El usuario solicita subir las copias locales y publicar. Esta entrega reúne registro v3, snapshots y edad estimada, tres plantillas de correo y reorganización de archivos con CSV analítico único. Se mantiene main y Pages desde raíz, conservando /analitica/. Sin cambios remotos a n8n ni envío de comunicaciones. Las notas de entrega local siguientes son antecedentes; antes de declarar la publicación terminada se comprobará el build correspondiente al commit y los recursos servidos por HTTPS.

## Estado vigente — archivos centralizados y CSV analítico único — 31/10/2026, LOCAL

Datos y sincronización es un módulo principal: JSON completo carga/descarga, exportación CSV para Analítica, carga masiva de atenciones y configuración n8n. Clientes contiene su carga CSV. Historial conserva el reporte filtrado y Cotización el PDF, Nueva y Guardar atención. Retiradas carga de cotización, registro JSON independiente y descargas de ejemplos/plantillas. Recuperación excepcional (reintento, respaldo pendiente, descarte) exclusivamente en Datos y sincronización; formularios muestran acceso sin descargas propias.

Analítica carga solo el nuevo CSV y conserva IndexedDB y conjuntos previos. Retiradas entradas JSON/CSV separados/demostración y todas las descargas analíticas. Conserva filtros, seis indicadores y cinco gráficos sin cambios. Reemplazo completo tras revisión, progreso/cancelación por bloques, reintento ante cuota y control de concurrencia. El original CSV permite recuperar la carga. Vaciar mantiene confirmación y revisión.

Contrato analytics-csv versión 1: una fila por servicio con datos visibles e importes exactos y celdas JSON que preservan snapshots, entidades actuales, estado y desglose. Exporta todos los guardados, no filtros/candidatos/cotizaciones independientes ni entidades sin atenciones. Conciliación estricta de componentes, servicios y atención; rechaza duplicados/contradicciones y nunca recalcula precios históricos. Workspace sigue v3. Nuevo módulo puro assets/analytics-csv.js, copiado con el sincronizador (nueve módulos). Guía vigente: [archivos-y-sincronizacion.md](archivos-y-sincronizacion.md), que sustituye las referencias históricas a controles retirados.

Verificación: 188 pruebas aprobadas, cero fallidas/omitidas; sintaxis y git diff --check aprobados. Control de exportación y reconstrucción: 25 clientes, 45 perros, 150 atenciones, 200 servicios, 2.134.679 céntimos. Revisión Chrome a 360/768/1440: módulo Datos, inventario, cotización conservada al navegar, descarga real del CSV y carga completa en Analítica con métricas conciliadas. Datos ficticios, sin peticiones externas, comunicaciones, cambios n8n, commit ni publicación. Las notas anteriores siguientes son cronológicas y no describen las entradas/salidas vigentes.

## Plantillas de correo — 31/10/2026, LOCAL

Implementadas tres plantillas editables desde la ficha: Coordinación de cita, Recordatorio de cita y Seguimiento de atención. Redacción libre conservada como opción inicial. Selector explícito de perrito del dueño y fecha/hora futuras de Lima para citas. Botón de aplicación sustituye el texto únicamente al pulsarlo; cambios posteriores de selección exigen reaplicar. Los controles quedan bloqueados durante revisión/envío y se rehabilitan al editar. Revisión conserva destinatario de la ficha, límites 200/360, confirmación real y contrato n8n sin modificaciones. No se reserva agenda ni se persisten plantillas, mensajes o selecciones; apertura nueva empieza vacía. El módulo puro assets/email-templates.js se carga antes de customer-profile.js.

Verificación: 180 pruebas aprobadas, cero fallidas/omitidas. Pruebas nuevas: generación de las tres variantes, vínculo dueño/perro, fecha/hora, datos inválidos, texto sin truncamiento, edición, bloqueo/revisión, reinicio y ausencia de escrituras/envíos al preparar. Chrome revisado a 360/768/1440 px sin desborde horizontal del diálogo. No se ejecutan comunicaciones reales ni se modifica el workflow remoto. Entrega local, sin publicar.

## Estado vigente del módulo de registro ampliado — 31/10/2026, LOCAL

Implementado workspace v3, distrito de cliente, especie Canino, raza/sexo/edad de perro y nacimiento estimado por años/meses y fecha de referencia de Lima. Peso opcional y cotización por rango conservados. Registros antiguos utilizables; al cambiar una entidad se completan sus obligatorios. Se preservan fechas estimadas al editar otros campos. Observaciones de atención opcionales, hasta 2.000 caracteres; snapshots independientes de cliente/perro y edad histórica. Actualizar servicios no sustituye los snapshots anteriores.

Clave activa pet-doctor.workspace.v3 y respaldo pet-doctor-base-v3.json. Migración desde v2/maestro sin borrar claves antiguas, candidato pendiente/reintento ante cuota y control de concurrencia. Registro JSON versión 2 con botón de exportación propio. Nuevas columnas CSV y compatibilidad heredada, revisión atómica y conflictos sin sobrescritura. Historial exporta columnas nuevas desde snapshots; PDF y tarifas sin cambios. Guía normativa de este módulo: [modelo-v3.md](modelo-v3.md), que sustituye las notas previas sobre el modelo activo.

Ejemplos actualizados con datos ficticios: IDs, vínculos y control 25 clientes/45 perros/150 atenciones/200 filas/2.134.679 céntimos conservados. Fixtures v2 retenidos. Analítica copia validadores y ejemplos nuevos y preserva v3 al respaldar; no cambian gráficos, KPI, filtros, diseño ni CSV de Analítica. records.js se carga antes de files y se copia con el sincronizador. No se modifican workflows ni comunicaciones.

Verificación: 175 pruebas aprobadas, cero fallidas/omitidas, con jsdom 27.2.0 y fake-indexeddb de desarrollo fuera del repositorio. Nuevos casos de edad/calendario, migración, cuota, snapshots, CSV/JSON y DOM. Revisión visual real Chrome del registro/ficha a 360/768/1440 px, navegación de teclado, guardado sin peso, detalle/observaciones e importación v3 en Analítica. Sin desborde horizontal de página/diálogo en las vistas comprobadas. La prueba de especificidad CSS con hoja antigua se ejecutó además en Chrome; jsdom comprueba únicamente dimensiones de la hoja final. No es certificación multibrowser ni de lectores de pantalla.

Entrega exclusivamente local: sin commit/push, publicación, llamadas, correos ni cambios remotos n8n. Las tres plantillas quedan para el siguiente módulo. Las secciones cronológicas siguientes describen versiones anteriores y no sustituyen este estado.

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


## Estado vigente: correo desde la ficha — entrega local, 30 de octubre de 2026

Implementado Enviar correo: destinatario registrado de solo lectura, asunto 1–200, mensaje 1–360, NFC/trim y Array.from, revisión y confirmación real, bloqueo durante envío, 15 s y sin reintentos. El cliente y correo se verifican al confirmar. Una dirección simple, IDs obligatorios y payload mínimo action correo/email/subject/message/clientId/requestId. Una sola URL y X-PetDoctor-Call-Key; etiqueta de clave generalizada y secreto únicamente en memoria. Sin migración ni persistencia de comunicaciones.

HTTP 200 + correo_enviado + ambos IDs + messageId no vacío es aceptación Gmail, no entrega/lectura. Error/red/CORS/timeout/JSON inválido/correlación incorrecta producen resultado desconocido; revisar Gmail y n8n antes de repetir. 400 datos, 403 par cliente-correo no autorizado, 401/403 autenticación, 502 proveedor/no confirmable.

Cambios de n8n a cargo del usuario: docs/correo-n8n.md incluye instrucciones y códigos completos. workflows/validar-correo.snippet.js se ANTEPONE al validador existente; intercepta correo y conserva el recorrido original para llamada, incluidas sus listas reales. CORREOS_PERMITIDOS vacía por defecto. workflows/adaptar-gmail.code.js es un nodo NUEVO, conectado a Respond to Webhook existente. Fuentes reproducibles en email-contract.cjs y build-email-snippets.cjs. No sustituir el remoto con el JSON viejo de llamadas. No se modificó n8n ni se enviaron comunicaciones.

95 pruebas aprobadas, 0 fallidas, 0 omitidas: 16 tarifas/archivos, 11 workspace, 9 historial/CSV, 3 configuración, 9 llamadas, 9 correo/n8n y 38 DOM. Verificados los fragmentos ejecutables y sus contratos, conservación del flujo de llamadas, secreto fuera de respaldo, teclado/foco y conservación de cotización. Revisión visual real a 360/768/1440 pendiente. Gmail real pendiente de configuración y prueba por el usuario. Esta nueva entrega es LOCAL; Pages sigue con el commit publicado anteriormente. Las notas anteriores que dicen que el botón de correo sigue pendiente son históricas.


## Publicación de correo solicitada — 30 de octubre de 2026

El usuario solicita subir la entrega porque está fuera de su PC. Se publica el formulario de correo de 360 caracteres, validaciones y guía docs/correo-n8n.md en main/GitHub Pages. 95 pruebas aprobadas, ninguna omitida. Se conservan la conexión única, clave solo en memoria y rama de llamada. Ninguna clave, credencial real ni backup de clientes se incluye. El usuario debe aplicar los cambios de n8n y realizar la prueba de Gmail; no se envían comunicaciones ni se modifica el workflow remoto durante esta publicación. Las menciones anteriores a entrega solo local corresponden al estado previo a esta solicitud.


## Estado vigente: carga masiva CSV — 31 de octubre de 2026, local

Implementadas las tres acciones en Datos y respaldos: plantilla CSV, ejemplo 10 clientes/15 perritos e importación con revisión de 20 filas por página, conteos, errores/avisos por fila/columna y confirmación/cancelación. Capa independiente assets/registry-csv.js: parser entrecomillado UTF-8/BOM, autodetección de coma/punto y coma por cabecera, límites 5 MB y 5.000 registros, normalización y candidato sin escritura. assets/registry-csv-view.js controla la UI y usa App.commit con huella de base para confirmación y reintento. Persistencia y workspace siguen en versión 2.

DNI agrupa dueños; existentes solo se reutilizan si nombre/correo NFC-trim y dígitos de teléfono coinciden. IDs de cliente cruzados son conflicto. Perrito con ID existente idéntico se omite; diferencias bloquean. Sin ID, nombre homónimo del mismo dueño es ambiguo y bloquea; con IDs distintos se admite y avisa. Toda validación falla sin aplicar registros parciales. IDs nuevos se preparan una vez y se conservan hasta confirmar/reintentar. Sin novedades, Confirmar deshabilitado. Cambios locales/eventos de almacenamiento invalidan la revisión; el store también rechaza otra pestaña sin evento. Mantiene candidato pendiente y respaldo ante cuota/bloqueo.

Plantilla y ejemplo guardados en examples/clientes-perritos-plantilla.csv y examples/clientes-perritos-ejemplo-10.csv. Ejemplo: cinco clientes con uno y cinco con dos perritos; IDs csv-demo estables, nombres ficticios, DNI de prueba 00000001–00000010, teléfonos sintéticos no autorizados y correos example.com. UTF-8 BOM, semicolon, CRLF; artefacto tabular verificado y comparación exacta con descarga de UI. No se publican bases reales ni se hacen llamadas/envíos.

113 pruebas aprobadas, 0 fallidas, 0 omitidas (95 previas y 18 nuevas: 10 capa CSV y 8 DOM). Incluyen recarga, idempotencia, CSV corrupto/Unicode/comillas/saltos, conflictos, tamaños, paginación, cuotas/reintento, carreras de lectura, cambio de base y conservación de cotización/historial. Guía: docs/carga-clientes-perritos-csv.md. Revisión visual real 360/768/1440 pendiente; DOM no certifica geometría.

Esta entrega CSV queda LOCAL, sin commit/push ni publicación ni modificación de n8n. La importación JSON y exportación CSV de atenciones continúan; importación masiva de atenciones pendiente de siguiente tarea. Las notas históricas que excluyen toda importación CSV quedan sustituidas por esta entrega.


## Corrección del layout del cotizador — 31 de octubre de 2026, local

Una regla de assets/application.css aplicaba width:100%, min-height:48px y margin-top:8px a todos los inputs de app-main, incluyendo radios y checkboxes. En las tarjetas flex del cotizador ocupaban el ancho disponible y desplazaban el texto. Se limita esa regla a campos que no sean checkbox/radio/file, también en diálogos; los controles de elección recuperan sus tamaños de 16/19 px y sus márgenes originales. No se cambian tarifas ni datos ni el layout de la carga CSV.

114 pruebas aprobadas sin fallos ni omitidas. Nueva regresión de estilos computados con todas las hojas CSS en orden: inclusión, opciones, adicionales, segmentos y selector de peso conservan ancho compacto, sin altura mínima 48 ni margen 8; el buscador conserva width 100% y min-height 48. Estas comprobaciones no sustituyen revisión geométrica/visual completa del navegador, que sigue pendiente. Corrección aplicada a la copia local, sin publicar.


## Ajuste adicional a partir de captura del usuario — 31 de octubre de 2026

La captura mostraba radios/casillas grandes y texto reducido a una columna vertical, compatible con dimensiones de campo de texto aún activas. Se añade assets/quote-controls.css al final de las hojas del documento. Fija ancho, alto, mínimos, máximos y base flex de controles dentro de #quote-module (16/19 px), y reserva espacio flexible para textos de tarjetas e inclusión. La hoja nueva y su especificidad evitan depender de que se haya renovado application.css en caché.

Regresión ampliada: se inyecta después de todas las hojas una regla antigua .app-main input con width 100%, min-height 48 y margen 8; los controles mantienen dimensiones/base flex compactas y los textos flex-grow 1. Verificación de estilos computados y regresiones aprobadas. La inspección directa de la pestaña file:// fue bloqueada por la política del navegador; no se intentó eludirla. No se certifica revisión visual real. Cambios locales, sin publicar.


## Estado vigente: 25 clientes, 45 perritos y 150 atenciones CSV — 31 de octubre de 2026, LOCAL

Ampliado botón/archivo de clientes a 25/45 conservando intactos los 10/15 originales; legacy example() y archivo 10 siguen compatibles, example25() genera el nuevo. Añadida carga histórica de atenciones: 150 registros/200 filas, 100 atenciones con un servicio y 50 con dos; primeros 15 perritos tienen cuatro y siguientes 30 tres. Periodo 22/08/2026–30/10/2026, IDs csv-demo estables. Nuevos CSV en examples/clientes-perritos-ejemplo-25.csv, atenciones-ejemplo-150.csv y atenciones-plantilla.csv. Total de ejemplo 2.134.679 céntimos PEN. Archivos producidos mediante artefacto tabular y contrastados con sus generadores de descarga.

assets/attention-csv.js valida/grupa por atención, exige vínculo existente y dueño completo, fechas y horas estrictas en America/Lima, servicios/configuraciones/datos tarifarios. Acepta importes históricos, ajuste de desglose, cero con aviso y controles exactos. Parser parametrizado en registry-csv.js, vista compartida registry-csv-view.js con prefijos únicos y scopes csv/attention-csv. pricing.totalize() extrae la conciliación/IGV usada por calculate(), con comprobación de rango seguro; regresiones de tarifas intactas. Sin migración, workspace sigue v2. No modifica registros de perritos, no crea cotizaciones independientes ni recalcula precios históricos al consultar.

IDs de atención existentes coincidentes se omiten; se conservan datos/precios omitidos de sus snapshots. Cualquier diferencia explícita bloquea, sin actualizar. Revisión de 20 filas, conteo/total de nuevas, errores y avisos con ID. Huella de base y store protegen contra cambios entre revisión/confirmación/reintento. Persistencia completa, candidato pendiente ante error y respaldo diferenciado. Se conservan cotización y filtros; fichas/historial se actualizan por IDs.

132 pruebas aprobadas, 0 fallidas, 0 omitidas: 114 anteriores + 12 atención CSV + 6 DOM. Verificados archivos 25/45/150/200, ampliación desde 10/15, fechas al cruzar medianoche, vínculos, configuraciones, moneda/céntimos/IGV, precios omitidos y ajustes/cero, idempotencia/snapshots, límite 10.000, errores/rollback, paginación, reintento y conservación de cotización. Guía completa docs/carga-atenciones-csv.md. Revisión geométrica real 360/768/1440 pendiente por bloqueo de acceso file://; sin eludirlo.

Entrega exclusivamente local, sin commit/push/publicación ni modificación de n8n ni comunicaciones. La publicación existente sigue en el commit anterior. Las notas históricas que describen importación de atenciones como pendiente quedan sustituidas por este apartado.

## Pet Doctor Analítica — 31/10/2026, entrega LOCAL

Implementado sitio independiente y autocontenido en analitica/, con URL prevista /pet_doctor/analitica/. Almacenamiento propio IndexedDB pet-doctor.analytics, sin lecturas automáticas de localStorage ni configuración n8n. Seis métricas y cinco gráficos ECharts 6.0.0 vendorizados con Apache LICENSE/NOTICE; filtros visibles equivalentes por controles y gráficos, detalle de consulta y CSV por servicio. JSON completo/restauración propia reemplaza tras revisión; CSV incorpora usando los validadores operativos copiados. Validación financiera adicional estricta y transacción completa con revisión entre pestañas, candidato pendiente/backup/reintento. Sin recálculo en consultas.

Demostración exacta 25 clientes, 45 perritos, 150 atenciones, 200 servicios; total con IGV S/ 21.346,79. Sincronización reproducible: scripts/sync-analytics.cjs y manifiesto SHA-256. Guía de métricas, carga y licencias: analitica/README.md. Contratos y continuidad específica: docs/analitica-estado.md.

156 pruebas aprobadas sin fallos ni omitidas: 132 regresiones y 24 nuevas de datos, almacenamiento, gráficos y DOM. Revisión real exclusiva de Analítica en Chrome por HTTP local a 360/768/1440 px, cinco gráficos SVG locales, filtros visibles y sin desbordamiento de página. No sustituye la revisión pendiente del cotizador operativo ni certifica todos los navegadores/lectores de pantalla. IndexedDB y cuota se simularon también en pruebas automatizadas; el navegador real cargó/persistió la demostración.

No se publicó, activó n8n ni hizo commit/push. Conservar cambios operativos previos sin mezclar al publicar: analitica/ es independiente. No hay datos reales cargados en archivos del proyecto. Permanecen límites de un navegador, cuotas variables, sin sincronización ni acceso de producción; importes no equivalen a cobros o utilidades. El CSV de reporte no restaura la base; usar JSON.

## Subida autorizada a GitHub y traspaso — 31/10/2026

El usuario solicita subir todos los cambios pendientes de estas tareas: cargas CSV de clientes/perritos y atenciones, corrección del cotizador, sitio Analítica y documentación. Esta autorización sustituye la restricción temporal de entrega exclusivamente local de los apartados anteriores. Se conserva la rama main y el contenido anterior; no se modifican workflows remotos n8n ni se incluyen bases reales o claves de comunicaciones.

Documento de continuidad completo: docs/traspaso-ia.md (en README usar el enlace relativo correspondiente). Incluye arquitectura, contratos, claves de almacenamiento, IDs ficticios estables, métricas, pruebas, instrucciones de ejecución/publicación y pendientes. Copia entregable fuera del repositorio: outputs/traspaso-ia-pet-doctor.md. Suite final: 156 pruebas aprobadas sin fallos/omisiones. El estado de Pages debe verificarse después de actualizar main; el último commit remoto identifica la revisión publicada.
