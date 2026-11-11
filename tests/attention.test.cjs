const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const W = require('../assets/workspace.js');
let JSDOM;
try { ({ JSDOM } = require('jsdom')); } catch { /* Dependencia opcional de desarrollo, no de la aplicación. */ }
const uiTest = (name, fn) => test(name, { skip: !JSDOM && 'Instala jsdom y expón su carpeta mediante NODE_PATH para las pruebas de interfaz.' }, fn);

uiTest('Archivos: inventario único y ubicación por módulo sin controles obsoletos',()=>{
 const a=app();for(const id of ['import-quote','quote-file','export-registry','import-registry','registry-file','csv-template','csv-example','attention-csv-template','attention-csv-example','retry-client-save','backup-client-draft','data-pending'])assert.equal(a.el('#'+id),null,id);
 assert.equal(a.el('#csv-open').closest('section#clients-module')?.id,'clients-module');assert.equal(a.el('#attention-csv-open').closest('#data-dialog')?.id,'data-dialog');assert.equal(a.el('#export-analytics').closest('#data-dialog')?.id,'data-dialog');assert.equal(a.el('#download-pending').closest('#data-dialog')?.id,'data-dialog');assert.equal(a.el('#data-dialog').tagName,'SECTION');assert.equal(a.el('#export-analytics').disabled,true);assert.ok(a.el('#history-csv'));assert.ok(a.el('.download-quote'));a.cleanup();
});
uiTest('Archivos: exportación analítica usa todo lo guardado y navegar conserva cotización y filtros',async()=>{
 const R=require('../assets/registry-csv'),A=require('../assets/attention-csv'),C=require('../assets/analytics-csv'),initial=A.prepare(R.prepare(W.empty(),R.example25()).candidate,A.example()).candidate,a=app({initial});
 a.click('#nav-quote');a.selectService();a.fill('#history-search','sin coincidencias');a.fill('#attention-observations','Pendiente sin guardar');a.click('#open-data');assert.equal(a.el('#data-dialog').hidden,false);assert.equal(a.el('#quote-module').hidden,true);a.click('#export-analytics');assert.match(a.downloads.at(-1).name,/pet-doctor-analitica-/);const csv=await a.downloadText();const loaded=await C.read(csv);assert.equal(loaded.attentions.length,150);assert.ok(!csv.includes('Pendiente sin guardar'));a.click('#close-data');assert.equal(a.el('#quote-module').hidden,false);assert.equal(a.el('#history-search').value,'sin coincidencias');assert.equal(a.el('#attention-observations').value,'Pendiente sin guardar');a.cleanup();
});

uiTest('Registro v3: campos ampliados obligatorios sin peso, persistencia y ficha',()=>{
  const a=app();a.click('#directory-new');a.fillOwner();a.fill('[data-pet-key="name"]','Luna');
  a.el('#client-form').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(a.data.size,0);assert.match(a.el('#client-form-error').textContent,/raza/);
  a.fill('[data-pet-key="breed"]','Mestizo');a.fill('[data-pet-key="sex"]','undetermined','change');a.fill('[data-pet-key="ageYears"]','0');a.fill('[data-pet-key="ageMonths"]','0');
  a.el('#client-form').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));
  const ws=a.master();assert.equal(ws.version,3);assert.equal(ws.pets[0].weightKg,null);assert.equal(ws.pets[0].sex,'undetermined');assert.equal(ws.owners[0].district,'Surco');assert.match(a.el('#profile-card').textContent,/Canino.*Mestizo/);assert.match(a.el('#profile-card').textContent,/Nacimiento estimado/);a.cleanup();
});
uiTest('Registro v3: editar nombre no cambia nacimiento y corregir edad sí',()=>{
  const r=fixture(),a=app({initial:r.workspace}),before=a.master().pets[0].ageReference;
  a.click('[data-profile-id]');a.click('#profile-edit');a.fill('[data-pet-key="name"]','Luna nueva');a.submit();assert.deepEqual(a.master().pets[0].ageReference,before);
  a.click('#profile-edit');const checkbox=a.el('[data-pet-key="correctAge"]');checkbox.checked=true;checkbox.dispatchEvent(new a.w.Event('change',{bubbles:true}));
  a.fill('[data-pet-key="ageYears"]','6');a.fill('[data-pet-key="ageMonths"]','0');a.submit();assert.notEqual(a.master().pets[0].ageReference.estimatedBirthDate,before.estimatedBirthDate);a.cleanup();
});
uiTest('Registro v3: observaciones conservadas entre módulos y detalle histórico',()=>{
  const r=fixture(),a=app({initial:r.workspace});a.selectFixture(r);a.selectService();a.fill('#attention-observations','Control\nSin incidencias');a.click('#nav-clients');a.click('#nav-quote');assert.equal(a.el('#attention-observations').value,'Control\nSin incidencias');
  a.click('.save-attention');assert.equal(a.master().attentions[0].observations,'Control\nSin incidencias');a.click('[data-history-id]');assert.match(a.el('#history-detail-body').textContent,/Surco/);assert.match(a.el('#history-detail-body').textContent,/Sin incidencias/);assert.match(a.el('#attention-date').textContent,/Lima/);a.click('#history-close-detail');a.click('#new-quote');assert.equal(a.el('#attention-observations').value,'');a.cleanup();
});
uiTest('Datos: JSON completo preserva todos los atributos y registro independiente retirado',async()=>{
 const r=fixture(),a=app({initial:r.workspace});a.click('#open-data');assert.equal(a.el('#data-dialog').hidden,false);assert.equal(a.el('#export-registry'),null);assert.equal(a.el('#import-registry'),null);a.click('#export-master');const file=await a.backup();assert.equal(file.version,3);assert.equal(file.owners[0].district,'Surco');assert.deepEqual(file.pets[0].ageReference,r.workspace.pets[0].ageReference);a.cleanup();
});
uiTest('Registro v3: editar solo al dueño no exige inventar datos del perro anterior',()=>{
  const r=fixture();for(const p of r.workspace.pets){p.breed='';p.sex=null;p.ageReference=null;p.registeredOn=null;}r.workspace.owners[0].district='';
  const a=app({initial:r.workspace});a.click('[data-profile-id]');a.click('#profile-edit');a.fill('[data-owner-key="district"]','Barranco');
  a.el('#client-form').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(a.el('#client-dialog').open,false);assert.equal(a.master().owners[0].district,'Barranco');assert.equal(a.master().pets[0].ageReference,null);a.cleanup();
});
uiTest('Registro v3: migración pendiente permite respaldo y reintento sin borrar v2',async()=>{
  const r=fixture(),old=JSON.stringify({...r.workspace,version:2}),data=new Map([[W.PREVIOUS_KEY,old]]),a=app({data,blocked:true});
  assert.equal(data.has(W.KEY),false);assert.equal(a.el('#storage-recovery').hidden,false);a.click('#open-data');a.click('#download-pending');const candidate=await a.backup();assert.equal(candidate.version,3);assert.equal(candidate.owners.length,1);a.block(false);a.click('#retry-save');assert.equal(a.master().version,3);assert.equal(data.get(W.PREVIOUS_KEY),old);a.cleanup();
});
const root = path.resolve(__dirname, '..');
const owner = { name: 'Ana Pérez', dni: '00123456', contact: '+51 999 123 456', email:'ana@example.com', district:'Surco' };
const pet = { name: 'Luna', weightKg: 12.5, size: null, coat: 'long',breed:'Mestizo',sex:'female',ageReference:require('../assets/records').makeAge(2,3,'2026-08-21') };
function fixture() { return W.saveClient(W.empty(), { owner, pets: [pet, { ...pet, name: 'Toby', weightKg: null, size: 'small' }] }); }
function app({ data = new Map(), blocked = false, initial = null } = {}) {
  if (initial) data.set(W.KEY, JSON.stringify(initial));
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'https://pet-doctor.test/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, errors = [], downloads = [], confirmations = []; let pdfCalls = 0, deny = false;
  Object.defineProperty(w, 'localStorage', { value: { getItem: key => data.get(key) ?? null, setItem(key, value) { if (blocked) throw Error('quota'); data.set(key, value); }, removeItem(key) { if(blocked)throw Error('blocked');data.delete(key); } } });
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
  w.confirm = message => { confirmations.push(message); return !deny; };
  w.addEventListener('error', event => { errors.push(event.error); event.preventDefault(); });
  w.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  w.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  w.URL.createObjectURL = blob => { downloads.push({ blob }); return 'blob:demo'; }; w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { downloads.at(-1).name = this.download; };
  w.PetDoctorPDF = { async createQuotePdf() { pdfCalls++; return new Uint8Array([37,80,68,70]); } };
  for (const file of ['auth','app','catalog','pricing','records','files','workspace','integration','registry-csv','registry-csv-view','attention-csv','clients','history','history-view','analytics-csv','application','quote','email-templates','customer-profile']) w.eval(fs.readFileSync(path.join(root, 'assets', file + '.js'), 'utf8'));
  const el = selector => w.document.querySelector(selector);
  function fill(selector, value, event = 'input') { const input = el(selector); assert.ok(input, selector); input.value = value; input.dispatchEvent(new w.Event(event, { bubbles: true })); }
  function click(selector) { const element = el(selector); assert.ok(element, selector); element.click(); }
  function submit() {
    // Los fixtures de alta completan los nuevos obligatorios; las pruebas v3 validan su ausencia por separado.
    for(const fieldset of w.document.querySelectorAll('[data-draft-index]'))if(fieldset.querySelector('[data-pet-key="name"]').value){
      for(const [key,value]of [['breed','Mestizo'],['sex','female'],['ageYears','2'],['ageMonths','3']]){const input=fieldset.querySelector('[data-pet-key="'+key+'"]');if(!input.disabled&&!input.value){input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));}}
    }
    el('#client-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  }
  function selectService() { const checkbox = el('[data-field="consulta.included"]'); checkbox.checked = true; checkbox.dispatchEvent(new w.Event('change', { bubbles: true })); }
  function fillOwner() { fill('[data-owner-key="name"]', owner.name); fill('[data-owner-key="dni"]', owner.dni); fill('[data-owner-key="contact"]', owner.contact); fill('[data-owner-key="email"]',owner.email);fill('[data-owner-key="district"]',owner.district); }
  function selectFixture(result = fixture()) { fill('#owner-select', result.ownerId, 'change'); fill('#pet-select', result.petId, 'change'); }
  function master() { return W.read(data.get(W.KEY)); }
  async function downloadText(index = downloads.length - 1) { const reader = new w.FileReader(); return await new Promise((resolve,reject) => { reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsText(downloads[index].blob); }); }
  async function backup(index = downloads.length - 1) { return JSON.parse(await downloadText(index)); }
  async function importFile(kind, value) {
    const input = el('#' + kind + '-file');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ size: JSON.stringify(value).length, text: async () => JSON.stringify(value) }] });
    input.dispatchEvent(new w.Event('change', { bubbles: true }));
    await new Promise(resolve => setImmediate(resolve));
  }
  function cleanup() { assert.deepEqual(errors, []); w.close(); }
  return { w, el, click, fill, fillOwner, submit, selectService, selectFixture, master, data, downloads, backup, downloadText, confirmations, importFile, cleanup, block(value) { blocked=value; }, deny(value) { deny=value; }, pdfCalls:()=>pdfCalls };
}

