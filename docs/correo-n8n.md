# Correo desde Pet Doctor — cambios manuales en tu n8n

Entrega de correo para GitHub Pages, 30 de octubre de 2026. **Tú haces los cambios en n8n.** El agente no modificó ni ejecutó el workflow remoto. La interfaz de correo se publica en https://aapintoz-rgb.github.io/pet_doctor/ por solicitud del usuario; la configuración remota sigue a tu cargo. La cuenta Gmail aparece configurada en tu captura, pero no se ha confirmado un envío real.

## 1. Conservar el flujo que ya funciona

Exporta una copia actual del workflow desde n8n antes de editar. Usa tu workflow existente, mismo Webhook con Header Auth, mismo Switch y mismo Respond to Webhook. No importes el JSON antiguo del repositorio encima del flujo: no incluye tu HTTP Request operativo de llamada.

Recorrido de correo:

```text
Webhook → Validar invocación → Switch (correo)
        → Send a message (Gmail) → Adaptar respuesta Gmail → Respond to Webhook
```

Mantén la rama llamada → HTTP Request → adaptador Twilio tal como funciona. El fallback del Switch sigue conectado al nodo que prepara 400/403.

## 2. Ampliar «Validar invocación» sin borrar tu lógica anterior

Abre ese nodo, modo **Run Once for All Items**, JavaScript. Pega el siguiente fragmento **AL PRINCIPIO**, antes de tu primera línea actual. Debajo debe permanecer TODO tu código anterior, incluida la lista de teléfonos que autorizaste. Es un bloque independiente: intercepta solo solicitudes de correo y deja que las llamadas recorran tu código original. También intercepta variantes de mayúsculas/espacios para rechazarlas y evitar que el validador anterior las admita con reglas antiguas.

Archivo para copiar: `workflows/validar-correo.snippet.js`.

```js
// AÑADIR AL PRINCIPIO de «Validar invocación», sin borrar el código actual.
{
function validateEmailInvocation(body, permitted = {}) {
  const data = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const fields = ['action','email','subject','message','clientId','requestId'];
  const errors = [];
  function text(field) {
    if (typeof data[field] !== 'string') { errors.push('El campo '+field+' debe ser texto.'); return ''; }
    return data[field];
  }
  const action=text('action'), rawEmail=text('email'), rawSubject=text('subject'), rawMessage=text('message');
  const email=rawEmail.trim(), subject=rawSubject.normalize('NFC').trim(), message=rawMessage.normalize('NFC').trim();
  const clientId=text('clientId'), requestId=text('requestId');
  if (Object.keys(data).some(field=>!fields.includes(field))) errors.push('La solicitud de correo contiene campos no admitidos.');
  if (action!=='correo') errors.push('La acción debe ser correo.');
  for (const [name,value] of [['clientId',clientId],['requestId',requestId]]) {
    if (!value.trim() || value.length>100) errors.push('El campo '+name+' es obligatorio y admite hasta 100 caracteres.');
  }
  if (!email || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\s,;<>]/.test(email) || /[\r\n]/.test(rawEmail)) errors.push('Se necesita una única dirección de correo válida.');
  if (!subject || Array.from(subject).length>200 || /[\r\n]/.test(rawSubject)) errors.push('El asunto debe tener de 1 a 200 caracteres y ocupar una sola línea.');
  if (!message || Array.from(message).length>360) errors.push('El mensaje de correo debe tener de 1 a 360 caracteres.');
  function reject(statusCode,status,details) {
    return {action:'invalida',statusCode,response:{ok:false,status,requestId:requestId&&requestId.length<=100?requestId:null,clientId:clientId&&clientId.length<=100?clientId:null,message:'No se ejecutó Gmail.',errors:details}};
  }
  if (errors.length) return reject(400,'solicitud_invalida',errors);
  const allowed=Object.hasOwn(permitted,clientId)&&typeof permitted[clientId]==='string'?permitted[clientId].trim():'';
  if (!allowed || allowed!==email) return reject(403,'destino_no_autorizado',['El cliente y correo no están autorizados en n8n.']);
  return {action:'correo',email,subject,message,clientId,requestId};
}

// Configuración exclusiva de n8n: clientId -> correo autorizado.
const CORREOS_PERMITIDOS = {};
const entradaCorreo = $input.first().json.body;
if (typeof entradaCorreo?.action === 'string' && entradaCorreo.action.trim().toLowerCase() === 'correo') {
  return [{json:validateEmailInvocation(entradaCorreo, CORREOS_PERMITIDOS)}];
}
}
// Debajo continúa TODO el código actual de llamada y validación general.

```

