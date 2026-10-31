# Pet Doctor Analítica

Sitio independiente para explorar atenciones realizadas. Entrega local del 31/10/2026, preparada para la ruta `https://aapintoz-rgb.github.io/pet_doctor/analitica/`. La publicación requiere una solicitud posterior; estos cambios no se han enviado a GitHub.

## Abrir y cargar

Desde la raíz del repositorio, ejecutar `python -m http.server 8766 --bind 127.0.0.1 --directory analitica` y abrir `http://127.0.0.1:8766/`. También se puede servir esta carpeta con cualquier servidor estático. Se recomienda HTTP local o HTTPS: el comportamiento de almacenamiento de `file://` depende del navegador.

1. **Cargar demostración** presenta una revisión antes de reemplazar el conjunto. Contiene solo datos ficticios: 25 clientes, 45 perritos, 150 atenciones y 200 servicios, con total S/ 21.346,79 (sin IGV S/ 18.090,50; IGV S/ 3.256,29). Los teléfonos sintéticos no autorizan comunicaciones.
2. **Cargar datos → JSON** acepta la base completa `pet-doctor.workspace`, versión 2, o un respaldo propio de Analítica, versión 1. Reemplaza el conjunto únicamente al confirmar.
3. **CSV de clientes y perritos**, después **CSV detallado de atenciones**, incorporan registros con las mismas validaciones y conflictos del sistema operativo. Hay plantillas y ejemplos en el diálogo. La segunda carga exige identidades existentes; no crea clientes a partir de nombres.

JSON admite 20 MB. Cada CSV admite 5 MB y 5.000 filas; la base admite 10.000 atenciones. Los límites y reglas adicionales de las entidades se conservan en los validadores originales. Se aceptan CSV con BOM, coma o punto y coma detectado por cabecera y campos entrecomillados. DNI conserva ceros iniciales. Las atenciones se agrupan por ID y sus configuraciones deben ser coherentes. No se aceptan el CSV resumido del historial ni el CSV de salida del dashboard como sustitutos del CSV detallado: no contienen la configuración necesaria.

Los precios informados en CSV se conservan; si se omiten en altas, el importador calcula con el catálogo versionado local y muestra avisos. Reimportar IDs idénticos no duplica; diferencias explícitas son conflictos. Para JSON se conservan snapshots y precios guardados. Antes de aceptar cualquier conjunto se exige que componentes, subtotal, IGV y total de cada servicio y de cada atención concilien en céntimos enteros. La consulta no calcula tarifas.

La revisión muestra modo de carga, archivo, conteos finales, cambios del CSV e incidencias por fila/columna. El reporte completo de validación se puede descargar. Ante errores, no se escribe nada. Si falla el guardado, el candidato permanece para reintentar o descargar un respaldo con `PENDIENTE` en su nombre. Ese respaldo contiene el conjunto propuesto; todavía no confirma que se haya persistido.

## Métricas y filtros

Los importes representan servicios registrados, no cobros, caja, facturación tributaria ni utilidades. No existen datos de pagos, costos ni agenda en esta base.

| Indicador | Definición |
|---|---|
| Importe sin IGV | Suma de subtotales de los servicios coincidentes; muestra IGV asignado y total como desglose |
| Atenciones | IDs distintos con al menos un servicio coincidente |
| Ticket medio sin IGV | Importe coincidente / atenciones; redondeado al céntimo para mostrar |
| Clientes y perritos | IDs distintos con relación válida en el conjunto cargado |
| Recurrencia | Clientes identificados con ≥2 atenciones / clientes identificados en la selección |
| Sin vínculo | Atenciones distintas sin relación válida; permanecen en importes y volumen |

Un denominador vacío muestra `—`. Cero real se muestra como cero. La identidad visible proviene del snapshot, nunca se completa con datos actuales. La vinculación utiliza exclusivamente IDs y relación dueño/perrito. Las atenciones sin vínculo no participan del Top 10 ni de los grupos de frecuencia. Los nombres de los selectores se toman del snapshot más reciente disponible por ID; un mismo cliente puede conservar nombres anteriores en sus detalles.

Fechas Desde/Hasta inclusivas en `America/Lima`. Día de semana y hora corresponden a `performedAt`, no al inicio de la cotización. Todo cubre el intervalo cargado; últimos 30/90 días y año actual toman la fecha real de Lima. Por eso un acceso rápido puede dejar un conjunto histórico sin resultados.

Servicios tiene condición **cualquiera**: una atención con dos servicios seleccionados se cuenta una vez, pero ambos importes se suman. Sin selección se incluyen todos. El filtro de frecuencia se aplica después de todos los demás: primero se cuentan las visitas de cada cliente y se determina su grupo 1/2/3/4+. Su gráfico muestra esa distribución previa al filtro de frecuencia, según indica su descripción, para poder cambiar entre grupos. Los demás gráficos reflejan la selección final.

La evolución agrupa por día, semana desde el lunes o mes, mostrando periodos con registros (no rellena días ausentes). Clic selecciona el intervalo completo del periodo. Servicios permite alternar importe/cantidad. El mapa de calor cuenta atenciones distintas por día de semana y hora; representa actividad registrada, no capacidad ni ocupación. El Top 10 muestra solo nombres y medidas, sin datos de contacto. Cada gráfico tiene una tabla de valores y controles equivalentes accesibles por teclado. Los clics actualizan filtros y etiquetas visibles.