uiTest('PDF anónimo sin escrituras; atención deshabilitada aun con nombres manuales', async () => {
  const a=app(); a.selectService(); assert.equal(a.el('.save-attention').disabled,true);
  a.fill('[data-identity="name"]','Luna'); a.fill('[data-identity="ownerName"]','Ana');
  a.click('.download-quote'); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(a.pdfCalls(),1);assert.equal(a.data.size,0); assert.match(a.downloads[0].name,/\.pdf$/);
  assert.match(a.el('#summary').textContent,/Cambios sin guardar/); a.cleanup();
});

uiTest('Registrar cliente con varios perritos, selección automática y persistencia al recargar', () => {
  const a=app();a.click('#new-client');a.fillOwner();a.fill('[data-draft-index="0"] [data-pet-key="name"]','Luna');
  a.click('#add-draft-pet');a.fill('[data-draft-index="1"] [data-pet-key="name"]','Toby');a.submit();
  const master=a.master();assert.equal(master.owners.length,1);assert.equal(master.pets.length,2);assert.equal(master.owners[0].dni,'00123456');
  assert.equal(a.el('#owner-select').value,master.owners[0].id);assert.equal(a.el('#pet-select').value,master.pets[0].id);assert.equal(a.el('#client-dialog').open,false);
  assert.equal(a.w.document.activeElement.id,'new-client');
  const reloaded=app({data:a.data});assert.match(reloaded.el('#owner-select').textContent,/Ana Pérez/);assert.equal(reloaded.el('#owner-select').value,'');
  reloaded.cleanup();a.cleanup();
});

uiTest('Cancelar o Escape no guardan; error de campos conserva el formulario y permite corregir', () => {
  const a=app();a.click('#new-client');a.fillOwner();a.submit();
  assert.equal(a.data.size,0);assert.equal(a.el('#client-dialog').open,true);assert.match(a.el('#client-form-error').textContent,/nombre/);
  assert.equal(a.el('[data-owner-key="dni"]').value,'00123456');a.click('#cancel-client');assert.equal(a.data.size,0);
  a.click('#new-client');a.fillOwner();a.el('#client-dialog').dispatchEvent(new a.w.Event('cancel',{cancelable:true}));assert.equal(a.el('#client-dialog').open,false);assert.equal(a.data.size,0);a.cleanup();
});

uiTest('Registro fallido no aplica nada: respalda candidato y reintenta completo', async () => {
  const a=app({blocked:true});a.click('#new-client');a.fillOwner();a.fill('[data-pet-key="name"]','Luna');a.submit();
  assert.equal(a.data.size,0);assert.equal(a.el('#client-dialog').open,true);assert.equal(a.el('#owner-select').options.length,1);
  assert.match(a.el('#client-form-error').textContent,/No se pudo guardar/);assert.equal(a.el('[data-owner-key="dni"]').value,'00123456');
  a.click('#client-recovery-link');a.click('#download-pending');const backup=await a.backup();assert.equal(backup.owners.length,1);assert.equal(backup.pets.length,1);assert.match(a.downloads[0].name,/pendiente/);
  a.block(false);a.click('#retry-save');assert.equal(a.master().owners.length,1);assert.equal(a.el('#client-dialog').open,false);a.cleanup();
});

uiTest('Buscador no elige automáticamente; coincidencia por perrito selecciona dueño y perrito', () => {
  const result=fixture(),a=app({initial:result.workspace});a.fill('#client-search','lúna');
  assert.equal(a.el('#owner-select').value,'');assert.equal(a.el('#pet-select').value,'');
  assert.match(a.el('#client-results').textContent,/Ana Pérez/);a.click('#client-results button');
  assert.equal(a.el('#owner-select').value,result.ownerId);assert.equal(a.el('#pet-select').value,result.petId);
  a.fill('#client-search','999123456');assert.match(a.el('#client-results').textContent,/00123456/);a.cleanup();
});

uiTest('Agregar perrito al cliente actual y editar su registro sin duplicar dueño', () => {
  const result=fixture(),a=app({initial:result.workspace});a.selectFixture(result);a.click('#add-pet');
  assert.equal(a.el('[data-owner-key]'),null);a.fill('[data-pet-key="name"]','Max');a.submit();
  assert.equal(a.master().owners.length,1);assert.equal(a.master().pets.length,3);assert.equal(a.el('#pet-select').selectedOptions[0].textContent.startsWith('Max'),true);
  a.click('#edit-client');a.fill('[data-owner-key="name"]','Ana Editada');a.fill('[data-draft-index="0"] [data-pet-key="name"]','Luna Editada');a.submit();
  assert.equal(a.master().owners[0].name,'Ana Editada');assert.equal(a.master().pets[0].id,result.petId);assert.equal(a.master().pets[0].name,'Luna Editada');a.cleanup();
});

uiTest('Atención guardada sin PDF, actualizable, con identidad bloqueada y respaldo íntegro', async () => {
  const result=fixture(),a=app({initial:result.workspace});a.selectFixture(result);a.selectService();
  assert.equal(a.el('.save-attention').disabled,false);a.click('.save-attention');a.click('.save-attention');
  assert.equal(a.pdfCalls(),0);assert.equal(a.master().attentions.length,1);assert.equal(a.master().attentions[0].status,'realizada');
  assert.equal(a.el('#owner-select').disabled,true);assert.equal(a.el('#pet-select').disabled,true);assert.match(a.el('#summary').textContent,/Atención realizada/);
  const first=a.master().attentions[0];a.click('#edit-client');a.fill('[data-owner-key="name"]','Ana Nueva');a.submit();
  assert.equal(a.master().attentions[0].ownerSnapshot.name,owner.name);assert.equal(a.master().attentions[0].performedAt,first.performedAt);
  a.click('#export-master');assert.deepEqual(W.read(JSON.stringify(await a.backup())),a.master());
  a.click('#new-quote');assert.equal(a.el('#owner-select').disabled,false);assert.equal(a.el('#owner-select').value,'');a.cleanup();
});

