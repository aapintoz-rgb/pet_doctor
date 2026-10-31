// Código completo del NUEVO nodo «Adaptar respuesta Gmail».
function adaptGmail(result, invocation) {
  const requestId=invocation.requestId, clientId=invocation.clientId;
  const accepted=result && !result.error && typeof result.id==='string' && !!result.id.trim();
  return {statusCode:accepted?200:502,response:accepted
    ?{ok:true,status:'correo_enviado',requestId,clientId,messageId:result.id,message:'Gmail aceptó el envío del correo.'}
    :{ok:false,status:'resultado_desconocido',requestId,clientId,message:'Resultado desconocido: revisa Enviados en Gmail y la ejecución de n8n antes de intentar otro envío',errors:['No se pudo confirmar la aceptación del correo por Gmail.']}};
}
return [{json:adaptGmail($input.first().json, $('Validar invocación').first().json)}];
