const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const I=require('../assets/integration.js');
const {validateEmailInvocation:validate,adaptGmail}=require('../workflows/email-contract.cjs');
const owner={id:'owner-1',email:'ana@example.com',contact:'+51999123456',dni:'00123456'};
const allow={'owner-1':owner.email};
const prepare=(message='Hola',subject='Seguimiento')=>I.prepareEmail(owner,{message,subject});
const url='https://n8n.example.com/webhook/comunicaciones',key='solo-test';
const response=(p,changes={})=>({ok:true,status:'correo_enviado',clientId:p.clientId,requestId:p.requestId,messageId:'gmail-opaque-id',...changes});
const send=(p,status,body,extra={})=>I.runEmail(url,p,key,{fetchImpl:async()=>({status,json:async()=>body}),...extra});

test('Correo: 360 caracteres Unicode y NFC/trim, 361 y vacío rechazados en ambos lados',()=>{
  for(const text of ['a'.repeat(360),'😀'.repeat(360),'e\u0301'.repeat(360),'  Hola\nseñora  ']){
    const p=prepare(text);assert.ok(I.emailTextLength(p.message)<=360);assert.equal(validate(p,allow).action,'correo');
  }
  for(const text of ['', '  ', 'a'.repeat(361),'😀'.repeat(361)]){
    assert.throws(()=>prepare(text));assert.equal(validate({...prepare(),message:text},allow).statusCode,400);
  }
});
test('Asunto de 200 puntos de código, sin saltos de línea ni recorte silencioso',()=>{
  const p=prepare('Hola','e\u0301'.repeat(200));assert.equal(validate(p,allow).subject,p.subject);
  for(const subject of ['', 'x'.repeat(201),'\nAsunto','Asunto\r\nBcc: x@example.com']){
    assert.throws(()=>prepare('Hola',subject));assert.equal(validate({...p,subject},allow).statusCode,400);
  }
});
test('Solicitud mínima de correo: registro, identificadores y una sola dirección',()=>{
  const p=I.prepareEmail(owner,{email:'otro@example.com',subject:'Hola',message:'Hola',from:'x'});
  assert.equal(p.email,owner.email);assert.deepEqual(Object.keys(p),['action','email','subject','message','clientId','requestId']);
  assert.notEqual(prepare().requestId,prepare().requestId);
  for(const email of ['', 'bad', 'a@example.com,b@example.com','Ana <a@example.com>','a@example.com;b@example.com','a@example.com\n'])assert.throws(()=>I.prepareEmail({...owner,email},{subject:'Hola',message:'Hola'}));
  assert.throws(()=>I.prepareEmail(null,{}));
  for(const change of [{action:'llamada'},{clientId:''},{requestId:'x'.repeat(101)},{email:[]},{message:2},{from:'x'},{cc:'x@example.com'},{phone:owner.contact}]){
    assert.throws(()=>I.validateEmailPayload({...p,...change}));assert.equal(validate({...p,...change},allow).statusCode,400);
  }
});
test('n8n rechaza por defecto y solo admite el par cliente-correo; sin herencia de propiedades',()=>{
  const p=prepare();assert.equal(validate(p).statusCode,403);assert.equal(validate(p,{'other':owner.email}).statusCode,403);
  assert.equal(validate(p,{'owner-1':'other@example.com'}).statusCode,403);assert.equal(validate(p,allow).action,'correo');
  assert.equal(validate({...p,clientId:'__proto__'},allow).statusCode,403);
  assert.equal(validate({...p,email:' ana@example.com '},{'owner-1':' ana@example.com '}).email,owner.email);
});
test('Adaptador Gmail exige ID y no filtra errores originales ni tokens',()=>{
  const p=prepare(),good=adaptGmail({id:'gmail-id',threadId:'thread'},p);
  assert.equal(good.statusCode,200);assert.deepEqual(good.response,response(p,{messageId:'gmail-id',message:'Gmail aceptó el envío del correo.'}));
  for(const result of [{},{id:''},{id:' '},{id:12},{id:'x',error:'token-privado'},null]){
    const r=adaptGmail(result,p);assert.equal(r.statusCode,502);assert.equal(r.response.requestId,p.requestId);assert.ok(!JSON.stringify(r).includes('token-privado'));
  }
});
test('Transporte usa una conexión, Header Auth y un único POST JSON sin datos extra',async()=>{
  const p=prepare();let calls=0;
  const r=await I.runEmail(url,p,key,{fetchImpl:async(u,o)=>{calls++;assert.equal(u,url);assert.equal(o.method,'POST');assert.equal(o.mode,'cors');assert.equal(o.credentials,'omit');assert.equal(o.headers['X-PetDoctor-Call-Key'],key);assert.deepEqual(JSON.parse(o.body),p);return {status:200,json:async()=>response(p)};}});
  assert.equal(calls,1);assert.equal(r.kind,'accepted');assert.match(r.message,/no confirma la entrega/);
});
test('Respuesta exige HTTP 200, estado, ID de Gmail y ambos IDs correlacionados',async()=>{
  const p=prepare();for(const change of [{status:'llamada_iniciada'},{messageId:''},{messageId:null},{ok:false},{requestId:'other'},{clientId:'other'}])assert.equal((await send(p,200,response(p,change))).kind,'unknown');
  for(const status of [202,404,500,502])assert.equal((await send(p,status,response(p))).kind,'unknown');
  for(const [status,bodyStatus] of [[400,'solicitud_invalida'],[403,'destino_no_autorizado']]){
    const r=await send(p,status,response(p,{ok:false,status:bodyStatus,errors:['Error visible']}));assert.equal(r.kind,'rejected');assert.deepEqual(r.errors,['Error visible']);
  }
  assert.equal((await send(p,401,null)).kind,'denied');assert.equal((await send(p,403,null)).kind,'denied');
});
test('Red, CORS, JSON inválido y timeout dan resultado desconocido sin reintento',async()=>{
  const p=prepare();
  for(const fetchImpl of [async()=>{throw new TypeError('CORS');},async()=>({status:200,json:async()=>{throw Error('JSON');}})])assert.equal((await I.runEmail(url,p,key,{fetchImpl})).kind,'unknown');
  let calls=0,signal;const r=await I.runEmail(url,p,key,{timeoutMs:5,fetchImpl:async(u,o)=>{calls++;signal=o.signal;return new Promise(()=>{});}});
  assert.equal(r.kind,'unknown');assert.equal(calls,1);assert.equal(signal.aborted,true);
});
test('Snippet n8n ejecutable conserva el código original para llamadas y rechaza correo antes de Gmail',()=>{
  const snippet=fs.readFileSync(path.join(__dirname,'../workflows/validar-correo.snippet.js'),'utf8');
  const old="return [{json:{action:'llamada',marker:'codigo-original',input:$input.first().json.body}}];";
  const run=p=>new Function('$input',snippet+old)({first:()=>({json:{body:p}})});
  const call={action:'llamada',phone:owner.contact};assert.equal(run(call)[0].json.marker,'codigo-original');assert.deepEqual(run(call)[0].json.input,call);
  assert.equal(run(prepare())[0].json.statusCode,403);
  for(const action of [' CORREO ','Correo','CORREO'])assert.equal(run({...prepare(),action})[0].json.statusCode,400);
  const configured=snippet.replace('const CORREOS_PERMITIDOS = {};','const CORREOS_PERMITIDOS = '+JSON.stringify(allow)+';');
  const result=new Function('$input',configured+old)({first:()=>({json:{body:prepare()}})});assert.equal(result[0].json.action,'correo');
  const adapter=fs.readFileSync(path.join(__dirname,'../workflows/adaptar-gmail.code.js'),'utf8'),p=prepare();
  const adapted=new Function('$input','$',adapter)({first:()=>({json:{id:'gmail-id'}})},()=>({first:()=>({json:p})}));assert.equal(adapted[0].json.response.requestId,p.requestId);
});
