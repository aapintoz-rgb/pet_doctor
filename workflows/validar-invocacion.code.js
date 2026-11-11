// REEMPLAZAR TODO el código de «Validar invocación».
// Run Once for All Items. Header Auth se conserva en el Webhook.
function validateInvocation(body) {
  const errors = [], fields = ['action','phone','message','clientId','requestId'];
  const data = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  function text(field,max) {
    if(typeof data[field]!=='string'){errors.push('El campo '+field+' debe ser texto.');return '';}
    const value=data[field];if(!value.trim()||value.length>max)errors.push('El campo '+field+' es obligatorio y admite hasta '+max+' caracteres.');return value;
  }
  if(Object.keys(data).some(field=>!fields.includes(field)))errors.push('La solicitud contiene campos no admitidos.');
  if(data.action!=='llamada')errors.push('La acción debe ser llamada.');
  const clientId=text('clientId',100),requestId=text('requestId',100);
  const rawPhone=text('phone',32),phone=rawPhone.replace(/[\s().-]/g,'');
  if(!/^\+[1-9]\d{6,14}$/.test(phone))errors.push('El teléfono debe incluir un prefijo internacional válido.');
  const message=typeof data.message==='string'?data.message.normalize('NFC').trim():'';
  if(typeof data.message!=='string'||Array.from(message).length<1||Array.from(message).length>120)errors.push('El mensaje debe tener entre 1 y 120 caracteres.');
  function rejected(statusCode,status,details){return {action:'invalida',statusCode,response:{ok:false,status,requestId:requestId&&requestId.length<=100?requestId:null,clientId:clientId&&clientId.length<=100?clientId:null,message:'No se pudo procesar la solicitud.',errors:details}};}
  if(errors.length)return rejected(400,'solicitud_invalida',errors);
  return {action:'llamada',phone,message,clientId,requestId};
}

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

const body=$input.first().json.body;
const result=body?.action==='correo' ? validateEmailInvocation(body) : validateInvocation(body);
return [{json:result}];
