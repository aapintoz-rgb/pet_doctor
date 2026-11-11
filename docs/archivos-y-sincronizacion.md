# Archivos y sincronización manual

Estado local vigente del 11/11/2026. Esta guía sustituye las instrucciones previas sobre ubicación de cargas, descargas y entradas de Analítica. Workspace continúa en versión 3; no hay sincronización automática, servidor ni modificaciones a n8n.

## Operaciones disponibles

| Zona | Operación |
|---|---|
| Datos y sincronización | Descargar/cargar JSON completo, descargar CSV de Analítica, cargar atenciones CSV, cargar datos de prueba previa confirmación, configurar n8n |
| Clientes | Cargar clientes y perros CSV |
| Cotización | Generar cotización PDF, Nueva, Guardar atención; sin carga de cotización |
| Historial general o de ficha | Descargar reporte CSV de los resultados filtrados |
| Analítica | Una sola carga de CSV analítico; revisión, confirmación, cancelación, reintento, vaciado y demostración con revisión |
| Datos y sincronización ante un error | Reintentar, descargar respaldo pendiente, descartar candidato |

Se retiran los controles para plantillas, ejemplos, registro JSON independiente, reportes/respaldos de Analítica. Los ejemplos y formatos permanecen en el repositorio para preparación de archivos y pruebas. El PDF se mantiene. Los reportes del historial no son archivos de carga.

## Primer uso sin archivos

Clientes muestra «Probar con datos de ejemplo» cuando la base está vacía. En Datos y sincronización, «Cargar datos de prueba» permite revisar cantidades y confirmar el reemplazo completo: 25 clientes, 45 perros, 150 atenciones y 200 servicios ficticios. Si hay datos propios, descargar antes JSON. Cancelar conserva base y cotización. Los fallos de guardado siguen la recuperación centralizada. No mezcla ni duplica la demostración al repetir.

En Analítica, «Probar con datos de ejemplo» prepara un conjunto independiente, con revisión, aviso de reemplazo y confirmación. La demostración se identifica con una etiqueta; no cambia el operativo. Estas opciones no añaden cargas/descargas de archivos ni envían comunicaciones.

## Uso

1. En Clientes carga el CSV de clientes/perros y confirma después de revisar. Se aplican las reglas v3 y compatibilidad antigua descritas en modelo-v3.md.
2. En Datos y sincronización carga atenciones históricas si corresponde. No se crean identidades ni se sobrescriben atenciones existentes desde esa carga.
3. Para respaldo del operativo usa Descargar base JSON. La carga de JSON completo reemplaza la base, previa confirmación, y acepta migración desde v2/maestro anterior.
4. Para Analítica pulsa Descargar CSV para Analítica en Datos y sincronización; incluye todas las atenciones guardadas, sin filtros ni candidatos pendientes.
5. En el dashboard pulsa Cargar CSV de Analítica, revisa cantidades y confirma. Reemplaza el conjunto analítico completo y no modifica el operativo. Guarda el CSV original para recargarlo o reintentar.

Los clientes/perros sin atenciones quedan fuera del CSV analítico. El JSON completo sí conserva todo el workspace, incluidas cotizaciones independientes. Las claves/configuración n8n no forman parte de estos archivos. Las selecciones y mensajes de correo tampoco se exportan.

## Contrato CSV analítico versión 1

Nombre `pet-doctor-analitica-AAAA-MM-DD.csv`, fecha de Lima. Una fila por servicio. Cabecera fija:

```text
formato_version;exportado_en;atencion_id;fecha;hora;estado;moneda;cliente_id;perrito_id;vinculo_registrado;cliente_nombre;cliente_dni;perrito_nombre;cliente_distrito;subtotal_atencion_pen;igv_atencion_pen;total_atencion_pen;observaciones;servicio_codigo;servicio_nombre;subtotal_servicio_pen;igv_servicio_pen;total_servicio_pen;cliente_actual_json;perrito_actual_json;cliente_historico_json;perrito_historico_json;atencion_json;estado_cotizacion_json;servicio_json
```