uiTest('Cambiar cliente limpia perrito; cotizar sin registro conserva los servicios', () => {
  const result=fixture(),other=W.saveClient(result.workspace,{owner:{...owner,dni:'87654321',name:'Luis'},pets:[pet]});
  const a=app({initial:other.workspace});a.selectFixture(result);a.selectService();a.fill('#owner-select',other.ownerId,'change');
  assert.equal(a.el('#pet-select').value,'');assert.equal(a.el('.save-attention').disabled,true);assert.equal(a.el('.download-quote').disabled,false);
  a.fill('#pet-select',other.petId,'change');a.click('#anonymous-quote');assert.equal(a.el('#owner-select').value,'');assert.equal(a.el('.download-quote').disabled,false);assert.equal(a.el('.save-attention').disabled,true);a.cleanup();
});

uiTest('Atención con fallo de cuota no se anuncia guardada y conserva cambios para reintentar', async () => {
  const result=fixture(),a=app({initial:result.workspace,blocked:true});a.selectFixture(result);a.selectService();a.click('.save-attention');
  assert.equal(a.master().attentions.length,0);assert.match(a.el('#file-message').textContent,/No se pudo guardar/);assert.match(a.el('#summary').textContent,/Cambios sin guardar/);
  a.click('#download-pending');assert.equal((await a.backup()).attentions.length,1);a.block(false);a.click('#retry-save');assert.equal(a.master().attentions.length,1);a.cleanup();
});

uiTest('Editar después de un fallo invalida el guardado pendiente anterior', () => {
  const result=fixture(),a=app({initial:result.workspace,blocked:true});a.selectFixture(result);a.selectService();a.click('.save-attention');
  const report=a.el('[data-field="consulta.report"]');report.checked=true;report.dispatchEvent(new a.w.Event('change',{bubbles:true}));
  assert.equal(a.el('#storage-recovery').hidden,true);a.block(false);a.click('#retry-save');assert.equal(a.master().attentions.length,0);
  a.click('.save-attention');assert.equal(a.master().attentions[0].quote.pricing.total,8850);a.cleanup();
});

uiTest('Peso y rango del registro son opcionales, excluyentes y los cambios del cotizador no los reescriben', () => {
  const a=app();a.click('#new-client');a.fillOwner();a.fill('[data-pet-key="name"]','Luna');
  a.fill('[data-pet-key="sizeMode"]','weight','change');a.submit();assert.equal(a.el('#client-dialog').open,true);assert.match(a.el('#client-form-error').textContent,/peso/);
  a.fill('[data-pet-key="weightKg"]','12.5');a.submit();const registered=a.master().pets[0];assert.equal(registered.weightKg,12.5);assert.equal(registered.size,null);
  a.click('[data-tab="grooming"]');a.fill('#weight-input','30');assert.equal(a.master().pets[0].weightKg,12.5);a.cleanup();
});

uiTest('Datos: JSON completo requiere confirmación y rechaza archivos inválidos sin pérdida',async()=>{
 const r=fixture(),a=app({initial:r.workspace}),before=a.data.get(W.KEY);a.deny(true);await a.importFile('master',W.empty());assert.equal(a.data.get(W.KEY),before);a.deny(false);await a.importFile('master',{...W.empty(),pets:[{id:'x',ownerId:'missing',name:'X'}]});assert.equal(a.data.get(W.KEY),before);await a.importFile('master',W.empty());assert.equal(a.master().owners.length,0);a.cleanup();
});

function historyFixture(count=1) {
  const result=fixture(),state=require('../assets/catalog.js').defaults();state.selections.consulta.included=true;state.pet.ownerId=result.ownerId;state.pet.petId=result.petId;
  const workspace=W.saveAttention(result.workspace,state,{id:'history-000',createdAt:'2026-10-30T12:00:00Z'});
  const source=workspace.attentions[0];workspace.attentions=[];
  for(let i=0;i<count;i++){const entry=JSON.parse(JSON.stringify(source));entry.id='history-'+String(i).padStart(3,'0');entry.quote.id=entry.id;entry.performedAt='2026-10-30T'+(12+Math.floor(i/60)).toString().padStart(2,'0')+':'+(i%60).toString().padStart(2,'0')+':00Z';workspace.attentions.push(entry);}
  return {...result,workspace};
}

uiTest('Historial cerrado al inicio, independiente del cotizador y con detalle de solo consulta',()=>{
  const result=historyFixture(),a=app({initial:result.workspace});
  assert.equal(a.el('#attention-history').open,false);assert.match(a.el('#history-count').textContent,/1/);assert.equal(a.el('#history-rows').rows.length,1);
  a.el('#attention-history').open=true;a.selectService();const before=a.data.get(W.KEY),summary=a.el('#summary').innerHTML;
  const button=a.el('[data-history-id]');button.focus();a.click('[data-history-id]');assert.equal(a.el('#history-detail').open,true);assert.match(a.el('#history-detail-body').textContent,/history-000/);assert.match(a.el('#history-detail-body').textContent,/00123456/);
  assert.equal(a.el('#history-detail-body input'),null);assert.equal(a.w.document.activeElement.id,'history-close-detail');
  a.el('#history-detail').dispatchEvent(new a.w.Event('cancel',{cancelable:true}));assert.equal(a.el('#history-detail').open,false);assert.equal(a.w.document.activeElement.dataset.historyId,'history-000');
  a.fill('#history-search','lúna');assert.equal(a.el('#history-rows').rows.length,1);assert.equal(a.data.get(W.KEY),before);assert.equal(a.el('#summary').innerHTML,summary);a.cleanup();
});

uiTest('Paginación, suma y CSV abarcan todos los resultados y los filtros vuelven a primera página',async()=>{
  const result=historyFixture(45),a=app({initial:result.workspace});a.el('#attention-history').open=true;
  assert.equal(a.el('#history-rows').rows.length,20);assert.match(a.el('#history-page').textContent,/1 de 3/);assert.match(a.el('#history-results-status').textContent,/45 atenciones/);
  a.click('#history-next');assert.match(a.el('#history-page').textContent,/2 de 3/);a.click('#history-next');assert.equal(a.el('#history-rows').rows.length,5);
  const before=a.data.get(W.KEY);a.click('#history-csv');const csv=await a.downloadText();assert.equal(csv.trim().split('\r\n').length,46);assert.match(csv,/history-044/);assert.match(csv,/history-000/);assert.match(a.downloads.at(-1).name,/^pet-doctor-atenciones-\d{4}-\d{2}-\d{2}\.csv$/);assert.equal(a.data.get(W.KEY),before);
  a.fill('#history-search','history-001');assert.match(a.el('#history-page').textContent,/1 de 1/);assert.equal(a.el('#history-rows').rows.length,1);a.click('#history-clear');assert.equal(a.el('#history-rows').rows.length,20);a.cleanup();
});

uiTest('Filtros de historial no cambian cliente ni perrito del cotizador; rango inválido bloquea CSV',()=>{
  const result=historyFixture(),a=app({initial:result.workspace});a.selectFixture(result);a.selectService();
  const ownerId=a.el('#owner-select').value,petId=a.el('#pet-select').value;
  a.fill('#history-owner','id:'+result.ownerId,'change');assert.equal(a.el('#history-rows').rows.length,1);
  a.fill('#history-pet','id:'+result.petId,'change');a.fill('#history-from','2026-10-31','change');a.fill('#history-to','2026-10-30','change');assert.equal(a.el('#history-error').hidden,false);assert.equal(a.el('#history-csv').disabled,true);
  a.click('#history-clear');assert.equal(a.el('#history-csv').disabled,false);assert.equal(a.el('#owner-select').value,ownerId);assert.equal(a.el('#pet-select').value,petId);a.cleanup();
});

uiTest('Solo guardados exitosos aparecen; actualizar conserva fecha sin duplicar y respeta filtros/despliegue',()=>{
  const result=fixture(),a=app({initial:result.workspace,blocked:true});a.el('#attention-history').open=true;a.fill('#history-search','Luna');a.selectFixture(result);a.selectService();
  a.click('.save-attention');assert.equal(a.el('#history-rows').rows.length,0);assert.equal(a.el('#history-csv').disabled,true);
  a.block(false);a.click('#retry-save');assert.equal(a.el('#history-rows').rows.length,1);const date=a.master().attentions[0].performedAt;
  const report=a.el('[data-field="consulta.report"]');report.checked=true;report.dispatchEvent(new a.w.Event('change',{bubbles:true}));a.click('.save-attention');
  assert.equal(a.master().attentions[0].performedAt,date);assert.equal(a.el('#history-rows').rows.length,1);assert.equal(a.el('#attention-history').open,true);assert.equal(a.el('#history-search').value,'Luna');assert.match(a.el('#history-results-status').textContent,/88/);a.cleanup();
});

