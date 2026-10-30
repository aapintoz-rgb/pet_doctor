(function () {
  'use strict';
  const C = window.PetDoctorCatalog, P = window.PetDoctorPricing, F = window.PetDoctorFiles;
  const W = window.PetDoctorWorkspace;
  const root = document.querySelector('#home-content');
  const App=window.PetDoctorApplication;
  let state = window.PetDoctorDefaults(), active = 'consulta', dirty = false, quotesMaster = App.getWorkspace();
  let clients, history;
  let meta = newMeta(), importedNotice = '';
  function newMeta() { return { id: globalThis.crypto?.randomUUID?.() || 'PD-' + Date.now() + '-' + Math.random().toString(36).slice(2,8), createdAt: new Date().toISOString() }; }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const money = cents => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(cents / 100);
  const gross = cents => money(cents + Math.round(cents * C.taxPercent / 100));
  const asset = id => 'assets/images/' + C.services[id].image + '.webp';
  const selected = (a,b) => a === b ? ' checked' : '';
  const check = value => value ? ' checked' : '';
  function option(field, value, label, price, description = '', checked = false) {
    return `<label class="choice-card${checked ? ' chosen' : ''}"><input type="radio" name="${field}" data-field="${field}" value="${value}"${check(checked)}><span><strong>${label}</strong>${description ? `<span class="choice-description">${description}</span>` : ''}${price !== null ? `<span class="choice-price">${gross(price)} <small>con IGV</small></span><span class="base-price">Base ${money(price)}</span>` : ''}</span></label>`;
  }
  function addon(field, label, price, checked, item = '') {
    return `<label class="addon"><span><input type="checkbox" data-field="${field}"${item ? ` value="${item}"` : ''}${check(checked)}><span>${label}</span></span><span class="addon-price">+ ${gross(price)}<small>Base ${money(price)}</small></span></label>`;
  }
  function selectionButton(field, value, label, description, current) {
    return `<label class="segment${String(current) === value ? ' chosen' : ''}"><input type="radio" name="${field}" data-field="${field}" value="${value}"${selected(String(current),value)}><span><strong>${label}</strong>${description ? `<small>${description}</small>` : ''}</span></label>`;
  }
  root.classList.add('quote-root');
  root.innerHTML = `
    <section class="quote-intro"><div><span class="section-tag">UN POCO DE PLANIFICACIÓN, MUCHO CARIÑO</span><h1>Cotiza sus cuidados<span>.</span></h1><p>Elige sus servicios. Nosotros hacemos las cuentas.</p><span class="academic-badge">Tarifas académicas · Sin registro previo</span></div><img src="${asset('guarderia')}" alt="" width="280" height="190" class="intro-illustration"></section>
    <div class="quote-toolbar"><p class="field-hint">PDF libre · Atenciones vinculadas a un cliente y su perrito</p><div class="file-tools"><button type="button" id="import-quote" class="text-button">↑ Cargar cotización</button><button type="button" id="new-quote" class="text-button">＋ Nueva</button></div></div>
    ${window.PetDoctorClients.markup}
    <section id="pet-fields" class="pet-fields" aria-label="Datos compartidos de la mascota"></section>
    <div class="quote-layout"><section class="service-workspace" aria-label="Configurar servicios"><div class="service-tabs" role="tablist" aria-label="Servicios">${Object.entries(C.services).map(([id,s],i) => `<button type="button" id="tab-${id}" class="service-tab" role="tab" aria-controls="service-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab="${id}"><img src="${asset(id)}" alt="" width="100" height="78" ${i ? 'loading="lazy"' : ''}><span>${s.short}</span><small class="tab-check" aria-label="Incluido" hidden>✓</small></button>`).join('')}</div><section id="service-panel" role="tabpanel" aria-labelledby="tab-consulta" tabindex="0"></section></section>
    <aside id="summary" class="quote-summary" aria-labelledby="summary-title"></aside></div>
    ${window.PetDoctorHistoryView.markup}
    <p class="quote-footer">Hecho para cuidar mejor. <span>Pet Doctor · Cotización académica en soles</span></p>
    <div class="mobile-total"><div><small id="mobile-total-label">Total con IGV</small><strong id="mobile-total-value">${money(0)}</strong></div><button type="button" id="open-detail" class="primary-button">Ver detalle ↑</button></div>
    <dialog id="summary-dialog" aria-labelledby="mobile-summary-title"><div class="dialog-heading"><h2 id="mobile-summary-title">Tu cotización</h2><button type="button" id="close-detail" class="secondary-button">Cerrar ✕</button></div><div id="mobile-summary-body"></div></dialog>
    <input type="file" id="quote-file" accept=".json,application/json" hidden>
    <div id="price-announcement" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>`;
  const el = id => document.getElementById(id);
  let announceTimer;
  const message=App.message,triggerDownload=App.download,commit=App.commit,clearPending=App.clearPending;
  function sizeNeeded() { return ['desparasitacion','grooming','guarderia'].includes(active) || ['desparasitacion','grooming','guarderia'].some(id => state.selections[id].included); }
  function petFields() {
    const p = state.pet, size = P.sizeOf(p), needed = sizeNeeded();
    el('pet-fields').hidden = !needed && !p.petId;
    el('pet-fields').innerHTML = `${p.petId ? `<p class="registered-note">✓ Datos del registro: <strong>${esc(p.name || 'Sin nombre')}</strong> · ${esc(p.ownerName)} <span>Los cambios solo afectan esta cotización.</span></p>` : ''}${needed ? `<div class="pet-title"><div><h2>¿De qué tamaño es?</h2><p>Este dato se comparte entre todos sus servicios.</p></div><label class="weight-toggle"><input type="checkbox" data-field="weight-mode"${check(p.sizeMode === 'weight')}>Conozco su peso</label></div>${p.sizeMode === 'range' ? `<fieldset class="size-options"><legend class="sr-only">Rango de peso</legend>${Object.entries(C.sizes).map(([id,s]) => selectionButton('pet.size',id,s.name,s.range,p.size)).join('')}</fieldset>` : `<div class="weight-input"><label for="weight-input">Peso en kilogramos</label><input id="weight-input" type="number" min="0.01" step="any" inputmode="decimal" data-field="pet.weightKg" value="${p.weightKg ?? ''}" placeholder="Ej. 12,5"><span id="weight-range" class="field-hint">${size ? C.sizes[size].name + ' · ' + C.sizes[size].range : 'Ingresa un peso mayor que cero.'}</span></div>`}<p class="field-hint">${p.sizeMode === 'range' ? 'No necesitas el peso exacto para obtener una cotización por rango.' : 'El rango se calcula automáticamente; no se cobra por cada kilogramo.'}</p>` : ''}`;
  }
  function serviceOptions() {
    const id = active, s = state.selections[id], p = state.pet;
    if (id === 'consulta') return `<fieldset class="plan-options two"><legend>Tipo de consulta</legend>${option('consulta.kind','first','Primera consulta',C.consultation.first,'Una primera revisión general.',s.kind === 'first')}${option('consulta.kind','followup','Control',C.consultation.followup,'Seguimiento de una consulta anterior.',s.kind === 'followup')}</fieldset><h3>Un extra, si lo necesitas</h3>${addon('consulta.report','Informe escrito ampliado',C.consultation.report,s.report)}`;
    if (id === 'vacunas') return `<fieldset class="addon-list"><legend>Elige las aplicaciones</legend>${Object.entries(C.vaccines).map(([k,v]) => addon('vacunas.items',v.name,v.price,s.items.includes(k),k)).join('')}</fieldset><p class="service-note">Incluye administración, sin consulta adicional automática. La selección está sujeta a revisión veterinaria; aquí no se determina un calendario de vacunación.</p>`;
    if (id === 'desparasitacion') {
      const size = P.sizeOf(p) || 'small', prefix = P.sizeOf(p) ? '' : 'Desde · ';
      return `<fieldset class="plan-options"><legend>Modalidad ${P.sizeOf(p) ? '' : '· precios desde tamaño pequeño'}</legend>${option('desparasitacion.kind','internal',prefix+'Interna',C.deworming.internal[size],'Cuidado interno.',s.kind === 'internal')}${option('desparasitacion.kind','external',prefix+'Externa',C.deworming.external[size],'Cuidado externo.',s.kind === 'external')}${option('desparasitacion.kind','both',prefix+'Ambas',C.deworming.internal[size]+C.deworming.external[size]-C.deworming.discount,'Ahorra '+money(C.deworming.discount)+' antes de IGV.',s.kind === 'both')}</fieldset><p class="service-note">Tarifa por rango de peso. La evaluación veterinaria determina el producto y su dosis; el cotizador no los prescribe.</p>`;
    }
    if (id === 'grooming') {
      const factor = C.sizes[P.sizeOf(p) || 'small'].factor;
      const apply = v => Math.round(v * factor / 100);
      return `<fieldset class="mode-options"><legend>¿Cómo prefieres elegir?</legend>${selectionButton('grooming.mode','plan','Un plan','Cuidados que combinan bien.',s.mode)}${selectionButton('grooming.mode','individual','A mi medida','Componentes individuales.',s.mode)}</fieldset>
      ${s.mode === 'plan' ? `<fieldset class="plan-options"><legend>Planes ${P.sizeOf(p) ? 'para tamaño ' + C.sizes[P.sizeOf(p)].name.toLowerCase() : '· precios desde tamaño pequeño'}</legend>${Object.entries(C.grooming.plans).map(([k,v]) => { const base=v.components.reduce((sum,k)=>sum+C.grooming.components[k].price,0)-v.discount; return option('grooming.plan',k,v.name,apply(base),v.components.map(k=>C.grooming.components[k].name).join(' · ')+(v.discount ? `<span class="plan-saving">Descuento base ${money(v.discount)}</span>`:''),s.plan===k); }).join('')}</fieldset><h3>Un toque adicional</h3>${addon('grooming.hydration','Hidratación cosmética',apply(C.grooming.components.hydration.price),s.hydration)}` : `<fieldset class="addon-list"><legend>Componentes ${P.sizeOf(p) ? 'ajustados a su tamaño' : '· precios desde tamaño pequeño'}</legend>${Object.entries(C.grooming.components).map(([k,v])=>addon('grooming.items',v.name,apply(v.price),s.items.includes(k),k)).join('')}</fieldset>`}
      ${P.needsCoat(s) ? `<div class="coat-fields"><h3>Dos detalles para afinar el precio</h3><fieldset class="mode-options"><legend>Tipo de pelaje</legend>${selectionButton('pet.coat','short','Corto','Sin suplemento',p.coat)}${selectionButton('pet.coat','long','Largo o denso','+ '+gross(C.grooming.coat)+' con IGV',p.coat)}</fieldset><fieldset class="mode-options"><legend>¿Necesita desenredado por nudos?</legend>${selectionButton('pet.knots','false','No','Sin suplemento',p.knots)}${selectionButton('pet.knots','true','Sí','+ '+gross(C.grooming.knots)+' con IGV',p.knots)}</fieldset></div>` : ''}<p class="service-note">Los precios de planes y componentes reflejan el tamaño elegido. Pelaje y nudos se agregan una sola vez, cuando corresponden.</p>`;
    }
    if (id === 'guarderia') {
      const adj = C.sizes[P.sizeOf(p) || 'small'].daycare;
      return `<fieldset class="plan-options two"><legend>Duración ${P.sizeOf(p) ? '' : '· precios desde tamaño pequeño'}</legend>${option('guarderia.duration','half','Media jornada',C.daycare.half+adj,'Hasta 4 horas.',s.duration==='half')}${option('guarderia.duration','full','Jornada completa',C.daycare.full+adj,'Hasta 8 horas.',s.duration==='full')}</fieldset><h3>Haz su día más especial</h3>${addon('guarderia.walk','Paseo individual de 20 minutos',C.daycare.walk,s.walk)}${addon('guarderia.food','Alimentación del establecimiento',C.daycare.food,s.food)}<p class="service-note">Una jornada diurna. Cotizar no reserva disponibilidad. No incluye alojamiento nocturno.</p>`;
    }
    return `<fieldset class="plan-options"><legend>Elige su experiencia de aprendizaje</legend>${Object.entries(C.learning).map(([k,v])=>option('inteligencia.plan',k,v.name,v.price,v.description,s.plan===k)).join('')}</fieldset><p class="service-note">Evaluación orientativa de aprendizaje y resolución de tareas. No es un diagnóstico ni una comparación entre razas. Las sesiones se cotizan sin agendarlas.</p>`;
  }
  function panel() {
    const s = C.services[active];
    el('service-panel').setAttribute('aria-labelledby','tab-'+active);
    el('service-panel').innerHTML = `<div class="service-heading"><div><span class="section-tag">CUIDADOS A SU MEDIDA</span><h2>${s.name}</h2><p>${s.description}</p></div><img src="${asset(active)}" width="160" height="125" alt=""></div><label class="include-control"><input type="checkbox" data-field="${active}.included"${check(state.selections[active].included)}><span>Incluir en cotización</span><span class="include-state">${state.selections[active].included ? 'Incluido ✓' : 'Sin agregar'}</span></label><div class="service-options">${serviceOptions()}</div><div id="service-feedback"></div>`;
    updateTabs(); feedback();
  }
  function updateTabs() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      const id = btn.dataset.tab, on = id === active;
      btn.setAttribute('aria-selected',String(on)); btn.tabIndex = on ? 0 : -1;
      btn.querySelector('.tab-check').hidden = !state.selections[id].included;
    });
  }
  function feedback() {
    const result = P.servicePrice(active,state), included = state.selections[active].included;
    el('service-feedback').innerHTML = `${result.missing.length ? `<div class="missing-fields"><strong>${included ? 'Para completar este servicio' : 'Para calcular este servicio'}</strong><ul>${result.missing.map(m=>`<li>${esc(m)}</li>`).join('')}</ul></div>` : `<div class="service-price"><span>${included ? 'Este servicio en tu cotización' : 'Precio de este servicio'}<small>Base ${money(result.subtotal)} + IGV ${money(Math.round(result.subtotal*C.taxPercent/100))}</small></span><strong>${gross(result.subtotal)}</strong></div>`}${!included ? '<p class="field-hint">Activa «Incluir en cotización» para sumarlo al total.</p>' : ''}`;
  }
  function summaryMarkup(result, mobile = false) {
    const complete = result.complete, partial = result.services.some(s=>!s.complete), canSave = complete && W.hasSelection(quotesMaster,state.pet.ownerId,state.pet.petId);
    return `${!mobile ? '<div class="summary-heading"><span class="section-tag">CLARO, DESDE EL PRINCIPIO</span><h2 id="summary-title">Tu cotización</h2></div>' : ''}<div class="summary-pet">${esc(state.pet.name || 'Mascota sin identificar')}${P.sizeOf(state.pet) ? `<small>${C.sizes[P.sizeOf(state.pet)].name} · ${state.pet.sizeMode === 'weight' ? esc(state.pet.weightKg)+' kg' : 'rango de peso'}</small>` : ''}</div>
      ${result.services.length ? `<div class="summary-services">${result.services.map(s=>`<details class="summary-service"><summary><span>${s.name}</span><strong>${s.complete ? money(s.total) : 'Por completar'}</strong></summary>${s.complete ? `<div class="line-items">${s.lines.map(l=>`<p><span>${esc(l.label)}</span><span>${money(l.amount)}</span></p>`).join('')}<p><span>IGV asignado</span><span>${money(s.tax)}</span></p></div>` : `<ul class="summary-missing">${s.missing.map(m=>`<li>${esc(m)}</li>`).join('')}</ul>`}<button type="button" class="text-button edit-service" data-edit="${s.id}">Editar servicio →</button></details>`).join('')}</div>` : '<div class="empty-summary"><span aria-hidden="true">＋</span><p>Su próximo cuidado<br>empieza aquí.</p><small>Incluye un servicio para comenzar.</small></div>'}
      <div class="totals"><p><span>${partial ? 'Subtotal de servicios completos' : 'Subtotal sin IGV'}</span><strong>${money(result.subtotal)}</strong></p><p><span>IGV (${C.taxPercent}%)</span><strong>${money(result.tax)}</strong></p><p class="grand-total"><span>${partial ? 'Total parcial' : 'Total con IGV'}</span><strong>${money(result.total)}</strong></p>${partial ? '<p class="partial-note">Faltan datos. El total final estará disponible al completar los servicios.</p>' : ''}</div>
      <details class="identity-details"><summary>Agregar nombre y contacto <small>Opcional</small></summary><div class="identity-fields">${state.pet.petId ? `<p>${esc(state.pet.name)} · ${esc(state.pet.ownerName)} · ${esc(state.pet.contact)}</p><p class="field-hint">Para cambiar estos datos usa «Editar datos» en Cliente y perrito.</p>` : [['name','Nombre de la mascota'],['ownerName','Nombre del dueño'],['contact','Teléfono o contacto']].map(([k,label])=>`<label>${label}<input type="text" data-identity="${k}" value="${esc(state.pet[k])}" maxlength="200" autocomplete="off"></label>`).join('')}<p class="field-hint">Se incluirán en el PDF y, si guardas la atención, en la base local.</p></div></details>
      <button type="button" class="primary-button download-quote"${complete ? '' : ' disabled'}>Generar cotización <span aria-hidden="true">↓</span></button><p class="save-hint">${complete ? 'Descarga únicamente el PDF; no registra una atención.' : 'Incluye y completa los servicios para descargar.'}</p><button type="button" class="secondary-button save-attention"${canSave ? '' : ' disabled'}>Guardar atención</button><p class="save-hint">${W.hasSelection(quotesMaster,state.pet.ownerId,state.pet.petId) ? 'Registra los servicios directamente como atención realizada.' : 'Selecciona o registra un cliente y su perrito.'}</p>${!dirty && quotesMaster.attentions.some(a=>a.id===meta.id) ? '<span class="attention-status">✓ Atención realizada</span>' : ''}${dirty ? '<span class="unsaved-indicator">● Cambios sin guardar</span>' : '<span class="unsaved-indicator saved">Sin cambios pendientes</span>'}<p class="tax-note">Tarifas académicas. Precios finales con IGV del 18%.</p>`;
  }
  function summaries() {
    const result = P.calculate(state);
    for (const [id,mobile] of [['summary',false],['mobile-summary-body',true]]) {
      const container = el(id);
      const openServices = [...container.querySelectorAll('.summary-service[open]')].map(n=>n.querySelector('[data-edit]').dataset.edit);
      const identityOpen = container.querySelector('.identity-details')?.open;
      container.innerHTML = summaryMarkup(result,mobile);
      if(identityOpen) container.querySelector('.identity-details').open = true;
      container.querySelectorAll('.summary-service').forEach(n=>{ if(openServices.includes(n.querySelector('[data-edit]').dataset.edit)) n.open=true; });
    }
    el('mobile-total-label').textContent = result.services.some(s=>!s.complete) ? 'Total parcial · faltan datos' : 'Total con IGV';
    el('mobile-total-value').textContent = money(result.total);
    clearTimeout(announceTimer);
    announceTimer = setTimeout(()=>{ el('price-announcement').textContent = result.complete ? 'Total con IGV: '+money(result.total) : 'Cotización incompleta. '+result.services.filter(s=>!s.complete).length+' servicios por completar.'; },450);
  }
  function renderAll() { petFields(); panel(); summaries(); clients?.render(); }
  function refresh(field) {
    clearPending('attention');
    dirty = true; importedNotice = ''; message('');
    if (field === 'pet.weightKg') {
      const size = P.sizeOf(state.pet); el('weight-range').textContent = size ? C.sizes[size].name+' · '+C.sizes[size].range : 'Ingresa un peso mayor que cero.';
      el('weight-input').setAttribute('aria-invalid',String(!size));
      el('weight-input').setAttribute('aria-describedby','weight-range');
    } else petFields();
    const serviceFocus = root.contains(document.activeElement) && document.activeElement.closest('#service-panel');
    const focusField = document.activeElement?.dataset.field, focusValue = document.activeElement?.value;
    panel(); summaries();
    if (serviceFocus && focusField) {
      const target = [...el('service-panel').querySelectorAll('[data-field]')].find(n=>n.dataset.field===focusField && n.value===focusValue);
      target?.focus({preventScroll:true});
    }
  }
  root.addEventListener('change', event => {
    const node=event.target, field=node.dataset.field;
    if (!field) return;
    if (field === 'weight-mode') {
      state.pet.sizeMode = node.checked ? 'weight' : 'range'; state.pet.size=null; state.pet.weightKg=null;
    } else {
      const [group,key] = field.split('.'), obj = group==='pet' ? state.pet : state.selections[group];
      if(field === 'grooming.mode' && obj.mode !== node.value) {
        const hasSelection = obj.included || obj.items.length || obj.hydration || obj.plan !== 'essential';
        if (hasSelection && !window.confirm('Remplazar la selección de grooming por la otra modalidad? Los demás servicios se conservarán.')) { panel(); return; }
        obj.items=[]; obj.hydration=false; obj.plan='essential';
      }
      if (key==='items') { obj.items=node.checked ? [...obj.items,node.value] : obj.items.filter(k=>k!==node.value); }
      else if(field==='pet.weightKg') obj[key] = node.value==='' ? null : Number(node.value);
      else if(field==='pet.knots') obj[key]=node.value==='true';
      else obj[key]=node.type==='checkbox' ? node.checked : node.value;
    }
    refresh(field);
  });
  root.addEventListener('input', event => {
    const node=event.target;
    if(node.dataset.field==='pet.weightKg') { state.pet.weightKg=node.value==='' ? null : Number(node.value); refresh('pet.weightKg'); }
    if(node.dataset.identity) {
      clearPending('attention');
      state.pet[node.dataset.identity]=node.value; dirty=true;
      root.querySelectorAll(`[data-identity="${node.dataset.identity}"]`).forEach(n=>{ if(n!==node)n.value=node.value; });
      root.querySelectorAll('.summary-pet').forEach(n=>{ n.firstChild.textContent=state.pet.name||'Mascota sin identificar'; });
      root.querySelectorAll('.unsaved-indicator').forEach(n=>{n.textContent='● Cambios sin guardar';n.classList.remove('saved');});
    }
  });
  function switchTab(id, focus = false) { active=id; petFields();panel();if(focus)el('tab-'+id).focus(); }
  root.addEventListener('click',event=>{
    const tab=event.target.closest('[data-tab]'); if(tab) switchTab(tab.dataset.tab);
    const edit=event.target.closest('[data-edit]'); if(edit) { el('summary-dialog').close();switchTab(edit.dataset.edit,true);el('service-panel').scrollIntoView({block:'nearest'}); }
    if(event.target.closest('.download-quote')) download();
    if(event.target.closest('.save-attention')) saveAttention();
  });
  root.querySelector('[role="tablist"]').addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    const ids=Object.keys(C.services),index=ids.indexOf(active);
    const next=event.key==='Home'?0:event.key==='End'?ids.length-1:(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+ids.length)%ids.length;
    event.preventDefault();switchTab(ids[next],true);
  });
  function canReplace() { return !dirty || window.confirm('Hay cambios sin guardar. ¿Quieres reemplazarlos?'); }
  function resetQuote(){state=window.PetDoctorDefaults();meta=newMeta();dirty=false;active='consulta';el('client-search').value='';renderAll();}
  el('new-quote').addEventListener('click',()=>{if(!canReplace() || !clearPending())return;resetQuote();message('Nueva cotización lista.');});
  el('import-quote').addEventListener('click',()=>el('quote-file').click());
  async function readFile(input,kind) {
    const file=input.files[0];input.value='';if(!file)return;
    try {
      if(file.size>20*1024*1024)throw new Error('El archivo supera el límite de 20 MB.');
      if(App.hasPending())throw new Error('Resuelve o descarta el guardado pendiente antes de cargar archivos.');
      const source=await file.text();
      if(kind==='quote') {
        const loaded=F.readQuote(source);
        if(!canReplace())return;
        state=loaded.state;meta={id:loaded.id,createdAt:loaded.createdAt};dirty=false;
        const current=P.calculate(state);
        if(loaded.pricingVersion!==C.version || loaded.previousTotal!==current.total) {
          importedNotice='La cotización se recalculó con las tarifas actuales. Total guardado: '+money(loaded.previousTotal)+'. Total actual'+(current.complete?'': ' parcial')+': '+money(current.total)+'.';dirty=true;
        } else importedNotice='Cotización recuperada. Los importes se verificaron con el tarifario actual.';
        renderAll();message(importedNotice);
      }
    }catch(error){message(error.message,true);}
  }
  el('quote-file').addEventListener('change',()=>readFile(el('quote-file'),'quote'));
  function isLocked(){return quotesMaster.attentions.some(a=>a.id===meta.id);}
  function selectClient(ownerId,petId,fromEdit=false){
    const saved=quotesMaster.attentions.find(a=>a.id===meta.id);
    if(saved && (!fromEdit || saved.quote.state.pet.ownerId!==ownerId || saved.quote.state.pet.petId!==petId)) {message('Esta atención conserva su cliente y perrito. Usa «Nueva» para registrar otra.',true);return;}
    clearPending('attention');
    const owner=quotesMaster.owners.find(o=>o.id===ownerId),pet=quotesMaster.pets.find(p=>p.id===petId && p.ownerId===ownerId);
    if(pet)state.pet={name:pet.name,ownerName:owner.name,contact:owner.contact,petId:pet.id,ownerId:owner.id,sizeMode:pet.weightKg!==null?'weight':'range',weightKg:pet.weightKg,size:pet.weightKg!==null?null:pet.size,coat:pet.coat,knots:null};
    else state.pet={...window.PetDoctorDefaults().pet,ownerId:owner?.id||null,ownerName:owner?.name||'',contact:owner?.contact||''};
    dirty=true;renderAll();message('Selección actualizada. Los servicios se conservan; confirma los datos tarifarios que falten.');
  }
  function anonymousQuote(){
    if(isLocked()){message('Usa «Nueva» para cotizar sin registro después de guardar una atención.',true);return;}
    clearPending('attention');
    state.pet={...state.pet,petId:null,ownerId:null,name:'',ownerName:'',contact:''};dirty=true;renderAll();message('Cotización sin registro. Los servicios y sus opciones se conservan.');
  }
  async function download(){
    try{
      const quote=F.makeQuote(state,meta),name='pet-doctor-'+meta.id.replace(/[^a-zA-Z0-9-]/g,'').slice(0,60);
      const pdfBytes=await window.PetDoctorPDF.createQuotePdf(quote);
      triggerDownload(new Blob([pdfBytes],{type:'application/pdf'}),name+'.pdf');
      message('PDF de cotización generado. Para registrar los servicios como realizados, usa «Guardar atención».');
    }catch(error){message(error.message,true);}
  }
  function saveAttention(){
    try {
      const candidate=W.saveAttention(quotesMaster,state,meta);
      commit(candidate,()=>{dirty=false;renderAll();message('Atención guardada como realizada y vinculada a su cliente y perrito. Usa «Descargar base» para respaldarla.');},'attention');
    } catch(error) { message(error.message,true); }
  }
  clients=window.PetDoctorClients.mount({getWorkspace:()=>quotesMaster,getSelection:()=>({ownerId:state.pet.ownerId,petId:state.pet.petId}),isLocked,onSelect:selectClient,onClear:anonymousQuote,openEditor:App.editor.open});
  history=window.PetDoctorHistoryView.mount({getWorkspace:()=>quotesMaster,download:triggerDownload});
  el('open-detail').addEventListener('click',()=>el('summary-dialog').showModal());
  el('close-detail').addEventListener('click',()=>el('summary-dialog').close());
  App.subscribe(workspace=>{quotesMaster=workspace;clients.render();summaries();history.render();});
  App.register('quote',{isDirty:()=>dirty,onHide:()=>{el('summary-dialog').close();history.close({restoreFocus:false});},onLogout:()=>{el('summary-dialog').close();history.close({restoreFocus:false});resetQuote();},onBaseReplaced:resetQuote});
  renderAll();
})();
