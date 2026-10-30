const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const I=require('../assets/integration.js');
const {validateInvocation,adaptTwilio}=require('../workflows/call-contract.cjs');
const workflow=require('../workflows/pet-doctor-llamadas-demo.json');
const owner={id:'client-1',contact:'+51 (999) 123-456',name:'Ana',dni:'00123456',email:'ana@example.com'};
const url='https://n8n.example.com/webhook-test/calls';
const key='clave-de-prueba-no-real';
const sid='CA0123456789abcdef0123456789abcdef';
const prepare=message=>I.prepareCall(owner,{message});

test('Mensaje Unicode: 120 válidos, 121 y vacío inválidos; NFC y trim equivalentes al servidor',()=>{
  for(const message of ['a'.repeat(120),'😀'.repeat(120),'e\u0301'.repeat(120),'  Hola, señor Pérez.  ']){
    const payload=prepare(message);assert.ok(Array.from(payload.message).length<=120);assert.equal(validateInvocation(payload,{'client-1':'+51999123456'}).action,'llamada');
  }
  for(const message of ['','   ','a'.repeat(121),'😀'.repeat(121)]){
    assert.throws(()=>prepare(message));const result=validateInvocation({action:'llamada',clientId:owner.id,requestId:'r1',phone:'+51999123456',message},{'client-1':'+51999123456'});assert.equal(result.statusCode,400);
  }
  assert.equal(I.callMessageLength(' e\u0301 '),1);
});

test('Solicitud mínima usa el registro, no un teléfono alternativo ni campos extra',()=>{
  const payload=I.prepareCall(owner,{message:'Hola',phone:'+51999888777',from:'x',email:'x'});
  assert.deepEqual(Object.keys(payload),['action','phone','message','clientId','requestId']);assert.equal(payload.phone,'+51999123456');
  assert.throws(()=>I.prepareCall(null,{message:'Hola'}));assert.throws(()=>I.prepareCall({...owner,contact:'999123456'},{message:'Hola'}));
  for(const extra of [{from:'+1234567890'},{twiml:'<Dial>bad</Dial>'},{email:'x'}]){assert.throws(()=>I.validateCallPayload({...payload,...extra}));assert.equal(validateInvocation({...payload,...extra},{'client-1':payload.phone}).statusCode,400);}
});

test('n8n rechaza campos inválidos y lista vacía; solo autoriza el par cliente-teléfono exacto',()=>{
  const payload=prepare('Hola');assert.equal(validateInvocation(payload).statusCode,403);
  assert.equal(validateInvocation(payload,{'other-client':payload.phone}).statusCode,403);
  assert.equal(validateInvocation(payload,{'client-1':'+51999888777'}).statusCode,403);
  assert.equal(validateInvocation(payload,{'client-1':payload.phone}).phone,payload.phone);
  for(const changed of [{action:'correo'},{action:'prueba_llamada'},{message:1},{clientId:''},{requestId:[]},{phone:'999123456'}])assert.equal(validateInvocation({...payload,...changed},{'client-1':payload.phone}).statusCode,400);
  assert.equal(validateInvocation({...payload,clientId:'__proto__'}).statusCode,403);
});

test('Única conexión conserva URL y excluye clave y datos de negocio',()=>{
  const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
  I.saveCallConfig(storage,url);
  assert.equal(I.readCallConfig(storage),url);
  assert.deepEqual(JSON.parse(data.get(I.CALL_CONFIG_KEY)),{url});
  assert.throws(()=>I.callKey(''));assert.throws(()=>I.callKey('secret\r\nheader'));assert.equal(I.callKey(' '+key+' '),key);
});

test('Adaptador Twilio conserva correlación y solo acepta SID y estado inicial válidos',()=>{
  const input=prepare('Hola'),accepted=adaptTwilio({sid,status:'queued'},input);
  assert.equal(accepted.statusCode,202);assert.equal(accepted.response.requestId,input.requestId);assert.equal(accepted.response.clientId,owner.id);
  for(const result of [{error:'AuthToken secreto'}, {sid:'bad',status:'queued'}, {sid,status:'failed'}, {sid}]){
    const error=adaptTwilio(result,input);assert.equal(error.statusCode,502);assert.equal(error.response.status,'resultado_desconocido');assert.equal(JSON.stringify(error).includes('AuthToken secreto'),false);
  }
});