uiTest('Historial vacío y registros sin vínculo; cargar una base refresca preservando filtros',async()=>{
  const a=app();assert.equal(a.el('#history-empty').hidden,false);assert.match(a.el('#history-empty').textContent,/Todavía no hay/);assert.equal(a.el('#history-csv').disabled,true);
  const result=historyFixture(),legacy=result.workspace.attentions[0];delete legacy.registration;delete legacy.petSnapshot;delete legacy.ownerSnapshot;legacy.quote.state.pet.ownerId=null;legacy.quote.state.pet.petId=null;
  a.el('#attention-history').open=true;a.fill('#history-search','Luna');await a.importFile('master',result.workspace);
  assert.equal(a.el('#attention-history').open,true);assert.equal(a.el('#history-search').value,'Luna');assert.match(a.el('#history-rows').textContent,/Sin vínculo registrado/);assert.match(a.el('#history-rows').textContent,/No registrado/);
  a.fill('#history-owner','unlinked','change');assert.equal(a.el('#history-rows').rows.length,1);a.fill('#history-search','No existe');assert.equal(a.el('#history-csv').disabled,true);assert.match(a.el('#history-empty').textContent,/No hay atenciones/);a.cleanup();
});

uiTest('El detalle admite desgloses antiguos incompletos y escapa contenido de texto',()=>{
  const result=historyFixture();result.workspace.attentions[0].quote.pricing.services=[{name:'<img src=x onerror=alert(1)>',lines:[{label:'Importe no conservado'}]}];
  const a=app({initial:result.workspace});a.click('[data-history-id]');assert.equal(a.el('#history-detail-body img'),null);assert.match(a.el('#history-detail-body').textContent,/Importe no conservado/);assert.match(a.el('#history-detail-body').textContent,/No registrado/);a.cleanup();
});
uiTest('Inicio en Clientes, menú independiente y navegación conserva cotización y filtros',()=>{
  const result=fixture(),a=app({initial:result.workspace});
  a.fill('#username','admin');a.fill('#password','PetDoctor123');a.el('#login-form').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(a.el('#clients-module').hidden,false);assert.equal(a.el('#quote-module').hidden,true);assert.equal(a.el('#nav-clients').getAttribute('aria-current'),'page');assert.equal(a.w.document.activeElement.id,'clients-title');
  a.click('#nav-quote');a.selectFixture(result);a.selectService();a.el('#attention-history').open=true;a.fill('#history-search','Luna');
  const summary=a.el('#summary').innerHTML;a.click('#nav-clients');a.click('[data-profile-id]');a.click('#profile-edit');a.fill('[data-owner-key="email"]','nuevo@example.com');a.submit();
  a.click('#nav-quote');assert.equal(a.el('#owner-select').value,result.ownerId);assert.equal(a.el('#pet-select').value,result.petId);assert.equal(a.el('#summary').innerHTML,summary);assert.equal(a.el('#attention-history').open,true);assert.equal(a.el('#history-search').value,'Luna');
  assert.equal(a.el('#home-content #export-master'),null);assert.equal(a.el('#home-content #master-file'),null);a.cleanup();
});

uiTest('Ficha y selección del cotizador son independientes y atenciones se relacionan por ID',()=>{
  const result=historyFixture(),other=W.saveClient(result.workspace,{owner:{...owner,dni:'87654321'},pets:[pet]}),legacy=JSON.parse(JSON.stringify(other.workspace.attentions[0]));
  legacy.id='same-name-legacy';legacy.quote.id=legacy.id;delete legacy.registration;delete legacy.petSnapshot;legacy.quote.state.pet.ownerId=null;legacy.quote.state.pet.petId=null;other.workspace.attentions.push(legacy);
  const a=app({initial:other.workspace});a.selectFixture(result);a.click('[data-profile-id="'+other.ownerId+'"]');
  assert.match(a.el('.profile-stats').textContent,/0Atenciones/);assert.equal(a.el('#owner-select').value,result.ownerId);
  a.click('#profile-back');a.click('[data-profile-id="'+result.ownerId+'"]');assert.match(a.el('.profile-stats').textContent,/1Atenciones/);assert.equal(a.el('#profile-history-rows').rows.length,1);assert.equal(a.w.document.querySelectorAll('#client-dialog').length,1);a.cleanup();
});

uiTest('Cliente anterior sin correo permite atención y agregar perrito; exige correo al editar',()=>{
  const result=fixture();delete result.workspace.owners[0].email;const a=app({initial:result.workspace});a.click('[data-profile-id]');
  assert.match(a.el('.profile-data').textContent,/Correo pendiente/);assert.equal(a.el('#profile-email').disabled,true);a.click('#profile-add-pet');assert.equal(a.el('[data-owner-key="email"]'),null);a.fill('[data-pet-key="name"]','Max');a.submit();assert.equal(a.master().pets.length,3);
  a.click('#profile-edit');a.fill('[data-owner-key="name"]','Nombre editado');a.submit();assert.match(a.el('#client-form-error').textContent,/correo/);a.click('#cancel-client');
  a.click('#nav-quote');a.selectFixture(result);a.selectService();assert.equal(a.el('.save-attention').disabled,false);a.click('.save-attention');assert.equal(a.master().attentions.length,1);a.cleanup();
});

uiTest('Solo existe una URL y conserva la conexión nueva al retirar la antigua',async()=>{
  const I=require('../assets/integration.js'),result=fixture(),data=new Map([['pet-doctor.integration-test.v1',JSON.stringify({url:'https://old.example.com/webhook'})],[I.CALL_CONFIG_KEY,JSON.stringify({url:'https://new.example.com/webhook'})]]),a=app({data,initial:result.workspace});
  a.click('#open-data');assert.equal(a.el('#integration-url'),null);assert.equal(a.el('#integration-config'),null);assert.equal(a.el('#calls-url').value,'https://new.example.com/webhook');assert.equal(a.data.has('pet-doctor.integration-test.v1'),false);assert.equal(a.master().owners.length,1);
  a.click('#export-master');const backup=await a.backup();assert.equal(JSON.stringify(backup).includes('example.com/webhook'),false);a.cleanup();
});

function configureCalls(a){
  a.click('#open-data');a.fill('#calls-url','https://n8n.example.com/webhook-test/calls');a.fill('#calls-key','clave-solo-de-test');a.el('#calls-config').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));a.click('#close-data');
}

uiTest('Llamada usa el registro, revisión y confirmación; no permite destino alternativo',async()=>{
  const result=fixture(),a=app({initial:result.workspace});configureCalls(a);a.click('[data-profile-id]');
  const calls=[];a.w.fetch=async(url,options)=>{const payload=JSON.parse(options.body);calls.push(payload);return {status:202,json:async()=>({ok:true,status:'llamada_iniciada',requestId:payload.requestId,clientId:payload.clientId,callSid:'CA0123456789abcdef0123456789abcdef',providerStatus:'queued'})};};
  a.click('#profile-phone');assert.equal(a.el('#communication-phone').readOnly,true);assert.equal(a.el('#communication-phone').value,'+51999123456');assert.equal(a.el('#communication-message').value,'');assert.equal(a.el('#call-counter').textContent,'0/120');
  a.fill('#communication-message','Hola, Ana.');a.el('#communication-form').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(calls.length,0);assert.equal(a.el('#call-review').hidden,false);assert.match(a.el('#call-review-phone').textContent,/51999123456/);
  a.click('#call-confirm');await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.length,1);assert.equal(calls[0].action,'llamada');assert.equal(calls[0].email,undefined);assert.match(a.el('#communication-result').textContent,/Llamada iniciada/);assert.equal(a.master().owners[0].contact,owner.contact);a.cleanup();
});

uiTest('Correo sin conexión está bloqueado y no dispara peticiones',()=>{
  const a=app({initial:fixture().workspace});let requests=0;a.w.fetch=async()=>{requests++;};a.click('[data-profile-id]');assert.equal(a.el('#profile-email').disabled,true);assert.match(a.el('#profile-email').textContent,/Enviar correo/);a.click('#profile-email');assert.equal(requests,0);assert.equal(a.el('#communication-dialog').open,false);a.cleanup();
});

