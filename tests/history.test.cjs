const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../assets/history.js');
const W = require('../assets/workspace.js');
const F = require('../assets/files.js');
const { defaults } = require('../assets/catalog.js');

function attention(id, performedAt, extra = {}) {
  const state = defaults(); state.selections.consulta.included = true;
  const quote = F.makeQuote(state,{id,createdAt:'2026-10-01T12:00:00Z'});
  quote.state.pet = { ...quote.state.pet, name:'Lúna', ownerName:'Ána Pérez', ownerId:'o1', petId:'p1', contact:'999123456', ...extra.pet };
  return { type:'pet-doctor.attention', version:1, id, performedAt, status:'realizada', quote, registration:{ownerId:'o1',petId:'p1'}, ownerSnapshot:{id:'o1',name:'Ána Pérez',dni:'00123456',contact:'999123456'}, ...extra.attention };
}
function workspace() {
  const w = W.empty();
  w.attentions = [attention('a','2026-10-31T04:59:59Z'),attention('b','2026-10-31T05:00:00Z'),attention('c','2026-10-30T05:00:00Z'),attention('d','2026-10-30T04:59:59Z')];
  return w;
}
// Parser independiente para verificar contenido de celdas y saltos de línea de CSV.
function parseCSV(source) {
  source = source.replace(/^\uFEFF/,'');
  const records=[];let record=[],cell='',quoted=false;
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(c==='"') { if(quoted && source[i+1]==='"'){cell+='"';i++;} else quoted=!quoted; }
    else if(c===';' && !quoted){record.push(cell);cell='';}
    else if(c==='\r' && source[i+1]==='\n' && !quoted){record.push(cell);records.push(record);record=[];cell='';i++;}
    else cell+=c;
  }
  assert.equal(quoted,false);return records;
}

test('Fechas en Lima, medianoche y orden descendente usan performedAt',()=>{
  assert.deepEqual(H.dateParts('2026-10-31T04:59:59Z'),{date:'2026-10-30',time:'23:59:59'});
  assert.deepEqual(H.dateParts('2026-10-31T05:00:00Z'),{date:'2026-10-31',time:'00:00:00'});
  assert.deepEqual(H.rows(workspace()).map(row=>row.id),['b','a','c','d']);
  assert.deepEqual(H.select(workspace(),{from:'2026-10-30',to:'2026-10-30'}).rows.map(row=>row.id),['a','c']);
  assert.equal(H.filename(new Date('2026-10-31T04:00:00Z')),'pet-doctor-atenciones-2026-10-30.csv');
});

test('Filtros inclusivos y combinados, búsquedas normalizadas, errores de rango',()=>{
  const w=workspace();
  for(const search of ['ana perez','LUNA','00123456','b']) assert.ok(H.select(w,{search}).count>0);
  assert.equal(H.select(w,{owner:'id:o1',pet:'id:p1',search:'luna',from:'2026-10-30',to:'2026-10-30'}).count,2);
  assert.equal(H.select(w,{owner:'id:missing'}).count,0);
  assert.equal(H.select(w,{from:'2026-10-31'}).count,1);
  assert.equal(H.select(w,{to:'2026-10-29'}).count,1);
  for(const filters of [{from:'2026-10-31',to:'2026-10-30'},{from:'2026-02-30'},{to:'bad'}]) assert.throws(()=>H.select(w,filters));
});

test('Snapshots e importes históricos no se completan con clientes ni catálogo actuales',()=>{
  const w=workspace();w.owners=[{id:'o1',name:'Nombre nuevo',dni:'99999999',contact:'111111111'}];
  w.pets=[{id:'p1',ownerId:'o1',name:'Otro nombre'}];w.attentions[0].quote.pricing.total=12345;
  const before=JSON.stringify(w),row=H.select(w,{search:'a'}).rows.find(row=>row.id==='a');
  assert.equal(row.ownerName,'Ána Pérez');assert.equal(row.petName,'Lúna');assert.equal(row.dni,'00123456');assert.equal(row.total,12345);
  H.filterOptions(w);H.csv(H.select(w));assert.equal(JSON.stringify(w),before);
});

