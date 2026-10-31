const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../assets/registry-csv.js'),W=require('../assets/workspace.js');
const example=()=>fs.readFileSync(path.join(__dirname,'../examples/clientes-perritos-ejemplo-10.csv'),'utf8');
const row=()=>['owner-csv','Ana Pérez','00123456','+51 999 123 456','ana@example.com','pet-csv','Luna','12,5','','largo'];
const csv=(...rows)=>C.serialize([C.HEADERS,...rows]);
const initial=()=>W.saveClient(W.empty(),{owner:{name:'Ana Pérez',dni:'00123456',contact:'+51 999 123 456',email:'ana@example.com'},pets:[{name:'Luna',weightKg:12.5,size:null,coat:'long'}]});

test('Ejemplo: 10 clientes, 15 perritos, distribución 5/5, IDs y DNI conservados al recargar',()=>{
  assert.equal(example(),C.example());assert.equal(example().charCodeAt(0),65279);assert.equal(example().replace(/\r\n/g,'').includes('\n'),false);
  const r=C.prepare(W.empty(),example());assert.deepEqual(r.errors,[]);assert.equal(r.counts.newOwners,10);assert.equal(r.counts.newPets,15);
  const saved=W.read(JSON.stringify(r.candidate));assert.equal(saved.owners[0].dni,'00000001');assert.equal(saved.pets[0].weightKg,12.5);assert.ok(saved.pets.some(p=>p.name.includes('"')));
  const groups=saved.owners.map(o=>saved.pets.filter(p=>p.ownerId===o.id).length);assert.equal(groups.filter(n=>n===1).length,5);assert.equal(groups.filter(n=>n===2).length,5);
  assert.ok(saved.owners.every(o=>o.email.endsWith('@example.com')));
});
test('Reimportar ejemplo no genera duplicados ni candidato importable',()=>{
  const first=C.prepare(W.empty(),example()),again=C.prepare(first.candidate,example());assert.deepEqual(again.errors,[]);assert.equal(again.canImport,false);assert.equal(again.counts.registered,15);assert.equal(again.counts.reusedOwners,10);assert.equal(again.candidate.pets.length,15);
});
test('CSV entrecomillado soporta ; coma, saltos, comillas, cabecera reordenada y BOM',()=>{
  const r=row();r[1]='Ana; "Pérez"\nEjemplo';const semis=C.parse(csv(r));assert.equal(semis.records[0].data.cliente_nombre,r[1]);
  const commaCell=v=>'"'+String(v).replace(/"/g,'""')+'"';
  const matrix=[C.HEADERS,r].map(x=>[...x].reverse());
  const comma=matrix.map(x=>x.map(commaCell).join(',')).join('\r\n');
  const parsed=C.prepare(W.empty(),comma);assert.deepEqual(parsed.errors,[]);assert.equal(parsed.candidate.pets[0].weightKg,12.5);assert.equal(parsed.candidate.owners[0].name,r[1]);
});
test('Sintaxis corrupta, columnas desconocidas/duplicadas/faltantes y filas desalineadas',()=>{
  for(const source of ['', 'a;b\n1;2',C.HEADERS.join(';')+';cliente_id',C.HEADERS.slice(1).join(';'),csv(row())+'"sin cerrar',csv(row())+'abc"def',C.HEADERS.join(';')+'\r\n"x"texto','\ufffd'])assert.throws(()=>C.parse(source));
  const r=C.prepare(W.empty(),C.HEADERS.join(';')+'\r\n1;2');assert.equal(r.errors[0].column,'fila');assert.equal(r.candidate,null);
  assert.equal(C.prepare(W.empty(),C.template()).canImport,false);
});
test('Campos obligatorios, DNI de ocho dígitos, pesos, tamaño/pelaje y dirección única',()=>{
  const cases=[[1,''],[2,'1234'],[2,'0000000x'],[3,'123'],[3,'abc1234567'],[4,''],[4,'bad'],[4,'a@example.com,b@example.com'],[6,''],[7,'0'],[7,'-1'],[7,'1,000.5'],[8,'gigante'],[9,'rizado']];
  for(const [col,value] of cases){const r=row();r[col]=value;const plan=C.prepare(W.empty(),csv(r));assert.ok(plan.errors.length,C.HEADERS[col]);assert.equal(plan.candidate,null);}
  const both=row();both[8]='pequeno';assert.ok(C.prepare(W.empty(),csv(both)).errors.length);
  const optional=row();optional[7]='';optional[8]='grande';optional[9]='';const good=C.prepare(W.empty(),csv(optional));assert.equal(good.candidate.pets[0].size,'large');assert.equal(good.candidate.pets[0].coat,null);
});
test('Reutilizar dueño por DNI sin modificar identidad; diferencias y IDs cruzados bloquean todo',()=>{
  const f=initial(),before=JSON.stringify(f.workspace),r=row();r[0]='';r[5]='new-pet';r[6]='Toby';r[3]='+51(999)123-456';
  const p=C.prepare(f.workspace,csv(r));assert.equal(p.counts.reusedOwners,1);assert.equal(p.counts.newOwners,0);assert.equal(p.candidate.pets.length,2);assert.equal(p.candidate.pets[1].ownerId,f.ownerId);assert.equal(p.candidate.owners[0].contact,'+51 999 123 456');assert.equal(JSON.stringify(f.workspace),before);
  for(const [col,value] of [[0,'other-id'],[1,'Otra Ana'],[3,'999123456'],[4,'otra@example.com']]){const changed=[...r];changed[col]=value;assert.ok(C.prepare(f.workspace,csv(changed)).errors.length);}
  const crossed=row();crossed[0]=f.ownerId;crossed[2]='99999999';assert.equal(C.prepare(f.workspace,csv(crossed)).candidate,null);
});
test('Filas del mismo DNI crean un solo dueño y requieren coherencia de datos e IDs',()=>{
  const a=row(),b=row();b[0]='';b[5]='pet-other';b[6]='Toby';const result=C.prepare(W.empty(),csv(a,b));assert.equal(result.counts.newOwners,1);assert.equal(result.counts.newPets,2);
  for(const [index,value] of [[0,'owner-other'],[1,'Ana Distinta'],[4,'otro@example.com']]){const changed=[...b];changed[index]=value;assert.equal(C.prepare(W.empty(),csv(a,changed)).candidate,null);}
});
test('ID de perrito existente requiere mismo dueño y datos; homónimos sin ID son ambiguos',()=>{
  const f=initial(),r=row();r[0]=f.ownerId;r[5]=f.petId;const good=C.prepare(f.workspace,csv(r));assert.equal(good.counts.registered,1);assert.equal(good.canImport,false);
  const changed=[...r];changed[7]='13';assert.equal(C.prepare(f.workspace,csv(changed)).candidate,null);
  const other=[...r];other[0]='new-owner';other[2]='99999999';assert.equal(C.prepare(f.workspace,csv(other)).candidate,null);
  const ambiguous=[...r];ambiguous[5]='';assert.match(C.prepare(f.workspace,csv(ambiguous)).errors[0].message,/ambiguo/);
  const homonym=[...r];homonym[5]='another-luna';const p=C.prepare(f.workspace,csv(homonym));assert.equal(p.errors.length,0);assert.equal(p.warnings.length,1);assert.equal(p.counts.newPets,1);
});
test('IDs omitidos se generan una vez al preparar; candidato conserva IDs en reintento',()=>{
  const r=row();r[0]='';r[5]='';const p=C.prepare(W.empty(),csv(r)),storeData=new Map();let blocked=true;
  const store=W.createStore({getItem:k=>storeData.get(k)??null,setItem:(k,v)=>{if(blocked)throw Error('quota');storeData.set(k,v);}});
  const id=p.candidate.pets[0].id;assert.throws(()=>store.commit(p.candidate));assert.equal(store.get().pets.length,0);blocked=false;store.commit(p.candidate);assert.equal(store.get().pets[0].id,id);assert.equal(p.rows[0].petId,id);
});
test('Límites: 5 MB UTF-8, 5.000 filas; líneas vacías ignoradas, números de línea físicos',()=>{
  assert.throws(()=>C.parse('é'.repeat(Math.ceil(C.MAX_BYTES/2)+1)),/5 MB/);
  const lines=Array.from({length:5000},()=>row());assert.equal(C.parse(csv(...lines)).records.length,5000);assert.throws(()=>C.parse(csv(...lines,row())),/5.000/);
  const r=row();r[1]='Ana\nEjemplo';const parsed=C.parse(C.HEADERS.join(';')+'\r\n\r\n'+C.serialize([r]).slice(1)+C.serialize([row()]).slice(1));assert.equal(parsed.records[0].line,3);assert.equal(parsed.records[1].line,5);
});