uiTest('Menú móvil admite cierre con Escape y no mezcla elementos ni IDs de módulos',()=>{
  const a=app();a.click('#menu-toggle');assert.equal(a.el('#menu-toggle').getAttribute('aria-expanded'),'true');a.el('#app-nav').dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(a.el('#menu-toggle').getAttribute('aria-expanded'),'false');assert.equal(a.w.document.activeElement.id,'menu-toggle');
  const ids=[...a.w.document.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length);a.cleanup();
});
uiTest('Contador Unicode y límites de 120 caracteres no truncan texto ni generan llamadas',()=>{
  const a=app({initial:fixture().workspace});configureCalls(a);a.click('[data-profile-id]');a.click('#profile-phone');
  a.fill('#communication-message','😀'.repeat(120));assert.equal(a.el('#call-counter').textContent,'120/120');assert.equal(a.el('#communication-run').disabled,false);
  a.fill('#communication-message','😀'.repeat(121));assert.equal(a.el('#communication-run').disabled,true);assert.equal(a.el('#communication-message').value,'😀'.repeat(121));a.el('#communication-form').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));assert.match(a.el('#communication-result').textContent,/120/);
  a.fill('#communication-message',' e\u0301 ');assert.equal(a.el('#call-counter').textContent,'1/120');a.cleanup();
});

uiTest('Número nacional, URL o clave ausentes mantienen llamadas deshabilitadas',()=>{
  const result=fixture(),a=app({initial:result.workspace});a.click('[data-profile-id]');assert.equal(a.el('#profile-phone').disabled,true);configureCalls(a);assert.equal(a.el('#profile-phone').disabled,false);
  a.click('#open-data');a.click('#forget-calls-key');a.click('#close-data');assert.equal(a.el('#profile-phone').disabled,true);configureCalls(a);
  a.click('#profile-edit');a.fill('[data-owner-key="contact"]','999123456');a.submit();assert.equal(a.el('#profile-phone').disabled,true);assert.match(a.el('.profile-communications').textContent,/prefijo internacional/);a.cleanup();
});

uiTest('Si cambia el teléfono tras revisar, no se invoca n8n',()=>{
  const a=app({initial:fixture().workspace});configureCalls(a);a.click('[data-profile-id]');a.click('#profile-phone');a.fill('#communication-message','Hola');a.el('#communication-form').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));
  const controllerApp=a.w.PetDoctorApplication,current=controllerApp.getWorkspace(),changed=a.w.PetDoctorWorkspace.saveClient(current,{owner:{...current.owners[0],contact:'+51999888777'},pets:[]});controllerApp.commit(changed.workspace,()=>{},'test');let count=0;a.w.fetch=async()=>{count++;};a.click('#call-confirm');assert.equal(count,0);assert.match(a.el('#communication-result').textContent,/teléfono cambió/);a.cleanup();
});

uiTest('Durante la llamada se bloquean dobles clics, cierre, Escape y cambio de módulo',async()=>{
  const a=app({initial:fixture().workspace});configureCalls(a);a.click('[data-profile-id]');let finish,count=0;a.w.fetch=(url,options)=>{count++;const p=JSON.parse(options.body);return new Promise(resolve=>{finish=()=>resolve({status:202,json:async()=>({ok:true,status:'llamada_iniciada',clientId:p.clientId,requestId:p.requestId,callSid:'CA0123456789abcdef0123456789abcdef',providerStatus:'queued'})});});};
  a.click('#profile-phone');a.fill('#communication-message','Hola');a.el('#communication-form').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));a.click('#call-confirm');a.click('#call-confirm');assert.equal(count,1);assert.equal(a.el('#communication-close').disabled,true);a.el('#communication-dialog').dispatchEvent(new a.w.Event('cancel',{cancelable:true}));assert.equal(a.el('#communication-dialog').open,true);
  a.w.PetDoctorApplication.navigate('quote');assert.equal(a.el('#quote-module').hidden,true);finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(a.el('#communication-close').disabled,false);assert.equal(a.el('#call-new').hidden,false);a.click('#call-confirm');assert.equal(count,1);a.cleanup();
});

uiTest('Clave solo en memoria: no aparece en configuración persistida, respaldo ni después de logout',async()=>{
  const a=app({initial:fixture().workspace});configureCalls(a);assert.equal(a.w.PetDoctorApplication.getCallKey(),'clave-solo-de-test');assert.equal([...a.data.values()].join('').includes('clave-solo-de-test'),false);assert.equal(a.el('#calls-key').value,'');
  a.click('#export-master');assert.equal(JSON.stringify(await a.backup()).includes('clave-solo-de-test'),false);assert.equal(a.master().communications,undefined);
  a.w.PetDoctorApplication.sessionChanged(false);assert.equal(a.w.PetDoctorApplication.getCallKey(),'');const again=app({data:a.data});assert.equal(again.w.PetDoctorApplication.getCallKey(),'');again.cleanup();a.cleanup();
});

uiTest('Respuesta no confirmada muestra resultado desconocido y exige preparar otra llamada',async()=>{
  const a=app({initial:fixture().workspace});configureCalls(a);a.click('[data-profile-id]');a.w.fetch=async()=>{throw new TypeError('Failed to fetch');};
  a.click('#profile-phone');a.fill('#communication-message','Hola');a.el('#communication-form').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));a.click('#call-confirm');await new Promise(resolve=>setImmediate(resolve));assert.match(a.el('#communication-result').textContent,/Resultado desconocido/);assert.equal(a.el('#call-review').hidden,true);assert.equal(a.el('#call-new').hidden,false);a.click('#call-new');assert.equal(a.el('#communication-message').value,'');a.cleanup();
});