test('Históricos sin vínculo conservan nombres y datos desconocidos vacíos',()=>{
  const w=workspace();const legacy=attention('old','2026-10-25T12:00:00Z');delete legacy.registration;delete legacy.ownerSnapshot;
  legacy.quote.state.pet.ownerId=null;legacy.quote.state.pet.petId=null;legacy.quote.state.pet.contact='';w.attentions.push(legacy);
  const result=H.select(w,{owner:'unlinked'});assert.equal(result.count,1);assert.equal(result.rows[0].ownerName,'Ána Pérez');assert.equal(result.rows[0].dni,'');assert.equal(result.rows[0].registered,false);
  const csv=parseCSV(H.csv(result));assert.equal(csv[1][4],'');assert.equal(csv[1][6],'');assert.equal(csv[1][7],'');assert.equal(csv[1][16],'no');
  assert.ok(H.filterOptions(w).owners.some(option=>option.label==='Sin vínculo registrado'));
});

test('Opciones de cliente y perrito dependen del historial, sin cruzar dueños',()=>{
  const w=workspace();w.attentions.push(attention('other','2026-10-31T12:00:00Z',{attention:{registration:{ownerId:'o2',petId:'p2'},ownerSnapshot:{name:'Luis',dni:'87654321',contact:'111111111'}},pet:{name:'Max',ownerName:'Luis',ownerId:'o2',petId:'p2'}}));
  assert.equal(H.filterOptions(w).owners.length,2);assert.equal(H.filterOptions(w).pets.length,2);
  assert.deepEqual(H.filterOptions(w,'id:o1').pets.map(pet=>pet.key),['id:p1']);
});

test('CSV exacto: BOM, cabecera, 17 columnas, coma decimal y una fila por atención',()=>{
  const result=H.select(workspace()),csv=H.csv(result),parsed=parseCSV(csv);
  assert.equal(csv.charCodeAt(0),0xFEFF);assert.equal(parsed.length,5);assert.deepEqual(parsed[0],H.HEADERS);
  assert.ok(parsed.every(row=>row.length===H.HEADERS.length));assert.equal(parsed[1][0],'b');assert.equal(parsed[1][6],'00123456');assert.equal(parsed[1][11],'60,00');assert.equal(parsed[1][12],'10,80');assert.equal(parsed[1][13],'70,80');assert.equal(parsed[1][3],'America/Lima');
  assert.equal(parsed[1][14],'PEN');assert.equal(parsed[1][15],'realizada');assert.equal(parsed[1][16],'si');
  assert.equal(result.total,4*7080);
});

test('CSV escapa comillas, separador y saltos; neutraliza prefijos de fórmula',()=>{
  const w=workspace();w.attentions=[w.attentions[0]];
  w.attentions[0].ownerSnapshot.name='Ána; "Pérez"\r\nApellido';w.attentions[0].quote.state.pet.name='=HYPERLINK("bad")';w.attentions[0].ownerSnapshot.contact='+51 999 123 456';
  w.attentions[0].quote.pricing.services[0].name='Consulta; inicial';w.attentions[0].quote.pricing.services.push({name:'Otro servicio'});
  let parsed=parseCSV(H.csv(H.select(w)));
  assert.equal(parsed.length,2);assert.equal(parsed[1][5],'Ána; "Pérez"\r\nApellido');assert.equal(parsed[1][9],"'=HYPERLINK(\"bad\")");assert.equal(parsed[1][7],"'+51 999 123 456");assert.equal(parsed[1][10],'Consulta; inicial | Otro servicio');
  for(const name of ['=1+1',' +1','-1','@SUM(1)','\ttext','\ntext','\u0000=1']) {w.attentions[0].ownerSnapshot.name=name;parsed=parseCSV(H.csv(H.select(w)));assert.equal(parsed[1][5],"'"+name);}
});

test('Solo realizada, resultado vacío y CSV completo sin dependencia de paginación',()=>{
  const w=workspace();w.attentions[0].status='pendiente';assert.equal(H.select(w).count,3);
  w.attentions=[];assert.equal(H.select(w).total,0);assert.equal(parseCSV(H.csv(H.select(w))).length,1);
  for(let i=0;i<45;i++)w.attentions.push(attention('row-'+i,'2026-10-30T12:00:00Z'));
  assert.equal(parseCSV(H.csv(H.select(w))).length,46);
});

test('Desgloses antiguos incompletos se presentan sin inventar importes ni romper la consulta',()=>{
  const w=workspace();w.attentions[0].quote.pricing.services=[null,{name:'Consulta antigua',lines:[{label:'Sin importe'}]}];
  const row=H.rows(w).find(row=>row.id==='a');assert.deepEqual(row.services,['Servicio sin detalle','Consulta antigua']);
  assert.equal(row.serviceDetails[0].total,null);assert.equal(row.serviceDetails[1].lines[0].amount,null);
  assert.equal(row.total,7080);
});
