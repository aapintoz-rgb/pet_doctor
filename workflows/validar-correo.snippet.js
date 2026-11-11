// AÑADIR AL PRINCIPIO de «Validar invocación», sin borrar el código actual.
{
function validateEmailInvocation(body) {
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
  return {action:'correo',email,subject,message,clientId,requestId};
}

const entradaCorreo = $input.first().json.body;
if (typeof entradaCorreo?.action === 'string' && entradaCorreo.action.trim().toLowerCase() === 'correo') {
  return [{json:validateEmailInvocation(entradaCorreo)}];
}
}
// Debajo continúa TODO el código actual de llamada y validación general.