function reviewEmail(a,message='Hola, Ana.',subject='Seguimiento'){
  a.fill('#communication-subject',subject);a.fill('#communication-message',message);
  a.el('#communication-form').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));
}
uiTest('Plantillas de correo: tres opciones, perro vinculado, fecha y texto editable sin enviar',()=>{
  const f=fixture(),a=app({initial:f.workspace});configureCalls(a);a.click('[data-profile-id]');a.click('#profile-email');let calls=0;a.w.fetch=async()=>{calls++;};
  assert.equal(a.el('#email-template').options.length,4);a.fill('#email-template','appointment','change');a.click('#email-template-apply');assert.match(a.el('#email-template-status').textContent,/perrito/);
  a.fill('#email-template-pet',f.petId,'change');a.fill('#email-template-date','2099-11-05');a.fill('#email-template-time','10:30');a.click('#email-template-apply');assert.match(a.el('#communication-message').value,/05\/11\/2099 a las 10:30/);assert.match(a.el('#communication-message').value,/Luna/);
  a.fill('#communication-message','Texto editado');a.el('#communication-form').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(a.el('#call-review-message').textContent,'Texto editado');assert.equal(a.el('#email-template').disabled,true);assert.equal(calls,0);a.click('#call-edit');assert.equal(a.el('#email-template').disabled,false);a.click('#communication-close');a.click('#profile-phone');assert.equal(a.el('#email-templates').hidden,true);a.cleanup();
});
uiTest('Plantillas: seguimiento sin fecha, revisión inválida tras cambiar datos y reinicio sin persistencia',()=>{
  const f=fixture(),a=app({initial:f.workspace});configureCalls(a);a.click('[data-profile-id]');const before=JSON.stringify(a.master());a.click('#profile-email');a.fill('#email-template','followup','change');a.fill('#email-template-pet',f.petId,'change');a.click('#email-template-apply');assert.equal(a.el('#email-template-schedule').hidden,true);assert.equal(a.el('#communication-run').disabled,false);
  a.fill('#email-template-pet','', 'change');a.el('#communication-form').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));assert.match(a.el('#communication-result').textContent,/Aplícala/);assert.equal(a.el('#call-review').hidden,true);
  a.click('#communication-close');a.click('#profile-email');assert.equal(a.el('#email-template').value,'');assert.equal(a.el('#communication-message').value,'');assert.equal(JSON.stringify(a.master()),before);a.cleanup();
});
uiTest('Correo de ficha revisa, confirma, correlaciona y no persiste mensaje, clave ni resultado',async()=>{
  const f=fixture(),a=app({initial:f.workspace});configureCalls(a);a.click('[data-profile-id]');const before=JSON.stringify(a.master());
  let count=0,payload;a.w.fetch=async(u,o)=>{count++;payload=JSON.parse(o.body);return {status:200,json:async()=>({ok:true,status:'correo_enviado',requestId:payload.requestId,clientId:payload.clientId,messageId:'gmail-id'})};};
  assert.equal(a.el('#profile-email').disabled,false);a.click('#profile-email');assert.equal(a.el('#communication-email').readOnly,true);assert.equal(a.el('#communication-email').value,owner.email);assert.equal(a.el('#communication-phone-label').hidden,true);assert.equal(a.el('#call-counter').textContent,'0/360');assert.equal(a.w.document.activeElement.id,'email-template');
  reviewEmail(a,'Hola <b>Ana</b>\nSegunda línea');assert.equal(count,0);assert.equal(a.el('#call-review').hidden,false);assert.equal(a.el('#call-review-message b'),null);assert.equal(a.el('#email-review-subject').textContent,'Seguimiento');
  a.click('#call-edit');assert.equal(a.el('#communication-message').value,'Hola <b>Ana</b>\nSegunda línea');reviewEmail(a);a.click('#call-confirm');await new Promise(r=>setImmediate(r));
  assert.equal(count,1);assert.deepEqual(Object.keys(payload),['action','email','subject','message','clientId','requestId']);assert.equal(payload.action,'correo');assert.equal(payload.email,owner.email);assert.match(a.el('#communication-result').textContent,/Correo enviado/);assert.match(a.el('#communication-result').textContent,/gmail-id/);assert.equal(JSON.stringify(a.master()),before);
  a.click('#export-master');const backup=JSON.stringify(await a.backup());assert.equal(backup.includes('gmail-id'),false);assert.equal(backup.includes('clave-solo-de-test'),false);
  a.click('#communication-close');assert.equal(a.w.document.activeElement.id,'profile-email');a.cleanup();
});
uiTest('Correo: contador 360, asunto 200, errores conservan campos y cancelar no escribe',()=>{
  const a=app({initial:fixture().workspace});configureCalls(a);a.click('[data-profile-id]');const before=[...a.data.entries()];a.click('#profile-email');
  a.fill('#communication-subject','😀'.repeat(200));a.fill('#communication-message','😀'.repeat(360));assert.equal(a.el('#call-counter').textContent,'360/360');assert.equal(a.el('#communication-run').disabled,false);
  a.fill('#communication-message','😀'.repeat(361));assert.equal(a.el('#communication-run').disabled,true);assert.equal(a.el('#communication-message').value,'😀'.repeat(361));a.el('#communication-form').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));assert.match(a.el('#communication-result').textContent,/360/);
  a.fill('#communication-message',' e\u0301 ');assert.equal(a.el('#call-counter').textContent,'1/360');a.fill('#communication-subject','x'.repeat(201));assert.equal(a.el('#communication-run').disabled,true);
  a.el('#communication-dialog').dispatchEvent(new a.w.Event('cancel',{cancelable:true}));assert.equal(a.el('#communication-dialog').open,false);assert.deepEqual([...a.data.entries()],before);assert.equal(a.w.document.activeElement.id,'profile-email');
  a.click('#profile-phone');assert.equal(a.el('#communication-subject-label').hidden,true);assert.equal(a.el('#call-counter').textContent,'0/120');a.cleanup();
});
uiTest('Correo sin dirección o clave permanece bloqueado; la configuración existente es compartida',()=>{
  const f=fixture();f.workspace.owners[0].email='';const a=app({initial:f.workspace});configureCalls(a);a.click('[data-profile-id]');assert.equal(a.el('#profile-email').disabled,true);assert.match(a.el('.profile-communications').textContent,/dirección de correo/);
  a.click('#profile-edit');a.fill('[data-owner-key="email"]','ana@example.com');a.submit();assert.equal(a.el('#profile-email').disabled,false);
  a.click('#open-data');a.click('#forget-calls-key');a.click('#close-data');assert.equal(a.el('#profile-email').disabled,true);assert.equal(a.el('#profile-phone').disabled,true);a.cleanup();
});
uiTest('Cambio de correo o desaparición del cliente tras revisar impide enviar',()=>{
  for(const remove of [false,true]){
    const a=app({initial:fixture().workspace});configureCalls(a);a.click('[data-profile-id]');a.click('#profile-email');reviewEmail(a);let count=0;a.w.fetch=async()=>{count++;};
    const controller=a.w.PetDoctorApplication,current=controller.getWorkspace();
    if(remove){current.owners.splice(0);a.click('#call-confirm');}
    else{const changed=a.w.PetDoctorWorkspace.saveClient(current,{owner:{...current.owners[0],email:'otra@example.com'},pets:[]});controller.commit(changed.workspace,()=>{},'test');a.click('#call-confirm');}
    assert.equal(count,0);assert.match(a.el('#communication-result').textContent,/correo cambió/);a.cleanup();
  }
});
uiTest('Envío de correo bloquea cierre, navegación y doble clic; otro intento necesita nueva revisión',async()=>{
  const a=app({initial:fixture().workspace});configureCalls(a);a.click('[data-profile-id]');let finish,count=0;
  a.w.fetch=(u,o)=>{count++;const p=JSON.parse(o.body);return new Promise(resolve=>{finish=()=>resolve({status:200,json:async()=>({ok:true,status:'correo_enviado',clientId:p.clientId,requestId:p.requestId,messageId:'id'})});});};
  a.click('#profile-email');reviewEmail(a);a.click('#call-confirm');a.click('#call-confirm');assert.equal(count,1);assert.equal(a.el('#communication-close').disabled,true);a.el('#communication-dialog').dispatchEvent(new a.w.Event('cancel',{cancelable:true}));assert.equal(a.el('#communication-dialog').open,true);a.w.PetDoctorApplication.navigate('quote');assert.equal(a.el('#quote-module').hidden,true);
  finish();await new Promise(r=>setImmediate(r));a.click('#call-confirm');assert.equal(count,1);a.click('#call-new');assert.equal(a.el('#communication-message').value,'');assert.equal(a.el('#communication-subject').value,'');assert.equal(a.el('#communication-run').disabled,true);a.cleanup();
});
uiTest('Correo rechaza destinatario desde n8n o muestra resultado desconocido sin reintentar',async()=>{
  for(const status of [403,502]){
    const a=app({initial:fixture().workspace});configureCalls(a);a.click('[data-profile-id]');const before=JSON.stringify(a.master());let count=0;
    a.w.fetch=async(u,o)=>{count++;const p=JSON.parse(o.body);return {status,json:async()=>({ok:false,status:status===403?'destino_no_autorizado':'resultado_desconocido',clientId:p.clientId,requestId:p.requestId,errors:['Detalle']})};};
    a.click('#profile-email');reviewEmail(a);a.click('#call-confirm');await new Promise(r=>setImmediate(r));assert.equal(count,1);assert.match(a.el('#communication-result').textContent,status===403?/no están autorizados/:/Resultado desconocido/);assert.equal(a.el('#communication-close').disabled,false);assert.equal(a.el('#call-new').hidden,false);assert.equal(JSON.stringify(a.master()),before);a.cleanup();
  }
});
uiTest('Correo y navegación conservan servicios, selección y filtros de la cotización',async()=>{
  const f=fixture(),a=app({initial:f.workspace});a.selectFixture(f);a.selectService();a.fill('#history-search','Luna');const service=a.el('[data-field="consulta.included"]');configureCalls(a);a.click('[data-profile-id]');a.click('#profile-email');reviewEmail(a);a.click('#communication-close');a.w.PetDoctorApplication.navigate('quote');assert.equal(service.checked,true);assert.equal(a.el('#owner-select').value,f.ownerId);assert.equal(a.el('#pet-select').value,f.petId);assert.equal(a.el('#history-search').value,'Luna');a.cleanup();
});


