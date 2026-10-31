(function(g){
  'use strict';
  const W=g.PetDoctorWorkspace,D=g.PetDoctorRecords;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const markup=`    <section id="client-section" class="client-section" aria-labelledby="client-heading">
      <div class="client-heading"><div><span class="section-tag">UN CLIENTE, TODOS SUS PERRITOS</span><h2 id="client-heading">Cliente y perrito</h2><p>Opcional para cotizar. Obligatorio para guardar una atención.</p></div><button type="button" id="new-client" class="secondary-button">＋ Nuevo cliente</button></div>
      <label for="client-search">Buscar por nombre, DNI, teléfono, correo o perrito</label><input id="client-search" type="search" placeholder="Ej. Ana, 00123456 o Luna" maxlength="200" autocomplete="off" aria-controls="client-results"><div id="client-results" class="client-results"></div><p id="client-results-status" class="field-hint" role="status"></p>
      <div class="client-selectors"><label for="owner-select">Cliente<select id="owner-select"><option value="">Selecciona un cliente</option></select></label><label for="pet-select">Perrito<select id="pet-select" disabled><option value="">Selecciona un perrito</option></select></label></div>
      <div class="client-actions"><button type="button" id="add-pet" class="secondary-button" disabled>＋ Agregar perrito</button><button type="button" id="edit-client" class="secondary-button" disabled>Editar datos</button><button type="button" id="anonymous-quote" class="text-button">Cotizar sin registro</button></div><p id="client-selection-status" class="field-hint" role="status"></p>
    </section>
`;
  const editorMarkup=`    <dialog id="client-dialog" class="client-dialog" aria-labelledby="client-dialog-title"><form id="client-form" novalidate>
      <div class="dialog-heading"><h2 id="client-dialog-title">Nuevo cliente</h2><button type="button" id="cancel-client-top" class="secondary-button" aria-label="Cerrar registro">Cerrar ✕</button></div>
      <p id="client-form-intro" class="field-hint"></p><div id="owner-fields" class="owner-fields"></div><datalist id="breed-options"><option value="Mestizo"></option><option value="Desconocida"></option></datalist>
      <div class="client-pets-heading"><h3>Sus perritos</h3><button type="button" id="add-draft-pet" class="text-button">＋ Otro perrito</button></div><div id="draft-pets"></div><p id="duplicate-pet-warning" class="field-hint" role="status"></p>
      <div id="client-form-error" class="error" role="alert" tabindex="-1" hidden></div><div id="client-form-recovery" hidden><p class="field-hint">El registro sigue pendiente. También puedes descargarlo junto con la base.</p><button type="button" class="secondary-button" id="client-recovery-link">Abrir Datos y sincronización</button></div>
      <div class="client-dialog-actions"><button type="button" id="cancel-client" class="secondary-button">Cancelar</button><button type="submit" class="primary-button" id="save-client">Guardar y seleccionar</button></div>
    </form></dialog>`;
  function mount(options){
    const el=id=>document.getElementById(id);
    function render() {
      const workspace = options.getWorkspace(), selection = options.getSelection();
      const owner = workspace.owners.find(item => item.id === selection.ownerId);
      const pets = workspace.pets.filter(pet => pet.ownerId === owner?.id);
      const ownerOption = item => `<option value="${esc(item.id)}"${item.id === selection.ownerId ? ' selected' : ''}>${esc(item.name || 'Sin nombre')} · DNI ${esc(item.dni || 'pendiente')} · ${esc(item.contact || 'sin teléfono')}${W.completeOwner(item) ? '' : ' · Incompleto'}</option>`;
      // Evita un selector enorme: muestra las coincidencias y conserva la selección actual.
      const found = W.search(workspace, el('client-search').value);
      const matchingOwners = [...new Map(found.items.map(item => [item.owner.id, item.owner])).values()];
      if (owner && !matchingOwners.some(item => item.id === owner.id)) matchingOwners.unshift(owner);
      el('owner-select').innerHTML = '<option value="">Selecciona un cliente</option>' + matchingOwners.map(ownerOption).join('');
      el('owner-select').value = owner?.id || '';
      el('pet-select').innerHTML = '<option value="">Selecciona un perrito</option>' + pets.map(pet => `<option value="${esc(pet.id)}"${pet.id === selection.petId ? ' selected' : ''}>${esc(pet.name || 'Sin nombre')} · ${esc(pet.id.slice(-8))}</option>`).join('');
      el('pet-select').value = pets.some(pet => pet.id === selection.petId) ? selection.petId : '';
      const locked = options.isLocked();
      el('owner-select').disabled = locked;
      el('pet-select').disabled = !owner || locked;
      el('add-pet').disabled = !owner || locked;
      el('new-client').disabled = locked;
      el('anonymous-quote').disabled = locked;
      el('edit-client').disabled = !owner;
      el('client-results').innerHTML = el('client-search').value.trim() ? found.items.map(item => `<button type="button" class="client-result" data-owner-id="${esc(item.owner.id)}"${item.pet ? ` data-pet-id="${esc(item.pet.id)}"` : ''}${locked ? ' disabled' : ''}><strong>${esc(item.pet ? item.pet.name + ' · ' + item.owner.name : item.owner.name || 'Cliente sin nombre')}</strong><span>DNI ${esc(item.owner.dni || 'pendiente')} · ${esc(item.owner.contact || 'sin teléfono')}${item.pet ? ' · Perrito ' + esc(item.pet.id.slice(-8)) : ''}</span></button>`).join('') : '';
      el('client-results-status').textContent = found.total > 20 ? 'Se muestran hasta 20 resultados. Afina la búsqueda para ver más.' : el('client-search').value.trim() ? (found.total ? found.total + ' coincidencias. Selecciona un resultado.' : 'Sin coincidencias. Puedes registrar un nuevo cliente.') : workspace.owners.length + ' clientes guardados. Busca o selecciona uno.';
      el('client-selection-status').textContent = locked ? 'Esta atención conserva su cliente y perrito. Usa «Nueva» para registrar otra.' : owner && !W.completeOwner(owner) ? 'Cliente incompleto: completa nombre, DNI y teléfono en «Editar datos».' : owner && !selection.petId ? 'Selecciona uno de sus perritos o agrega uno nuevo.' : selection.petId ? 'Cliente y perrito seleccionados. Los cambios de tarifa afectan solo esta atención.' : 'Puedes generar el PDF sin registro. Para guardar la atención, selecciona un cliente y su perrito.';
    }
    for(const [id,mode] of [['new-client','new'],['add-pet','add'],['edit-client','edit']])el(id).addEventListener('click',event=>{if(mode!=='edit' && options.isLocked())return;options.openEditor(mode,event.currentTarget,{...options.getSelection(),label:'Guardar y seleccionar',onSaved:options.onSelect});});
    el('client-search').addEventListener('input', render);
    el('owner-select').addEventListener('change', event => { options.onSelect(event.target.value || null, null); render(); });
    el('pet-select').addEventListener('change', event => { options.onSelect(el('owner-select').value || null, event.target.value || null); render(); });
    el('anonymous-quote').addEventListener('click', () => { options.onClear(); render(); });
    el('client-results').addEventListener('click', event => {
      const result = event.target.closest('[data-owner-id]');
      if (result && !options.isLocked()) { options.onSelect(result.dataset.ownerId, result.dataset.petId || null); render(); }
    });
    render();return {render};
  }
  function mountEditor(options){
    const el=id=>document.getElementById(id);
    const dialog=el('client-dialog'),form=el('client-form');
    let draft=null,opener=null,mode='new',savedCallback=()=>{},selectionPetId=null;
    function petMarkup(pet, index) {
      const ref=pet.ageReference;
      return `<fieldset class="draft-pet" data-draft-index="${index}"><legend>Perrito ${index + 1}${pet.id ? ' · ' + esc(pet.id.slice(-8)) : ''}</legend><label>Nombre del perrito *<input data-pet-key="name" value="${esc(pet.name)}" maxlength="200" required autocomplete="off"></label><p>Especie: Canino</p><div class="pet-record-options"><label>Raza *<input data-pet-key="breed" value="${esc(pet.breed||'')}" maxlength="200" list="breed-options" required></label><label>Sexo *<select data-pet-key="sex" required><option value="">Selecciona</option>${[['male','Macho'],['female','Hembra'],['undetermined','No determinado']].map(([v,t])=>`<option value="${v}"${pet.sex===v?' selected':''}>${t}</option>`).join('')}</select></label></div><fieldset class="age-fields"><legend>Edad ${ref?'registrada':'al registrar'} · referencia ${esc(pet.correctAge?D.today():ref?.asOf||pet.ageAsOf||D.today())}</legend>${ref?`<p>${esc(D.ageLabel(ref))} · Nacimiento estimado: ${esc(ref.estimatedBirthDate)}</p><label><input type="checkbox" data-pet-key="correctAge"${pet.correctAge?' checked':''}>Corregir edad a la fecha de hoy</label>`:''}<div class="pet-record-options"><label>Años *<input data-pet-key="ageYears" type="number" min="0" step="1" value="${esc(pet.ageYears??ref?.years??'')}"${ref&&!pet.correctAge?' disabled':''}></label><label>Meses (0–11) *<input data-pet-key="ageMonths" type="number" min="0" max="11" step="1" value="${esc(pet.ageMonths??ref?.months??'')}"${ref&&!pet.correctAge?' disabled':''}></label></div><p class="field-hint">Se calcula un nacimiento estimado. La edad avanza al consultar la ficha.</p></fieldset><div class="pet-record-options"><label>Tamaño o peso<select data-pet-key="sizeMode"><option value="unknown"${!pet.weightKg && !pet.size ? ' selected' : ''}>Sin definir</option><option value="range"${pet.size ? ' selected' : ''}>Por rango</option><option value="weight"${pet.weightKg !== null ? ' selected' : ''}>Peso exacto</option></select></label><label class="draft-weight"${pet.weightKg === null ? ' hidden' : ''}>Peso en kg<input data-pet-key="weightKg" type="number" min="0.01" step="any" value="${pet.weightKg ?? ''}"></label><label class="draft-size"${!pet.size ? ' hidden' : ''}>Rango<select data-pet-key="size"><option value="">Selecciona un rango</option><option value="small"${pet.size === 'small' ? ' selected' : ''}>Pequeño · hasta 10 kg</option><option value="medium"${pet.size === 'medium' ? ' selected' : ''}>Mediano · más de 10 a 25 kg</option><option value="large"${pet.size === 'large' ? ' selected' : ''}>Grande · más de 25 kg</option></select></label><label>Pelaje<select data-pet-key="coat"><option value="">Sin definir</option><option value="short"${pet.coat === 'short' ? ' selected' : ''}>Corto</option><option value="long"${pet.coat === 'long' ? ' selected' : ''}>Largo o denso</option></select></label></div>${!pet.id && index > 0 ? '<button type="button" class="text-button remove-draft-pet">Quitar este perrito del formulario</button>' : ''}</fieldset>`;
    }
    function emptyPet() { return { name: '', weightKg: null, size: null, coat: null,ageAsOf:D.today() }; }
    function readDraft() {
      if (!draft) return;
      form.querySelectorAll('[data-owner-key]').forEach(input => { draft.owner[input.dataset.ownerKey] = input.value; });
      form.querySelectorAll('[data-draft-index]').forEach(fieldset => {
        const pet = draft.pets[Number(fieldset.dataset.draftIndex)];
        pet.name = fieldset.querySelector('[data-pet-key="name"]').value;
        pet.breed=fieldset.querySelector('[data-pet-key="breed"]').value;
        pet.sex=fieldset.querySelector('[data-pet-key="sex"]').value||null;
        pet.correctAge=fieldset.querySelector('[data-pet-key="correctAge"]')?.checked||false;
        pet.ageYears=fieldset.querySelector('[data-pet-key="ageYears"]').value;
        pet.ageMonths=fieldset.querySelector('[data-pet-key="ageMonths"]').value;
        pet.coat = fieldset.querySelector('[data-pet-key="coat"]').value || null;
        const sizeMode = fieldset.querySelector('[data-pet-key="sizeMode"]').value;
        const weight = fieldset.querySelector('[data-pet-key="weightKg"]').value;
        pet.weightKg = sizeMode === 'weight' && weight !== '' ? Number(weight) : null;
        pet.size = sizeMode === 'range' ? fieldset.querySelector('[data-pet-key="size"]').value || null : null;
      });
    }
    function warnings() {
      const existing = options.getWorkspace().pets.filter(pet => pet.ownerId === draft.owner.id && !draft.pets.some(item => item.id === pet.id));
      const names = [...existing, ...draft.pets].map(pet => pet.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()).filter(Boolean);
      el('duplicate-pet-warning').textContent = new Set(names).size < names.length ? 'Hay perritos con el mismo nombre. Se guardarán con códigos diferentes.' : '';
    }
    function open(nextMode, button, selection = {}) {
      const workspace = options.getWorkspace();
      savedCallback = selection.onSaved || (()=>{}); selectionPetId = selection.petId || null;
      const owner = workspace.owners.find(item => item.id === selection.ownerId);
      if (nextMode !== 'new' && !owner) return;
      if(nextMode==='add' && !W.completeOwner(owner)){options.message('Completa nombre, DNI y teléfono en «Editar datos» antes de agregar perritos.',true);return;}
      mode = nextMode; opener = button;
      el('save-client').textContent = selection.label || 'Guardar registro';
      draft = { owner: mode === 'new' ? { name: '', dni: '', contact: '', email:'',district:'' } : { ...owner }, pets: mode === 'edit' ? workspace.pets.filter(pet => pet.ownerId === owner.id).map(pet => ({ ...pet })) : [emptyPet()] };
      el('client-dialog-title').textContent = mode === 'new' ? 'Nuevo cliente y sus perritos' : mode === 'add' ? 'Agregar perrito' : 'Editar cliente y perritos';
      el('client-form-intro').textContent = mode === 'add' ? 'Cliente: ' + owner.name + '. Los nuevos perritos quedarán vinculados a este cliente.' : 'Completa los campos con *. Peso y pelaje son opcionales. Los registros antiguos sin cambios siguen disponibles.';
      el('owner-fields').innerHTML = mode === 'add' && W.completeOwner(owner) ? '' : [['name', 'Nombre completo', 'text'], ['dni', 'DNI peruano', 'text'], ['contact', 'Teléfono', 'tel'], ['email','Correo electrónico','email'],['district','Distrito','text']].map(([key, label, type]) => `<label>${label} <span aria-hidden="true">*</span><input data-owner-key="${key}" type="${type}" value="${esc(draft.owner[key]||'')}" maxlength="${key === 'dni' ? 8 : key === 'email' ? 254 : key==='district'?100:200}"${key === 'dni' ? ' inputmode="numeric" pattern="[0-9]{8}"' : ''} required autocomplete="${key === 'name' ? 'name' : key === 'contact' ? 'tel' : key === 'email' ? 'email' : 'off'}"></label>`).join('');
      el('draft-pets').innerHTML = draft.pets.map(petMarkup).join('');
      for(const fieldset of form.querySelectorAll('[data-draft-index]')){
        const p=draft.pets[Number(fieldset.dataset.draftIndex)];
        if(p.id&&!p.ageReference){fieldset.querySelector('[data-pet-key="breed"]').required=false;fieldset.querySelector('[data-pet-key="sex"]').required=false;}
      }
      el('client-form-error').hidden = true; el('client-form-recovery').hidden = true;
      warnings(); dialog.showModal();
      (form.querySelector('[data-owner-key]') || form.querySelector('[data-pet-key="name"]'))?.focus();
    }
    function close({restoreFocus=true}={}) { const wasOpen=dialog.open;dialog.close();draft=null;options.clearPending('client');if(wasOpen && restoreFocus && opener?.isConnected)opener.focus(); }
    el('cancel-client').addEventListener('click', close); el('cancel-client-top').addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    el('add-draft-pet').addEventListener('click', () => { readDraft(); draft.pets.push(emptyPet()); el('draft-pets').innerHTML = draft.pets.map(petMarkup).join(''); el('draft-pets').lastElementChild.querySelector('input').focus(); options.clearPending('client'); });
    form.addEventListener('click', event => {
      const button = event.target.closest('.remove-draft-pet');
      if (!button) return;
      readDraft(); draft.pets.splice(Number(button.closest('[data-draft-index]').dataset.draftIndex), 1); el('draft-pets').innerHTML = draft.pets.map(petMarkup).join(''); warnings(); options.clearPending('client');
    });
    form.addEventListener('change', event => {
      if(event.target.dataset.petKey==='correctAge'){
        readDraft();const i=Number(event.target.closest('[data-draft-index]').dataset.draftIndex),p=draft.pets[i];
        if(p.correctAge){const age=D.ageAt(p.ageReference);p.ageYears=String(age.years);p.ageMonths=String(age.months);}
        el('draft-pets').innerHTML=draft.pets.map(petMarkup).join('');
      }
      if (event.target.dataset.petKey === 'sizeMode') {
        const fieldset = event.target.closest('[data-draft-index]');
        fieldset.querySelector('.draft-weight').hidden = event.target.value !== 'weight';
        fieldset.querySelector('.draft-size').hidden = event.target.value !== 'range';
      }
    });
    form.addEventListener('input', () => { readDraft(); warnings(); options.clearPending('client'); el('client-form-recovery').hidden = true; });
    form.addEventListener('submit', event => {
      event.preventDefault(); readDraft();
      try {
        form.querySelectorAll('[aria-invalid]').forEach(n=>n.removeAttribute('aria-invalid'));
        const savedOwner=options.getWorkspace().owners.find(o=>o.id===draft.owner.id);
        const unchangedOwner=savedOwner&&['name','dni','contact','email','district'].every(k=>(draft.owner[k]??'')===(savedOwner[k]??''));
        for(const input of form.querySelectorAll('input:not(:disabled),select:not(:disabled)')){
          if(input.dataset.ownerKey&&unchangedOwner)continue;
          const fieldset=input.closest('[data-draft-index]');
          if(fieldset){const p=draft.pets[Number(fieldset.dataset.draftIndex)],old=options.getWorkspace().pets.find(v=>v.id===p.id);if(old&&!old.ageReference&&['name','breed','sex','weightKg','size','coat'].every(k=>(p[k]??null)===(old[k]??null))&&p.ageYears===''&&p.ageMonths==='')continue;}
          if(!input.checkValidity()){input.setAttribute('aria-invalid','true');showError('Completa el campo '+input.closest('label').textContent.trim().toLowerCase()+'.');input.reportValidity();return;}
        }
        for (const fieldset of form.querySelectorAll('[data-draft-index]')) {
          const sizeMode = fieldset.querySelector('[data-pet-key="sizeMode"]').value;
          const pet = draft.pets[Number(fieldset.dataset.draftIndex)];
          const old=options.getWorkspace().pets.find(p=>p.id===pet.id);
          const unchanged=old&&['name','breed','sex','weightKg','size','coat'].every(k=>(pet[k]??null)===(old[k]??null))&&pet.ageYears===''&&pet.ageMonths==='';
          if((!old?.ageReference&&!unchanged)||pet.correctAge){
            if(pet.ageYears===''||pet.ageMonths===''){const input=fieldset.querySelector('[data-pet-key="'+(pet.ageYears===''?'ageYears':'ageMonths')+'"]');input.setCustomValidity('Completa la edad en años y meses.');input.reportValidity();input.setCustomValidity('');return;}
            pet.ageReference=D.makeAge(Number(pet.ageYears),Number(pet.ageMonths),pet.correctAge?D.today():(pet.ageAsOf||D.today()));
          }
          if ((sizeMode === 'weight' && pet.weightKg === null) || (sizeMode === 'range' && !pet.size)) throw new Error('Completa el peso o rango seleccionado, o elige «Sin definir».');
        }
        draft.operation=mode==='add'?'addPets':'save';
        const result = W.saveClient(options.getWorkspace(), draft);
        const selectedPetId = mode === 'edit' ? selectionPetId || result.petId : result.petId;
        options.commit(result.workspace, () => {
          const callback=savedCallback;close();callback(result.ownerId,selectedPetId,true);options.message('Registro guardado. '+result.warning);
        }, 'client');
      } catch (error) { showError(error.message); }
    });
    function showError(message, recover = false) { el('client-form-error').textContent = message; el('client-form-error').hidden = false; el('client-form-recovery').hidden = !recover; el('client-form-error').focus(); }
    el('client-recovery-link').addEventListener('click',()=>{dialog.close();options.navigate('data');});
    return {open,close,showError,isOpen:()=>dialog.open};
  }
  g.PetDoctorClients={markup,editorMarkup,mount,mountEditor};
})(globalThis);
