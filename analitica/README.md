# Pet Doctor Analítica

Dashboard independiente para atenciones realizadas. Esta revisión incorpora la reorganización del 31/10/2026, cuya publicación fue solicitada por el usuario. No cambian sus seis indicadores, cinco gráficos, filtros ni definiciones financieras. Verificar el despliegue correspondiente en GitHub Actions.

## Carga única

En el operativo abre **Datos y sincronización → Descargar CSV para Analítica**. En este dashboard usa **Cargar CSV de Analítica**, revisa cantidades y confirma. Cargar reemplaza el conjunto completo; repetir el archivo no acumula registros. Conserva el CSV original para recuperar o reintentar.

Este es el único mecanismo de carga. No se ofrecen entradas JSON, CSV separados de clientes/atenciones o demostraciones. No hay descargas de reportes, respaldos, candidatos, ejemplos o plantillas. Los antiguos conjuntos IndexedDB siguen abriendo; no se borra su almacenamiento.

Contrato y columnas: [Archivos y sincronización](../docs/archivos-y-sincronizacion.md). Una fila por servicio con importes finales e IGV asignado, campos históricos y celdas JSON de metadatos, identidades, snapshots, estado y desglose. Se conservan precios guardados; no se recalcula el catálogo. No utilizar el reporte resumido del historial como carga. JSON completo sigue siendo el respaldo del operativo.

Hasta 50 MB, 60.000 servicios y 10.000 atenciones; la cuota del navegador puede ser menor. Validación por bloques con progreso y cancelación. Archivo inválido no modifica el conjunto. Error de almacenamiento retiene candidato para reintentar; no genera una descarga. Concurrencia impide sobrescribir otra revisión. Vaciar requiere confirmación y revisión; permite cargar nuevamente el CSV original.

## Métricas y gráficos conservados

- Importe sin IGV con desglose IGV/total, atenciones únicas, ticket medio neto, clientes/perros vinculados y recurrencia (clientes con al menos dos atenciones / clientes identificados).
- Evolución diaria, semanal desde lunes o mensual; servicios por cantidad o importe; mapa día/hora; Top 10 clientes; frecuencia 1/2/3/4+.
- Fechas inclusivas America/Lima, filtros por cliente/perro, servicio, día/hora, frecuencia y búsqueda. Servicios seleccionados usan OR; atenciones no se duplican por tener varios servicios.
- Identidad e importes provienen de snapshots. Sin vínculo mantiene ingresos y volumen sin inventar clientes. Importe no equivale a cobro ni utilidad. Sin denominador se muestra —.
- Gráficos con tablas accesibles y controles equivalentes; detalle de consulta y paginación de 20. Frecuencia se calcula con los demás filtros antes de aplicar su propio grupo. La tabla diferencia neto filtrado y total original.

## Almacenamiento y mantenimiento

IndexedDB `pet-doctor.analytics`, versión de almacenamiento 1, almacén datasets, registro active con revisión y conjunto. Sin acceso automático al localStorage operativo ni a n8n. Es separación funcional, no una barrera de seguridad frente a código del mismo origen. Sin backend ni sincronización.

ECharts 6.0.0 local, [Apache LICENSE](vendor/LICENSE-echarts.txt) y [NOTICE](vendor/NOTICE-echarts.txt), sin CDN. La aplicación no requiere npm. Los módulos puros copiados conservan APIs antiguas para compatibilidad y pruebas, no como operaciones de la interfaz.

Desde raíz `node scripts/sync-analytics.cjs` copia nueve módulos puros y cuatro ejemplos de prueba, normaliza JS a LF y actualiza `dependencies.json`. El módulo compartido analytics-csv implementa el contrato. No editar manualmente sus copias. Datos importados y archivos privados no se incorporan al repositorio.

Pruebas: `node --test tests/*.test.cjs` desde raíz, con jsdom 27.2.0 y fake-indexeddb como dependencias de desarrollo externas. El ejemplo sigue siendo 25 clientes, 45 perros, 150 atenciones y 200 servicios, total S/ 21.346,79. Los ejemplos no autorizan comunicaciones.