async function loadCsv(a,source,name='clientes.csv',options={}){
  const input=a.el('#csv-file');Object.defineProperty(input,'files',{configurable:true,value:[{name,size:options.size??Buffer.byteLength(source),text:options.text||async function(){return source;}}]});
  input.dispatchEvent(new a.w.Event('change',{bubbles:true}));await new Promise(resolve=>setImmediate(resolve));
}
uiTest('CSV: revisar y cancelar no escriben; confirmar importa 10/15 y persiste al recargar',async()=>{
  const C=require('../assets/registry-csv.js'),a=app();a.click('#open-data');await loadCsv(a,C.example(),'ejemplo.csv');
  assert.equal(a.data.size,0);assert.equal(a.el('#csv-confirm').disabled,false);assert.match(a.el('#csv-counts').textContent,/10 clientes nuevos/);assert.equal(a.el('#csv-rows').rows.length,15);assert.equal(a.w.document.activeElement.id,'csv-review-title');
  a.click('#csv-cancel');assert.equal(a.data.size,0);assert.equal(a.el('#csv-review').hidden,true);assert.equal(a.w.document.activeElement.id,'csv-open');
  await loadCsv(a,C.example());a.click('#csv-confirm');assert.equal(a.master().owners.length,10);assert.equal(a.master().pets.length,15);assert.match(a.el('#csv-message').textContent,/guardada correctamente/);assert.equal(a.el('#csv-review').hidden,true);
  const reload=app({data:a.data});assert.equal(reload.master().pets.length,15);reload.cleanup();a.cleanup();
});
uiTest('CSV inválido bloquea toda la carga; muestra fila/columna sin interpretar HTML',async()=>{
  const C=require('../assets/registry-csv.js'),a=app(),rows=C.exampleRows();rows[1][1]='<img src=x onerror=bad>';rows[1][2]='123';
  a.click('#open-data');await loadCsv(a,C.serialize(rows));assert.equal(a.el('#csv-confirm').disabled,true);assert.match(a.el('#csv-issues').textContent,/Fila 2.*cliente_dni/);assert.equal(a.el('#csv-rows img'),null);a.click('#csv-confirm');assert.equal(a.data.size,0);
  await loadCsv(a,'a;b\n1;2');assert.match(a.el('#csv-message').textContent,/Cabecera/);assert.equal(a.el('#csv-review').hidden,true);assert.equal(a.data.size,0);
  await loadCsv(a,'', 'grande.csv',{size:C.MAX_BYTES+1});assert.match(a.el('#csv-message').textContent,/5 MB/);a.cleanup();
});
uiTest('CSV reimportado está marcado como ya registrado y no habilita confirmar',async()=>{
  const C=require('../assets/registry-csv.js'),initial=C.prepare(W.empty(),C.example()).candidate,a=app({initial}),before=JSON.stringify(a.master());a.click('#open-data');await loadCsv(a,C.example());assert.equal(a.el('#csv-confirm').disabled,true);assert.match(a.el('#csv-rows').textContent,/Ya registrado/);assert.match(a.el('#csv-message').textContent,/No hay registros nuevos/);assert.equal(JSON.stringify(a.master()),before);a.cleanup();
});
uiTest('CSV: falla de cuota conserva candidato/IDs, permite respaldo y reintento completo',async()=>{
  const C=require('../assets/registry-csv.js'),a=app({blocked:true});a.click('#open-data');await loadCsv(a,C.example());a.click('#csv-confirm');assert.equal(a.data.size,0);assert.equal(a.el('#csv-review').hidden,false);assert.equal(a.w.PetDoctorApplication.hasPending(),true);assert.equal(a.el('#csv-confirm').disabled,true);
  a.click('#open-data');a.click('#download-pending');const backup=await a.backup();assert.equal(backup.pets.length,15);assert.match(a.downloads.at(-1).name,/pendiente/);a.block(false);a.click('#retry-save');assert.equal(a.master().pets.length,15);assert.equal(a.master().pets[0].id,backup.pets[0].id);assert.equal(a.el('#csv-review').hidden,true);assert.equal(a.w.PetDoctorApplication.hasPending(),false);a.cleanup();
});
uiTest('CSV: cambio local o evento de otra pestaña invalida la revisión',async()=>{
  const C=require('../assets/registry-csv.js');for(const external of [false,true]){
    const a=app();a.click('#open-data');await loadCsv(a,C.example());
    if(external)a.w.dispatchEvent(new a.w.StorageEvent('storage',{key:W.KEY,newValue:'cambio'}));
    else a.w.PetDoctorApplication.commit(fixture().workspace,()=>{},'test');
    assert.equal(a.el('#csv-confirm').disabled,true);assert.match(a.el('#csv-message').textContent,/base cambió/);a.click('#csv-confirm');assert.equal(a.w.PetDoctorApplication.getWorkspace().owners.length,external?0:1);a.cleanup();
  }
});
uiTest('CSV: escritura externa sin evento también es rechazada sin sobrescribir',async()=>{
  const C=require('../assets/registry-csv.js'),a=app();a.click('#open-data');await loadCsv(a,C.example());const outside=JSON.stringify(fixture().workspace);a.data.set(W.KEY,outside);a.click('#csv-confirm');assert.equal(a.data.get(W.KEY),outside);assert.equal(a.w.PetDoctorApplication.getWorkspace().owners.length,0);assert.equal(a.w.PetDoctorApplication.hasPending(),true);a.click('#retry-save');assert.equal(a.data.get(W.KEY),outside);a.click('#csv-cancel');assert.equal(a.w.PetDoctorApplication.hasPending(),false);a.cleanup();
});
uiTest('CSV: paginación de 20 filas, descargas exactas y nueva selección descarta lectura anterior',async()=>{
  const C=require('../assets/registry-csv.js'),rows=C.exampleRows(),extra=rows.slice(1).map((r,i)=>r.map((v,k)=>k===5?'extra-'+i:k===6?'Nuevo '+v:v)),a=app();a.click('#open-data');
  assert.equal(a.el('#csv-template'),null);assert.equal(a.el('#csv-example'),null);
  await loadCsv(a,C.serialize([...rows,...extra]));assert.equal(a.el('#csv-rows').rows.length,20);a.click('#csv-next');assert.equal(a.el('#csv-rows').rows.length,10);assert.match(a.el('#csv-page').textContent,/Página 2 de 2/);a.click('#csv-prev');assert.equal(a.el('#csv-rows').rows.length,20);
  let finish;await loadCsv(a,'','lento.csv',{text:()=>new Promise(resolve=>{finish=resolve;})});await loadCsv(a,C.example(),'actual.csv');finish('archivo inválido');await new Promise(resolve=>setImmediate(resolve));assert.match(a.el('#csv-filename').textContent,/actual.csv/);assert.equal(a.el('#csv-confirm').disabled,false);a.cleanup();
});
uiTest('CSV conserva selección, servicios, tarifas e historial de cotización y actualiza el directorio',async()=>{
  const C=require('../assets/registry-csv.js'),f=fixture(),a=app({initial:f.workspace});a.selectFixture(f);a.selectService();a.fill('#history-search','Luna');const before=a.el('#summary').textContent;
  a.click('#open-data');await loadCsv(a,C.example());a.click('#csv-confirm');assert.equal(a.el('#owner-select').value,f.ownerId);assert.equal(a.el('#pet-select').value,f.petId);assert.equal(a.el('[data-field="consulta.included"]').checked,true);assert.equal(a.el('#history-search').value,'Luna');assert.equal(a.el('#summary').textContent,before);assert.equal(a.el('#directory-results').children.length,11);assert.equal(a.master().attentions.length,0);assert.equal(a.master().quotes.length,0);a.cleanup();
});


uiTest('Estilos compartidos respetan el tamaño nativo de radios/casillas del cotizador',()=>{
  const a=app();
  for(const name of ['styles','quote','quote-additions','clients','history','application','quote-controls']){
    const style=a.w.document.createElement('style');style.textContent=fs.readFileSync(path.join(root,'assets',name+'.css'),'utf8');a.w.document.head.append(style);
  }
  // Reproduce una hoja compartida antigua o inyectada después del resto.
  const stale=a.w.document.createElement('style');stale.textContent='.app-main input{width:100%;min-height:48px;margin-top:8px}';a.w.document.head.append(stale);
  // jsdom no resuelve especificidad entre hojas como Chrome. La cascada con hoja antigua
  // se comprueba en navegador real; aquí se verifican las dimensiones de la hoja final.
  const final=a.w.document.createElement('style');final.textContent=fs.readFileSync(path.join(root,'assets/quote-controls.css'),'utf8');a.w.document.head.append(final);
  a.w.PetDoctorApplication.navigate('quote');
  function compact(selector,width){const input=a.el(selector);assert.ok(input,selector);const css=a.w.getComputedStyle(input);assert.equal(css.width,width,selector);assert.notEqual(css.minHeight,'48px',selector);assert.notEqual(css.marginTop,'8px',selector);assert.equal(css.flexShrink,'0',selector);assert.equal(css.flexBasis,width,selector);assert.equal(css.maxWidth,width,selector);}
  assert.equal(a.w.getComputedStyle(a.el('.choice-card>span')).flexGrow,'1');
  compact('.include-control input','19px');compact('.choice-card input','16px');compact('.addon input','19px');
  a.click('#tab-grooming');compact('.segment input','16px');compact('.weight-toggle input','19px');
  const search=a.w.getComputedStyle(a.el('#client-search'));assert.equal(search.width,'100%');assert.equal(search.minHeight,'48px');
  a.cleanup();
});


