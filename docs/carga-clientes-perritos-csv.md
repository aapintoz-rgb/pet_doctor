> Interfaz vigente del 31/10/2026: consultar [Archivos y sincronización](archivos-y-sincronizacion.md). Clientes CSV se carga desde Clientes; atenciones CSV y JSON completo desde Datos y sincronización. Analítica admite solo el CSV único exportado desde esa sección. Se retiraron cargas de cotización/registro independiente y descargas de ejemplos, plantillas y archivos analíticos. Los formatos heredados de datos y validaciones descritos aquí siguen siendo referencias; las instrucciones previas sobre controles retirados quedan sin efecto.

> Actualización local del 31/10/2026: registro ampliado y workspace v3 implementados. Consultar [modelo y compatibilidad v3](modelo-v3.md). Esta actualización sustituye las referencias previas a campos, CSV y workspace v2 como versión activa. Analítica conserva sus indicadores y diseño; publicación de esta entrega pendiente.

> Actualización del 31/10/2026: el botón actual descarga 25 clientes y 45 perritos. [Archivo ampliado](../examples/clientes-perritos-ejemplo-25.csv). Se conservan intactos los 10/15 anteriores y se añaden 15 clientes con dos perritos cada uno; el resto de reglas de esta guía se mantiene. La carga histórica de atenciones ya está implementada localmente: [guía de atenciones](carga-atenciones-csv.md). Las referencias posteriores a futura entrega de atenciones describen el estado anterior.

# Carga masiva de clientes y perritos

Entrega local del 31 de octubre de 2026. Esta funcionalidad incorpora clientes y perritos; no importa atenciones. No sustituye al respaldo completo JSON ni modifica n8n. Los cambios aún no se han publicado en GitHub Pages.

## Preparar y cargar

1. Abre **Datos y respaldos**. Descarga la plantilla CSV o el ejemplo de 10 clientes.
2. Completa una fila por perrito. Repite los datos del dueño para sus otros perritos. El DNI identifica al cliente.
3. En Excel, usa **Datos → Desde texto/CSV**, UTF-8, separador `;`, e importa **DNI, teléfono e IDs como texto**. Abrir con doble clic puede quitar ceros o convertir valores: el CSV conserva los dígitos, pero no controla las conversiones de Excel. No uses fórmulas para representar identificadores.
4. Guarda el archivo como CSV UTF-8. Pulsa **Importar clientes y perritos CSV**.
5. Revisa nombre del archivo, cantidades, filas y errores/avisos. La tabla muestra 20 filas por página; sus errores y avisos se muestran en esa página. Las cantidades de errores y avisos son del archivo completo.
6. Corrige todos los errores en el archivo y selecciónalo nuevamente. Confirma cuando existan registros nuevos y no haya errores. Cancelar no escribe datos.

La carga se aplica toda o ninguna. Un contador de clientes/perritos nuevos en una revisión con errores es provisional: no significa que ya se guardaron. Si no hay novedades, Confirmar permanece deshabilitado.

## Formato

```text
cliente_id;cliente_nombre;cliente_dni;cliente_telefono;cliente_correo;perrito_id;perrito_nombre;peso_kg;tamano;pelaje
```

Las diez columnas deben existir, sin duplicados ni columnas adicionales. Pueden reordenarse; sus nombres deben coincidir exactamente, sin cambiar mayúsculas. Las celdas opcionales se dejan vacías, sin escribir `null` ni `N/A`. Se eliminan espacios exteriores y se normaliza Unicode NFC.

| Columna | Condición |
|---|---|
| cliente_id | Opcional en altas. Máximo 100 caracteres. Si existe el DNI, debe coincidir con su ID cuando se indique. |
| cliente_nombre | Obligatorio, máximo 200 caracteres. |
| cliente_dni | Obligatorio, exactamente ocho dígitos como texto. |
| cliente_telefono | Obligatorio, 7–15 dígitos, admitiendo prefijo y separadores habituales. No se infiere país. |
| cliente_correo | Obligatorio, una dirección válida, máximo 254 caracteres. Sin listas ni nombre entre `< >`. |
| perrito_id | Opcional en altas, máximo 100 caracteres; recomendable para reimportaciones y futuras atenciones. |
| perrito_nombre | Obligatorio, máximo 200 caracteres. |
| peso_kg | Opcional, positivo. Coma o punto decimal, sin separadores de miles. Escribe `0,5`, no `.5`. |
| tamano | Opcional: `pequeno`, `mediano`, `grande`. No combinar con peso. |
| pelaje | Opcional: `corto`, `largo`. |

El tamaño se convierte internamente a small/medium/large y el pelaje a short/long. Peso, tamaño y pelaje pueden estar vacíos. Los IDs omitidos se generan al preparar el candidato y se conservan al confirmar/reintentar; solo forman parte de la base después del guardado exitoso. Los IDs mostrados en una revisión cancelada no quedan registrados.

