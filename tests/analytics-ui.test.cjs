const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),{IDBFactory}=require('fake-indexeddb'),D=require('../analitica/data'),C=require('../assets/analytics-csv');
const root=path.resolve(__dirname,'../analitica'),wait=()=>new Promise(r=>setTimeout(r,10)),demo=()=>C.exportCsv(D.demo().workspace);
async function app(factory=new IDBFactory()){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://pet-doctor.test/analitica/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,errors=[],instances=new Map();let blocked=false,deny=false;
 Object.defineProperty(w,'localStorage',{get(){throw Error('No tocar base operativa');}});w.fetch=()=>{throw Error('No usar red');};w.indexedDB=factory;w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.AbortController=AbortController;w.confirm=()=>!deny;
 w.addEventListener('error',e=>{errors.push(e.error);e.preventDefault();});w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 w.echarts={init(target){const instance={handler:null,on(name,fn){this.handler=fn;},setOption(option){this.option=option;},resize(){},dispose(){}};instances.set(target.id,instance);return instance;}};
 for(const script of dom.window.document.querySelectorAll('script[src]')){const file=script.getAttribute('src');if(file.includes('vendor/')||file==='app.js')continue;w.eval(fs.readFileSync(path.join(root,file),'utf8'));}
 const create=w.PetDoctorAnalyticsStorage.createStore;w.PetDoctorAnalyticsStorage.createStore=()=>{const store=create();return {...store,commit(...args){return blocked?Promise.reject(Error('Cuota agotada. Conserva el CSV original.')):store.commit(...args);}};};w.eval(fs.readFileSync(path.join(root,'app.js'),'utf8'));await w.PetDoctorAnalyticsApp.ready;
 const el=id=>w.document.getElementById(id),click=id=>el(id).click(),fill=(id,value,event='change')=>{el(id).value=value;el(id).dispatchEvent(new w.Event(event,{bubbles:true}));},snapshot=()=>w.PetDoctorAnalyticsApp.snapshot();
 async function until(fn){for(let i=0;i<400&&!fn();i++)await wait();assert.ok(fn(),'La operación debe terminar');}
 async function input(text=demo(),name='analitica.csv',options={}){click('open-import');Object.defineProperty(el('import-file'),'files',{configurable:true,value:[{size:options.size??Buffer.byteLength(text),name,text:options.text||async function(){return text;}}]});el('import-file').dispatchEvent(new w.Event('change'));if(!options.noWait)await until(()=>el('cancel-read').hidden);}
 async function confirm(){click('confirm-import');await until(()=>!snapshot().busy);}
 async function load(){await input();await confirm();}
 function close(){assert.deepEqual(errors,[]);w.PetDoctorAnalyticsApp.destroy();w.close();}
 return {w,el,click,fill,input,confirm,load,snapshot,instances,factory,close,until,block(v){blocked=v;},deny(v){deny=v;}};
}
test('Analítica UI: entrada única, revisión sin escritura, persistencia y recarga aislada',async()=>{
 const a=await app();for(const id of ['import-kind','export-csv','export-backup','pending-backup','download-report'])assert.equal(a.el(id),null);
 await a.input();assert.equal(a.snapshot().revision,0);assert.equal(a.snapshot().kpis.attentions,0);assert.equal(a.el('confirm-import').disabled,false);await a.confirm();assert.equal(a.snapshot().kpis.total,2134679);assert.equal(a.instances.size,5);assert.equal(a.el('records-body').children.length,20);const f=a.factory;a.close();const b=await app(f);assert.equal(b.snapshot().kpis.attentions,150);b.close();
});
test('Analítica UI: filtros/gráficos, teclado, detalle y paginación siguen funcionando',async()=>{
 const a=await app();await a.load();a.fill('owner','csv-demo-cliente-01');assert.equal(a.snapshot().kpis.clients,1);a.click('reset-filters');a.instances.get('chart-services').handler({componentType:'series',data:{id:'consulta'}});assert.ok(a.snapshot().filters.services.includes('consulta'));a.click('reset-filters');a.click('next');assert.match(a.el('page').textContent,/2 de/);a.el('records-body').querySelector('button').click();assert.equal(a.el('detail-dialog').open,true);assert.match(a.el('detail-body').textContent,/IGV/);assert.equal(a.w.document.activeElement.id,'close-detail');a.click('close-detail');a.close();
});
test('Analítica UI: cancelación, formatos inválidos, límite y lectura obsoleta sin pérdida',async()=>{
 const a=await app();await a.load();const rev=a.snapshot().revision;await a.input('{}','no.json');assert.equal(a.el('confirm-import').disabled,true);assert.match(a.el('review-issues').textContent,/Cabecera/);await a.input('', 'grande.csv',{size:C.MAX_BYTES+1});assert.match(a.el('import-message').textContent,/50 MB/);
 let finish;await a.input('', 'lento.csv',{text:()=>new Promise(resolve=>{finish=resolve;}),noWait:true});a.click('cancel-read');finish(demo());await wait();assert.equal(a.snapshot().revision,rev);await a.input();a.click('cancel-review');assert.equal(a.snapshot().review,false);assert.equal(a.snapshot().revision,rev);a.close();
});
test('Analítica UI: cuota mantiene conjunto y candidato, reintento reemplaza sin duplicar',async()=>{
 const a=await app();await a.load();await a.input();a.block(true);await a.confirm();assert.match(a.el('import-message').textContent,/Cuota/);assert.equal(a.snapshot().revision,1);assert.equal(a.snapshot().review,true);a.block(false);await a.confirm();assert.equal(a.snapshot().revision,2);assert.equal(a.snapshot().kpis.attentions,150);a.close();
});
test('Analítica UI: concurrencia conserva candidato e impide sobrescritura',async()=>{
 const f=new IDBFactory(),a=await app(f),b=await app(f);await a.input();await b.load();await a.confirm();assert.equal(a.snapshot().revision,0);assert.match(a.el('import-message').textContent,/otra pestaña/);assert.equal(a.el('confirm-import').disabled,true);a.click('refresh-data');await a.until(()=>a.snapshot().revision===1);assert.equal(a.snapshot().kpis.attentions,150);a.close();b.close();
});
test('Analítica UI: vaciar con revisión, rechazo/cancelación y recarga del mismo CSV',async()=>{
 const a=await app();await a.load();a.deny(true);a.click('clear-data');assert.equal(a.snapshot().review,false);a.deny(false);a.click('clear-data');assert.equal(a.snapshot().kpis.attentions,150);await a.confirm();assert.equal(a.snapshot().kpis.attentions,0);await a.load();assert.equal(a.snapshot().kpis.attentions,150);const ids=[...a.w.document.querySelectorAll('[id]')].map(n=>n.id);assert.equal(new Set(ids).size,ids.length);a.close();
});