- formato_version es 1; exportado_en es fecha ISO común al archivo; moneda PEN. fecha/hora de atención se muestran en America/Lima.
- Los importes visibles usan coma y dos decimales, sin miles. Internamente y en JSON se conservan céntimos enteros.
- atencion_json conserva metadatos, vínculo, estado y metadatos/precios globales de la cotización. Sus snapshots, quote.state y quote.pricing.services se transportan en las otras celdas para evitar duplicar el conjunto de servicios por fila.
- cliente/perrito_actual_json conservan los registros vinculados actuales; cliente/perrito_historico_json conservan snapshots o null cuando no existan. Los datos visibles son históricos; no se completan desde el registro actual.
- estado_cotizacion_json conserva todas las selecciones tarifarias; servicio_json conserva el objeto íntegro del servicio, incluidos componentes, descuentos, ajustes e impuesto asignado. No se recalcula con el catálogo vigente.
- Los valores JSON ausentes se representan como null y no como objetos ficticios. Los servicios de una atención se agrupan por ID; clientes/perros actuales repetidos deben coincidir por ID. Snapshots de distintas atenciones pueden diferir.
- UTF-8 BOM, separador punto y coma, CRLF, comillas CSV duplicadas. Saltos internos entrecomillados admitidos. Los textos peligrosos para Excel reciben un apóstrofo protector; los textos que originalmente empiezan por apóstrofo también se escapan con uno adicional. El lector revierte únicamente este esquema, conservando apóstrofos legítimos. Mantener IDs y DNI como texto al abrir en Excel.
- El lector comprueba coincidencia de columnas con los JSON, componentes/subtotal, subtotal+IGV/total y suma de servicios/atención. Conserva los importes históricos exactos. Duplicados, relaciones cruzadas, contradicciones, JSON inválido o diferencias de un céntimo rechazan todo el archivo, señalando fila/atención cuando estén disponibles.

No editar las celdas JSON para actualizar datos operativos: este archivo solo alimenta Analítica. Utiliza los formularios o las cargas masivas correspondientes y vuelve a exportar.

## Límites y recuperación

JSON completo: 20 MB. Cargas masivas operativas: 5 MB/5.000 filas. CSV analítico: 50 MB/60.000 filas de servicios/10.000 atenciones. La cuota real del navegador puede ser menor. El lector cede ejecución por bloques, muestra progreso y admite cancelación antes de guardar. El candidato se valida completo antes de la transacción.

En el operativo, un fallo conserva formulario/candidato y ofrece acceso a Datos y sincronización. Solo allí se descarga el respaldo pendiente, distinto de la base confirmada; también se puede reintentar o descartar. Una carga masiva cancelada no guarda registros. Se mantienen los controles de concurrencia.

Analítica conserva su conjunto previo ante error o cuota. Permite reintentar el candidato; no ofrece descargas. Su archivo original basta para repetir la carga. Cancelar lectura o revisión no escribe. Cambios de otra pestaña impiden sobrescribir una revisión anterior. Los conjuntos ya guardados en IndexedDB siguen abriendo, sin migración de almacenamiento ni borrado automático.

## Mantenimiento

assets/analytics-csv.js implementa exportación, lectura y conciliación compartidas. Se carga después de workspace/history y antes de application en el operativo; en Analítica, antes de data. scripts/sync-analytics.cjs copia nueve módulos puros y actualiza SHA-256. No modifica gráficos, indicadores o filtros. Se mantienen bibliotecas de validación antiguas necesarias para migraciones y pruebas, aunque sus controles retirados no están en la interfaz.

Verificar con la suite de Node, jsdom 27.2.0 y fake-indexeddb externos al sitio. El ejemplo debe conservar 25 clientes, 45 perros, 150 atenciones, 200 servicios y 2.134.679 céntimos. Pruebas Chrome deben usar datos ficticios sin enviar comunicaciones. No publicar esta entrega hasta que se solicite.
