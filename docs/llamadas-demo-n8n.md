# Llamadas de demostración desde la ficha cliente

Esta guía describe el único workflow modificado que usa la aplicación. El webhook anterior de pruebas se ha retirado de Pet Doctor. El correo queda pendiente, con su botón deshabilitado. Esta actualización no modifica ni ejecuta el flujo remoto.

## 1. Preparar el workflow

Usa el workflow que ya modificaste en n8n y su URL en Pet Doctor. `workflows/pet-doctor-llamadas-demo.json` queda como referencia opcional de la estructura: está desactivado, sin credenciales, con From y destinos permitidos vacíos. No necesitas crear un segundo workflow para la aplicación.

| Nodo | Configuración y función |
|---|---|
| Webhook llamadas | POST, path pet-doctor-llamadas-demo, Authentication Header Auth, Respond usando Respond to Webhook |
| Validar invocación | Valida campos y comprueba el par cliente-teléfono en PERMITTED |
| Switch llamada | Salida 0: action igual a llamada; fallback extra: rechazo |
| Make a call | Twilio Call / Make; From fijo de n8n, To y Message dinámicos; sin TwiML |
| Adaptar respuesta Twilio | Conserva requestId/clientId del validador y normaliza el resultado |
| Preparar error | Conserva el sobre statusCode/response de validación |
| Respond to Webhook | JSON; cuerpo `{{ $json.response }}`; código `{{ $json.statusCode }}` |

### Autenticación del webhook

Crea una credencial **Header Auth** en n8n:

- **Name:** `X-PetDoctor-Call-Key`.
- **Value:** una clave propia de demostración, diferente de las credenciales de Twilio.

Selecciona esa credencial en Webhook llamadas. El acceso se comprueba antes de ejecutar el Code. No pegues la clave en el código, JSON, repositorio ni mensajes de error. La credencial contiene el valor secreto; el workflow exportado no lo incluye.

### Lista de destinos

Abre Validar invocación y localiza:

```javascript
const PERMITTED = {};
```

Añade únicamente pares de IDs reales de cliente y teléfonos internacionales que hayas verificado y autorizado para la demostración. El ID se muestra en la ficha de Pet Doctor. El objeto vacío rechaza todas las solicitudes con 403 antes de Twilio. El número debe coincidir con el registrado en la ficha; no se admiten destinos elegidos libremente en el modal.

No uses nombres de cliente como identificador, no guardes una lista completa de clientes en este flujo y no agregues DNI, correo ni datos de perritos. Los IDs se tratan como identificadores opacos, sin renombrarlos ni normalizarlos.

### Twilio

En Make a call selecciona tu credencial Twilio y completa **From** con el número Voice de tu cuenta. No copies ese número al JSON enviado por Pet Doctor.

- Resource: Call.
- Operation: Make.
- To, como expresión: `{{ $json.phone }}`.
- Use TwiML: desactivado.
- Message, como expresión: `{{ $json.message }}`.
- Settings / On Error: **Continue (using regular output)**. El export incluye `onError: continueRegularOutput`.
- Sin reintentos automáticos, grabaciones ni Status Callback.

El adaptador solo confirma aceptación si recibe SID con formato CA seguido de 32 dígitos hexadecimales y un estado inicial queued, initiated, ringing o in-progress. Los errores o salidas incompletas se convierten en 502/resultado_desconocido sin exponer el error original de Twilio.

Las restricciones y el saldo de la cuenta trial son independientes de la lista local: autorizar un destino en PERMITTED no lo verifica en Twilio. Revisa los números verificados, permisos y condiciones de Voice de tu cuenta antes de confirmar una llamada real.

## 2. Configurar Pet Doctor

En **Datos y respaldos → Conexión n8n**, configura la única conexión:

1. URL del webhook modificado: HTTPS, o HTTP solo para localhost.
2. Clave de llamadas para esta sesión: el valor de la credencial Header Auth.
3. Guarda la conexión. Guardar esta configuración no envía solicitudes ni inicia llamadas.

La URL se guarda en `pet-doctor.calls-demo.v1`. La clave permanece únicamente en memoria; el campo se limpia al guardar o cerrar el diálogo. Se olvida al cerrar sesión, recargar la página o pulsar Olvidar clave. Ninguna clave ni configuración de conexión se incluye en la base JSON de clientes.

Si usas una URL /webhook-test/, activa **Listen for test event** antes de la llamada. El workflow no se publica automáticamente. Para operar de forma continua habría que preparar otra entrega de despliegue/autorización; el login de Pet Doctor sigue siendo académico.

### CORS y preflight

Sirve la app desde un origen HTTP estático definido; por ejemplo http://127.0.0.1:8000. El export usa ese origen en Allowed Origins; adáptalo si usas otro puerto o dominio. Un origen localhost es distinto de 127.0.0.1.

