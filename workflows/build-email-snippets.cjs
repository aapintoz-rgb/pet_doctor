'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {validateEmailInvocation,adaptGmail}=require('./email-contract.cjs');
const {validateInvocation}=require('./call-contract.cjs');
// Fragmento para ANTEPONER al validador actual: otras acciones siguen su código original.
const validator=`// AÑADIR AL PRINCIPIO de «Validar invocación», sin borrar el código actual.\n{\n${validateEmailInvocation.toString()}\n\nconst entradaCorreo = $input.first().json.body;\nif (typeof entradaCorreo?.action === 'string' && entradaCorreo.action.trim().toLowerCase() === 'correo') {\n  return [{json:validateEmailInvocation(entradaCorreo)}];\n}\n}\n// Debajo continúa TODO el código actual de llamada y validación general.\n`;
const adapter=`// Código completo del NUEVO nodo «Adaptar respuesta Gmail».\n${adaptGmail.toString()}\nreturn [{json:adaptGmail($input.first().json, $('Validar invocación').first().json)}];\n`;
fs.writeFileSync(path.join(__dirname,'validar-correo.snippet.js'),validator);
fs.writeFileSync(path.join(__dirname,'adaptar-gmail.code.js'),adapter);

// Sustitución completa del nodo compartido: no conservar debajo listas antiguas.
const combined=`// REEMPLAZAR TODO el código de «Validar invocación».\n// Run Once for All Items. Header Auth se conserva en el Webhook.\n${validateInvocation.toString()}\n\n${validateEmailInvocation.toString()}\n\nconst body=$input.first().json.body;\nconst result=body?.action==='correo' ? validateEmailInvocation(body) : validateInvocation(body);\nreturn [{json:result}];\n`;
fs.writeFileSync(path.join(__dirname,'validar-invocacion.code.js'),combined);
