const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../assets/analytics-csv'),W=require('../assets/workspace'),R=require('../assets/registry-csv'),A=require('../assets/attention-csv'),D=require('../analitica/data');
const source=()=>A.prepare(R.prepare(W.empty(),R.example25()).candidate,A.example()).candidate;
const rows=text=>[C.HEADERS,...R.parse(text,C.HEADERS).records.map(r=>r.values)];
test('CSV único: 200 servicios, 150 atenciones, 25 clientes, 45 perros e importes exactos',async()=>{
 const ws=source(),text=C.exportCsv(ws),read=await C.read(text),q=D.query(D.normalize(read));assert.equal(rows(text).length,201);assert.equal(read.version,3);assert.equal(read.owners.length,25);assert.equal(read.pets.length,45);assert.equal(read.attentions.length,150);assert.equal(q.kpis.services,200);assert.equal(q.kpis.total,2134679);assert.deepEqual(read.attentions,ws.attentions);assert.equal(text.charCodeAt(0),65279);assert.ok(!text.replace(/\r\n/g,'').includes('\n'));assert.equal((await C.read(text)).attentions.length,150);
});
test('CSV único: excluye clientes sin atención, cotizaciones y configuración',async()=>{
 const ws=source(),o={...ws.owners[0],id:'unused',dni:'99999999'};ws.owners.push(o);ws.pets.push({...ws.pets[0],id:'unused-pet',ownerId:'unused'});ws.quotes=[ws.attentions[0].quote];ws.connectionSecret='no-exportar';
 const text=C.exportCsv(ws),read=await C.read(text);assert.equal(read.owners.length,25);assert.equal(read.pets.length,45);assert.equal(read.quotes.length,0);assert.ok(!text.includes('no-exportar'));
});
test('CSV único: datos actuales y snapshots diferentes, históricos sin vínculo y escapes reversibles',async()=>{
 const ws=source();ws.attentions=ws.attentions.slice(0,2);ws.owners[0].name="'=Cliente; \"Ána\"";ws.pets[0].name='Nombre actual';const a=ws.attentions[0];a.ownerSnapshot.name="'=Histórico";a.quote.state.pet.ownerName=a.ownerSnapshot.name;a.observations="=texto;\n\"tildes á\"";
 const b=ws.attentions[1];delete b.registration;delete b.ownerSnapshot;delete b.petSnapshot;b.quote.state.pet.ownerId=null;b.quote.state.pet.petId=null;
 const text=C.exportCsv(ws),read=await C.read(text);assert.deepEqual(read.attentions,ws.attentions);assert.equal(read.owners[0].name,ws.owners[0].name);assert.equal(D.query(D.normalize(read)).kpis.unlinked,1);assert.ok(text.includes("''=Histórico"));
});
test('CSV único: columnas alteradas, JSON inválido, importes y duplicados rechazan todo',async()=>{
 const original=C.exportCsv(source());for(const mutate of [r=>r[1][20]='1,01',r=>r[1][29]='{roto',r=>r.push(r[1]),r=>r[1][0]='2',r=>r[1][3]='2020-01-01',r=>{const s=JSON.parse(r[1][29]);s.lines[0].amount++;r[1][29]=JSON.stringify(s);},r=>{const i=r.findIndex((x,i)=>i>1&&x[7]===r[1][7]);const o=JSON.parse(r[i][23]);o.name='Contradictorio';r[i][23]=JSON.stringify(o); }]){const r=rows(original);mutate(r);await assert.rejects(C.read(R.serialize(r)));}
});
test('CSV único: metadatos comunes contradictorios y relaciones cruzadas se rechazan',async()=>{
 const r=rows(C.exportCsv(source()));const i=r.findIndex((x,i)=>i>1&&x[2]===r[3][2]);const owner=JSON.parse(r[i][23]);owner.id='otro';r[i][23]=JSON.stringify(owner);await assert.rejects(C.read(R.serialize(r)),/Fila.*atención/);
});
test('CSV único: cancelación por bloques y progreso antes de construir candidato',async()=>{
 const controller=new AbortController(),progress=[];await assert.rejects(C.read(C.exportCsv(source()),{signal:controller.signal,onProgress:p=>{progress.push(p.percent);if(p.percent>0)controller.abort();}}),/cancelada/);assert.ok(progress.length>1);assert.ok(progress.at(-1)<100);
});
test('CSV único: límites, formatos incompatibles y fuentes sin desglose',async()=>{
 assert.throws(()=>C.exportCsv(W.empty()),/No hay/);await assert.rejects(C.read('x'.repeat(C.MAX_BYTES+1)),/50 MB/);await assert.rejects(C.read(R.example()),/Cabecera/);await assert.rejects(C.read(C.HEADERS.join(';')+'\n"sin cerrar'),/comillas/);const ws=source();ws.attentions[0].quote.pricing.services[0].lines=[];assert.throws(()=>C.exportCsv(ws),/Atención/);
});
