> Interfaz vigente del 31/10/2026: consultar [Archivos y sincronización](archivos-y-sincronizacion.md). Clientes CSV se carga desde Clientes; atenciones CSV y JSON completo desde Datos y sincronización. Analítica admite solo el CSV único exportado desde esa sección. Se retiraron cargas de cotización/registro independiente y descargas de ejemplos, plantillas y archivos analíticos. Los formatos heredados de datos y validaciones descritos aquí siguen siendo referencias; las instrucciones previas sobre controles retirados quedan sin efecto.

# Registro ampliado de clientes y perros

Estado local del 31 de octubre de 2026. Este documento sustituye las descripciones anteriores de workspace v2 y de los campos del registro. No se ha publicado esta entrega. Solo perros; tarifas, PDF y gráficos sin cambios. Plantillas de comunicaciones quedan para otro módulo.

## Campos y formularios

Cliente nuevo: nombre, DNI único de ocho dígitos, celular, correo válido y distrito de 1–100 caracteres obligatorios. Distrito es texto libre, sin limitar a Lima. No se pide dirección completa.

Perro nuevo: nombre, especie Canino fija, raza (incluye las respuestas explícitas Mestizo y Desconocida), sexo (Macho, Hembra, No determinado) y edad en años/meses. Peso, rango y pelaje son opcionales; peso y rango excluyentes. No determinado y Desconocida no se preseleccionan. El cotizador exige rango o peso únicamente para los servicios que dependen del tamaño. Cotización anónima sigue disponible.

Editar una entidad con cambios exige completar sus obligatorios. Una entidad anterior sin cambios puede conservar sus campos ausentes; editar únicamente al dueño no obliga a inventar la edad de sus perros. Agregar perros no modifica al dueño. No hay eliminación ni reasignación de IDs.

La edad usa años enteros no negativos y meses enteros 0–11, referidos a una fecha de Lima. Años 0 y meses 0 son válidos. Se resta primero años y luego meses calendario, ajustando al último día válido del mes. Por ejemplo, 1 año y 1 mes a 2024-02-29 produce nacimiento estimado 2023-01-28. Se conserva la referencia original y se muestra la edad actual calculada desde el nacimiento estimado. Corregir edad es una acción explícita a la fecha de hoy; editar nombre/peso no desplaza la fecha. Datos anteriores sin edad permanecen sin registrar.

## Contratos

- Workspace: `type: pet-doctor.workspace`, `version: 3`, `currency: PEN`; mantiene owners/pets/quotes/attentions.
- Cliente agrega `district` (string; vacío para históricos).
- Perro agrega `species: canine`, `breed` (string), `sex: male|female|undetermined|null`, `registeredOn: AAAA-MM-DD|null`, `ageReference: {years,months,asOf,estimatedBirthDate}|null`.
- Registro independiente: `pet-doctor.registry` versión 2, owners/pets. Lectura de versión 1 preservada. «Descargar registro JSON» exporta versión 2, sin atenciones; para respaldo completo usar «Descargar base JSON».
- Atención mantiene versión 1 con ampliación validada: `ownerSnapshot` incluye distrito; `petSnapshot` conserva perro y `ageAtAttention: {years,months}|null`; `observations` es string de hasta 2.000 caracteres. Se verifica correspondencia de IDs y de edad con performedAt.
- Contrato de cotización y estado tarifario sin cambios; datos no tarifarios no se agregan al PDF.

Observaciones se ingresan en sección plegable debajo de servicios. La fecha se muestra automáticamente y se conserva al actualizar. Observaciones y snapshots se incluyen en JSON/historial; el PDF sigue siendo comercial. Actualizar servicios conserva los snapshots anteriores, incluso cuando han cambiado los registros actuales. Los históricos sin snapshot no se completan retroactivamente.

## Persistencia y migración

Clave activa `pet-doctor.workspace.v3`; respaldo `pet-doctor-base-v3.json`. Si existe v3, prevalece. Si no, migra primero `pet-doctor.workspace.v2`; en su ausencia usa `pet-doctor.quotes-master.v1`. No elimina ni modifica claves anteriores ni fusiona datos. IDs, fechas e importes conservados.

Un error de cuota al migrar conserva el candidato v3 en memoria, muestra el problema y habilita respaldo pendiente/reintento; no anuncia éxito. El reintento verifica que no cambió la base fuente ni apareció otra v3. Una fuente corrupta exige cargar un respaldo antes de escribir. Otras operaciones mantienen guardado completo o ninguno y comprobación de cambios entre pestañas. No usar una aplicación antigua para editar respaldos v3.

