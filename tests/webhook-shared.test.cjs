const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../workflows/validar-invocacion.code.js'),'utf8');
const run=body=>new Function('$input',source)({first:()=>({json:{body}})})[0].json;
const call={action:'llamada',phone:'+51999123456',message:'Hola',clientId:'nuevo-cliente-otro-pc',requestId:'operacion-1'};
const mail={action:'correo',email:'nuevo@example.com',subject:'Seguimiento',message:'Hola',clientId:'otro-cliente-otro-pc',requestId:'operacion-2'};

test('Validador compartido admite ambas ramas sin lista y conserva correlación',()=>{
  for(const input of [call,mail]){
    const output=run(input);assert.equal(output.action,input.action);assert.equal(output.clientId,input.clientId);assert.equal(output.requestId,input.requestId);
  }
  assert.ok(!/PERMITTED|CORREOS_PERMITIDOS/.test(source));
});

test('Validador compartido rechaza acciones, IDs, destinos y campos inválidos antes del proveedor',()=>{
  for(const input of [null,[],{}, {...call,action:' LLAMADA '},{...mail,action:'CORREO'},{...mail,clientId:''},{...call,requestId:'x'.repeat(101)},{...mail,email:'a@example.com;b@example.com'},{...call,phone:'999123456'},{...mail,subject:'Hola\nBcc: x@example.com'},{...call,from:'+51999888777'},{...mail,cc:'x@example.com'},{...mail,message:'x'.repeat(361)},{...call,message:'x'.repeat(121)}]){
    const output=run(input);assert.equal(output.action,'invalida');assert.equal(output.statusCode,400);assert.equal(output.response.ok,false);
  }
});
