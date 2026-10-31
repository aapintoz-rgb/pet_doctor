(function(g){
  'use strict';
  const D=g.PetDoctorAnalyticsData,S=g.PetDoctorAnalyticsStorage,H=g.PetDoctorHistory;
  const $=id=>document.getElementById(id),days=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const money=c=>c===null?'—':new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(c/100);
  const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
  const store=S.createStore();let readController=null;let data=D.empty(),revision=0,rows=[],filters=D.initialFilters(),page=1,result,review=null,busy=false,fileToken=0,returnFocus,external=false,filterError=false;
  const settings={group:'day',trendMeasure:'amount',serviceMeasure:'amount',clientMeasure:'amount'};
  const charts=g.PetDoctorAnalyticsCharts.mount(selectChart);
  const channel=typeof g.BroadcastChannel==='function'?new g.BroadcastChannel('pet-doctor.analytics.changes'):null;
  function notice(message,error=false,id='status'){const n=$(id);n.textContent=message;n.classList.toggle('error',error);n.hidden=!message;}
  function showDialog(id){returnFocus=document.activeElement;if(!$(id).open)$(id).showModal();}
  function closeDialog(id){if(busy)return;if(id==='import-dialog'){fileToken++;readController?.abort();$('import-progress').hidden=true;$('cancel-read').hidden=true;}$(id).close();returnFocus?.focus();}
  function fillSelect(id,items,selected,all='Todos'){
    const select=$(id);select.replaceChildren(new Option(all,''));for(const item of items)select.add(new Option(item.name,item.id));select.value=selected;
  }
  function syncControls(){
    const options=D.options(rows);
    fillSelect('owner',options.owners.sort((a,b)=>a.name.localeCompare(b.name,'es')),filters.owner);
    fillSelect('pet',options.pets.filter(p=>!filters.owner||p.ownerId===filters.owner).sort((a,b)=>a.name.localeCompare(b.name,'es')),filters.pet);
    for(const key of ['from','to','weekday','hour','frequency','search'])$(key).value=filters[key];
    const container=$('service-options');
    for(const input of container.querySelectorAll('input'))if(!options.services.some(s=>s.id===input.value))input.parentElement.remove();
    for(const service of options.services){let input=[...container.querySelectorAll('input')].find(i=>i.value===service.id);if(!input){const label=el('label');input=el('input');input.type='checkbox';input.value=service.id;input.addEventListener('change',()=>{filters.services=input.checked?[...filters.services,service.id]:filters.services.filter(s=>s!==service.id);page=1;render();});label.append(input,el('span'));container.append(label);}input.checked=filters.services.includes(service.id);input.nextElementSibling.textContent=service.name;}
    $('filter-chips').replaceChildren();
    const names={from:'Desde',to:'Hasta',owner:'Cliente',pet:'Perrito',weekday:'Día',hour:'Hora',frequency:'Frecuencia',search:'Buscar'};
    for(const key of Object.keys(names))if(filters[key]!==''){
      let value=filters[key];if(key==='owner')value=options.owners.find(o=>o.id===value)?.name||value;if(key==='pet')value=options.pets.find(p=>p.id===value)?.name||value;if(key==='weekday')value=days[Number(value)];if(key==='hour')value=String(value).padStart(2,'0')+':00';
      const b=el('button',names[key]+': '+value+' ×');b.setAttribute('aria-label','Retirar filtro '+names[key]+': '+value);b.onclick=()=>{filters[key]='';if(key==='owner')filters.pet='';page=1;render();};$('filter-chips').append(b);
    }
    for(const id of filters.services){const name=options.services.find(s=>s.id===id)?.name||id,b=el('button','Servicio: '+name+' ×');b.setAttribute('aria-label','Retirar servicio '+name);b.onclick=()=>{filters.services=filters.services.filter(s=>s!==id);page=1;render();};$('filter-chips').append(b);}
  }
  function render(){
    syncControls();
    try{result=D.query(rows,filters,settings);if(filterError)notice('');filterError=false;}catch(e){notice(e.message,true);filterError=true;result=D.query([]);}
    const k=result.kpis;
    $('source-name').textContent=data.meta.name;$('source-counts').textContent=data.workspace.owners.length+' clientes · '+data.workspace.pets.length+' perritos · '+data.workspace.attentions.length+' atenciones';$('demo-badge').hidden=!data.meta.demo;
    const cards=[['Importe sin IGV',money(k.subtotal),'IGV '+money(k.tax)+' · Total '+money(k.total)],['Atenciones realizadas',k.attentions,'IDs únicos en la selección'],['Ticket medio sin IGV',money(k.ticket),'Importe filtrado / atenciones'],['Clientes atendidos',k.clients,'Con vínculo registrado'],['Perritos atendidos',k.pets,'Con vínculo registrado'],['Clientes recurrentes',k.recurrence===null?'—':new Intl.NumberFormat('es-PE',{style:'percent',maximumFractionDigits:1}).format(k.recurrence),'2 o más atenciones en la selección']];
    $('kpis').replaceChildren();for(const [label,value,hint]of cards){const card=el('article',undefined,'kpi');card.append(el('p',label),el('strong',String(value)),el('small',hint));$('kpis').append(card);}
    $('results-summary').textContent=k.attentions+' atenciones · '+k.services+' servicios · '+k.unlinked+' sin vínculo registrado';
    $('dashboard-empty').hidden=rows.length>0;
    charts.render(result,settings);
    page=Math.min(page,Math.max(1,Math.ceil(result.attentions.length/20)));$('records-body').replaceChildren();
    for(const a of result.attentions.slice((page-1)*20,page*20)){
      const tr=el('tr'),identity=el('td');identity.append(el('span',a.ownerName),el('small',a.petName));if(!a.attention.registration?.ownerId||!result.rows.find(r=>r.attentionId===a.id)?.ownerId)identity.append(el('small','Sin vínculo registrado'));
      tr.append(el('td',a.date+' '+a.time),el('td',a.id),identity,el('td',a.services.join(' · ')),el('td',money(a.subtotal)),el('td',money(a.attentionTotal)));
      const td=el('td'),button=el('button','Ver detalle');button.onclick=()=>detail(a.attention);td.append(button);tr.append(td);$('records-body').append(tr);
    }
    $('records-empty').hidden=result.attentions.length>0;$('records-empty').textContent=rows.length?'No hay coincidencias. Ajusta o limpia los filtros.':'No hay atenciones cargadas.';
    $('page').textContent='Página '+page+' de '+Math.max(1,Math.ceil(result.attentions.length/20));$('previous').disabled=page<=1;$('next').disabled=page*20>=result.attentions.length;
  }
  function detail(a){
    const body=$('detail-body'),q=a.quote,pet=q.state.pet,parts=H.dateParts(a.performedAt);body.replaceChildren();
    const meta=el('div',undefined,'detail-meta');for(const [label,value]of [['ID completo',a.id],['Fecha · America/Lima',parts.date+' '+parts.time],['Cliente registrado',a.ownerSnapshot?.name??pet.ownerName??'No registrado'],['DNI registrado',a.ownerSnapshot?.dni||'No registrado'],['Perrito registrado',pet.name||'No registrado'],['Vínculo',rows.find(r=>r.attentionId===a.id)?.ownerId?'Registrado por IDs':'Sin vínculo registrado']]){const p=el('p');p.append(el('small',label),el('br'),el('strong',value));meta.append(p);}body.append(meta);
    for(const service of q.pricing.services){const section=el('section');section.append(el('h3',service.name));const list=el('ul',undefined,'detail-lines');for(const line of service.lines){const li=el('li');li.append(el('span',line.label||line.name||'Componente'),el('strong',money(line.amount)));list.append(li);}section.append(list,el('p','Sin IGV '+money(service.subtotal)+' · IGV '+money(service.tax)+' · Total '+money(service.total),'hint'));body.append(section);}
    body.append(el('p','Subtotal '+money(q.pricing.subtotal)+' · IGV '+money(q.pricing.tax)+' · Total '+money(q.pricing.total),'detail-totals'));showDialog('detail-dialog');$('close-detail').focus();
  }
  function selectChart(key,value){
    if(key==='services')filters.services=filters.services.includes(value.id)?filters.services.filter(s=>s!==value.id):[...filters.services,value.id];
    if(key==='clients'){filters.owner=value.id;filters.pet='';}
    if(key==='heat'){filters.weekday=String(value.weekday);filters.hour=String(value.hour);}
    if(key==='frequency')filters.frequency=value.key;
    if(key==='trend'){
      let from=value.key,to=value.key;
      if(settings.group==='month'){from+='-01';const d=new Date(from+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);to=d.toISOString().slice(0,10);}
      if(settings.group==='week'){const d=new Date(from+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+6);to=d.toISOString().slice(0,10);}
      filters.from=from;filters.to=to;
    }
    page=1;render();$('filters-title').scrollIntoView?.({block:'start'});
  }
  function applyLoaded(record){
    const first=rows.length===0;data=record.data;revision=record.revision;rows=D.normalize(data.workspace);external=false;$('external-change').hidden=true;
    const compatible=D.reconcile(filters,rows);filters=compatible.filters;if(first)Object.assign(filters,D.quickRange('all',rows));page=1;render();return compatible.changed;
  }
  function renderReview(){
    $('review').hidden=!review;if(!review)return;
    const r=review.prepared,c=r.counts;
    $('review-summary').textContent=review.name+' · '+r.mode+(c?' · Conjunto resultante: '+c.owners+' clientes, '+c.pets+' perritos, '+c.attentions+' atenciones, '+c.services+' servicios · '+money(c.total)+' con IGV':'')+(r.changes?' · Cambios: '+Object.entries(r.changes).map(([k,v])=>k+': '+v).join(', '):'');
    $('review-issues').replaceChildren();const issues=[...(r.errors||[]).map(i=>({...i,type:'Error'})),...(r.warnings||[]).map(i=>({...i,type:'Aviso'}))];
    for(const issue of issues)$('review-issues').append(el('li',issue.type+' · fila '+(issue.line||'—')+' · '+(issue.column||'')+': '+issue.message));
    if(!issues.length)$('review-issues').append(el('li','Validación correcta. Revisa las cantidades antes de confirmar.'));
    $('confirm-import').disabled=busy||!r.canImport||review.baseRevision!==revision||external;
  }
  async function saveReview(){
    if(busy||!review?.prepared.canImport||review.baseRevision!==revision||external)return;
    busy=true;renderReview();$('close-import').disabled=true;$('cancel-review').disabled=true;$('import-file').disabled=true;
    try{
      const saved=await store.commit(review.prepared.candidate,review.baseRevision);const removed=applyLoaded(saved);review=null;renderReview();notice('Datos guardados en Analítica.'+(removed?' Se retiraron filtros cuyos valores ya no existen.':''));notice('',false,'import-message');channel?.postMessage({revision});busy=false;closeDialog('import-dialog');
    }catch(e){notice(e.message,true,'import-message');$('confirm-import').textContent='Reintentar guardado';await checkExternal();}
    finally{busy=false;$('close-import').disabled=false;$('cancel-review').disabled=false;$('import-file').disabled=false;renderReview();}
  }
  async function checkExternal(){try{const stored=await store.load();if(stored.revision!==revision){external=true;$('external-change').hidden=false;renderReview();}}catch(e){notice(e.message,true);}}
  for(const [i,day]of days.entries())$('weekday').add(new Option(day,String(i)));for(let h=0;h<24;h++)$('hour').add(new Option(String(h).padStart(2,'0')+':00',String(h)));
  for(const key of ['from','to','owner','pet','weekday','hour','frequency','search'])$(key).addEventListener(key==='search'?'input':'change',()=>{filters[key]=$(key).value;if(key==='owner')filters.pet='';page=1;render();});
  for(const [id,key]of [['group','group'],['trend-measure','trendMeasure'],['service-measure','serviceMeasure'],['client-measure','clientMeasure']])$(id).onchange=()=>{settings[key]=$(id).value;render();};
  document.querySelectorAll('[data-range]').forEach(b=>b.onclick=()=>{Object.assign(filters,D.quickRange(b.dataset.range,rows));page=1;render();});
  $('reset-filters').onclick=()=>{filters=D.initialFilters();page=1;notice('');render();};$('previous').onclick=()=>{page--;render();};$('next').onclick=()=>{page++;render();};
  $('open-import').onclick=()=>{showDialog('import-dialog');$('import-file').focus();};$('close-import').onclick=()=>closeDialog('import-dialog');$('close-detail').onclick=()=>closeDialog('detail-dialog');
  for(const id of ['import-dialog','detail-dialog'])$(id).addEventListener('cancel',e=>{e.preventDefault();closeDialog(id);});
  $('import-file').onchange=async()=>{
    const file=$('import-file').files[0],token=++fileToken;if(!file||busy)return;
    readController?.abort();readController=new AbortController();const controller=readController,base=revision;
    review=null;renderReview();notice('Leyendo y validando…',false,'import-message');
    $('import-progress').value=0;$('import-progress').hidden=false;$('cancel-read').hidden=false;
    try{
      if(file.size>50*1024*1024)throw Error('El archivo supera 50 MB.');
      const text=await file.text();if(token!==fileToken||controller.signal.aborted)return;
      const prepared=await D.prepareCsv(text,file.name,{signal:controller.signal,onProgress:p=>{if(token===fileToken)$('import-progress').value=p.percent;}});
      if(token!==fileToken||controller.signal.aborted)return;
      if(base!==revision||external)throw Error('La base cambió durante la lectura. Vuelve a seleccionar el archivo.');
      review={prepared,baseRevision:revision,name:file.name};notice('',false,'import-message');renderReview();$('review-title').focus();
    }catch(e){if(token===fileToken&&!controller.signal.aborted)notice(e.message,true,'import-message');}
    finally{if(token===fileToken){$('import-progress').hidden=true;$('cancel-read').hidden=true;}}
  };
  $('cancel-read').onclick=()=>{fileToken++;readController?.abort();$('import-progress').hidden=true;$('cancel-read').hidden=true;notice('Lectura cancelada. El conjunto anterior se conserva.',false,'import-message');};
  $('cancel-review').onclick=()=>{if(busy)return;review=null;fileToken++;$('import-file').value='';$('confirm-import').textContent='Confirmar carga';renderReview();notice('',false,'import-message');$('import-file').focus();};
  $('confirm-import').onclick=saveReview;
  $('clear-data').onclick=()=>{if(busy)return;if(!g.confirm('¿Vaciar únicamente los datos de Analítica? Conserva el CSV original para volver a cargarlos.'))return;showDialog('import-dialog');review={prepared:{candidate:D.empty(),mode:'vaciar',canImport:true,errors:[],warnings:[],counts:{owners:0,pets:0,attentions:0,services:0,total:0}},baseRevision:revision,name:'Vaciar Analítica'};renderReview();$('review-title').focus();};
  $('refresh-data').onclick=async()=>{if(busy)return;if(review&&!g.confirm('Hay un candidato pendiente. Conserva el CSV original. ¿Descartarlo y actualizar Analítica?'))return;try{const record=await store.load();review=null;renderReview();const removed=applyLoaded(record);notice('Analítica actualizada.'+(removed?' Se retiraron filtros no disponibles.':''));}catch(e){notice(e.message,true);}};
  if(channel)channel.onmessage=checkExternal;g.addEventListener('focus',checkExternal);
  g.addEventListener('beforeunload',e=>{if(review?.prepared.canImport){e.preventDefault();e.returnValue='';}});
  for(const id of ['open-import','clear-data'])$(id).disabled=true;
  const ready=store.load().then(record=>{applyLoaded(record);}).catch(e=>{render();notice(e.message,true);}).finally(()=>{for(const id of ['open-import','clear-data'])$(id).disabled=false;});
  // Read-only inspection hook for automated checks; all persistence uses the same UI transaction.
  g.PetDoctorAnalyticsApp={ready,snapshot:()=>({revision,filters:structuredClone(filters),page,kpis:result?.kpis,review:!!review,busy}),destroy(){charts.destroy();channel?.close();store.close();g.removeEventListener('focus',checkExternal);}};
})(globalThis);
