const test = require('node:test');
const assert = require('node:assert/strict');
const {catalog:C, defaults} = require('../assets/catalog.js');
const P = require('../assets/pricing.js');
const F = require('../assets/files.js');

function withService(id, size='small') { const s=defaults();s.pet.size=size;s.pet.coat='short';s.pet.knots=false;s.selections[id].included=true;return s; }
test('Consulta e inteligencia sin datos personales ni tamaño',()=>{
  for(const [id,total] of [['consulta',7080],['inteligencia',5900]]){
    const s=defaults();s.selections[id].included=true;
    assert.equal(P.calculate(s).total,total);assert.equal(P.calculate(s).complete,true);
    assert.equal(F.makeQuote(s,{id:'demo',createdAt:new Date().toISOString()}).state.pet.name,'');
  }
});
test('Límites exactos de tamaño y rechazo de pesos no válidos',()=>{
  for(const [weightKg,size] of [[10,'small'],[10.01,'medium'],[25,'medium'],[25.01,'large'],[0,null],[-1,null],[null,null],[NaN,null],[Infinity,null]])assert.equal(P.sizeOf({sizeMode:'weight',weightKg}),size);
  assert.equal(P.sizeOf({sizeMode:'range',size:'medium'}),'medium');
  assert.equal(P.sizeOf({sizeMode:'range',size:'constructor'}),null);
});
test('Cada modalidad de consulta y vacunas sin cargos extra',()=>{
  const s=withService('consulta');s.selections.consulta.kind='followup';s.selections.consulta.report=true;
  assert.equal(P.calculate(s).subtotal,5500);
  s.selections.consulta.included=false;s.selections.vacunas.included=true;
  assert.equal(P.calculate(s).complete,false);
  s.selections.vacunas.items=['rabies','multiple','bordetella'];
  assert.equal(P.calculate(s).subtotal,15500);
});
test('Desparasitación por rango y descuento exacto',()=>{
  for(const [size,internal,external] of [['small',2000,3500],['medium',3000,5500],['large',4000,7500]]){
    const s=withService('desparasitacion',size);
    assert.equal(P.calculate(s).subtotal,internal);
    s.selections.desparasitacion.kind='external';assert.equal(P.calculate(s).subtotal,external);
    s.selections.desparasitacion.kind='both';assert.equal(P.calculate(s).subtotal,internal+external-500);
  }
});
test('Grooming planes, factores, descuentos y suplementos una sola vez',()=>{
  for(const [plan,base] of [['essential',5000],['complete',7500],['premium',10000]])for(const [size,factor] of [['small',1],['medium',1.3],['large',1.6]]){
    const s=withService('grooming',size);s.selections.grooming.plan=plan;
    assert.equal(P.calculate(s).subtotal,Math.round(base*factor));
    s.pet.coat='long';s.pet.knots=true;s.selections.grooming.hydration=true;
    assert.equal(P.calculate(s).subtotal,Math.round((base+1500)*factor)+3500);
  }
});
test('Grooming individual sin duplicados, suplementos solo si corresponden',()=>{
  const s=withService('grooming','medium');s.selections.grooming.mode='individual';s.selections.grooming.items=['nails','ears'];s.pet.coat=null;s.pet.knots=null;
  assert.equal(P.calculate(s).complete,true);assert.equal(P.calculate(s).subtotal,2600);
  s.selections.grooming.items=['bath'];assert.equal(P.calculate(s).complete,false);
  s.pet.coat='short';s.pet.knots=false;assert.equal(P.calculate(s).subtotal,4550);
  s.selections.grooming.items=[];assert.equal(P.calculate(s).complete,false);
});
test('Guardería con todos los rangos y adicionales',()=>{
  for(const [size,adj] of [['small',0],['medium',500],['large',1000]]){
    const s=withService('guarderia',size);assert.equal(P.calculate(s).subtotal,3000+adj);
    Object.assign(s.selections.guarderia,{duration:'full',walk:true,food:true});assert.equal(P.calculate(s).subtotal,7200+adj);
  }
});
test('Planes de aprendizaje',()=>{
  for(const [plan,base] of [['exploration',5000],['profile',9000],['support',13000]]){
    const s=withService('inteligencia');s.selections.inteligencia.plan=plan;assert.equal(P.calculate(s).subtotal,base);
  }
});
test('Ejemplo acordado S/ 203,55',()=>{
  const s=withService('grooming','medium');s.pet.coat='long';s.selections.grooming.plan='complete';s.selections.consulta.included=true;
  const r=P.calculate(s);assert.equal(r.subtotal,17250);assert.equal(r.tax,3105);assert.equal(r.total,20355);
});
test('Cambio global de tamaño, exclusión y ausencia de datos',()=>{
  const s=withService('grooming');s.selections.guarderia.included=true;s.selections.desparasitacion.included=true;
  const small=P.calculate(s).total;s.pet.size='large';assert.ok(P.calculate(s).total>small);
  s.selections.grooming.included=false;assert.equal(s.selections.grooming.plan,'essential');
  s.pet.size=null;assert.equal(P.calculate(s).complete,false);assert.throws(()=>F.makeQuote(s,{id:'x',createdAt:new Date().toISOString()}));
  assert.equal(P.calculate(defaults()).complete,false);
});
test('Conciliación de céntimos con catálogo fraccionario y todos los servicios',()=>{
  const c=structuredClone(C);c.consultation.first=6003;c.learning.exploration.price=5003;
  const s=withService('consulta');s.selections.inteligencia.included=true;
  const r=P.calculate(s,c);assert.equal(r.tax,1981);assert.equal(r.services.reduce((sum,s)=>sum+s.tax,0),r.tax);assert.equal(r.services.reduce((sum,s)=>sum+s.total,0),r.total);
  const all=withService('grooming');Object.values(all.selections).forEach(s=>s.included=true);all.selections.vacunas.items=['rabies'];
  assert.equal(P.calculate(all).services.length,6);assert.equal(P.calculate(all).complete,true);
});
test('Ida y vuelta JSON, sin datos obligatorios y sin confiar en totales guardados',()=>{
  const s=withService('consulta');const meta={id:'demo',createdAt:new Date().toISOString()};
  const quote=F.makeQuote(s,meta),loaded=F.readQuote(JSON.stringify(quote));assert.deepEqual(loaded.state,s);
  quote.pricingVersion='old';quote.pricing.total=118;quote.pricing.subtotal=100;quote.pricing.tax=18;
  const old=F.readQuote(JSON.stringify(quote));assert.equal(old.previousTotal,118);assert.equal(P.calculate(old.state).total,7080);
});
test('Archivos corruptos, opciones desconocidas y cobros duplicados se rechazan',()=>{
  assert.throws(()=>F.readQuote('{invalid'));assert.throws(()=>F.readQuote('{}'));
  for(const mutate of [s=>s.selections.vacunas.items=['rabies','rabies'],s=>s.selections.consulta.kind='__proto__',s=>s.selections.grooming.items=['bath'],s=>s.pet.weightKg=-2,s=>s.pet.size='unknown',s=>s.pet.knots='true']){
    const s=withService('consulta');mutate(s);assert.throws(()=>F.validateState(s));
  }
});
test('Registro versionado, relaciones, duplicados y datos opcionales',()=>{
  const file={type:'pet-doctor.registry',version:1,owners:[{id:'o1',name:'Ana'}],pets:[{id:'p1',ownerId:'o1',name:'Luna',weightKg:12.5,coat:'long'},{id:'p2',ownerId:'o1',name:'Toby',size:'small'}]};
  const result=F.readRegistry(JSON.stringify(file));assert.equal(result.pets[0].weightKg,12.5);assert.equal(result.pets[1].weightKg,null);assert.equal(result.owners[0].contact,'');
  file.pets.push({...file.pets[0]});assert.throws(()=>F.readRegistry(JSON.stringify(file)));file.pets.pop();file.pets[0].ownerId='missing';assert.throws(()=>F.readRegistry(JSON.stringify(file)));
});
test('Base maestra agrega y actualiza cotizaciones sin duplicarlas',()=>{
  const state=withService('consulta'),createdAt=new Date().toISOString();
  const first=F.makeQuote(state,{id:'quote-1',createdAt});
  let master=F.upsertQuote(F.emptyQuotesMaster(),first);
  assert.equal(master.quotes.length,1);assert.equal(F.readQuotesMaster(JSON.stringify(master)).quotes[0].pricing.total,7080);
  state.selections.consulta.report=true;
  const updated=F.makeQuote(state,{id:'quote-1',createdAt});master=F.upsertQuote(master,updated);
  assert.equal(master.quotes.length,1);assert.equal(master.quotes[0].pricing.total,8850);
  const second=F.makeQuote(withService('inteligencia'),{id:'quote-2',createdAt});master=F.upsertQuote(master,second);
  assert.equal(master.quotes.length,2);
});
test('Base maestra rechaza moneda, versión, duplicados y cotizaciones corruptas',()=>{
  for(const invalid of [{},{type:'pet-doctor.quotes-master',version:2,currency:'PEN',quotes:[]},{type:'pet-doctor.quotes-master',version:1,currency:'USD',quotes:[]}])assert.throws(()=>F.readQuotesMaster(JSON.stringify(invalid)));
  const quote=F.makeQuote(withService('consulta'),{id:'same',createdAt:new Date().toISOString()});
  assert.throws(()=>F.readQuotesMaster(JSON.stringify({type:'pet-doctor.quotes-master',version:1,currency:'PEN',quotes:[quote,quote]})));
});
