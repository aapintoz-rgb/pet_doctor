# Pet Doctor

Aplicación académica para servicios de perros en HTML, CSS y JavaScript, sin framework ni backend. Ilustraciones y pdf-lib locales; Google Fonts opcional. Acceso de demostración **admin / PetDoctor123**; el login no protege datos ni constituye autenticación de producción.

Repositorio: https://github.com/aapintoz-rgb/pet_doctor. Sitios públicos: https://aapintoz-rgb.github.io/pet_doctor/ y https://aapintoz-rgb.github.io/pet_doctor/analitica/. Esta revisión incluye registro v3, plantillas de correo, archivos centralizados con CSV analítico único y demostración guiada sin archivos. Publicación de esta actualización solicitada el 11/11/2026; el estado de despliegue se consulta en Actions de GitHub.

## Navegación y archivos

- **Clientes**: listado, búsqueda, ficha y registro de dueños/perros. Carga masiva de clientes y perros CSV en este módulo.
- **Cotización**: seis servicios, planes/componentes y cálculo inmediato en PEN con IGV 18 %. Generar cotización descarga solo PDF comercial; Guardar atención registra una atención realizada con cliente/perro vinculados. Nueva inicia otra atención. No hay carga de cotización.
- **Datos y sincronización**: cargar/descargar base JSON completa, descargar CSV para Analítica y cargar atenciones históricas CSV y Cargar datos de prueba, previa confirmación de reemplazo. La configuración n8n está separada de las operaciones de archivos dentro de este módulo.
- **Historial**: filtros, detalle y reporte CSV de todas las coincidencias, no solo la página visible. También disponible en la ficha del cliente. El reporte es por atención, no una carga detallada.
- **Analítica**: cargar únicamente el CSV exportado para Analítica; cinco gráficos, indicadores, filtros y tabla. Ofrece «Probar con datos de ejemplo», con revisión y confirmación. No ofrece descargas ni entradas JSON/CSV separados. Mantiene IndexedDB independiente y permite vaciar con revisión.

No hay sincronización automática. Cambiar de módulo conserva la cotización y sus filtros. Ante un fallo, formularios conservan la operación y conducen a Datos y sincronización para reintentar, descargar respaldo pendiente o descartar. El respaldo pendiente no demuestra una escritura exitosa. No hay descargas de plantillas, ejemplos o registro JSON independiente en la interfaz.

Guía vigente y cabecera completa del CSV: [Archivos y sincronización](docs/archivos-y-sincronizacion.md). Los formatos y ejemplos ficticios permanecen en el repositorio para preparar cargas y pruebas.

## Probar por primera vez

Al ingresar con una base vacía, Clientes muestra «Probar con datos de ejemplo». Abre Datos y sincronización y pulsa «Cargar datos de prueba». Revisa la confirmación: reemplaza la base y la cotización actuales; si tienes datos propios, descarga antes la base JSON. Carga 25 clientes, 45 perros y 150 atenciones ficticias (200 servicios, S/ 21.346,79 con IGV), sin archivos ni conexión. Después abre las fichas y sus historiales o selecciona una mascota en Cotización.

Analítica tiene su propio botón «Probar con datos de ejemplo». Muestra cantidades y aviso de reemplazo antes de «Confirmar carga»; cancelar conserva el conjunto anterior. Se guarda únicamente en la base de Analítica. Para analizar tu base propia sigue usando el CSV único. Los botones no ejecutan llamadas ni correos; los contactos ficticios no deben usarse para comunicaciones reales.

## Registro y persistencia

Cliente nuevo: nombre, DNI único de ocho dígitos, celular, correo válido y distrito libre. Perro: nombre, especie Canino fija, raza (admite Mestizo/Desconocida), sexo (incluye No determinado) y edad en años/meses. Peso/rango y pelaje opcionales al registrar; el cotizador pide tamaño cuando cambia el precio. La edad infiere nacimiento estimado y conserva su referencia; corregirla es explícito. Registros anteriores sin cambios siguen siendo utilizables.