test('Analítica: demostración se revisa antes de guardar, cancela y recarga sin duplicados',async()=>{
 const a=await app();a.click('load-demo');assert.equal(a.snapshot().revision,0);assert.equal(a.snapshot().kpis.attentions,0);assert.match(a.el('review-summary').textContent,/25 clientes.*45 perritos.*150 atenciones.*200 servicios/);assert.match(a.el('review-issues').textContent,/reemplazará/);
 a.click('cancel-review');assert.equal(a.snapshot().revision,0);a.click('load-demo');await a.confirm();assert.equal(a.snapshot().kpis.total,2134679);assert.equal(a.el('demo-badge').hidden,false);
 a.fill('search','no-existe');a.click('load-demo');await a.confirm();assert.equal(a.snapshot().kpis.attentions,150);assert.equal(a.snapshot().filters.search,'');assert.equal(a.snapshot().kpis.services,200);
 const f=a.factory;a.close();const b=await app(f);assert.equal(b.snapshot().kpis.attentions,150);assert.equal(b.el('demo-badge').hidden,false);b.close();
});

test('Analítica: fallo de cuota al cargar demostración conserva conjunto y permite reintento',async()=>{
 const a=await app();await a.load();const revision=a.snapshot().revision;a.click('load-demo');a.block(true);await a.confirm();assert.equal(a.snapshot().revision,revision);assert.equal(a.snapshot().review,true);assert.match(a.el('import-message').textContent,/Cuota/);a.block(false);await a.confirm();assert.equal(a.snapshot().revision,revision+1);assert.equal(a.snapshot().kpis.attentions,150);a.close();
});