Comprueba OPTIONS y las respuestas reales, incluidos errores. El navegador solicitará permiso para POST y los encabezados Content-Type y X-PetDoctor-Call-Key. Los encabezados CORS de la respuesta deben permitir el origen de Pet Doctor. No uses mode no-cors ni publiques la clave en query strings. La configuración exacta de preflight depende del despliegue de n8n/proxy; Allowed Origins por sí solo no certifica OPTIONS.

## 3. Preparar y confirmar desde la ficha

Llamar permanece deshabilitado sin URL, clave o teléfono internacional válido. Si el cliente tiene solo un número nacional, corrígelo desde Editar datos; no se añade un país ni se permite un número alternativo en el modal.

El mensaje empieza vacío. El contador usa `Array.from(message.normalize('NFC').trim()).length`: entre 1 y 120 caracteres Unicode, con el mismo criterio en n8n. No se recorta texto automáticamente, y no se usa un maxlength UTF-16 que cuente emojis de forma distinta.

**Revisar llamada** prepara una operación y muestra cliente, teléfono y mensaje; todavía no envía nada. **Editar mensaje** vuelve a la composición. **Confirmar llamada real** vuelve a comprobar que existe el cliente y conserva el mismo teléfono, y entonces hace un único POST. Mientras espera, bloquea confirmaciones repetidas, cierre/Escape y cambio de módulo durante un máximo de 15 segundos.

## 4. Contrato de entrada

```json
{
  "action": "llamada",
  "phone": "+51999123456",
  "message": "Hola, Ana. Te llamamos de Pet Doctor para dar seguimiento a la atención de Luna.",
  "clientId": "identificador-del-cliente",
  "requestId": "identificador-unico-de-la-operacion"
}
```

El número es ilustrativo, no un destino autorizado. Nunca ejecutes pruebas contra un número ajeno al que hayas autorizado/verificado.

Solo se aceptan esos cinco campos. IDs de texto obligatorios, de hasta 100 caracteres. El teléfono se normaliza quitando separadores, sin inventar prefijos. Mensaje de texto plano entre 1 y 120 caracteres tras NFC y trim. Campos From, TwiML, email u otros se rechazan. El mensaje se suministra a la operación de texto a voz del nodo, sin aceptar instrucciones XML del navegador.

## 5. Contrato de salida

Aceptación: HTTP 202.

```json
{
  "ok": true,
  "status": "llamada_iniciada",
  "requestId": "identificador-unico-de-la-operacion",
  "clientId": "identificador-del-cliente",
  "callSid": "CA0123456789abcdef0123456789abcdef",
  "providerStatus": "queued",
  "message": "Twilio aceptó la solicitud de llamada."
}
```

Pet Doctor comprueba HTTP, estado, correlación, Call SID y estado inicial antes de mostrar Llamada iniciada. No afirma que fue contestada ni que el mensaje se escuchó.

Errores de datos: HTTP 400/status solicitud_invalida; par no autorizado: HTTP 403/status destino_no_autorizado. El cuerpo contiene ok false, requestId, clientId, message y errors. Header Auth puede rechazar antes de entrar al flujo con 401/403 sin el cuerpo de aplicación.

Error o salida no confirmable de Twilio: HTTP 502/status resultado_desconocido. Una desconexión, timeout o respuesta mal formada también producen: **Resultado desconocido: comprueba los registros de Twilio antes de intentar otra llamada**. La llamada puede haberse iniciado aunque no llegara la respuesta; interrumpir la espera no cancela una llamada.

Después del resultado solo se puede cerrar o **Preparar nueva llamada**, que comienza otra revisión y otro requestId. No hay reintentos automáticos. requestId es correlación, no deduplicación distribuida: no reenviar el mismo POST esperando una garantía de llamada única.

No se persisten mensajes, resultados, IDs de llamadas ni un historial de comunicaciones en el workspace. El resultado solo vive en el modal.

## 6. Archivos y verificaciones

- `workflows/call-contract.cjs`: funciones puras de validación y adaptación.
- `workflows/build-calls.cjs`: genera el workflow; comando `node workflows/build-calls.cjs` desde la raíz.
- `workflows/pet-doctor-llamadas-demo.json`: archivo importable, desactivado y sin configuración sensible.
- `tests/calls.test.cjs`: límites, contrato, lista permitida, autenticación representada en el JSON, errores y transporte simulado; ejecuta también los Code nodes del JSON dentro de un contexto aislado.

Las pruebas automatizadas no sustituyen importar el JSON en tu versión de n8n y verificar Header Auth, preflight y una llamada autorizada. Esa comprobación real permanece pendiente; esta entrega no inició llamadas ni activó flujos remotos.

Referencias oficiales: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.twilio/ y https://www.twilio.com/docs/voice/api/call-resource
