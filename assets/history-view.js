(function (g) {
  'use strict';
  const H = g.PetDoctorHistory, PAGE_SIZE = 20;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const money = cents => new Intl.NumberFormat('es-PE', { style:'currency', currency:'PEN' }).format(cents / 100);
  const dateLabel = row => row.date.split('-').reverse().join('/') + ' · ' + row.time;
  const markup = `
    <details id="attention-history" class="attention-history"><summary id="history-toggle">Historial de atenciones realizadas <span id="history-count">(0)</span></summary>
      <div class="history-content"><p class="field-hint">Atenciones guardadas, de más reciente a más antigua. Fechas y horas de Lima. Estos filtros no cambian la cotización.</p>
        <div class="history-filters"><label for="history-from">Desde<input id="history-from" type="date"></label><label for="history-to">Hasta<input id="history-to" type="date"></label><label for="history-owner">Cliente<select id="history-owner"><option value="">Todos los clientes</option></select></label><label for="history-pet">Perrito<select id="history-pet"><option value="">Todos los perritos</option></select></label><label for="history-search" class="history-search">Buscar atención<input id="history-search" type="search" placeholder="Código, cliente, DNI o perrito" maxlength="200" autocomplete="off"></label></div>
        <div class="history-actions"><button type="button" id="history-clear" class="secondary-button">Limpiar filtros</button><button type="button" id="history-csv" class="secondary-button" disabled>Descargar CSV de resultados</button></div>
        <p id="history-results-status" class="history-results-status" role="status" aria-live="polite"></p><p id="history-error" class="error" role="alert" hidden></p>
        <p id="history-empty" class="history-empty" hidden></p>
        <table id="history-table" class="history-table" role="table"><caption class="sr-only">Historial de atenciones realizadas. Fechas y horas de Lima.</caption><thead role="rowgroup"><tr role="row"><th scope="col">Fecha y hora</th><th scope="col">N.º de atención</th><th scope="col">Cliente</th><th scope="col">DNI</th><th scope="col">Perrito</th><th scope="col">Servicios</th><th scope="col">Total (S/)</th><th scope="col">Estado</th><th scope="col">Detalle</th></tr></thead><tbody id="history-rows" role="rowgroup"></tbody></table>
        <nav id="history-pagination" class="history-pagination" aria-label="Páginas del historial"><button type="button" id="history-prev" class="secondary-button">← Anterior</button><span id="history-page" role="status"></span><button type="button" id="history-next" class="secondary-button">Siguiente →</button></nav>
        <p class="field-hint">El CSV incluye todos los resultados filtrados, también los de otras páginas. En Excel importa DNI y teléfono como texto para conservar ceros iniciales. Para un respaldo completo usa «Descargar base» (JSON).</p>
      </div>
    </details>
    <dialog id="history-detail" class="history-detail" aria-labelledby="history-detail-title"><div class="dialog-heading"><h2 id="history-detail-title">Detalle de atención</h2><button type="button" id="history-close-detail" class="secondary-button">Cerrar ✕</button></div><div id="history-detail-body"></div></dialog>`;
  function markupFor(prefix) { return markup.replace(/\b(id|for|aria-labelledby)="([^"]+)"/g,(_,attribute,id)=>attribute+'="'+prefix+id+'"'); }
  function mount({ getWorkspace, download, prefix='', hideOwnerFilter=false }) {
    const el = id => document.getElementById(prefix+id);
    if(hideOwnerFilter)el('history-owner').parentElement.hidden=true;
    let filters = { from:'', to:'', owner:'', pet:'', search:'' }, page = 1, selection = null, opener = null, openedId = null;
    function options(id, items, placeholder, value) {
      const select = el(id);
      select.innerHTML = '<option value="">' + placeholder + '</option>' + items.map(item => `<option value="${esc(item.key)}">${esc(item.label)}</option>`).join('') + (value && !items.some(item => item.key === value) ? `<option value="${esc(value)}">Filtro seleccionado (sin datos en esta base)</option>` : '');
      select.value = value;
    }
    function render() {
      const workspace = getWorkspace(), choices = H.filterOptions(workspace, filters.owner);
      el('history-count').textContent = '(' + workspace.attentions.filter(a => a.status === 'realizada').length + ')';
      options('history-owner',choices.owners,'Todos los clientes',filters.owner);
      options('history-pet',choices.pets,'Todos los perritos',filters.pet);
      el('history-from').max = filters.to; el('history-to').min = filters.from;
      try { selection = H.select(workspace,filters); el('history-error').hidden = true; }
      catch (error) { selection = null; el('history-error').textContent = error.message; el('history-error').hidden = false; }
      const count = selection?.count || 0, pages = Math.max(1,Math.ceil(count/PAGE_SIZE)); page = Math.min(page,pages);
      el('history-results-status').textContent = count + ' atenciones · Total de resultados: ' + money(selection?.total || 0);
      el('history-csv').disabled = !count;
      el('history-table').hidden = !count;
      el('history-empty').hidden = !!count || !selection;
      el('history-empty').textContent = workspace.attentions.length ? 'No hay atenciones que coincidan con estos filtros.' : 'Todavía no hay atenciones guardadas. Guarda una atención realizada para verla aquí.';
      const visible = selection?.rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE) || [];
      const cell = (label, content) => `<td role="cell" data-label="${label}">${content}</td>`;
      el('history-rows').innerHTML = visible.map(row => `<tr role="row">${cell('Fecha y hora',`<time datetime="${esc(row.performedAt)}">${dateLabel(row)}</time>`)}${cell('N.º de atención',`<abbr title="${esc(row.id)}">${esc(row.id.length>16 ? '…'+row.id.slice(-12) : row.id)}</abbr>`)}${cell('Cliente',esc(row.ownerName || 'No registrado') + (!row.registered ? '<small class="history-unlinked">Sin vínculo registrado</small>' : ''))}${cell('DNI',esc(row.dni || 'No registrado'))}${cell('Perrito',esc(row.petName || 'No registrado'))}${cell('Servicios',row.services.map(esc).join('<br>'))}${cell('Total (S/)',`<strong>${money(row.total)}</strong>`)}${cell('Estado','<span class="history-state">Realizada</span>')}${cell('Detalle',`<button type="button" class="text-button" data-history-id="${esc(row.id)}" aria-label="Ver detalle de la atención ${esc(row.id)}">Ver detalle</button>`)}</tr>`).join('');
      el('history-pagination').hidden = !count;
      el('history-page').textContent = 'Página '+page+' de '+pages;
      el('history-prev').disabled = page===1;el('history-next').disabled = page>=pages;
      if (openedId) {
        const row = H.rows(workspace).find(item => item.id === openedId);
        if (row) detail(row); else close();
      }
    }
    function detail(row) {
      const cell = (label,value) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
      el('history-detail-body').innerHTML = `<dl class="history-identity">${cell('N.º de atención',row.id)}${cell('Fecha y hora de Lima',dateLabel(row))}${cell('Estado','Realizada')}${cell('Cliente',row.ownerName || 'No registrado')}${cell('DNI',row.dni || 'No registrado')}${cell('Teléfono',row.contact || 'No registrado')}${cell('Perrito',row.petName || 'No registrado')}${cell('Vínculo',row.registered ? 'Cliente y perrito registrados' : 'Sin vínculo registrado')}</dl><div class="history-detail-services">${row.serviceDetails.map(service => `<section><h3>${esc(service.name)}</h3>${service.lines.map(line=>`<p><span>${esc(line.label)}</span><span>${line.amount === null ? 'No registrado' : money(line.amount)}</span></p>`).join('')}<p><span>IGV asignado</span><span>${Number.isSafeInteger(service.tax) ? money(service.tax) : 'No registrado'}</span></p><p><strong>Total del servicio</strong><strong>${Number.isSafeInteger(service.total) ? money(service.total) : 'No registrado'}</strong></p></section>`).join('')}</div><dl class="history-totals">${cell('Subtotal',money(row.subtotal))}${cell('IGV',money(row.tax))}${cell('Total',money(row.total))}</dl><p class="field-hint">Importes e identidad guardados en la atención. Esta consulta no modifica la cotización ni actualiza las tarifas.</p>`;
    }
    function close({ restoreFocus = true } = {}) {
      if (!el('history-detail').open && !openedId) return;
      const id = openedId; openedId = null; el('history-detail').close();
      const currentButton = [...el('history-rows').querySelectorAll('[data-history-id]')].find(button => button.dataset.historyId === id);
      if (restoreFocus) (currentButton || (opener?.isConnected ? opener : el('history-toggle')))?.focus(); opener = null;
    }
    el('history-rows').addEventListener('click',event=>{
      const button = event.target.closest('[data-history-id]'); if (!button) return;
      const row = H.rows(getWorkspace()).find(item=>item.id===button.dataset.historyId); if (!row) return;
      opener = button;openedId = row.id;detail(row);el('history-detail').showModal();el('history-close-detail').focus();
    });
    el('history-close-detail').addEventListener('click',close);
    el('history-detail').addEventListener('cancel',event=>{event.preventDefault();close();});
    for (const [field,eventType] of [['from','change'],['to','change'],['owner','change'],['pet','change'],['search','input']]) {
      el('history-'+field).addEventListener(eventType,event=>{filters[field]=event.target.value;if(field==='owner')filters.pet='';page=1;render();});
    }
    function reset(){filters={from:'',to:'',owner:'',pet:'',search:''};for(const field of ['from','to','search'])el('history-'+field).value='';page=1;render();}
    el('history-clear').addEventListener('click',reset);
    el('history-prev').addEventListener('click',()=>{if(page>1){page--;render();}});
    el('history-next').addEventListener('click',()=>{if(selection && page*PAGE_SIZE<selection.count){page++;render();}});
    el('history-csv').addEventListener('click',()=>{
      // Reconsulta la fuente persistida; nunca exporta solo la página visible ni candidatos pendientes.
      try { const selected = H.select(getWorkspace(),filters); if(selected.count)download(new Blob([H.csv(selected)],{type:'text/csv;charset=utf-8'}),H.filename()); }
      catch(error){el('history-error').textContent=error.message;el('history-error').hidden=false;}
    });
    render();return { render, close, reset };
  }
  g.PetDoctorHistoryView = { markup, markupFor, mount };
})(globalThis);
