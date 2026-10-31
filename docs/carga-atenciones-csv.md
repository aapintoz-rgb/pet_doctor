# Importación histórica de atenciones CSV

Entrega local, 31 de octubre de 2026. No modifica n8n, no ejecuta comunicaciones y no publica Pages. El workspace permanece en versión 2. Esta carga admite fechas históricas; el guardado normal del cotizador no cambia.

## Orden de carga y archivos

1. Abre Datos y respaldos y descarga/importa [el ejemplo de 25 clientes y 45 perritos](../examples/clientes-perritos-ejemplo-25.csv).
2. Revisa y confirma la carga. Si ya cargaste los 10 clientes originales, se añaden únicamente 15 clientes y 30 perritos. Los IDs y datos anteriores permanecen intactos.
3. En **Carga histórica de atenciones**, descarga/importa [el ejemplo de 150 atenciones](../examples/atenciones-ejemplo-150.csv).
4. Revisa conteos, importes, errores y avisos. Confirma para incorporarlas al historial general y a las fichas de clientes. Antes de confirmar no se guarda nada.

También se entrega [la plantilla vacía](../examples/atenciones-plantilla.csv). El [ejemplo anterior de 10 clientes](../examples/clientes-perritos-ejemplo-10.csv) se conserva como referencia compatible. Los datos son ficticios: DNI secuenciales de prueba, teléfonos sintéticos con ceros iniciales y correos example.com; no son destinos autorizados para comunicaciones.

El ejemplo nuevo tiene 25 clientes, 45 perritos y exactamente 150 atenciones: los primeros 15 perritos tienen cuatro y los otros 30 tienen tres. Hay 100 atenciones con un servicio y 50 con dos, es decir, 200 filas. Sus fechas abarcan 22/08/2026–30/10/2026, sin repetir perrito e instante. IDs de clientes 01–25, perritos 01–45 y atenciones 001–150 con prefijo csv-demo. El total de referencia del ejemplo con el catálogo de esta entrega es **S/ 21.346,79** (2.134.679 céntimos).

## Estructura

Una fila representa un servicio. Las filas con igual atencion_id forman una sola atención:

```text
atencion_id;fecha;hora;cliente_id;perrito_id;servicio;modalidad;componentes;extras;peso_kg;tamano;pelaje;nudos;subtotal_servicio_pen;subtotal_atencion_pen;igv_atencion_pen;total_atencion_pen
```

Las 17 columnas deben estar presentes, aunque sus valores opcionales estén vacíos. Se pueden reordenar, sin duplicar ni añadir columnas. No usar `null`, fórmulas ni `N/A`. Los nombres de columna y códigos son exactos, en minúsculas; se aplica NFC y se quitan espacios exteriores de celdas.

| Campo | Regla |
|---|---|
| atencion_id | Obligatorio, hasta 100 caracteres; estable y único por atención. |
| fecha / hora | Ambas obligatorias en todas las filas, AAAA-MM-DD y HH:mm:ss, America/Lima. |
| cliente_id / perrito_id | Obligatorios en todas las filas, hasta 100 caracteres; deben existir y estar relacionados. |
| servicio / modalidad | Según la tabla de abajo. Servicio obligatorio; modalidad obligatoria salvo vacunas. |
| componentes / extras | Opcionales según servicio; separar valores con `|`. Sin duplicados, elementos vacíos ni opciones incompatibles. |
| peso_kg / tamano | Opcionales, excluyentes; si el servicio los necesita, deben resolverse con el CSV o el registro. Peso positivo con coma/punto decimal. Tamaño: pequeno, mediano, grande. |
| pelaje | Opcional salvo que el servicio lo necesite: corto o largo. |
| nudos | si o no. Explícito para grooming que necesita confirmarlo; no se inventa un valor a partir del registro del perrito. |
| subtotal_servicio_pen | Opcional, importe final de ese servicio SIN IGV, incluidos descuentos/recargos. |
| subtotal_atencion_pen / igv_atencion_pen / total_atencion_pen | Opcionales, importes de control para toda la atención, no para la fila. |

Las filas de una atención deben tener los mismos cliente, perrito y fecha/hora. Los datos tarifarios y controles pueden aparecer en una sola fila y quedar vacíos en las otras; si se repiten deben coincidir, incluso cuando usan coma/punto decimal equivalente. Un perrito no puede tener peso y tamaño simultáneamente en distintas filas de una misma atención.

| Servicio | Modalidad | Componentes permitidos | Extras permitidos |
|---|---|---|---|
| consulta | primera, control | Ninguno | informe |
| vacunas | Vacía | antirrabica, multiple, bordetella; al menos uno | Ninguno |
| desparasitacion | interna, externa, ambas | Ninguno | Ninguno |
| grooming | esencial, completo, premium | Ninguno | hidratacion |
| grooming | individual | bano, secado, corte, unas, cepillado, orejas, hidratacion; al menos uno | Ninguno |
| guarderia | media, completa | Ninguno | paseo, alimentacion |
| inteligencia | exploracion, perfil, acompanamiento | Ninguno | Ninguno |

Una atención no puede repetir un servicio: para varias vacunas usa su lista de componentes en una sola fila. No se aplican reglas clínicas inventadas de edad, tratamientos o periodicidad; se valida coherencia de datos y tarifas.

## Identidad y fechas

El cliente debe existir con nombre, DNI válido y teléfono completo según el registro actual. No se exige completar el correo a clientes históricos para cargar atenciones. El perrito debe existir y pertenecer a ese cliente. No se busca por nombre ni se crean identidades faltantes.