La ausencia de campos antiguos se representa con distrito/raza vacíos, sexo y edad null; especie Canino se deriva del alcance previo del proyecto. registeredOn histórico desconocido permanece null. No se infieren DNI, edades ni distritos.

## CSV de clientes y perros

Las diez columnas anteriores permanecen, y se añaden siete:

```text
cliente_id;cliente_nombre;cliente_dni;cliente_telefono;cliente_correo;perrito_id;perrito_nombre;peso_kg;tamano;pelaje;cliente_distrito;especie;raza;sexo;edad_anios;edad_meses;fecha_referencia_edad
```

Plantilla nueva: distrito, raza, sexo y ambos números de edad obligatorios. especie debe ser `canino`; sexo admite `macho`, `hembra`, `no_determinado`. Fecha explícita `AAAA-MM-DD`, válida y no futura. No usar la fecha de importación como referencia: reimportar otro día debe producir el mismo nacimiento. registeredOn de CSV usa su fecha de referencia, pues no se conoce otro instante de alta original.

Se acepta la cabecera antigua completa de diez columnas, con aviso de formato heredado y campos nuevos sin registrar. No se admiten cabeceras nuevas incompletas ni columnas desconocidas. Nuevas columnas participan de la detección de conflictos; formato antiguo omitido no borra datos nuevos existentes. Ningún formato actualiza por coincidencia: contradicciones bloquean todo el archivo. El ID sigue siendo necesario ante homónimos.

## CSV detallado de atenciones e historial

Se mantienen las 17 columnas tarifarias existentes y se añaden columnas opcionales:

```text
cliente_distrito;especie;raza;sexo;edad_anios;edad_meses;observaciones
```

Se admite cualquier subconjunto de estas columnas adicionales, manteniendo todas las originales. Ambos números de edad se informan juntos y se refieren a la fecha de la atención. Los valores informados deben coincidir entre filas del mismo ID. Los datos ausentes quedan sin registrar, nunca se copian del distrito/raza/edad actuales. Las referencias y observaciones explícitas distintas de un ID guardado provocan conflicto; omitidas conservan su snapshot.

CSV resumido del historial conserva las 17 columnas originales y añade al final distrito, especie, raza, sexo, edad en años, edad en meses, nacimiento estimado y observaciones. Estos datos provienen de snapshots. Mantiene neutralización de fórmulas, comillas, tildes, separador punto y coma, BOM UTF-8 y CRLF. Es reporte, no plantilla detallada ni respaldo restaurable. Límites de entrada: JSON 20 MB; CSV 5 MB/5.000 filas; 10.000 atenciones. Cuota del navegador puede ser menor.

## Ejemplos, dependencias y Analítica

`scripts/build-record-examples.cjs` genera plantillas, registro JSON y ejemplos nuevos. Conserva fixtures v2 en tests/fixtures/v2. Los ejemplos siguen teniendo 10/15 y 25/45 clientes/perros, 150 atenciones y 200 filas, con IDs y relaciones estables; total 2.134.679 céntimos. Los datos nuevos son ficticios, con edades referidas al 21/08/2026 y edades históricas por fecha de atención. No autorizan comunicaciones.

`assets/records.js` es módulo puro compartido: fechas/edad, atributos y snapshots. Debe cargarse antes de files/workspace/clients. La sincronización de Analítica ahora copia ocho módulos, incluyendo records, y cuatro ejemplos. Actualizar mediante `node scripts/sync-analytics.cjs`; su manifiesto incluye SHA-256.

Analítica acepta workspaces v2/v3, migra el contenido y preserva atributos al respaldarlo. IndexedDB y sobre de respaldo analítico permanecen en versión 1. No hay nuevos filtros, KPI, gráficos ni columnas del CSV analítico. Los módulos copiados validan los nuevos CSV. La base analítica no accede al localStorage operativo.

## Verificación y límites

Pruebas: `node --test tests/*.test.cjs`, con jsdom 27.2.0 y fake-indexeddb disponibles en NODE_PATH fuera del repositorio. Casos nuevos de fechas/edad, obligaciones, migración, recuperación, snapshots, CSV/JSON, compatibilidad y DOM. La prueba CSS de jsdom comprueba la hoja final; la cascada con una regla antigua insertada al final se verifica en Chrome real.

Revisión local Chrome: alta sin peso, registro/ficha a 360/768/1440 px sin desborde horizontal, teclado, guardado de observaciones, detalle histórico, estilos compactos y carga de una base v3 en Analítica. No certifica todos los navegadores ni lectores de pantalla. Sin llamadas/correos, cambios de n8n o publicación.