Dentro del fragmento cambia exclusivamente `CORREOS_PERMITIDOS` para añadir el ID real de la ficha y el correo que registraste. Ejemplo **ficticio**, no listo para enviar:

```js
const CORREOS_PERMITIDOS = {
  "ID_COPIADO_DEL_CODIGO_DE_LA_FICHA": "tu-correo-de-prueba@ejemplo.com"
};
```

El código del cliente está debajo de su nombre en Pet Doctor. No uses nombre ni DNI. El correo debe coincidir exactamente después de quitar espacios exteriores; no se convierten mayúsculas silenciosamente. Con la lista vacía, el correo devuelve 403 y **no ejecuta Gmail**. Mantén los pares reales solo en n8n, no en el repositorio ni en archivos publicados.

El fragmento se entrega separado porque la última exportación disponible es anterior al HTTP Request de llamada. Así se conserva tu validador vigente sin inventar ni sobrescribir sus cambios.

## 3. Revisar Switch y Gmail

En Switch conserva las reglas `{{ $json.action }}` igual a `correo` y a `llamada`, más fallback extra. La salida correo debe ir **solo a Gmail**, retirando cualquier conexión directa antigua desde esa salida a Respond to Webhook. No actives el envío a todas las salidas: cada petición debe tomar una sola rama.

En el Gmail que ya configuraste:

| Campo | Valor |
|---|---|
| Credential | Tu Gmail conectado en n8n |
| Resource / Operation | Message / Send |
| To — Expression | `{{ $json.email }}` |
| Subject — Expression | `{{ $json.subject }}` |
| Email Type | Text |
| Message — Expression | `{{ $json.message }}` |
| Sender Name (opcional) | Pet Doctor |
| Append n8n attribution | Desactivado si no deseas esa firma |

No añadas CC, BCC, destinatarios extra ni adjuntos. El remitente es la cuenta conectada; no se recibe desde Pet Doctor.

En **Settings** de Gmail: **Retry On Fail desactivado** y **On Error → Continue (using regular output)** —en algunas versiones se muestra como Continue—. La salida normal se conecta al adaptador. Si tu versión usa salida de error separada, conecta también esa salida al adaptador y comprueba que recibe el error; nunca conectes un fallo a una respuesta de éxito. No habilites Always Output Data como sustituto del manejo de errores.

## 4. Crear «Adaptar respuesta Gmail»

Añade un nodo **Code**, nombre exacto **Adaptar respuesta Gmail**, JavaScript, **Run Once for All Items**. Conecta Gmail → este nodo → Respond to Webhook. Pega su código completo; este es un nodo nuevo, no reemplaza el adaptador Twilio.

Archivo para copiar: `workflows/adaptar-gmail.code.js`.

```js
// Código completo del NUEVO nodo «Adaptar respuesta Gmail».
function adaptGmail(result, invocation) {
  const requestId=invocation.requestId, clientId=invocation.clientId;
  const accepted=result && !result.error && typeof result.id==='string' && !!result.id.trim();
  return {statusCode:accepted?200:502,response:accepted
    ?{ok:true,status:'correo_enviado',requestId,clientId,messageId:result.id,message:'Gmail aceptó el envío del correo.'}
    :{ok:false,status:'resultado_desconocido',requestId,clientId,message:'Resultado desconocido: revisa Enviados en Gmail y la ejecución de n8n antes de intentar otro envío',errors:['No se pudo confirmar la aceptación del correo por Gmail.']}};
}
return [{json:adaptGmail($input.first().json, $('Validar invocación').first().json)}];

```

La referencia `$('Validar invocación')` debe coincidir con el nombre de tu nodo. No recuperes los identificadores desde Gmail: su salida reemplaza los datos de entrada. La aceptación exige `id` de Gmail no vacío y ausencia de error; no exige threadId ni interpreta el identificador con un formato inventado.

## 5. Respond to Webhook y conexión única

Conserva la configuración común:

- Webhook: POST, Header Auth, Respond **Using Respond to Webhook Node**.
- Respond to Webhook → Respond With **JSON**.
- Response Body en Expression: `{{ $json.response }}`.
- Response Code en Expression: `{{ $json.statusCode }}`.

