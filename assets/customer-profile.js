(function(g){
  'use strict';
  const App=g.PetDoctorApplication,W=g.PetDoctorWorkspace,H=g.PetDoctorHistory,I=g.PetDoctorIntegration;
  const el=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=cents=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(cents/100);
  el('customers-content').innerHTML=`<div class="module-heading"><div><span class="section-tag">CONOCE A QUIENES CONFÍAN EN TI</span><h1 id="clients-title" tabindex="-1">Clientes</h1><p>Su información, sus perritos y cada atención, en un solo lugar.</p></div><button type="button" id="directory-new" class="primary-button">＋ Nuevo cliente</button></div>
    <section id="client-directory" aria-label="Buscar clientes"><label for="directory-search">Buscar cliente o perrito<input id="directory-search" type="search" maxlength="200" placeholder="Nombre, DNI, teléfono, correo o perrito" autocomplete="off"></label><p id="directory-count" class="field-hint" role="status"></p><div id="directory-results" class="directory-results"></div></section>
    <section id="customer-profile" hidden aria-labelledby="profile-title"><button type="button" id="profile-back" class="text-button">← Volver a clientes</button><div id="profile-card"></div><div id="profile-history-root">${g.PetDoctorHistoryView.markupFor('profile-')}</div></section>
    <dialog id="communication-dialog" class="communication-dialog" aria-labelledby="communication-title"><form id="communication-form" novalidate><div class="dialog-heading"><h2 id="communication-title">Llamar al cliente</h2><button type="button" id="communication-close" class="secondary-button">Cerrar ✕</button></div><p id="communication-mode" class="test-badge">LLAMADA REAL · DEMOSTRACIÓN CONTROLADA</p><p id="communication-explanation"></p><label id="communication-phone-label">Teléfono con prefijo internacional<input id="communication-phone" type="tel" placeholder="+51999123456" maxlength="32"></label><p id="communication-phone-hint" class="field-hint"></p><label>Mensaje<textarea id="communication-message" rows="4"></textarea></label><p id="call-counter" class="field-hint" role="status" hidden>0/120</p><p class="field-hint">El contacto pertenece a la ficha. Para corregirlo permanentemente usa «Editar datos».</p><button type="submit" id="communication-run" class="primary-button">Revisar llamada</button><section id="call-review" class="call-review" aria-labelledby="call-review-title" tabindex="-1" hidden><h3 id="call-review-title">Revisar llamada real</h3><dl><div><dt>Cliente</dt><dd id="call-review-client"></dd></div><div><dt>Teléfono</dt><dd id="call-review-phone"></dd></div><div><dt>Mensaje que se leerá</dt><dd id="call-review-message"></dd></div></dl><p>Twilio intentará llamar a este número. El flujo trial actual reproduce una plantilla; la lectura del mensaje personalizado está pendiente. Cancelar la espera no cancela una llamada iniciada.</p><button type="button" id="call-confirm" class="primary-button">Confirmar llamada real</button><button type="button" id="call-edit" class="secondary-button">Editar mensaje</button></section><button type="button" id="call-new" class="secondary-button" hidden>Preparar nueva llamada</button><div id="communication-result" role="status" aria-live="polite" tabindex="-1" hidden></div></form></dialog>`;
  let selectedId=null,profileHistory,communicationOwnerId=null,busy=false,opener=null,generation=0,review=null,callFinished=false;
  function scopedWorkspace(){const workspace=App.getWorkspace();return {...workspace,attentions:workspace.attentions.filter(a=>(a.registration?.ownerId||a.quote.state.pet.ownerId)===selectedId)};}
  function openProfile(id){selectedId=id;profileHistory.close({restoreFocus:false});profileHistory.reset();render();el('profile-title')?.focus();}
  function newClient(button){App.editor.open('new',button,{onSaved:id=>openProfile(id)});}
  function render(){
    const workspace=App.getWorkspace(),q=el('directory-search').value;
    const found=W.search(workspace,q,10000),owners=[...new Map(found.items.map(item=>[item.owner.id,item.owner])).values()];
    el('directory-count').textContent=owners.length+' clientes encontrados.'+(owners.length>50?' Se muestran 50; afina tu búsqueda.':'');
    el('directory-results').innerHTML=owners.length?owners.slice(0,50).map(owner=>`<button type="button" class="directory-card" data-profile-id="${esc(owner.id)}"><strong>${esc(owner.name||'Cliente sin nombre')}</strong><span>DNI ${esc(owner.dni||'pendiente')} · ${esc(owner.contact||'sin teléfono')}</span><span>${esc(owner.email||'Correo pendiente')}</span><small>${workspace.pets.filter(p=>p.ownerId===owner.id).length} perritos · Abrir ficha →</small></button>`).join(''):'<p class="empty-state">No hay clientes que coincidan. Puedes registrar uno nuevo.</p>';
    const owner=workspace.owners.find(item=>item.id===selectedId);
    if(!owner){selectedId=null;el('customer-profile').hidden=true;el('client-directory').hidden=false;profileHistory?.render();return;}
    el('client-directory').hidden=true;el('customer-profile').hidden=false;
    const pets=workspace.pets.filter(p=>p.ownerId===owner.id),rows=H.rows(scopedWorkspace());
    const date=rows.length?rows[0].date.split('-').reverse().join('/')+' · '+rows[0].time:'Sin atenciones';
    el('profile-card').innerHTML=`<div class="profile-heading"><div><span class="section-tag">FICHA CLIENTE</span><h2 id="profile-title" tabindex="-1">${esc(owner.name||'Cliente sin nombre')}</h2><p class="field-hint">Código ${esc(owner.id)}</p></div><button type="button" id="profile-edit" class="secondary-button">Editar datos</button></div><dl class="profile-data"><div><dt>DNI</dt><dd>${esc(owner.dni||'Pendiente')}</dd></div><div><dt>Teléfono</dt><dd>${esc(owner.contact||'Pendiente')}</dd></div><div><dt>Correo electrónico</dt><dd>${esc(owner.email||'Correo pendiente')}</dd></div></dl>
      <div class="profile-stats"><div><strong>${rows.length}</strong><span>Atenciones realizadas</span></div><div><strong>${money(rows.reduce((sum,row)=>sum+row.total,0))}</strong><span>Total acumulado</span></div><div><strong>${date}</strong><span>Última atención · Lima</span></div></div>
      <section class="profile-pets" aria-label="Perritos del cliente"><div class="profile-heading"><h3>Sus perritos</h3><button type="button" id="profile-add-pet" class="secondary-button">＋ Agregar perrito</button></div><div class="pet-card-grid">${pets.map(p=>`<article class="profile-pet"><h4>${esc(p.name||'Sin nombre')}</h4><p>${p.weightKg!==null?esc(p.weightKg)+' kg':p.size?esc(g.PetDoctorCatalog.sizes[p.size].name):'Tamaño pendiente'} · ${p.coat==='long'?'Pelaje largo o denso':p.coat==='short'?'Pelaje corto':'Pelaje pendiente'}</p><small>Código ${esc(p.id)}</small><button type="button" class="text-button" data-edit-profile-pet="${esc(p.id)}">Editar datos</button></article>`).join('')||'<p>Este cliente todavía no tiene perritos registrados.</p>'}</div></section>
      <section class="profile-communications" aria-label="Comunicaciones"><h3>Comunicaciones</h3><p>Llamadas reales de demostración a destinos autorizados en el único workflow n8n. El envío de correo está pendiente de integración.</p><div class="data-actions"><button type="button" id="profile-email" class="secondary-button" disabled>Enviar correo · Pendiente</button><button type="button" id="profile-phone" class="secondary-button"${I.validCallPhone(owner.contact)&&App.getCallEndpoint()&&App.getCallKey()?'':' disabled'}>Llamar</button></div><p class="field-hint">Para llamar, configura la URL de llamadas y la clave de sesión en Datos y respaldos. El destino debe estar autorizado en n8n.</p>${!I.validCallPhone(owner.contact)?'<p class="field-hint">Corrige el teléfono con prefijo internacional en «Editar datos» para poder llamar.</p>':''}</section>`;
    profileHistory?.render();
  }
  function openCall(button){
    if(busy)return;
    const owner=App.getWorkspace().owners.find(item=>item.id===selectedId);if(!owner)return;
    if((!I.validCallPhone(owner.contact)||!App.getCallEndpoint()||!App.getCallKey())){App.message('Completa el teléfono internacional y la conexión de llamadas en Datos y respaldos.',true);return;}
    communicationOwnerId=owner.id;opener=button;generation++;busy=false;review=null;callFinished=false;
    el('communication-title').textContent='Llamar al cliente';
    el('communication-mode').textContent='LLAMADA REAL · DEMOSTRACIÓN CONTROLADA';
    el('communication-explanation').textContent='Escribe un mensaje de hasta 120 caracteres. Revisa el destinatario y confirma antes de solicitar la llamada.';
    el('communication-phone').value=I.normalizePhone(owner.contact);el('communication-phone').readOnly=true;
    el('communication-phone-hint').textContent='Teléfono tomado del registro del cliente. Para cambiarlo usa «Editar datos».';
    el('communication-message').value='';
    el('communication-message').readOnly=false;el('communication-message').setAttribute('aria-describedby','call-counter');
    el('communication-result').hidden=true;el('communication-run').hidden=false;el('communication-run').textContent='Revisar llamada';
    el('call-review').hidden=true;el('call-new').hidden=true;el('call-counter').hidden=false;el('communication-close').disabled=false;el('call-confirm').disabled=false;el('call-edit').disabled=false;
    updateCounter();el('communication-dialog').showModal();el('communication-message').focus();
  }
  function updateCounter(){
    const count=I.callMessageLength(el('communication-message').value);el('call-counter').textContent=count+'/120';
    el('communication-message').setAttribute('aria-invalid',String(count<1||count>120));
    el('communication-run').disabled=busy||count<1||count>120;
  }
  function closeCommunication({restoreFocus=true,force=false}={}){
    if(busy&&!force)return false;
    const open=el('communication-dialog').open;generation++;busy=false;review=null;el('communication-dialog').close();el('communication-run').disabled=false;
    if(open&&restoreFocus){const target=opener?.isConnected?opener:el('profile-phone');target?.focus();}return true;
  }
  function showResult(result,requestId=''){
    const box=el('communication-result');box.hidden=false;box.className='communication-result '+(result.kind==='accepted'?'is-expected':'is-error');
    box.replaceChildren();const paragraph=document.createElement('p');paragraph.textContent=result.message;box.append(paragraph);
    if(result.errors?.length){const list=document.createElement('ul');for(const error of result.errors){const li=document.createElement('li');li.textContent=error;list.append(li);}box.append(list);}
    if(result.callSid){const call=document.createElement('p');call.textContent='ID Twilio: '+result.callSid+' · Estado inicial: '+result.providerStatus;box.append(call);}
    if(requestId){const reference=document.createElement('small');reference.textContent='Solicitud: '+requestId;box.append(reference);}box.focus();
  }
  el('communication-message').addEventListener('input',updateCounter);
  el('communication-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    const owner=App.getWorkspace().owners.find(item=>item.id===communicationOwnerId);
    if(review||callFinished)return;
      try{
        I.callEndpoint(App.getCallEndpoint());I.callKey(App.getCallKey());
        if(!owner||I.normalizePhone(owner.contact)!==el('communication-phone').value)throw new Error('El teléfono del cliente cambió. Cierra y vuelve a abrir la llamada para revisarlo.');
        const payload=I.prepareCall(owner,{message:el('communication-message').value});
        review={payload,name:owner.name};el('call-review-client').textContent=owner.name;el('call-review-phone').textContent=payload.phone;el('call-review-message').textContent=payload.message;
        el('communication-message').readOnly=true;el('communication-run').hidden=true;el('call-review').hidden=false;el('communication-result').hidden=true;el('call-review').focus();
      }catch(error){showResult({kind:'validation',message:error.message});}
  });
  el('call-edit').addEventListener('click',()=>{if(busy)return;review=null;el('call-review').hidden=true;el('communication-message').readOnly=false;el('communication-run').hidden=false;updateCounter();el('communication-message').focus();});
  el('call-confirm').addEventListener('click',async()=>{
    if(busy||!review||callFinished)return;
    const owner=App.getWorkspace().owners.find(item=>item.id===communicationOwnerId);
    if(!owner||I.normalizePhone(owner.contact)!==review.payload.phone){showResult({kind:'validation',message:'El cliente ya no existe o su teléfono cambió. Cierra y vuelve a revisar la llamada.'});return;}
    try{I.callEndpoint(App.getCallEndpoint());I.callKey(App.getCallKey());I.validateCallPayload(review.payload);}catch(error){showResult({kind:'validation',message:error.message});return;}
    const token=++generation,payload=review.payload;busy=true;el('call-confirm').disabled=true;el('call-edit').disabled=true;el('communication-close').disabled=true;el('communication-result').hidden=false;el('communication-result').textContent='Solicitando la llamada a Twilio. Espera la respuesta; cerrar la página no cancela una llamada iniciada.';
    try{const result=await I.runCall(App.getCallEndpoint(),payload,App.getCallKey());if(token===generation)showResult(result,payload.requestId);}
    catch{if(token===generation)showResult({kind:'unknown',message:I.UNKNOWN_CALL},payload.requestId);}
    finally{if(token===generation){busy=false;callFinished=true;el('communication-close').disabled=false;el('call-review').hidden=true;el('call-new').hidden=false;}}
  });
  el('call-new').addEventListener('click',()=>{if(!busy)openCall(opener);});
  el('communication-close').addEventListener('click',()=>closeCommunication());el('communication-dialog').addEventListener('cancel',event=>{event.preventDefault();closeCommunication();});
  el('directory-new').addEventListener('click',event=>newClient(event.currentTarget));el('directory-search').addEventListener('input',render);
  el('directory-results').addEventListener('click',event=>{const button=event.target.closest('[data-profile-id]');if(button)openProfile(button.dataset.profileId);});
  el('profile-back').addEventListener('click',()=>{profileHistory.close({restoreFocus:false});selectedId=null;render();el('directory-search').focus();});
  el('profile-card').addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.id==='profile-phone')openCall(button);
    else if(button.id==='profile-edit'||button.id==='profile-add-pet'||button.dataset.editProfilePet)App.editor.open(button.id==='profile-add-pet'?'add':'edit',button,{ownerId:selectedId,petId:button.dataset.editProfilePet,onSaved:id=>{selectedId=id;render();el('profile-title').focus();}});
  });
  profileHistory=g.PetDoctorHistoryView.mount({getWorkspace:scopedWorkspace,download:App.download,prefix:'profile-',hideOwnerFilter:true});
  el('profile-history-toggle').firstChild.textContent='Atenciones del cliente ';
  App.subscribe(()=>{if(communicationOwnerId&&!busy&&!App.getWorkspace().owners.some(owner=>owner.id===communicationOwnerId))closeCommunication({restoreFocus:false});render();});
  App.subscribeConfig(render);
  App.register('clients',{isDirty:()=>busy,canLeave:()=>!busy,onHide:()=>{closeCommunication({restoreFocus:false});profileHistory.close({restoreFocus:false});},onLogout:()=>{closeCommunication({restoreFocus:false,force:true});profileHistory.close({restoreFocus:false});selectedId=null;el('directory-search').value='';render();},onBaseReplaced:()=>{selectedId=null;profileHistory.reset();render();}});
  render();
})(globalThis);
