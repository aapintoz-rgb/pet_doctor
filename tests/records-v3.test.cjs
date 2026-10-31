const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../assets/records'),W=require('../assets/workspace'),F=require('../assets/files'),R=require('../assets/registry-csv'),A=require('../assets/attention-csv'),H=require('../assets/history');
const {defaults}=require('../assets/catalog');
const fixture=name=>fs.readFileSync(path.join(__dirname,'fixtures/v2',name),'utf8');
function setup(){return R.prepare(W.empty(),R.example25()).candidate;}
function state(ws){const s=defaults();s.pet.ownerId=ws.owners[0].id;s.pet.petId=ws.pets[0].id;s.selections.consulta.included=true;return s;}
function storage(data={},blocked=false){const map=new Map(Object.entries(data));return {map,blocked,getItem:k=>map.get(k)??null,setItem(k,v){if(this.blocked)throw Error('quota');map.set(k,v);}};}
test('Edad: años antes que meses, febrero bisiesto, fin de mes y recién nacido',()=>{
  assert.equal(D.makeAge(1,1,'2024-02-29').estimatedBirthDate,'2023-01-28');
  assert.equal(D.makeAge(0,1,'2024-03-31').estimatedBirthDate,'2024-02-29');
  assert.equal(D.makeAge(0,1,'2025-01-31').estimatedBirthDate,'2024-12-31');
  assert.deepEqual(D.ageAt(D.makeAge(0,0,'2024-02-29'),'2025-02-28'),{years:1,months:0});
  for(const [y,m]of [[-1,0],[1.2,0],[0,12],[0,-1],[NaN,1]])assert.throws(()=>D.makeAge(y,m,'2026-08-21'));
  assert.throws(()=>D.makeAge(0,0,'2026-02-30'));assert.throws(()=>D.makeAge(0,0,'9999-01-01'));
  assert.equal(D.today(new Date('2026-11-01T04:59:59Z')),'2026-10-31');
});
test('Referencia persistida no acepta nacimiento manipulado ni fecha omitida',()=>{
  const ref=D.makeAge(2,3,'2026-08-21');assert.deepEqual(D.ageReference(ref),ref);
  assert.throws(()=>D.ageReference({...ref,estimatedBirthDate:'2020-01-01'}));
  assert.throws(()=>D.ageReference({...ref,asOf:undefined}));
});
test('Altas nuevas requieren distrito, raza, sexo y edad, no peso; solo perros',()=>{
  const ws=setup(),owner={...ws.owners[0],id:undefined,dni:'99999999'},pet={...ws.pets[0],id:undefined,weightKg:null,size:null};
  assert.equal(W.saveClient(ws,{owner,pets:[pet]}).workspace.pets.at(-1).weightKg,null);
  assert.throws(()=>W.saveClient(ws,{owner:{...owner,district:''},pets:[pet]}),/distrito/);
  for(const change of [{breed:''},{sex:null},{ageReference:null},{species:'feline'}])assert.throws(()=>W.saveClient(ws,{owner,pets:[{...pet,...change}]}));
});
test('Editar otro campo conserva nacimiento; corrección explícita modifica solo registro',()=>{
  const ws=setup(),old=ws.pets[0],ref=JSON.stringify(old.ageReference);
  const saved=W.saveClient(ws,{owner:ws.owners[0],pets:[{...old,name:'Luna editada'}]}).workspace;
  assert.equal(JSON.stringify(saved.pets[0].ageReference),ref);
  const corrected=W.saveClient(saved,{owner:saved.owners[0],pets:[{...saved.pets[0],ageReference:D.makeAge(3,0,'2026-10-31')}]}).workspace;
  assert.notEqual(corrected.pets[0].ageReference.estimatedBirthDate,old.ageReference.estimatedBirthDate);
});
test('Migración v2 conserva ausencia de datos; edición por entidad y atenciones siguen disponibles',()=>{
  const ws=setup();ws.version=2;for(const o of ws.owners)delete o.district;for(const p of ws.pets)for(const k of ['species','breed','sex','registeredOn','ageReference'])delete p[k];
  const migrated=W.read(JSON.stringify(ws));assert.equal(migrated.version,3);assert.equal(migrated.pets[0].ageReference,null);assert.equal(migrated.pets[0].species,'canine');
  assert.equal(W.saveAttention(migrated,state(migrated),{id:'legacy',createdAt:new Date().toISOString()}).attentions.length,1);
  assert.throws(()=>W.saveClient(migrated,{owner:{...migrated.owners[0],name:'Otro'},pets:[]}),/distrito/);
  const ownerFixed=W.saveClient(migrated,{owner:{...migrated.owners[0],district:'Jesús María'},pets:[migrated.pets[0]]}).workspace;
  assert.equal(ownerFixed.pets[0].ageReference,null);
  assert.throws(()=>W.saveClient(ownerFixed,{owner:ownerFixed.owners[0],pets:[{...ownerFixed.pets[0],name:'Cambiado'}]}),/raza/);
});
test('Almacenamiento: migración atómica, cuota, reintento, precedencia v3 y claves antiguas intactas',()=>{
  const old={...setup(),version:2},source=JSON.stringify(old),s=storage({[W.PREVIOUS_KEY]:source},true),store=W.createStore(s);
  assert.ok(store.migrationPending());assert.match(store.error(),/migrar/);assert.equal(s.getItem(W.KEY),null);
  s.blocked=false;store.commit(store.get());assert.equal(W.read(s.getItem(W.KEY)).version,3);assert.equal(s.getItem(W.PREVIOUS_KEY),source);
  s.map.set(W.PREVIOUS_KEY,'roto');assert.equal(W.createStore(s).get().owners.length,25);
  const newer=storage({[W.PREVIOUS_KEY]:source},true),pending=W.createStore(newer);newer.blocked=false;newer.map.set(W.PREVIOUS_KEY,JSON.stringify(W.empty()));assert.throws(()=>pending.commit(pending.get()),/otra pestaña/);
  const broken=W.createStore(storage({[W.PREVIOUS_KEY]:'roto'}));assert.throws(()=>broken.commit(W.empty()),/respaldo/);
});
test('Snapshots no se reescriben al editar registros ni al actualizar servicios',()=>{
  const ws=setup(),s=state(ws),meta={id:'snap',createdAt:new Date().toISOString(),observations:'Control\nSin incidencias'};
  const first=W.saveAttention(ws,s,meta),a=first.attentions[0],before=JSON.stringify([a.ownerSnapshot,a.petSnapshot,a.performedAt]);
  const edit=W.saveClient(first,{owner:{...first.owners[0],district:'Barranco',name:'Nombre nuevo'},pets:[{...first.pets[0],breed:'Otra',name:'Nombre nuevo',ageReference:D.makeAge(4,0,'2026-10-31')}]}).workspace;
  s.selections.consulta.report=true;const updated=W.saveAttention(edit,s,meta).attentions[0];
  assert.equal(JSON.stringify([updated.ownerSnapshot,updated.petSnapshot,updated.performedAt]),before);
  assert.equal(updated.quote.state.pet.name,a.quote.state.pet.name);assert.equal(updated.observations,meta.observations);
  assert.throws(()=>W.saveAttention(edit,s,{...meta,observations:'x'.repeat(2001)}),/observaciones/);
});
test('Snapshot y observaciones inválidos se rechazan antes de aceptar un respaldo',()=>{
  const base=W.saveAttention(setup(),state(setup()),{id:'x',createdAt:new Date().toISOString()}),copy=()=>JSON.parse(JSON.stringify(base));
  const bad=copy();bad.attentions[0].petSnapshot.id='wrong';assert.throws(()=>W.read(JSON.stringify(bad)),/instantánea/);
  const obs=copy();obs.attentions[0].observations=45;assert.throws(()=>W.read(JSON.stringify(obs)),/observaciones/);
});
test('JSON completo y registro v2 conservan todos los datos y leen registro anterior',()=>{
  const ws=setup(),round=W.readBackup(JSON.stringify(ws));assert.deepEqual(round.pets,ws.pets);
  const registry=W.exportRegistry(ws);assert.equal(registry.version,2);assert.deepEqual(W.mergeRegistry(W.empty(),JSON.stringify(registry)).pets,ws.pets);
  assert.equal(F.readRegistry(fixture('registro-demo.json')).pets[0].ageReference,null);
});
test('CSV antiguo sigue válido, no inventa datos; nuevo exige campos y reimporta sin duplicar',()=>{
  const old=R.prepare(W.empty(),fixture('clientes-perritos-ejemplo-25.csv'));assert.equal(old.errors.length,0);assert.ok(old.warnings.length);assert.equal(old.candidate.pets[0].ageReference,null);
  const rows=R.exampleRows(25);rows[1][10]='';assert.ok(R.prepare(W.empty(),R.serialize(rows)).errors.length);
  const ws=setup();assert.equal(R.prepare(ws,R.example25()).counts.registered,45);
  assert.equal(R.prepare(ws,fixture('clientes-perritos-ejemplo-25.csv')).counts.registered,45);
});
test('CSV histórico no atribuye datos actuales; explícitos coherentes y reimportación con conflicto',()=>{
  const ws=setup(),old=A.prepare(ws,fixture('atenciones-ejemplo-150.csv'));assert.equal(old.errors.length,0);assert.equal(old.candidate.attentions[0].ownerSnapshot.district,'');assert.equal(old.candidate.attentions[0].petSnapshot.ageReference,null);
  const rows=A.exampleRows(),first=A.prepare(ws,R.serialize(rows));assert.equal(first.errors.length,0);
  assert.equal(A.prepare(first.candidate,R.serialize(rows)).counts.registered,150);
  rows[1][17]='Distrito diferente';assert.equal(A.prepare(first.candidate,R.serialize(rows)).candidate,null);
  const multi=A.exampleRows();const id=multi[3][0],other=multi.find((r,i)=>i>3&&r[0]===id);if(other){other[23]='Contradicción';assert.equal(A.prepare(ws,R.serialize(multi)).candidate,null);}
});
test('CSV del historial usa snapshots y protege observaciones multilínea',()=>{
  const ws=setup(),saved=W.saveAttention(ws,state(ws),{id:'csv',createdAt:new Date().toISOString(),observations:'=fórmula;\n"tildes"'});
  saved.owners[0].district='Distrito actual';const row=H.rows(saved)[0];assert.equal(row.district,'Surco');
  const csv=H.csv(H.select(saved,{}));assert.equal(csv.charCodeAt(0),65279);assert.ok(csv.includes('nacimiento_estimado'));assert.ok(csv.includes("'=fórmula"));assert.ok(csv.includes('Surco'));assert.ok(!csv.includes('Distrito actual'));
});
test('Analítica conserva v3 y v2 sin cambiar resultados financieros ni su CSV',()=>{
  const Analytics=require('../analitica/data'),ws=setup(),all=A.prepare(ws,A.example()).candidate;
  const dataset=Analytics.dataset(all),result=Analytics.query(Analytics.normalize(dataset.workspace));
  assert.equal(result.kpis.total,2134679);assert.equal(result.kpis.attentions,150);assert.equal(result.kpis.services,200);
  assert.equal(dataset.workspace.pets[0].breed,all.pets[0].breed);assert.equal(dataset.workspace.version,3);
  const previous={...all,version:2};assert.equal(Analytics.dataset(previous).workspace.version,3);
  assert.ok(!Analytics.csv(result).split('\r\n')[0].includes('distrito'));
});