No necesitas otra URL ni otra clave. En Pet Doctor → Datos y respaldos → Conexión n8n introduce la misma URL y **clave de comunicaciones para esta sesión**. El nombre técnico sigue siendo `X-PetDoctor-Call-Key`; la clave no se guarda ni se exporta. El encabezado no cambia para Gmail.

Si usas `/webhook-test/`, activa **Listen for test event** para cada prueba cuando corresponda. Para el sitio Pages, el origen CORS es `https://aapintoz-rgb.github.io`, sin la ruta `/pet_doctor/`; comprueba OPTIONS y los encabezados Content-Type y X-PetDoctor-Call-Key. No uses no-cors. Publicar el sitio no activa el workflow remoto.

## 6. Contrato y resultados

La aplicación prepara únicamente este JSON de negocio:

```json
{"action":"correo","email":"cliente@ejemplo.com","subject":"Seguimiento","message":"Hola desde Pet Doctor.","clientId":"ID_DE_LA_FICHA","requestId":"NUEVO_POR_INTENTO"}
```

Asunto: 1–200 puntos de código, una línea. Mensaje: 1–360, con saltos de línea. NFC/trim y conteo Array.from iguales en ambos lados. Destinatario único hasta 254 caracteres, sin listas ni nombres con formato de cabecera. IDs obligatorios, máximo 100 caracteres. n8n aplica además la lista autorizada; la clave de webhook no sustituye esa comprobación.

Aceptación HTTP **200**:

```json
{"ok":true,"status":"correo_enviado","requestId":"MISMO_ID","clientId":"MISMO_CLIENTE","messageId":"ID_DE_GMAIL","message":"Gmail aceptó el envío del correo."}
```

400: solicitud_invalida. 403: destino_no_autorizado o acceso rechazado por el Webhook. 401: autenticación rechazada. El adaptador devuelve 502/resultado_desconocido cuando Gmail falla o no devuelve ID verificable. No revela errores crudos ni secretos del proveedor.

Pet Doctor solo anuncia aceptación si coinciden HTTP 200, estado, ambos IDs y un messageId no vacío. Eso no acredita entrega ni lectura. Red/CORS, timeout de 15 s, JSON inválido y respuestas inesperadas producen **Resultado desconocido**: revisar Enviados en Gmail y la ejecución de n8n antes de preparar otro envío. No hay reintentos automáticos ni garantía de deduplicación por requestId. Cerrar la página o abortar la espera no cancela un correo que ya se envió.

## 7. Prueba manual que realizas tú

1. En Pet Doctor (Pages o copia local actualizada) registra/edita un cliente con un correo tuyo y copia su código. Autoriza ese par en n8n.
2. Abre su ficha y configura la conexión y clave de sesión si faltan.
3. Pulsa Enviar correo: destinatario solo lectura, asunto y mensaje vacíos, contador 0/360.
4. Escribe asunto y mensaje; pulsa Revisar correo. Todavía no se envía.
5. Comprueba destinatario y contenido. Activa la escucha de n8n si corresponde y pulsa **Confirmar envío real** una sola vez. Este paso envía un correo real.
6. Confirma resultado e ID Gmail en Pet Doctor, ejecución de n8n y correo recibido/enviado. No confundir aceptación con entrega.
7. Para verificar 403, retira temporalmente el par de la lista y confirma un nuevo intento: no debe ejecutarse Gmail. Restáuralo después si deseas permitir ese cliente.
8. Comprueba una llamada en otra ocasión solo cuando quieras efectuarla; los tests automáticos no generan comunicaciones reales.

El resultado vive en el modal. Ningún mensaje, ID de Gmail ni historial de comunicaciones entra al workspace. La configuración local del correo está lista; mientras no completes estos nodos, el frontend puede mostrar un resultado desconocido y no debe interpretarse como fallo seguro de envío.

## Verificación de entrega

95 pruebas automatizadas aprobadas, sin omitidas: 79 regresiones adaptadas más 16 escenarios nuevos de correo (9 integración/n8n y 7 DOM). Incluyen límites, Unicode, par autorizado, rechazo antes de Gmail, código de los fragmentos, transporte simulado, errores y timeout, doble clic, cambios de destinatario, foco, ausencia de persistencia y conservación de Cotización.

Revisión visual real a 360/768/1440 pendiente; CSS adaptable y teclado/foco comprobados con DOM. Prueba de Gmail real pendiente y a cargo del usuario. La publicación de Pages no modifica ni activa n8n remotamente.