La fecha/hora se convierte desde America/Lima a ISO usando la zona horaria. Se rechazan fechas imposibles, horas inválidas, horas locales inexistentes/ambiguas y momentos futuros. Para una hora histórica ambigua debe indicarse una hora inequívoca; el CSV no tiene columna de offset. Si hay otro ID para el mismo perrito y momento, se muestra aviso y se mantienen como operaciones separadas.

Peso/tamaño/pelaje del CSV describen la atención y no actualizan el registro. Si no se informan, en una atención nueva se toman del perrito cuando existan. Un dato explícito de peso excluye el tamaño del registro y viceversa. Deben estar disponibles los datos necesarios para completar todos los servicios; para grooming con componentes de pelo, pelaje y nudos son obligatorios.

Se guardan registration con ambos IDs, ownerSnapshot y la identidad/servicios/precios en quote. La fecha de creación del snapshot de cotización es la de realización; la exportación/preparación corresponde al momento de importación. No se añade una cotización independiente a la colección quotes.

## Precios históricos e IGV

Si no informas el subtotal de un servicio nuevo, se calcula con el catálogo **actual**, versión de referencia academico-2026-01, y se muestra un aviso. No se presume que esa era la tarifa del día de realización.

Si lo informas, se conserva como importe histórico. Las diferencias frente al catálogo generan aviso y una línea de desglose **Ajuste por importe histórico**, positiva o negativa, para conciliar componentes y subtotal. No se aplica IGV dos veces ni se vuelven a descontar recargos/descuentos sobre el importe informado.

Los importes admiten cero (con aviso de gratuidad) y hasta dos decimales, sin moneda, miles, signo negativo o notación científica. Se procesan como céntimos enteros, con comprobaciones del rango seguro. Un importe como `1,000` se rechaza por tener tres decimales; escribe `1000` para mil o `1,00` para uno.

Subtotal de atención = suma de subtotales de servicios. IGV = 18 %, redondeado al céntimo, con el mismo reparto entre servicios del cotizador. Total = subtotal + IGV. Si se informa cualquier control, debe coincidir EXACTAMENTE; un céntimo de diferencia es error. Valores repetidos distintos dentro del grupo también bloquean. Los totales de los avisos y la revisión son provisionales mientras haya errores.

La vista previa muestra por servicio su subtotal efectivo sin IGV, y el conteo muestra el total con IGV de las atenciones NUEVAS, sin sumar otra vez las ya registradas. El desglose se consulta en Ver detalle después de guardar.

## Reimportación y fallos

La importación incorpora; no actualiza ni reemplaza atenciones. Un ID existente debe coincidir en vínculos, fecha, servicios y opciones, así como los datos tarifarios e importes explícitamente informados. Si coincide: **Ya registrada**, sin duplicar. Si difiere: conflicto, sin sobrescritura.

Para comparar un registro existente, los valores tarifarios omitidos y los importes omitidos se conservan de su snapshot; no se recalculan con el catálogo ni con el perrito actual. Editar el nombre del cliente no sustituye su snapshot histórico. Un ID histórico sin vínculo válido no se reapropia como nueva atención.

La carga completa se bloquea si existe cualquier error o si no hay registros nuevos. Cancelar no modifica la base. Tras el éxito se actualizan el historial general y el de ficha, conservando filtros, cotización en curso y sus selecciones/importes.

Se usa la misma comprobación de cambios desde revisión y concurrencia entre pestañas que en clientes CSV. Si el almacenamiento falla, el candidato queda pendiente, con IDs y snapshots fijos; puedes reintentar o descargar su respaldo diferenciado. No se anuncia éxito antes de persistir. Otra pestaña requiere respaldar/recargar/revisar, no sobrescribir. Mientras haya una operación pendiente, resolverla o cancelarla antes de otra importación.

## Límites y compatibilidad

UTF-8 con BOM, punto y coma y CRLF en descargas; también se lee coma como separador, detectado en la cabecera. Usa comillas para celdas con separadores, comillas o saltos; las comillas interiores se duplican. Con coma separadora, un decimal con coma debe ir entrecomillado. Importa IDs como texto desde Excel.

Máximo 5 MB y 5.000 filas de servicios por CSV; la base conserva su máximo de 10.000 atenciones. Una atención puede tener hasta los seis servicios diferentes del catálogo. Se reutiliza el parser y la revisión paginada de 20 filas. Los errores/avisos de cada página incluyen fila, columna e ID, con conteos de todo el archivo.

El CSV exportado desde el historial es un **reporte**, no esta plantilla de importación. No se cargan sus textos de servicios como si fueran configuraciones de catálogo. JSON sigue siendo el respaldo completo, con su compatibilidad anterior. La lectura/exportación de atenciones existentes no recalcula precios históricos.

## Comprobaciones de entrega

132 pruebas aprobadas sin omitidas: 114 anteriores y 18 nuevas (12 de datos/importación y 6 de interfaz). Incluyen distribución 25/45/150/200, compatibilidad con 10/15, precios/IGV/céntimos, fecha de Lima, controles imposibles, servicios y vínculos, snapshots y reimportación, máximo de base, revisión/cancelación, almacenamiento/reintento, filtros y conservación de cotización. La regresión de estilos del cotizador sigue aprobada.

La revisión geométrica real a 360/768/1440 permanece pendiente: el acceso a la pestaña file:// está bloqueado por la herramienta del navegador y no se eludió. CSS adaptable y comportamiento/foco se verificaron con DOM. No se realizaron llamadas, envíos, publicación ni cambios remotos.
