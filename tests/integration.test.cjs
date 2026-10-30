const test=require('node:test');
const assert=require('node:assert/strict');
const I=require('../assets/integration.js');

test('Único endpoint admite HTTPS/localhost y rechaza credenciales y protocolos ajenos',()=>{
  for(const value of ['https://n8n.example.com/webhook/x','http://localhost:5678/x','http://127.0.0.1:5678/x','http://[::1]:5678/x'])assert.ok(I.endpoint(value));
  for(const value of ['','bad','http://public.example/x','file:///x','javascript:alert(1)','https://user:secret@n8n.example.com/x','https://x/#secret'])assert.throws(()=>I.endpoint(value));
});

test('Retirar la conexión antigua no modifica la URL nueva ni el workspace',()=>{
  const old='pet-doctor.integration-test.v1',data=new Map([[old,'anterior'],[I.CALL_CONFIG_KEY,JSON.stringify({url:'https://new.example.com/webhook'})],['pet-doctor.workspace.v2','datos-de-negocio']]);
  I.retireLegacyConfig({removeItem:key=>data.delete(key)});
  assert.equal(data.has(old),false);assert.equal(I.readCallConfig({getItem:key=>data.get(key)}),'https://new.example.com/webhook');assert.equal(data.get('pet-doctor.workspace.v2'),'datos-de-negocio');
});

test('La URL retirada nunca se reutiliza, incluso si el navegador impide borrarla',()=>{
  const data=new Map([['pet-doctor.integration-test.v1',JSON.stringify({url:'https://old.example.com/webhook'})]]);
  const storage={getItem:key=>data.get(key),removeItem(){throw Error('blocked');}};
  I.retireLegacyConfig(storage);assert.equal(I.readCallConfig(storage),'');
  assert.throws(()=>I.saveCallConfig({setItem(){throw Error('quota');}},'https://new.example.com/webhook'));
});
