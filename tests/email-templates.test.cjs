const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../assets/email-templates');
const owner={id:'o1',name:'Ana'},pet={id:'p1',ownerId:'o1',name:'Luna'};
const input={owner,pet,date:'2026-11-05',time:'10:30',now:new Date('2026-10-31T12:00:00Z')};
test('Tres plantillas generan contenido personalizado y horario de Lima cuando corresponde',()=>{
  assert.equal(T.templates.length,3);
  for(const t of T.templates){const text=T.build({...input,template:t.id});assert.ok(text.subject.includes('Luna'));assert.ok(text.message.includes('Ana'));assert.ok(Array.from(text.message).length<=360);assert.ok(Array.from(text.subject).length<=200);if(t.date)assert.ok(text.message.includes('05/11/2026 a las 10:30 (Lima)'));}
  assert.ok(!T.build({...input,template:'followup',date:'',time:''}).message.includes('10:30'));
});
test('Plantillas rechazan perro ajeno, ausencia de selección, fechas inválidas y horarios pasados',()=>{
  for(const change of [{pet:null},{pet:{...pet,ownerId:'other'}},{template:'invalid'},{date:'2026-02-30'},{time:'25:00'},{date:'2026-10-30'},{time:''}])assert.throws(()=>T.build({...input,template:'appointment',...change}));
});
test('No se truncan nombres largos ni se incorporan saltos en el asunto',()=>{
  const text=T.build({...input,template:'followup',pet:{...pet,name:'Luna\n'+ 'a'.repeat(200)}});assert.ok(!text.subject.includes('\n'));assert.ok(text.subject.includes('a'.repeat(200)));
});