Los servicios cuyo código ya no existe se agrupan en **Sin clasificar**; se conserva su nombre e importe en el detalle. Las alternativas de selección que desaparecen al cargar otra base se retiran con aviso. Se conservan fechas/búsqueda compatibles y las selecciones que siguen existiendo. Una primera carga abre todo el intervalo. Los filtros no persisten al cerrar o recargar la página.

## Tabla, CSV y respaldos

La tabla pagina 20 atenciones. Distingue importe **filtrado sin IGV** de total **original con IGV** de la atención. El detalle muestra identidad histórica, ID completo, componentes, descuentos/ajustes, subtotal, IGV y total; no permite editar.

El CSV exporta todas las filas de servicios coincidentes, incluidas otras páginas, para conciliar con las tarjetas. Cabecera:

```text
atencion_id;fecha;hora;zona_horaria;cliente_id;cliente_nombre;perrito_id;perrito_nombre;servicio_codigo;servicio_nombre;subtotal_pen;igv_pen;total_pen
```

UTF-8 con BOM, punto y coma, CRLF, celdas entrecomilladas y comillas escapadas, importes de dos decimales con coma y sin miles. Los textos con prefijos interpretables como fórmulas se neutralizan con apóstrofo. Este CSV es un reporte, no un respaldo para restaurar. La restauración usa JSON propio, que conserva el workspace y la etiqueta de demostración.

## Aislamiento y persistencia

`storage.js` usa exclusivamente IndexedDB **`pet-doctor.analytics`**, almacén `datasets`, registro `active`. Se guarda todo el candidato en una transacción junto con una revisión incremental. Un candidato construido con una revisión anterior no puede sobrescribir una más reciente. `BroadcastChannel` y la comprobación al recuperar foco avisan de cambios entre pestañas; la transacción aplica la protección incluso sin ese aviso.

No se usa localStorage ni configuración n8n. Los módulos puros copiados contienen APIs operativas de almacenamiento que esta aplicación **no invoca**. No se hacen peticiones de negocio ni se envían archivos. La ruta comparte origen con el cotizador en Pages, pero usa almacenamiento explícitamente independiente. Esto es aislamiento funcional, no una barrera de seguridad entre aplicaciones del mismo origen. No hay autenticación ni sincronización, y borrar los datos del navegador puede eliminar la base: conserva respaldos privados.

Vaciar Analítica exige confirmación y una revisión antes de escribir un conjunto vacío; no borra la base operativa. Si otra pestaña cambia el conjunto, se conserva el candidato pendiente y se debe descargarlo o descartarlo para actualizar y revisar de nuevo. Fallos de apertura/lectura se muestran sin anunciar éxito. Los datos importados y respaldos descargados no se añaden a archivos del repositorio.

## Organización y mantenimiento

- `data.js`: validación financiera, preparación de cargas, consulta, agregaciones y exportación.
- `storage.js`: transacción y control de revisiones de IndexedDB.
- `charts.js`: especificaciones ECharts, tablas accesibles y eventos de selección.
- `app.js`: controles, revisión, diálogo de detalle, descargas y cambios entre pestañas.
- `styles.css`: estilos propios; no importa CSS operativo.
- `lib/` y `examples/`: copias versionadas reproducibles de módulos puros y CSV ficticios.
- `vendor/`: ECharts **6.0.0**, licencia Apache 2.0 y NOTICE, distribuidos localmente. [Licencia oficial](https://github.com/apache/echarts/blob/6.0.0/LICENSE), [eventos oficiales](https://echarts.apache.org/handbook/en/concepts/event/).

Desde la raíz: `node scripts/sync-analytics.cjs` actualiza exclusivamente las copias en `analitica/` y el manifiesto SHA-256 `dependencies.json`. Ejecutarlo es una actualización deliberada del catálogo y validadores disponibles para futuras cargas CSV; no cambia los importes ya guardados. El script no descarga dependencias ni modifica fuentes operativas. La librería vendorizada se obtuvo de la distribución publicada `echarts@6.0.0/dist/echarts.min.js`; versión y hashes están comprobados por pruebas.

Pruebas desde la raíz: `node --test tests/*.test.cjs`, con `jsdom` y `fake-indexeddb` disponibles en `NODE_PATH` como dependencias de desarrollo externas al sitio. El sitio no requiere npm ni esas dependencias en producción. Las pruebas de Analítica cubren conciliación, snapshots, fechas de Lima, filtros, CSV, respaldo, cuota simulada, transacciones/revisión, DOM, foco, tablas y aislamiento. La revisión visual se ejecutó en Chrome a 360, 768 y 1440 px sobre el sitio nuevo por HTTP local; no implica una certificación de todos los navegadores o lectores de pantalla.

Fuera de alcance: edición, comunicaciones, modificación del catálogo, servidor, permisos de producción, sincronización y publicación automática. La implementación deja preparada la carpeta para GitHub Pages, sin incorporar o publicar los cambios operativos pendientes.

La sincronización de módulos JavaScript normaliza CRLF a LF antes de calcular las huellas. .gitattributes conserva los bytes de analitica/ y los CSV con BOM/CRLF para que clonar en otro sistema no altere su integridad.
