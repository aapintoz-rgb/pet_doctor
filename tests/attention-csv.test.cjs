const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../assets/attention-csv.js'),R=require('../assets/registry-csv.js'),W=require('../assets/workspace.js'),P=require('../assets/pricing.js'),H=require('../assets/history.js');
const now=Date.parse('2026-10-31T23:59:59-05:00');
const workspace=()=>R.prepare(W.empty(),R.example25()).candidate;
const row=()=>['csv-att-test','2026-10-01','10:00:00','csv-demo-cliente-01','csv-demo-perrito-01','consulta','primera','','','','','','','','','',''];
const csv=(...rows)=>R.serialize([A.HEADERS,...rows.map(row=>row.length===A.LEGACY_HEADERS.length?row.concat(Array(A.HEADERS.length-row.length).fill('')):row)]);
const prepare=(ws,...rows)=>A.prepare(ws,csv(...rows),{now});

test('Ejemplo 25/45 conserva íntegros los 10/15 originales y amplía sin duplicar',()=>{
  const old=R.prepare(W.empty(),R.example()).candidate,newFile=fs.readFileSync(path.join(__dirname,'../examples/clientes-perritos-ejemplo-25.csv'),'utf8');assert.equal(newFile,R.example25());
  const add=R.prepare(old,newFile);assert.deepEqual(add.errors,[]);assert.equal(add.counts.newOwners,15);assert.equal(add.counts.newPets,30);assert.equal(add.counts.registered,15);
  assert.deepEqual(add.candidate.owners.slice(0,10),old.owners);assert.deepEqual(add.candidate.pets.slice(0,15),old.pets);
});
test('Archivo real: 150 atenciones, 200 servicios, 45 perritos y distribución 4/3',()=>{
  const file=fs.readFileSync(path.join(__dirname,'../examples/atenciones-ejemplo-150.csv'),'utf8');assert.equal(file,A.example());assert.equal(file.charCodeAt(0),65279);
  const ws=workspace(),before=JSON.stringify(ws),r=A.prepare(ws,file,{now});assert.deepEqual(r.errors,[]);assert.equal(r.counts.newAttentions,150);assert.equal(r.rows.length,200);assert.equal(JSON.stringify(ws),before);
  const records=r.candidate.attentions;assert.equal(records.filter(a=>a.quote.pricing.services.length===1).length,100);assert.equal(records.filter(a=>a.quote.pricing.services.length===2).length,50);
  for(let i=0;i<45;i++){const id='csv-demo-perrito-'+String(i+1).padStart(2,'0');assert.equal(records.filter(a=>a.registration.petId===id).length,i<15?4:3);}
  assert.equal(new Set(records.map(a=>a.registration.ownerId)).size,25);assert.equal(new Set(records.map(a=>a.registration.petId+'|'+a.performedAt)).size,150);
  assert.equal(H.rows(r.candidate).length,150);assert.equal(r.candidate.quotes.length,0);
  for(const a of records){const p=a.quote.pricing;assert.equal(p.services.reduce((n,s)=>n+s.subtotal,0),p.subtotal);assert.equal(p.services.reduce((n,s)=>n+s.tax,0),p.tax);assert.equal(p.services.reduce((n,s)=>n+s.total,0),p.total);for(const s of p.services)assert.equal(s.lines.reduce((n,l)=>n+l.amount,0),s.subtotal);}
  assert.equal(r.counts.total,2134679);
});
test('Vínculos existentes obligatorios, relación y dueño completo; no crea identidades',()=>{
  const ws=workspace();for(const changes of [{3:'missing'},{4:'missing'},{3:'csv-demo-cliente-02'}]){const r=row();for(const k in changes)r[k]=changes[k];assert.equal(prepare(ws,r).candidate,null);}
  const incomplete=workspace();incomplete.owners[0].contact='';assert.equal(prepare(incomplete,row()).candidate,null);
  const noEmail=workspace();noEmail.owners[0].email='';assert.equal(prepare(noEmail,row()).counts.newAttentions,1);
  assert.equal(prepare(W.empty(),row()).candidate,null);
});
test('Campos comunes y fechas estrictos; Lima y medianoche, futuro rechazado',()=>{
  const ws=workspace();for(const [idx,value] of [[0,''],[0,'x'.repeat(101)],[1,'2026-02-30'],[1,'2030-01-01'],[2,'24:00:00'],[2,'12:60:00'],[3,''],[4,''],[5,'']]){const r=row();r[idx]=value;assert.equal(prepare(ws,r).candidate,null,value);}
  const a=row();a[1]='2026-10-30';a[2]='23:59:59';const imported=prepare(ws,a).candidate.attentions[0];assert.equal(imported.performedAt,'2026-10-31T04:59:59.000Z');assert.deepEqual(H.dateParts(imported.performedAt),{date:'2026-10-30',time:'23:59:59'});
  const b=[...a];b[5]='inteligencia';b[6]='perfil';b[2]='23:59:58';assert.equal(prepare(ws,a,b).candidate,null);
});
test('Servicios, modalidades, extras y listas desconocidos o duplicados se rechazan',()=>{
  const ws=workspace();for(const [idx,value] of [[5,'__proto__'],[5,'constructor'],[5,'otro'],[6,'desconocido'],[7,'bano'],[8,'informe|informe'],[8,'informe|'],[8,'paseo']]){const r=row();r[idx]=value;assert.equal(prepare(ws,r).candidate,null,value);}
  assert.equal({}.included,undefined);assert.equal(prepare(ws,row(),row()).candidate,null);
  for(const values of [['vacunas','','',''],['grooming','individual','',''],['grooming','esencial','bano',''],['inteligencia','perfil','','informe']]){const r=row();r.splice(5,4,...values);assert.equal(prepare(ws,r).candidate,null);}
});
test('Peso/tamaño excluyentes, datos compartidos, pelaje y nudos requeridos',()=>{
  const ws=workspace(),r=row();r[5]='grooming';r[6]='completo';assert.equal(prepare(ws,r).candidate,null);r[12]='no';assert.ok(prepare(ws,r).candidate);
  r[9]='10';r[10]='mediano';assert.equal(prepare(ws,r).candidate,null);r[10]='';r[9]='-1';assert.equal(prepare(ws,r).candidate,null);
  const missing=row();missing[3]='csv-demo-cliente-03';missing[4]='csv-demo-perrito-03';missing[5]='grooming';missing[6]='esencial';missing[12]='no';assert.equal(prepare(ws,missing).candidate,null);missing[10]='pequeno';assert.equal(prepare(ws,missing).candidate,null);missing[11]='largo';assert.ok(prepare(ws,missing).candidate);
  const a=row(),b=row();a[5]='guarderia';a[6]='media';a[9]='12,5';b[5]='grooming';b[6]='esencial';b[9]='12.5';b[12]='si';assert.ok(prepare(ws,a,b).candidate);b[9]='13';assert.equal(prepare(ws,a,b).candidate,null);
});
test('Precios calculados, históricos y cero: ajustes concilian y no editan al perrito',()=>{
  const ws=workspace(),original=JSON.stringify(ws.pets),r=row(),base=prepare(ws,r);assert.equal(base.candidate.attentions[0].quote.pricing.total,7080);assert.ok(base.warnings.some(w=>w.message.includes('catálogo actual')));
  for(const amount of ['40,25','0','60.00']){r[13]=amount;const p=prepare(ws,r);assert.deepEqual(p.errors,[]);const service=p.candidate.attentions[0].quote.pricing.services[0];assert.equal(service.subtotal,A.money(amount));assert.equal(service.lines.reduce((n,l)=>n+l.amount,0),service.subtotal);assert.equal(JSON.stringify(ws.pets),original);}
  r[13]='40';const p=prepare(ws,r);assert.ok(p.candidate.attentions[0].quote.pricing.services[0].lines.some(l=>l.label==='Ajuste por importe histórico'&&l.amount===-2000));
});
test('Importes seguros y controles opcionales exactos, incluidas contradicciones y un céntimo',()=>{
  const ws=workspace();for(const amount of ['-1','1.001','1,000.50','S/ 1','NaN','1e3','99999999999999999999999']){const r=row();r[13]=amount;assert.equal(prepare(ws,r).candidate,null,amount);}
  const a=row(),b=row();a[13]='1,01';a[14]='3,03';a[15]='0,55';a[16]='3,58';b[5]='inteligencia';b[6]='perfil';b[13]='2,02';const good=prepare(ws,a,b);assert.deepEqual(good.errors,[]);assert.equal(good.candidate.attentions[0].quote.pricing.services.reduce((n,s)=>n+s.tax,0),55);
  b[16]='3,59';assert.equal(prepare(ws,a,b).candidate,null);b[16]='';a[16]='3,57';assert.equal(prepare(ws,a,b).candidate,null);
  const huge=row();huge[13]='90071992547409.91';assert.equal(prepare(ws,huge).candidate,null);
});
test('Reimportación conserva 150 snapshots y precios; importes/atributos omitidos usan históricos',()=>{
  const initial=A.prepare(workspace(),A.example(),{now}).candidate,before=JSON.stringify(initial);
  const again=A.prepare(initial,A.example(),{now});assert.deepEqual(again.errors,[]);assert.equal(again.counts.registered,150);assert.equal(again.canImport,false);assert.equal(JSON.stringify(initial),before);
  const r=row();r[13]='40';const first=prepare(workspace(),r).candidate;first.owners[0].name='Nombre actualizado';first.pets[0].weightKg=30;first.pets[0].coat='long';r[13]='';
  const skipped=prepare(first,r);assert.equal(skipped.counts.registered,1);assert.equal(skipped.candidate.attentions[0].ownerSnapshot.name,'Ana Ejemplo');assert.equal(skipped.candidate.attentions[0].quote.pricing.total,4720);assert.equal(skipped.candidate.attentions[0].quote.state.pet.weightKg,12.5);
  for(const [idx,value] of [[13,'41'],[1,'2026-10-02'],[6,'control'],[9,'8'],[3,'csv-demo-cliente-02']]){const changed=[...r];changed[idx]=value;assert.equal(prepare(first,changed).candidate,null);}
});
test('No depende de montos actuales para aceptar un ID ya registrado con importes omitidos',()=>{
  const r=row(),first=prepare(workspace(),r).candidate;first.attentions[0].quote.pricing.services[0].lines=[{label:'Histórico',amount:100}];first.attentions[0].quote.pricing.services[0].subtotal=100;first.attentions[0].quote.pricing.services[0].tax=18;first.attentions[0].quote.pricing.services[0].total=118;Object.assign(first.attentions[0].quote.pricing,{subtotal:100,tax:18,total:118});
  assert.equal(prepare(first,r).counts.registered,1);assert.equal(prepare(first,r).candidate.attentions[0].quote.pricing.total,118);
});
test('Mismo perrito/instante con otro ID avisa; error posterior bloquea toda la carga',()=>{
  const ws=workspace(),a=row(),b=row();b[0]='otro-id';const p=prepare(ws,a,b);assert.equal(p.counts.newAttentions,2);assert.ok(p.warnings.some(w=>w.message.includes('mismo perrito')));
  const before=JSON.stringify(ws);b[5]='no-existe';const failed=prepare(ws,a,b);assert.equal(failed.candidate,null);assert.equal(JSON.stringify(ws),before);
});
test('CSV estructural inválido, límite heredado y máximo de atenciones en la base',()=>{
  assert.throws(()=>A.prepare(workspace(),R.template(),{now}),/Cabecera/);assert.throws(()=>A.prepare(workspace(),A.HEADERS.join(';')+'\n"sin cerrar',{now}),/sin cerrar/);
  assert.equal(prepare(workspace(),row().slice(0,7)).candidate,null);
  const ws=prepare(workspace(),row()).candidate,base=ws.attentions[0];ws.attentions=Array.from({length:10000},(_,i)=>({...base,id:'existing-'+i,quote:{...base.quote,id:'existing-'+i}}));const r=row();r[0]='one-more';assert.equal(prepare(ws,r).candidate,null);
});
