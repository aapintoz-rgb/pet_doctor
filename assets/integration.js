(function (g) {
  'use strict';
  const W = g.PetDoctorWorkspace || require('./workspace.js');
  const CALL_CONFIG_KEY = 'pet-doctor.calls-demo.v1';
  function endpoint(value) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('Configura la URL del webhook n8n en «Datos y respaldos».');
    let url; try { url = new URL(value.trim()); } catch { throw new Error('La URL del webhook no es válida.'); }
    const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw new Error('Usa HTTPS o HTTP únicamente para localhost.');
    if (url.username || url.password || url.hash) throw new Error('La URL no debe contener credenciales ni fragmentos.');
    return url.href;
  }
  function retireLegacyConfig(storage){try{storage.removeItem('pet-doctor.integration-test.v1');}catch{/* La configuración retirada nunca se consulta, aunque no pueda eliminarse. */}}
  const normalizePhone=value=>typeof value==='string'?value.replace(/[\s().-]/g,''):'';
  const validCallPhone=value=>/^\+[1-9]\d{6,14}$/.test(normalizePhone(value));
  const normalizeCallMessage=value=>typeof value==='string'?value.normalize('NFC').trim():'';
  const callMessageLength=value=>Array.from(normalizeCallMessage(value)).length;
  function callEndpoint(value){if(typeof value!=='string'||!value.trim())throw new Error('Configura la URL de llamadas de demostración en «Datos y respaldos».');return endpoint(value);}
  function callKey(value){if(typeof value!=='string'||!value.trim()||value.length>1024||/[\u0000-\u001f\u007f]/.test(value))throw new Error('Introduce una clave de llamadas válida para esta sesión en «Datos y respaldos».');return value.trim();}
  function readCallConfig(storage){try{const source=storage.getItem(CALL_CONFIG_KEY);return source?callEndpoint(JSON.parse(source).url):'';}catch{return '';}}
  function saveCallConfig(storage,value){const url=value.trim()?callEndpoint(value):'';try{storage.setItem(CALL_CONFIG_KEY,JSON.stringify({url}));}catch{throw new Error('No se pudo guardar la URL de llamadas.');}return url;}
  function validateCallPayload(payload){
    const fields=['action','phone','message','clientId','requestId'];
    if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).length!==fields.length||Object.keys(payload).some(key=>!fields.includes(key)))throw new Error('La llamada solo admite acción, teléfono, mensaje e identificadores.');
    if(payload.action!=='llamada')throw new Error('La acción de llamada no es válida.');
    for(const field of ['clientId','requestId'])if(typeof payload[field]!=='string'||!payload[field].trim()||payload[field].length>100)throw new Error('La llamada necesita identificadores válidos.');
    if(typeof payload.phone!=='string'||!validCallPhone(payload.phone)||normalizePhone(payload.phone)!==payload.phone)throw new Error('Corrige el teléfono internacional del cliente en «Editar datos».');
    if(typeof payload.message!=='string'||!callMessageLength(payload.message)||callMessageLength(payload.message)>120||normalizeCallMessage(payload.message)!==payload.message)throw new Error('El mensaje de llamada debe tener entre 1 y 120 caracteres.');
    return payload;
  }
  function prepareCall(client,draft){
    if(!client?.id)throw new Error('Selecciona un cliente registrado.');
    return validateCallPayload({action:'llamada',phone:normalizePhone(client.contact),message:normalizeCallMessage(draft?.message),clientId:client.id,requestId:W.newId()});
  }
  const UNKNOWN_CALL='Resultado desconocido: comprueba los registros de Twilio antes de intentar otra llamada';
  async function runCall(value,payload,key,{fetchImpl=g.fetch?.bind(g),timeoutMs=15000}={}){
    const url=callEndpoint(value),secret=callKey(key);validateCallPayload(payload);
    if(!fetchImpl)return {kind:'validation',message:'El navegador no permite realizar esta petición.'};
    const controller=new AbortController();let timer;
    const unknown=()=>({kind:'unknown',message:UNKNOWN_CALL,requestId:payload.requestId});
    const timeout=new Promise(resolve=>{timer=setTimeout(()=>{controller.abort();resolve(unknown());},timeoutMs);});
    const task=(async()=>{
      try{
        const response=await fetchImpl(url,{method:'POST',mode:'cors',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json','X-PetDoctor-Call-Key':secret},body:JSON.stringify(payload),signal:controller.signal});
        if(response.status===401)return {kind:'denied',message:'El webhook rechazó la autenticación. Revisa la clave de sesión.',requestId:payload.requestId};
        let body;try{body=await response.json();}catch{return response.status===403?{kind:'denied',message:'El webhook rechazó el acceso. Revisa la clave y el destino autorizado.',requestId:payload.requestId}:unknown();}
        const correlated=body?.requestId===payload.requestId;
        if(response.status===202&&body?.ok===true&&body.status==='llamada_iniciada'&&correlated&&body.clientId===payload.clientId&&/^CA[\da-f]{32}$/i.test(body.callSid)&&['queued','initiated','ringing','in-progress'].includes(body.providerStatus))return {kind:'accepted',message:'Llamada iniciada: Twilio aceptó la solicitud. Esto no confirma que el cliente contestó o escuchó el mensaje.',callSid:body.callSid,providerStatus:body.providerStatus,requestId:payload.requestId};
        if(correlated&&body?.ok===false&&((response.status===400&&body.status==='solicitud_invalida')||(response.status===403&&body.status==='destino_no_autorizado')))return {kind:'rejected',message:response.status===403?'El cliente y teléfono no están autorizados en la lista de demostración de n8n.':'n8n rechazó los datos de la llamada.',errors:Array.isArray(body.errors)?body.errors.filter(error=>typeof error==='string'):[],requestId:payload.requestId};
        if(response.status===403)return {kind:'denied',message:'El webhook rechazó el acceso o el destino. Revisa la configuración.',requestId:payload.requestId};
        return unknown();
      }catch{return unknown();}
    })();
    try{return await Promise.race([task,timeout]);}finally{clearTimeout(timer);}
  }
  const api={endpoint,retireLegacyConfig,CALL_CONFIG_KEY,normalizePhone,validCallPhone,normalizeCallMessage,callMessageLength,callEndpoint,callKey,readCallConfig,saveCallConfig,validateCallPayload,prepareCall,runCall,UNKNOWN_CALL};
  g.PetDoctorIntegration=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