test('Transporte real separado: Header Auth solo en cabecera y JSON mínimo',async()=>{
  const payload=prepare('Hola');let captured;
  const result=await I.runCall(url,payload,key,{fetchImpl:async(target,options)=>{captured={target,options};return {status:202,json:async()=>adaptTwilio({sid,status:'queued'},payload).response};}});
  assert.equal(result.kind,'accepted');assert.equal(result.callSid,sid);assert.equal(captured.options.headers['X-PetDoctor-Call-Key'],key);assert.equal(captured.options.mode,'cors');assert.equal(captured.options.credentials,'omit');
  assert.deepEqual(JSON.parse(captured.options.body),payload);assert.equal(captured.options.body.includes(key),false);
  await assert.rejects(I.runCall(url,payload,''));await assert.rejects(I.runCall(url,{...payload,action:'prueba_llamada'},key));
});

test('Errores y respuestas inesperadas nunca se anuncian como llamada iniciada',async()=>{
  const payload=prepare('Hola'),success=adaptTwilio({sid,status:'queued'},payload).response;
  for(const body of [{...success,requestId:'other'},{...success,clientId:'other'},{...success,callSid:'bad'},{...success,status:'completed'},{ok:true}])assert.equal((await I.runCall(url,payload,key,{fetchImpl:async()=>({status:202,json:async()=>body})})).kind,'unknown');
  for(const [status,body,kind] of [[400,{ok:false,status:'solicitud_invalida',requestId:payload.requestId},'rejected'],[403,{ok:false,status:'destino_no_autorizado',requestId:payload.requestId},'rejected'],[401,{},'denied'],[502,{},'unknown'],[404,{},'unknown']])assert.equal((await I.runCall(url,payload,key,{fetchImpl:async()=>({status,json:async()=>body})})).kind,kind);
  const invalid=await I.runCall(url,payload,key,{fetchImpl:async()=>({status:202,json:async()=>{throw Error('not json');}})});assert.equal(invalid.kind,'unknown');
  assert.equal((await I.runCall(url,payload,key,{fetchImpl:async()=>{throw Error('Failed to fetch');}})).message,I.UNKNOWN_CALL);
});

test('Timeout limita la espera y no vuelve a invocar el proveedor',async()=>{
  let count=0;const result=await I.runCall(url,prepare('Hola'),key,{timeoutMs:5,fetchImpl:()=>{count++;return new Promise(()=>{});}});assert.equal(count,1);assert.equal(result.kind,'unknown');
});

test('JSON importable conserva autenticación, rutas de error, parámetros dinámicos y configuración vacía',()=>{
  assert.equal(workflow.active,false);assert.deepEqual(workflow.pinData,{});
  const node=name=>workflow.nodes.find(node=>node.name===name);
  assert.equal(node('Webhook llamadas').parameters.authentication,'headerAuth');assert.equal(node('Webhook llamadas').parameters.responseMode,'responseNode');
  assert.ok(workflow.nodes.every(node=>!node.credentials));assert.equal(node('Make a call').parameters.from,'');assert.equal(node('Make a call').parameters.to,'={{ $json.phone }}');assert.equal(node('Make a call').parameters.message,'={{ $json.message }}');assert.equal(node('Make a call').parameters.twiml,false);assert.equal(node('Make a call').onError,'continueRegularOutput');
  assert.equal(workflow.connections['Switch llamada'].main[1][0].node,'Preparar error');
  const code=node('Validar invocación').parameters.jsCode;
  const execute=(source,data,extra={})=>vm.runInNewContext('(function(){'+source+'})()',{ $input:{first:()=>({json:data})},...extra});
  const payload=prepare('Hola'),rejected=execute(code,{body:payload})[0].json;assert.equal(rejected.statusCode,403);
  const authorized=execute(code.replace('const PERMITTED = {};','const PERMITTED = '+JSON.stringify({'client-1':payload.phone})+';'),{body:payload})[0].json;assert.equal(authorized.action,'llamada');
  const error=execute(node('Preparar error').parameters.jsCode,rejected)[0].json;assert.equal(error.statusCode,403);
  const accepted=execute(node('Adaptar respuesta Twilio').parameters.jsCode,{sid,status:'queued'},{$:()=>({first:()=>({json:authorized})})})[0].json;assert.equal(accepted.statusCode,202);assert.equal(accepted.response.requestId,payload.requestId);
});