La aplicación descarga UTF-8 con BOM, punto y coma y CRLF. También lee CSV separados por coma: el separador se determina por la cabecera. Si usas coma como separador, un peso `12,5` debe ir entre comillas, o usa `12.5`. Un único separador decimal se interpreta como decimal, nunca como miles: `1,000` significa 1 kilogramo.

Celdas con separadores, comillas o saltos de línea deben ir entre comillas dobles. Las comillas interiores se duplican. Las filas vacías se ignoran; los números de error señalan la línea física inicial de cada registro, incluso cuando hay celdas multilínea. Archivos con comillas sin cerrar, filas desalineadas, texto corrupto, más de 5 MB o más de 5.000 filas de datos se rechazan.

## Coincidencias y conflictos

- Un DNI nuevo crea un cliente. Las filas de ese DNI deben repetir datos consistentes.
- Un DNI existente reutiliza al cliente y permite añadir perritos. No actualiza nombre, teléfono o correo. Se comparan nombre y correo con NFC/espacios exteriores; se mantienen diferencias de mayúsculas y tildes. Los teléfonos se comparan por dígitos sin separadores. Si los datos difieren, corrígelos desde la ficha o ajusta el CSV; no se sobrescriben con la carga.
- Un cliente antiguo sin correo deberá completarse desde su ficha antes de reutilizarse mediante este CSV. El CSV de altas exige datos completos; la importación histórica JSON conserva su compatibilidad anterior.
- Un ID de cliente asociado a otro DNI bloquea la carga.
- Un perrito con ID ya existente se clasifica **Ya registrado** únicamente cuando dueño, nombre, peso, tamaño y pelaje coinciden. Un dato diferente o dueño distinto es conflicto. Una fila idéntica repetida con el mismo ID no crea otro perrito.
- Sin ID de perrito, el nombre se compara ignorando mayúsculas/tildes con los del mismo dueño. Si hay coincidencia, no se presume identidad: se pide indicar el ID existente o un ID nuevo si es otro animal.
- Con IDs distintos se permiten homónimos, con aviso. El aviso no bloquea.

El ejemplo trae IDs explícitos: volver a importarlo sin editarlo no crea duplicados. Después de una carga con IDs generados, descarga la base JSON para conservarlos. JSON sigue siendo el respaldo completo; esta entrega no añade una exportación CSV del registro actual.

## Guardado, concurrencia y recuperación

La revisión no escribe en almacenamiento ni cambia el formulario de cotización. Al confirmar se verifica que la base no cambió. Un cambio local o un evento de otra pestaña invalida la revisión. Si otro navegador/pestaña modificó el almacenamiento, conserva un respaldo y recarga antes de revisar nuevamente; no se fusionan escrituras concurrentes.

Si falla el guardado por cuota o bloqueo, no se incorporan registros ni se anuncia éxito. El candidato permanece pendiente con los mismos IDs. Puedes **Reintentar guardado pendiente** o **Descargar respaldo pendiente**. Ese JSON identifica una operación aún no aplicada; no es prueba de carga exitosa. Mientras haya un candidato pendiente, no se permite otra importación. Cancelar la revisión descarta su candidato CSV pendiente sin modificar la base.

Las fichas y selectores se actualizan después del éxito. La selección, servicios, precios en curso y filtros de Cotización se conservan. No se alteran atenciones ni snapshots históricos, y no se inicia ninguna comunicación.

## Archivos de ejemplo

- [Plantilla vacía](../examples/clientes-perritos-plantilla.csv).
- [10 clientes y 15 perritos](../examples/clientes-perritos-ejemplo-10.csv).

Cinco clientes tienen un perrito y cinco tienen dos. Los nombres son ficticios, los DNI secuenciales `00000001`–`00000010` son datos de prueba y los correos usan example.com. Los teléfonos son sintéticos con ceros iniciales, no números de prueba autorizados para llamar. No se añaden a listas permitidas de n8n. Se incluyen tildes, decimales, campos opcionales y `Pipo "Chiqui"` para verificar comillas. Nunca sustituirlos por datos reales en el repositorio público.

Los códigos `csv-demo-cliente-01`–`10` y `csv-demo-perrito-01`–`15` permiten preparar una futura carga de atenciones vinculadas. Esa carga queda para otra entrega.

## Verificación

Se comprobaron el archivo guardado y el generado por los botones, el BOM/CRLF, los ceros del DNI, 10/15 registros y distribución 5/5, reimportación, conflictos, normalización, CSV corrupto y límites. Pruebas DOM cubren revisión/cancelación/confirmación, foco, errores seguros, paginación, lecturas simultáneas, persistencia, cuota/reintento, concurrencia y conservación de Cotización. La revisión visual real a 360/768/1440 sigue pendiente; el CSS es adaptable y usa tarjetas en móvil. No se publica ni se modifica el workflow n8n en esta entrega.
