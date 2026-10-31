const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const D=require('../analitica/data.js'),S=require('../analitica/storage.js'),G=require('../analitica/charts.js'),R=require('../analitica/lib/registry-csv.js'),A=require('../analitica/lib/attention-csv.js');
const {IDBFactory}=require('fake-indexeddb');
const clone=x=>JSON.parse(JSON.stringify(x)),demo=D.demo(),rows=D.normalize(demo.workspace);
test('Analítica: demostración exacta, servicios e IGV concilian',()=>{
  const q=D.query(rows);assert.equal(demo.workspace.owners.length,25);assert.equal(demo.workspace.pets.length,45);assert.equal(q.kpis.attentions,150);assert.equal(q.kpis.services,200);assert.equal(q.kpis.total,2134679);assert.equal(q.kpis.subtotal+q.kpis.tax,q.kpis.total);
  assert.equal(D.sum(q.services.map(s=>s.subtotal)),q.kpis.subtotal);assert.equal(D.sum(q.trend.map(s=>s.subtotal)),q.kpis.subtotal);assert.equal(D.sum(q.heat.map(s=>s.count)),150);assert.equal(q.kpis.clients,25);assert.equal(q.kpis.pets,45);assert.equal(q.kpis.recurrence,1);
});
test('Analítica: selección OR de servicios suma solo filas coincidentes y cuenta IDs una vez',()=>{
  const ids=['consulta','grooming'],expected=rows.filter(r=>ids.includes(r.serviceCode)),q=D.query(rows,{services:ids});assert.equal(q.kpis.subtotal,D.sum(expected.map(r=>r.subtotal)));assert.equal(q.kpis.attentions,new Set(expected.map(r=>r.attentionId)).size);assert.equal(q.rows.length,expected.length);assert.equal(new Set(q.attentions.map(a=>a.id)).size,q.attentions.length);
});
test('Analítica: frecuencia se calcula antes de filtrar su propio grupo',()=>{
  const owner=rows[0].ownerId,all=D.query(rows,{owner}),n=all.kpis.attentions,key=n>=4?'4+':String(n),q=D.query(rows,{owner,frequency:key});assert.equal(q.kpis.attentions,n);assert.deepEqual(q.distribution,all.distribution);assert.equal(D.query(rows,{owner,frequency:'1'}).kpis.attentions,0);assert.equal(q.kpis.clients,1);
});
test('Analítica: Lima inclusiva, medianoche, semanas y periodos rápidos',()=>{
  const ws=clone(demo.workspace);ws.attentions=ws.attentions.slice(0,2);ws.attentions[0].performedAt='2026-10-01T04:59:59Z';ws.attentions[1].performedAt='2026-10-01T05:00:00Z';const r=D.normalize(D.validate(ws));assert.equal(r[0].date,'2026-09-30');assert.equal(r[1].date,'2026-10-01');assert.equal(D.query(r,{from:'2026-10-01',to:'2026-10-01'}).kpis.attentions,1);
  assert.deepEqual(D.quickRange('30',r,new Date('2026-10-31T04:00:00Z')),{from:'2026-10-01',to:'2026-10-30'});assert.deepEqual(D.quickRange('year',r,new Date('2026-10-31T05:00:00Z')),{from:'2026-01-01',to:'2026-10-31'});assert.equal(D.query(r,{}, {group:'week'}).trend[0].key,'2026-09-28');assert.equal(D.query(r,{}, {group:'month'}).trend.length,2);
  for(const filters of [{from:'2026-02-30'},{from:'2026-10-02',to:'2026-10-01'},{hour:'24'},{weekday:'7'}])assert.throws(()=>D.query(r,filters));
});
test('Analítica: datos sin vínculo conservan importes sin inventar clientes',()=>{
  const ws=clone(demo.workspace);ws.attentions=ws.attentions.slice(0,1);delete ws.attentions[0].registration;const q=D.query(D.normalize(D.validate(ws)));assert.equal(q.kpis.attentions,1);assert.equal(q.kpis.clients,0);assert.equal(q.kpis.pets,0);assert.equal(q.kpis.unlinked,1);assert.equal(q.kpis.recurrence,null);assert.ok(q.kpis.total>0);assert.equal(D.query([],{}).kpis.ticket,null);
});
test('Analítica: snapshots y servicios sin clasificar se conservan',()=>{
  const ws=clone(demo.workspace);ws.owners[0].name='Nombre actual distinto';ws.pets[0].name='Nuevo nombre';ws.attentions[0].quote.pricing.services[0].id='retirado';const q=D.query(D.normalize(D.validate(ws)));assert.equal(q.rows[0].ownerName,'Ana Ejemplo');assert.equal(q.rows[0].petName,'Luna');assert.equal(q.rows[0].serviceCode,'unclassified');assert.ok(q.services.some(s=>s.name==='Sin clasificar'));assert.equal(q.kpis.total,2134679);
});
test('Analítica: rechaza desglose financiero ausente, diferencias y negativos',()=>{
  for(const change of [w=>w.attentions[0].quote.pricing.services[0].lines.pop(),w=>w.attentions[0].quote.pricing.services=[],w=>w.attentions[0].quote.pricing.services[0].tax++,w=>w.attentions[0].quote.pricing.services[0].subtotal=-1]){const ws=clone(demo.workspace);change(ws);assert.throws(()=>D.validate(ws));}
});
test('Analítica: gratuidad concilia y consultas no escriben ni recalculan tarifas',()=>{
  const ws=clone(demo.workspace);ws.attentions=ws.attentions.slice(0,1);const p=ws.attentions[0].quote.pricing;for(const s of p.services){s.subtotal=s.tax=s.total=0;s.lines=[{label:'Gratuito',amount:0}];}p.subtotal=p.tax=p.total=0;const normalized=D.normalize(D.validate(ws)),before=JSON.stringify(normalized);const P=require('../analitica/lib/pricing.js'),original=P.calculate;P.calculate=()=>{throw Error('No recalcular');};try{const q=D.query(normalized);assert.equal(q.kpis.total,0);assert.equal(q.kpis.ticket,0);D.csv(q);G.specs(q,{});assert.equal(JSON.stringify(normalized),before);}finally{P.calculate=original;}
});
test('Analítica: búsqueda ignora tildes y filtros combinados',()=>{
  const target=rows.find(r=>r.ownerName.includes('María'));assert.ok(target);const q=D.query(rows,{search:'MARIA',owner:target.ownerId,pet:target.petId,weekday:String(target.weekday),hour:String(target.hour),from:target.date,to:target.date});assert.ok(q.rows.length);assert.ok(q.rows.every(r=>r.petId===target.petId&&r.date===target.date));assert.equal(D.query(rows,{search:'inexistente'}).rows.length,0);
});
test('Analítica: respaldo propio / JSON conservan snapshots y no configuración',()=>{
  const restored=D.prepare(D.empty(),'json',D.backup(demo),'respaldo');assert.equal(restored.errors.length,0);assert.equal(restored.counts.total,2134679);assert.equal(restored.candidate.meta.demo,true);assert.deepEqual(restored.candidate.workspace.attentions,demo.workspace.attentions);assert.equal('n8n' in JSON.parse(D.backup(demo)),false);assert.ok(D.prepare(demo,'json','corrupto','mal').errors.length);
});
test('Analítica: CSV incremental exige identidades y reimportación no duplica',()=>{
  const missing=D.prepare(D.empty(),'attentions',A.example(),'atenciones.csv');assert.ok(missing.errors.length);const clients=D.prepare(D.empty(),'owners',R.example25(),'clientes.csv');assert.equal(clients.errors.length,0);assert.equal(clients.counts.owners,25);const attention=D.prepare(clients.candidate,'attentions',A.example(),'atenciones.csv');assert.equal(attention.counts.attentions,150);const repeated=D.prepare(attention.candidate,'attentions',A.example(),'repetido.csv');assert.equal(repeated.errors.length,0);assert.equal(repeated.canImport,false);assert.equal(repeated.counts.attentions,150);
});
test('Analítica: CSV de reporte no se acepta como entrada detallada; tamaños y filtros',()=>{
  assert.ok(D.prepare(demo,'attentions',D.csv(D.query(rows)),'reporte.csv').errors.length);assert.ok(D.prepare(demo,'json',' '.repeat(20*1024*1024+1),'grande').errors.length);const f=D.reconcile({owner:'no-existe',pet:rows[0].petId,services:['consulta','no'],from:'2026-10-01'},rows);assert.equal(f.changed,true);assert.equal(f.filters.owner,'');assert.deepEqual(f.filters.services,['consulta']);assert.equal(f.filters.from,'2026-10-01');
});
test('Analítica: CSV exporta 200 servicios con BOM, CRLF, céntimos, comillas y protección fórmula',()=>{
  const edited=rows.map(r=>({...r}));edited[0].ownerName='=SUM(1;2)';edited[0].petName='Perrito "ñ";\nprueba';const q=D.query(edited),csv=D.csv(q);assert.equal(csv.charCodeAt(0),0xfeff);assert.ok(csv.includes('"\'=SUM(1;2)"'));assert.ok(csv.includes('Perrito ""ñ"";\nprueba'));assert.ok(csv.includes(';"75,00";'));const parsed=R.parse(csv,['atencion_id','fecha','hora','zona_horaria','cliente_id','cliente_nombre','perrito_id','perrito_nombre','servicio_codigo','servicio_nombre','subtotal_pen','igv_pen','total_pen']);assert.equal(parsed.records.length,200);assert.equal(q.attentions.length,150);
});
test('Analítica: cinco especificaciones de gráficos conservan tablas y acciones',()=>{
  const q=D.query(rows),s=G.specs(q,{});assert.deepEqual(Object.keys(s),['trend','services','heat','clients','frequency']);assert.equal(s.heat.rows.length,168);assert.equal(s.clients.rows.length,10);assert.equal(s.frequency.rows.length,4);assert.equal(s.services.option.tooltip.renderMode,'richText');assert.ok(s.trend.option.series[0].data[0].key);assert.ok(s.services.option.series[0].data[0].id);assert.equal(s.clients.rows.flat().some(x=>String(x).includes('@')),false);
});
test('Analítica: IndexedDB transaccional, recarga y revisión concurrente',async()=>{
  const factory=new IDBFactory(),a=S.createStore(factory),b=S.createStore(factory);assert.equal((await a.load()).revision,0);await a.commit(demo,0);assert.equal((await b.load()).data.workspace.attentions.length,150);await assert.rejects(b.commit(D.empty(),0),/otra pestaña/);assert.equal((await a.load()).data.workspace.attentions.length,150);await b.commit(D.empty(),1);assert.equal((await a.load()).data.workspace.attentions.length,0);assert.deepEqual((await factory.databases()).map(d=>d.name),['pet-doctor.analytics']);a.close();b.close();
});
test('Analítica: almacenamiento no disponible y candidato inválido no escriben',async()=>{
  await assert.rejects(S.createStore(null).load(),/IndexedDB/);const factory=new IDBFactory(),store=S.createStore(factory);const bad=clone(demo);bad.workspace.attentions[0].quote.pricing.services=[];await assert.rejects(store.commit(bad,0));assert.equal((await store.load()).revision,0);store.close();
});
test('Analítica: librería 6.0.0, licencias y sincronización exacta',()=>{
  const root=path.resolve(__dirname,'../analitica'),manifest=require('../analitica/dependencies.json');assert.equal(require('../analitica/vendor/echarts.min.js').version,'6.0.0');for(const [file,hash]of Object.entries(manifest.sha256)){const bytes=fs.readFileSync(path.join(root,file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hash,file);if(file.startsWith('lib/'))assert.equal(bytes.toString('utf8'),fs.readFileSync(path.resolve(root,'../assets',path.basename(file)),'utf8').replace(/\r\n/g,'\n'));}assert.match(fs.readFileSync(path.join(root,'vendor/LICENSE-echarts.txt'),'utf8'),/Apache License/);
});
