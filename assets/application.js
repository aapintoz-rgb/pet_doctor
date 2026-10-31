(function(g){
  'use strict';
  const W=g.PetDoctorWorkspace,I=g.PetDoctorIntegration;
  const el=id=>document.getElementById(id);
  const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)};
  I.retireLegacyConfig(storage);
  const store=W.createStore(storage);let workspace=store.get(),pending=null,active='clients',callsKey='';
  const modules=new Map(),listeners=new Set(),configListeners=new Set();
  function message(text,isError=false){const node=el('file-message');node.hidden=!text;node.textContent=text;node.classList.toggle('is-error',isError);if(isError&&pending&&active!=='data'){const button=document.createElement('button');button.type='button';button.className='text-button';button.textContent='Abrir Datos y sincronización';button.onclick=()=>navigate('data');node.append(' ',button);}}
  function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function updateCounts(){el('export-analytics').disabled=!workspace.attentions.length;el('master-count').textContent=workspace.owners.length+' clientes · '+workspace.pets.length+' perritos · '+workspace.attentions.length+' atenciones';}
  function clearPending(scope){
    if(!pending || (scope && pending.scope!==scope))return true;
    if(!scope && !g.confirm('Hay un guardado pendiente. ¿Quieres descartarlo?'))return false;
    pending=null;el('storage-recovery').hidden=true;el('client-form-recovery').hidden=true;return true;
  }
  function commit(candidate,onSuccess=()=>{},scope='workspace',replace=false,baseFingerprint=null){
    if(pending && pending.scope!==scope)throw new Error('Resuelve el guardado pendiente antes de continuar.');
    if(baseFingerprint&&JSON.stringify(workspace)!==baseFingerprint)throw new Error('La base cambió desde la revisión CSV. Revisa nuevamente el archivo antes de guardar.');
    pending={candidate,onSuccess,scope,replace,baseFingerprint};
    try{workspace=store.commit(candidate,{replace});}
    catch(error){
      message(error.message,true);el('storage-recovery').hidden=false;
      if(scope==='client')editor.showError(error.message,true);
      if(!el('data-dialog').hidden){el('data-message').textContent=error.message;el('data-message').hidden=false;}
      return false;
    }
    pending=null;el('storage-recovery').hidden=true;updateCounts();
    for(const listener of listeners)listener(workspace);
    onSuccess();return true;
  }
  function retry(){if(pending){const p=pending;if(p.scope==='import' && !g.confirm('Reintentar reemplazará toda la base y descartará la cotización. ¿Quieres continuar?'))return;try{commit(p.candidate,p.onSuccess,p.scope,p.replace,p.baseFingerprint);}catch(error){message(error.message,true);el('data-message').textContent=error.message;el('data-message').hidden=false;}}}
  function downloadPending(){if(pending){download(new Blob([JSON.stringify(pending.candidate,null,2)],{type:'application/json'}),'pet-doctor-respaldo-pendiente.json');message('Respaldo pendiente descargado. La operación todavía no se ha aplicado a la base local.');}}
  function downloadMaster(){download(new Blob([JSON.stringify(workspace,null,2)],{type:'application/json'}),'pet-doctor-base-v3.json');message('Base completa descargada.'+(pending?' Existe un guardado pendiente; usa su respaldo diferenciado para incluirlo.':''));}
  document.getElementById('shared-editor').innerHTML=g.PetDoctorClients.editorMarkup;
  const editor=g.PetDoctorClients.mountEditor({getWorkspace:()=>workspace,commit,clearPending,retry,downloadPending,message,navigate});
  function navigate(name,{focus=true}={}){
    if(!['clients','quote','data'].includes(name))return;
    if(active!==name&&modules.get(active)?.canLeave?.()===false)return;
    if(active!==name)modules.get(active)?.onHide?.();
    if(name==='data'&&active!=='data')dataReturn=active;
    if(active==='data'&&name!=='data')el('calls-key').value='';
    active=name;
    el('clients-module').hidden=name!=='clients';el('quote-module').hidden=name!=='quote';el('data-dialog').hidden=name!=='data';
    if(name==='data'){el('calls-url').value=I.readCallConfig(storage);el('calls-key').value='';keyStatus();}
    for(const button of document.querySelectorAll('[data-module]')){if(button.dataset.module===name)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
    el('header-location').textContent=name==='clients'?'Clientes':name==='quote'?'Cotización':'Datos y sincronización';
    document.title=el('home-view').hidden?'Pet Doctor · Acceso':'Pet Doctor · '+(name==='clients'?'Clientes':name==='quote'?'Cotización':'Datos y sincronización');
    el('app-nav').classList.remove('menu-open');el('menu-toggle').setAttribute('aria-expanded','false');
    if(focus)(name==='clients'?el('clients-title'):name==='quote'?el('home-content'):el('data-dialog'))?.focus();
  }
  function sessionChanged(session,moveFocus=false){
    if(session)navigate('clients',{focus:moveFocus});
    else{
      callsKey='';el('calls-key').value='';for(const listener of configListeners)listener();
      editor.close({restoreFocus:false});closeData(false);clearPending('client');pending=null;el('storage-recovery').hidden=true;
      for(const module of modules.values())module.onLogout?.();
      navigate('clients',{focus:false});document.title='Pet Doctor · Acceso';
      if(moveFocus)el('username').focus();
    }
  }
  let dataReturn='clients';
  function closeData(){el('calls-key').value='';if(active==='data')navigate(dataReturn);}
  function keyStatus(){el('calls-key-status').textContent=callsKey?'Clave disponible en memoria para esta sesión. Deja el campo vacío para conservarla.':'Sin clave de sesión: las comunicaciones reales están deshabilitadas.';}
  el('close-data').addEventListener('click',closeData);
  el('calls-config').addEventListener('submit',event=>{
    event.preventDefault();
    try{const secret=el('calls-key').value?I.callKey(el('calls-key').value):callsKey;const url=I.saveCallConfig(storage,el('calls-url').value);callsKey=secret;el('calls-url').value=url;el('calls-key').value='';keyStatus();for(const listener of configListeners)listener();el('data-message').textContent='URL del webhook n8n guardada; la clave permanece solo en memoria. No se inició ninguna comunicación.';}
    catch(error){el('data-message').textContent=error.message;}el('data-message').hidden=false;
  });
  el('forget-calls-key').addEventListener('click',()=>{callsKey='';el('calls-key').value='';keyStatus();for(const listener of configListeners)listener();});
  async function readFile(input,kind){
    const file=input.files[0];input.value='';if(!file)return;
    try{
      if(pending)throw new Error('Resuelve o descarta el guardado pendiente antes de cargar archivos.');
      if(file.size>20*1024*1024)throw new Error('El archivo supera el límite de 20 MB.');
      const source=await file.text();
      const candidate=W.readBackup(source);
      if(!g.confirm('Cargar esta base reemplazará clientes, perritos y atenciones y descartará la cotización actual. ¿Quieres continuar?'))return;
      commit(candidate,()=>{for(const module of modules.values())module.onBaseReplaced?.();message('Base completa cargada y guardada.');},'import',true);
    }catch(error){message(error.message,true);el('data-message').textContent=error.message;el('data-message').hidden=false;}
  }
  el('export-master').addEventListener('click',downloadMaster);
  el('import-master').addEventListener('click',()=>el('master-file').click());
  el('master-file').addEventListener('change',()=>readFile(el('master-file')));
  el('export-analytics').addEventListener('click',()=>{try{const csv=g.PetDoctorAnalyticsCsv.exportCsv(workspace);download(new Blob([csv],{type:'text/csv;charset=utf-8'}),'pet-doctor-analitica-'+g.PetDoctorRecords.today()+'.csv');message('CSV completo para Analítica descargado.');}catch(e){message(e.message,true);}});
  el('retry-save').addEventListener('click',retry);el('download-pending').addEventListener('click',downloadPending);
  el('discard-pending').addEventListener('click',()=>{const scope=pending?.scope;if(clearPending()){if(scope==='client')editor.close();else modules.get(scope)?.onLogout?.();message('Candidato descartado. La base guardada no cambió.');}});
  for(const button of document.querySelectorAll('[data-module]'))button.addEventListener('click',()=>navigate(button.dataset.module));
  document.querySelector('.home-header .brand').addEventListener('click',event=>{event.preventDefault();navigate('clients');});
  el('menu-toggle').addEventListener('click',()=>{const expanded=el('menu-toggle').getAttribute('aria-expanded')==='true';el('menu-toggle').setAttribute('aria-expanded',String(!expanded));el('app-nav').classList.toggle('menu-open',!expanded);});
  el('app-nav').addEventListener('keydown',event=>{if(event.key==='Escape'){el('app-nav').classList.remove('menu-open');el('menu-toggle').setAttribute('aria-expanded','false');el('menu-toggle').focus();}});
  const isDirty=()=>!!pending || editor.isOpen() || [...modules.values()].some(module=>module.isDirty?.());
  g.addEventListener('beforeunload',event=>{if(isDirty()){event.preventDefault();event.returnValue='';}});
  el('logout-button').addEventListener('click',event=>{if(isDirty() && !g.confirm('Hay cambios o una operación pendiente. ¿Quieres cerrar sesión y descartarlos?'))event.stopImmediatePropagation();},true);
  g.PetDoctorApplication={getWorkspace:()=>workspace,subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},subscribeConfig(listener){configListeners.add(listener);return()=>configListeners.delete(listener);},register(name,module){modules.set(name,module);},commit,clearPending,hasPending:()=>!!pending,retry,downloadPending,download,message,editor,navigate,sessionChanged,getCallEndpoint:()=>I.readCallConfig(storage),getCallKey:()=>callsKey};
  g.PetDoctorRegistryCsvView.mount(g.PetDoctorApplication);
  g.PetDoctorRegistryCsvView.mount(g.PetDoctorApplication,{kind:'attentions'});
  updateCounts();navigate('clients',{focus:false});if(store.error())message(store.error(),true);
  if(store.migrationPending()){pending={candidate:workspace,onSuccess:()=>message('Migración v3 guardada. La base anterior se conserva.'),scope:'migration',replace:false};el('storage-recovery').hidden=false;}
})(globalThis);
