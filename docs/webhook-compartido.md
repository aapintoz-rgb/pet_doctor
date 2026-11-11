# Llamadas y correo sin listas de IDs de origen

Actualización 31/10/2026. Entrega local; aplicar manualmente en el workflow existente. No se modificó n8n ni se enviaron comunicaciones.

## 1. Webhook

Conservar POST, Header Auth con nombre **X-PetDoctor-Call-Key**, credencial actual y respuesta mediante Respond to Webhook. No hace falta un script adicional aquí. Cada persona configura en Datos y sincronización la misma URL y una clave válida para ese webhook; la clave permanece en memoria de su sesión. La autenticación sigue siendo necesaria aunque se quiten las listas.

Compartir la misma URL de Pages no cambia el origen del navegador. Mantener CORS para **https://aapintoz-rgb.github.io** (sin /pet_doctor/) y permitir el preflight de Content-Type y X-PetDoctor-Call-Key. Solo agregar otros orígenes si se aloja otra copia en otro dominio. La lista CORS y la lista de IDs de clientes son controles diferentes.

## 2. Code «Validar invocación» — único reemplazo necesario

Seleccionar **JavaScript → Run Once for All Items**. Reemplazar TODO el contenido por [validar-invocacion.code.js](../workflows/validar-invocacion.code.js).

Este archivo ya contiene los dos validadores y el enrutamiento de entrada. No pegarlo antes o después del código anterior. Retirar las listas PERMITTED, CORREOS_PERMITIDOS y cualquier rechazo por pertenencia del clientId o del destino a una lista. No importar encima del workflow el antiguo JSON de referencia de llamadas.

- Llamada: teléfono internacional válido, mensaje de 1–120 caracteres Unicode, action exacta llamada.
- Correo: una dirección válida, asunto de 1–200 caracteres en una línea, mensaje de 1–360 caracteres, action exacta correo.
- Ambas: clientId y requestId siguen siendo textos obligatorios de hasta 100 caracteres; se aceptan sin registro previo y se devuelven sin alteración para correlación. No representan autenticación.
- Se rechazan campos adicionales y datos inválidos con action invalida, statusCode 400 y response. No se envía nada al proveedor en esa rama.
- No se exige coincidencia con un cliente previamente cargado en n8n. Una solicitud autenticada con destino válido puede pasar al proveedor.

Si el workflow tiene otro nodo personalizado que coteja IDs o destinatarios con una lista, retirar solo ese cotejo. El repositorio no contiene la exportación actual del workflow remoto para confirmar nodos adicionales.

## 3. Switch

Conservar las reglas exactas de action **llamada** y **correo**. Fallback → Preparar error. No añadir condiciones por clientId, teléfono o correo. El validador conserva los mismos nombres de campos que usan las ramas actuales.

## 4. Nodos de proveedor y adaptadores

Sin cambios. Mantener en HTTP Request/Twilio el destino obtenido de phone, la credencial y el From definidos en n8n. Gmail usa email, subject y message del validador. No introducir destinatarios fijos de prueba como sustitución del campo dinámico.

Conservar los adaptadores existentes: ambos deben tomar clientId/requestId de **Validar invocación**. El adaptador de Gmail del repositorio está en [adaptar-gmail.code.js](../workflows/adaptar-gmail.code.js). No sustituir el adaptador de tu HTTP Request por uno pensado para otro formato de respuesta Twilio.

Preparar error y Respond to Webhook conservan su código: respuesta JSON desde $json.response y código HTTP desde $json.statusCode. No hay scripts nuevos necesarios en estos puntos.

## 5. Comprobación

Guardar y publicar/activar la actualización del workflow de producción según tu instalación. La publicación de Pages no actualiza n8n.

Se probaron localmente ambos validadores con IDs de otros navegadores, destinos válidos, IDs vacíos y largos, campos extra, datos inválidos y límites de mensajes; sin invocar Gmail/Twilio. Las restricciones de destinos verificados, permisos y saldo de Twilio trial siguen vigentes y son independientes de este cambio.

Los archivos son reproducibles con node workflows/build-calls.cjs y node workflows/build-email-snippets.cjs. El JSON de referencia sigue siendo solo de llamadas; el archivo de reemplazo compartido incluye ambas acciones.
