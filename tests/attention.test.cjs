const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const W = require('../assets/workspace.js');
let JSDOM;
try { ({ JSDOM } = require('jsdom')); } catch { /* Dependencia opcional de desarrollo, no de la aplicación. */ }
const uiTest = (name, fn) => test(name, { skip: !JSDOM && 'Instala jsdom y expón su carpeta mediante NODE_PATH para las pruebas de interfaz.' }, fn);
const root = path.resolve(__dirname, '..');
const owner = { name: 'Ana Pérez', dni: '00123456', contact: '+51 999 123 456', email:'ana@example.com' };
const pet = { name: 'Luna', weightKg: 12.5, size: null, coat: 'long' };
function fixture() { return W.saveClient(W.empty(), { owner, pets: [pet, { ...pet, name: 'Toby', weightKg: null, size: 'small' }] }); }
function app({ data = new Map(), blocked = false, initial = null } = {}) {
  if (initial) data.set(W.KEY, JSON.stringify(initial));
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'https://pet-doctor.test/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, errors = [], downloads = [], confirmations = []; let pdfCalls = 0, deny = false;
  Object.defineProperty(w, 'localStorage', { value: { getItem: key => data.get(key) ?? null, setItem(key, value) { if (blocked) throw Error('quota'); data.set(key, value); }, removeItem(key) { if(blocked)throw Error('blocked');data.delete(key); } } });
  w.confirm = message => { confirmations.push(message); return !deny; };
  w.addEventListener('error', event => { errors.push(event.error); event.preventDefault(); });
  w.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  w.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  w.URL.createObjectURL = blob => { downloads.push({ blob }); return 'blob:demo'; }; w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { downloads.at(-1).name = this.download; };
  w.PetDoctorPDF = { async createQuotePdf() { pdfCalls++; return new Uint8Array([37,80,68,70]); } };
  for (const file of ['auth','app','catalog','pricing','files','workspace','integration','clients','history','history-view','application','quote','customer-profile']) w.eval(fs.readFileSync(path.join(root, 'assets', file + '.js'), 'utf8'));
  const el = selector => w.document.querySelector(selector);
  function fill(selector, value, event = 'input') { const input = el(selector); assert.ok(input, selector); input.value = value; input.dispatchEvent(new w.Event(event, { bubbles: true })); }
  function click(selector) { const element = el(selector); assert.ok(element, selector); element.click(); }
  function submit() { el('#client-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); }
  function selectService() { const checkbox = el('[data-field="consulta.included"]'); checkbox.checked = true; checkbox.dispatchEvent(new w.Event('change', { bubbles: true })); }
  function fillOwner() { fill('[data-owner-key="name"]', owner.name); fill('[data-owner-key="dni"]', owner.dni); fill('[data-owner-key="contact"]', owner.contact); fill('[data-owner-key="email"]',owner.email); }
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
  a.click('#backup-client-draft');const backup=await a.backup();assert.equal(backup.owners.length,1);assert.equal(backup.pets.length,1);assert.match(a.downloads[0].name,/pendiente/);
  a.block(false);a.click('#retry-client-save');assert.equal(a.master().owners.length,1);assert.equal(a.el('#client-dialog').open,false);a.cleanup();
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

uiTest('Importar registro incorpora incompletos; respaldo completo pide confirmación y valida antes de reemplazar', async () => {
  const a=app(),legacy={type:'pet-doctor.registry',version:1,owners:[{id:'o1',name:'Ana'}],pets:[{id:'p1',ownerId:'o1',name:'Luna'}]};
  await a.importFile('registry',legacy);a.fill('#owner-select','o1','change');a.fill('#pet-select','p1','change');a.selectService();assert.equal(a.el('.save-attention').disabled,true);assert.match(a.el('#client-selection-status').textContent,/incompleto/);
  a.click('#edit-client');a.fill('[data-owner-key="dni"]',owner.dni);a.fill('[data-owner-key="contact"]',owner.contact);a.fill('[data-owner-key="email"]',owner.email);a.submit();assert.equal(a.el('.save-attention').disabled,false);
  const before=a.data.get(W.KEY);await a.importFile('registry',legacy);assert.equal(a.data.get(W.KEY),before);assert.match(a.el('#file-message').textContent,/Conflicto/);
  a.deny(true);await a.importFile('master',W.empty());assert.equal(a.data.get(W.KEY),before);assert.ok(a.confirmations.length>0);
  a.deny(false);await a.importFile('master',{...W.empty(),pets:[{id:'x',ownerId:'missing',name:'X'}]});assert.equal(a.data.get(W.KEY),before);
  await a.importFile('master',W.empty());assert.equal(a.master().owners.length,0);a.cleanup();
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
  const result=historyFixture(),legacy=result.workspace.attentions[0];delete legacy.registration;delete legacy.ownerSnapshot;legacy.quote.state.pet.ownerId=null;legacy.quote.state.pet.petId=null;
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
  legacy.id='same-name-legacy';legacy.quote.id=legacy.id;delete legacy.registration;legacy.quote.state.pet.ownerId=null;legacy.quote.state.pet.petId=null;other.workspace.attentions.push(legacy);
  const a=app({initial:other.workspace});a.selectFixture(result);a.click('[data-profile-id="'+other.ownerId+'"]');
  assert.match(a.el('.profile-stats').textContent,/0Atenciones/);assert.equal(a.el('#owner-select').value,result.ownerId);
  a.click('#profile-back');a.click('[data-profile-id="'+result.ownerId+'"]');assert.match(a.el('.profile-stats').textContent,/1Atenciones/);assert.equal(a.el('#profile-history-rows').rows.length,1);assert.equal(a.w.document.querySelectorAll('#client-dialog').length,1);a.cleanup();
});

uiTest('Cliente anterior sin correo permite atención y agregar perrito; exige correo al editar',()=>{
  const result=fixture();delete result.workspace.owners[0].email;const a=app({initial:result.workspace});a.click('[data-profile-id]');
  assert.match(a.el('.profile-data').textContent,/Correo pendiente/);assert.equal(a.el('#profile-email').disabled,true);a.click('#profile-add-pet');assert.equal(a.el('[data-owner-key="email"]'),null);a.fill('[data-pet-key="name"]','Max');a.submit();assert.equal(a.master().pets.length,3);
  a.click('#profile-edit');a.submit();assert.match(a.el('#client-form-error').textContent,/correo/);a.click('#cancel-client');
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
uiTest('Correo de ficha revisa, confirma, correlaciona y no persiste mensaje, clave ni resultado',async()=>{
  const f=fixture(),a=app({initial:f.workspace});configureCalls(a);a.click('[data-profile-id]');const before=JSON.stringify(a.master());
  let count=0,payload;a.w.fetch=async(u,o)=>{count++;payload=JSON.parse(o.body);return {status:200,json:async()=>({ok:true,status:'correo_enviado',requestId:payload.requestId,clientId:payload.clientId,messageId:'gmail-id'})};};
  assert.equal(a.el('#profile-email').disabled,false);a.click('#profile-email');assert.equal(a.el('#communication-email').readOnly,true);assert.equal(a.el('#communication-email').value,owner.email);assert.equal(a.el('#communication-phone-label').hidden,true);assert.equal(a.el('#call-counter').textContent,'0/360');assert.equal(a.w.document.activeElement.id,'communication-subject');
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
