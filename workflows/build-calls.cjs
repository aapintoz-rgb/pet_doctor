// Regenerar desde la raíz: node workflows/build-calls.cjs
const fs=require('node:fs');
const path=require('node:path');
const {validateInvocation,adaptTwilio}=require('./call-contract.cjs');
const workflow={
  name:'Pet Doctor - llamadas de demostración',active:false,
  nodes:[
    {id:'pd-call-webhook',name:'Webhook llamadas',type:'n8n-nodes-base.webhook',typeVersion:2,position:[0,200],webhookId:'682e5897-c691-447e-8258-4c1bbb930282',parameters:{httpMethod:'POST',path:'pet-doctor-llamadas-demo',authentication:'headerAuth',responseMode:'responseNode',options:{allowedOrigins:'http://127.0.0.1:8000'}},notes:'Configurar una credencial Header Auth con Name X-PetDoctor-Call-Key. No activar sin credencial ni destinos verificados.',notesInFlow:true},
    {id:'pd-call-validate',name:'Validar invocación',type:'n8n-nodes-base.code',typeVersion:2,position:[260,200],parameters:{mode:'runOnceForAllItems',language:'javaScript',jsCode:`${validateInvocation.toString()}\n\n// Configuración exclusiva de n8n: pares clientId -> teléfono verificado.\n// Vacía por defecto: todas las solicitudes se rechazan.\nconst PERMITTED = {};\nreturn [{json:validateInvocation($input.first().json.body, PERMITTED)}];`}},
    {id:'pd-call-switch',name:'Switch llamada',type:'n8n-nodes-base.switch',typeVersion:3.2,position:[520,200],parameters:{mode:'rules',rules:{values:[{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:'pd-call-rule',leftValue:'={{ $json.action }}',rightValue:'llamada',operator:{type:'string',operation:'equals'}}],combinator:'and'},renameOutput:true,outputKey:'llamada'}]},options:{fallbackOutput:'extra'}}},
    {id:'pd-call-twilio',name:'Make a call',type:'n8n-nodes-base.twilio',typeVersion:1,position:[800,100],onError:'continueRegularOutput',parameters:{resource:'call',operation:'make',from:'',to:'={{ $json.phone }}',twiml:false,message:'={{ $json.message }}',options:{}},notes:'Seleccionar credencial Twilio y completar From con el número Voice autorizado. To y Message vienen del validador. Sin callbacks.',notesInFlow:true},
    {id:'pd-call-adapt',name:'Adaptar respuesta Twilio',type:'n8n-nodes-base.code',typeVersion:2,position:[1080,100],parameters:{mode:'runOnceForAllItems',language:'javaScript',jsCode:`${adaptTwilio.toString()}\nreturn [{json:adaptTwilio($input.first().json, $('Validar invocación').first().json)}];`}},
    {id:'pd-call-error',name:'Preparar error',type:'n8n-nodes-base.code',typeVersion:2,position:[800,340],parameters:{mode:'runOnceForAllItems',language:'javaScript',jsCode:`const data=$input.first().json;\nreturn [{json:{statusCode:data.statusCode||400,response:data.response||{ok:false,status:'solicitud_invalida',requestId:null,message:'Solicitud inválida.',errors:['La acción no está permitida.']}}}];`}},
    {id:'pd-call-response',name:'Respond to Webhook',type:'n8n-nodes-base.respondToWebhook',typeVersion:1.4,position:[1360,220],parameters:{respondWith:'json',responseBody:'={{ $json.response }}',options:{responseCode:'={{ $json.statusCode }}'}}},
  ],
  connections:{
    'Webhook llamadas':{main:[[{node:'Validar invocación',type:'main',index:0}]]},
    'Validar invocación':{main:[[{node:'Switch llamada',type:'main',index:0}]]},
    'Switch llamada':{main:[[{node:'Make a call',type:'main',index:0}],[{node:'Preparar error',type:'main',index:0}]]},
    'Make a call':{main:[[{node:'Adaptar respuesta Twilio',type:'main',index:0}]]},
    'Adaptar respuesta Twilio':{main:[[{node:'Respond to Webhook',type:'main',index:0}]]},
    'Preparar error':{main:[[{node:'Respond to Webhook',type:'main',index:0}]]},
  },
  settings:{executionOrder:'v1'},pinData:{},meta:{templateCredsSetupCompleted:false},
};
const target=path.join(__dirname,'pet-doctor-llamadas-demo.json');
fs.writeFileSync(target,JSON.stringify(workflow,null,2)+'\n');
console.log('Workflow generado: '+path.basename(target));