const ATT=require('../assets/attention-csv.js'),REG=require('../assets/registry-csv.js');
function registry25(){return REG.prepare(W.empty(),REG.example25()).candidate;}
async function loadAttentionCsv(a,source=ATT.example(),name='atenciones.csv'){
  const input=a.el('#attention-csv-file');Object.defineProperty(input,'files',{configurable:true,value:[{name,size:Buffer.byteLength(source),text:async()=>source}]});input.dispatchEvent(new a.w.Event('change',{bubbles:true}));await new Promise(resolve=>setImmediate(resolve));
}
uiTest('Atenciones CSV: 150/200, revisión paginada, confirmación y persistencia; sin comunicaciones ni PDF',async()=>{
  const a=app({initial:registry25()}),before=JSON.stringify(a.master());let communications=0;a.w.fetch=async()=>{communications++;};a.click('#open-data');await loadAttentionCsv(a);assert.equal(JSON.stringify(a.master()),before);assert.equal(a.el('#attention-csv-confirm').disabled,false);assert.equal(a.el('#attention-csv-rows').rows.length,20);assert.match(a.el('#attention-csv-counts').textContent,/150 atenciones nuevas.*200 filas/);assert.equal(a.w.document.activeElement.id,'attention-csv-review-title');
  a.click('#attention-csv-next');assert.match(a.el('#attention-csv-page').textContent,/Página 2 de 10/);a.click('#attention-csv-prev');a.click('#attention-csv-confirm');assert.equal(a.master().attentions.length,150);assert.equal(a.master().quotes.length,0);assert.equal(a.master().owners.length,25);assert.equal(a.el('#attention-csv-review').hidden,true);assert.equal(a.w.document.activeElement.id,'attention-csv-open');assert.equal(communications,0);assert.equal(a.pdfCalls(),0);
  const reload=app({data:a.data});assert.equal(reload.master().attentions.length,150);reload.cleanup();a.cleanup();
});
uiTest('Atenciones CSV: faltar clientes bloquea todo; cancelar no escribe; descargas exactas',async()=>{
  const a=app();a.click('#open-data');assert.equal(a.el('#attention-csv-template'),null);assert.equal(a.el('#attention-csv-example'),null);
  await loadAttentionCsv(a);assert.equal(a.el('#attention-csv-confirm').disabled,true);assert.match(a.el('#attention-csv-issues').textContent,/csv-demo-atencion-001/);assert.equal(a.data.size,0);a.click('#attention-csv-cancel');assert.equal(a.el('#attention-csv-review').hidden,true);assert.equal(a.w.document.activeElement.id,'attention-csv-open');assert.equal(a.data.size,0);a.cleanup();
});
uiTest('Atenciones CSV: fallo de almacenamiento permite respaldo y reintento sin duplicar',async()=>{
  const a=app({initial:registry25(),blocked:true});a.click('#open-data');await loadAttentionCsv(a);a.click('#attention-csv-confirm');assert.equal(a.master().attentions.length,0);assert.equal(a.w.PetDoctorApplication.hasPending(),true);assert.equal(a.el('#attention-csv-confirm').disabled,true);a.click('#open-data');a.click('#download-pending');const pending=await a.backup();assert.equal(pending.attentions.length,150);assert.match(a.downloads.at(-1).name,/pendiente/);a.block(false);a.click('#retry-save');assert.equal(a.master().attentions.length,150);assert.equal(a.master().attentions[0].id,pending.attentions[0].id);assert.equal(a.el('#attention-csv-review').hidden,true);a.cleanup();
});
uiTest('Atenciones CSV: reimportar no sobrescribe snapshots y base cambiada invalida revisión',async()=>{
  const initial=ATT.prepare(registry25(),ATT.example()).candidate,a=app({initial});const first=initial.attentions[0];
  const appController=a.w.PetDoctorApplication,current=appController.getWorkspace(),changed=a.w.PetDoctorWorkspace.saveClient(current,{owner:{...current.owners[0],name:'Nombre editado'},pets:[]});appController.commit(changed.workspace,()=>{},'test');
  a.click('#open-data');await loadAttentionCsv(a);assert.equal(a.el('#attention-csv-confirm').disabled,true);assert.match(a.el('#attention-csv-counts').textContent,/150 ya registradas/);assert.deepEqual(a.master().attentions[0],first);a.click('#attention-csv-cancel');a.cleanup();
  const b=app({initial:registry25()});b.click('#open-data');await loadAttentionCsv(b);b.w.dispatchEvent(new b.w.StorageEvent('storage',{key:W.KEY,newValue:'cambio'}));assert.equal(b.el('#attention-csv-confirm').disabled,true);assert.match(b.el('#attention-csv-message').textContent,/base cambió/);assert.equal(b.master().attentions.length,0);b.cleanup();
});
uiTest('Atenciones CSV conserva cotización/filtros y actualiza historial general y ficha por IDs',async()=>{
  const ws=registry25(),a=app({initial:ws});a.fill('#owner-select',ws.owners[0].id,'change');a.fill('#pet-select',ws.pets[0].id,'change');a.selectService();a.fill('#history-search','Luna');a.el('#attention-history').open=true;a.click('[data-profile-id]');const before=a.el('#summary').textContent;
  a.click('#open-data');await loadAttentionCsv(a);a.click('#attention-csv-confirm');assert.equal(a.el('#summary').textContent,before);assert.equal(a.el('#owner-select').value,ws.owners[0].id);assert.equal(a.el('#pet-select').value,ws.pets[0].id);assert.equal(a.el('#history-search').value,'Luna');assert.equal(a.el('#attention-history').open,true);assert.equal(a.el('#history-rows').rows.length,4);assert.equal(a.el('.profile-stats strong').textContent,'4');assert.equal(a.el('#profile-history-rows').rows.length,4);a.cleanup();
});
uiTest('Atenciones CSV: errores de montos y contenido inválido no ejecutan importaciones parciales',async()=>{
  const a=app({initial:registry25()}),rows=ATT.exampleRows(),before=JSON.stringify(a.master());rows[1][16]='0,01';a.click('#open-data');await loadAttentionCsv(a,REG.serialize(rows));assert.equal(a.el('#attention-csv-confirm').disabled,true);assert.match(a.el('#attention-csv-issues').textContent,/no coincide/);assert.equal(JSON.stringify(a.master()),before);
  await loadAttentionCsv(a,'a;b\n1;2');assert.equal(a.el('#attention-csv-review').hidden,true);assert.match(a.el('#attention-csv-message').textContent,/Cabecera/);assert.equal(JSON.stringify(a.master()),before);a.cleanup();
});


uiTest('Demostración: acceso inicial y carga completa sin archivos, reimportación sin duplicados',()=>{
 const a=app();assert.equal(a.el('#demo-welcome').hidden,false);a.click('#demo-start');assert.equal(a.el('#data-dialog').hidden,false);assert.equal(a.w.document.activeElement.id,'load-demo-data');a.click('#load-demo-data');
 assert.equal(a.master().owners.length,25);assert.equal(a.master().pets.length,45);assert.equal(a.master().attentions.length,150);assert.equal(a.master().attentions.reduce((n,x)=>n+x.quote.pricing.total,0),2134679);assert.equal(a.el('#demo-welcome').hidden,true);assert.equal(a.el('#clients-module').hidden,false);assert.equal(a.downloads.length,0);
 a.click('#open-data');a.click('#load-demo-data');assert.equal(a.master().attentions.length,150);assert.match(a.confirmations.at(-1),/REEMPLAZARÁ/);a.cleanup();
});

uiTest('Demostración: cancelar conserva la base y la cotización',()=>{
 const r=fixture(),a=app({initial:r.workspace});a.selectService();const before=JSON.stringify(a.master());a.click('#open-data');a.deny(true);a.click('#load-demo-data');assert.equal(JSON.stringify(a.master()),before);a.click('#nav-quote');assert.equal(a.el('[data-field="consulta.included"]').checked,true);assert.equal(a.downloads.length,0);a.cleanup();
});

uiTest('Demostración: cuota mantiene base anterior y recuperación centralizada',()=>{
 const r=fixture(),a=app({initial:r.workspace}),before=JSON.stringify(a.master());a.click('#open-data');a.block(true);a.click('#load-demo-data');assert.equal(JSON.stringify(a.master()),before);assert.equal(a.el('#storage-recovery').hidden,false);a.click('#load-demo-data');assert.match(a.el('#data-message').textContent,/guardado pendiente/);a.block(false);a.click('#retry-save');assert.equal(a.master().attentions.length,150);assert.equal(a.el('#storage-recovery').hidden,true);a.cleanup();
});