Workspace `pet-doctor.workspace` versión 3, clave `pet-doctor.workspace.v3`, respaldo `pet-doctor-base-v3.json`. Migra bases v2 y maestro anterior sin borrar sus claves. JSON completo conserva owners/pets/quotes/attentions. Atenciones guardan snapshots de dueño/perro, edad histórica, observaciones y precios; editar el registro no los reescribe. Actualizar la misma atención conserva ID, identidad y fecha inicial. La cotización anónima sigue disponible.

El CSV analítico tiene una fila por servicio y celdas JSON para preservar componentes y snapshots. Incluye todas las atenciones persistidas y solamente sus clientes/perros vinculados; no incluye cotizaciones independientes o candidatos pendientes. Al cargarlo en Analítica reemplaza el conjunto tras revisión; no toca el operativo ni recalcula tarifas. El JSON completo sigue siendo el respaldo restaurable de la aplicación.

Límites: JSON 20 MB; cargas masivas 5 MB/5.000 filas; CSV analítico 50 MB/60.000 servicios/10.000 atenciones. Cuotas del navegador variables. CSV UTF-8/BOM, punto y coma, CRLF, coma decimal y protección de fórmulas; importar DNI, teléfono e IDs como texto en Excel.

## Comunicaciones y plantillas

Desde la ficha se llama o envía correo por la única conexión n8n, con revisión y confirmación. Tres plantillas editables de correo: Coordinación de cita, Recordatorio de cita y Seguimiento de atención. Selección explícita del perro y fecha/hora futuras de Lima para citas. Redacción libre conservada. Aplicar prepara el texto, sin envío; indicar horario no reserva agenda. Asunto máximo 200 caracteres y mensaje máximo 360, sin truncamiento. Llamada: mensaje máximo 120.

URL en Datos y sincronización; Header Auth `X-PetDoctor-Call-Key`. La clave permanece solo en memoria hasta recarga/logout, fuera de localStorage y respaldos. Credenciales de Gmail/Twilio exclusivamente en n8n. Las respuestas aceptadas indican aceptación del proveedor, no entrega, lectura ni contestación. Sin reintentos automáticos; resultado desconocido exige revisar proveedor antes de repetir. El trial de llamada usa plantilla; locución personalizada pendiente según guía. No se cambian workflows remotos automáticamente.

Validación actual sin listas de IDs/destinos: [Webhook compartido](docs/webhook-compartido.md); reemplazo manual del nodo de validación para llamadas y correo, sin modificar el flujo remoto automáticamente.

Guías de configuración: [correo](docs/correo-n8n.md) y [llamada](docs/llamadas-demo-n8n.md). Sus referencias antiguas a ubicación de controles quedan sustituidas por Datos y sincronización. No probar con destinatarios ficticios de los ejemplos ni subir datos/secretos reales.

## Ejecución y pruebas

Servir la raíz con cualquier servidor HTTP estático; Analítica está en `analitica/`. Cada navegador/origen conserva su base; trasladarla mediante archivos. No necesita dependencias npm en producción.

Suite: `node --test tests/*.test.cjs`, con jsdom 27.2.0 y fake-indexeddb instalados fuera del repositorio y expuestos mediante NODE_PATH. `node scripts/sync-analytics.cjs` actualiza módulos puros y huellas SHA-256 de Analítica; `node scripts/build-record-examples.cjs` regenera ejemplos ficticios conservando fixtures antiguos.

Antes de continuar leer AGENTS.md, [estado](docs/estado.md), [modelo v3](docs/modelo-v3.md) y [archivos](docs/archivos-y-sincronizacion.md). Agenda, backend/sincronización real, permisos de producción y ficha clínica siguen fuera del alcance implementado. Los indicadores/gráficos no se han ampliado en esta reorganización.
