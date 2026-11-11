// Funciones puras: se incorporan al JSON de n8n sin dependencias externas.
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
function adaptTwilio(result,invocation) {
  const requestId=invocation.requestId,clientId=invocation.clientId;
  if(!result?.error && typeof result?.sid==='string' && /^CA[\da-f]{32}$/i.test(result.sid) && ['queued','initiated','ringing','in-progress'].includes(result.status))return {statusCode:202,response:{ok:true,status:'llamada_iniciada',requestId,clientId,callSid:result.sid,providerStatus:result.status,message:'Twilio aceptó la solicitud de llamada.'}};
  // No se exponen errores originales: pueden contener datos internos del proveedor.
  return {statusCode:502,response:{ok:false,status:'resultado_desconocido',requestId,clientId,message:'Resultado desconocido: comprueba los registros de Twilio antes de intentar otra llamada',errors:['No se pudo confirmar la aceptación de la llamada por Twilio.']}};
}
module.exports={validateInvocation,adaptTwilio};
