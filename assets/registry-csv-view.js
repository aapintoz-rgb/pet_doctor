(function(g){
  'use strict';
  function mount(App,{kind='registry'}={}){
    const attention=kind==='attentions',prefix=attention?'attention-':'',scope=attention?'attention-csv':'csv';
    const C=attention?g.PetDoctorAttentionCsv:g.PetDoctorRegistryCsv,el=id=>document.getElementById(prefix+id);
    const money=value=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(value/100);
    let review=null,page=1,version=0,waiting=false;
    let markup=`<section class="csv-import" aria-labelledby="csv-title"><h3 id="csv-title">Carga masiva de clientes y perritos</h3><p class="field-hint">Una fila por perrito. Se añaden registros; no se sobrescriben clientes ni atenciones. Máximo 5 MB y 5.000 filas. Importa DNI y teléfono como texto en Excel para conservar sus dígitos.</p><div class="data-actions"><button type="button" id="csv-open" class="secondary-button">Cargar clientes CSV</button></div><p class="field-hint">Consulta las columnas y reglas de carga en la documentación del proyecto.</p><input type="file" id="csv-file" accept=".csv,text/csv" hidden><p id="csv-message" class="file-message" role="status" hidden></p><section id="csv-review" aria-labelledby="csv-review-title" hidden><h4 id="csv-review-title" tabindex="-1">Revisar carga CSV</h4><p id="csv-filename"></p><p id="csv-counts" role="status"></p><p id="csv-issues-summary" role="status"></p><ul id="csv-issues"></ul><div class="csv-table-scroll" tabindex="0" aria-label="Filas del CSV"><table class="csv-table"><thead><tr><th>Fila</th><th>Cliente / DNI</th><th>Teléfono / correo</th><th>Perrito / datos</th><th>IDs</th><th>Estado</th></tr></thead><tbody id="csv-rows"></tbody></table></div><div class="csv-pagination"><button type="button" id="csv-prev" class="text-button">Anterior</button><span id="csv-page" role="status"></span><button type="button" id="csv-next" class="text-button">Siguiente</button></div><div class="data-actions"><button type="button" id="csv-cancel" class="secondary-button">Cancelar</button><button type="button" id="csv-confirm" class="primary-button">Confirmar carga</button></div></section></section>`;
    if(attention)markup=markup.replace('Carga masiva de clientes y perritos','Carga histórica de atenciones').replace('Una fila por perrito. Se añaden registros; no se sobrescriben clientes ni atenciones. Máximo 5 MB y 5.000 filas. Importa DNI y teléfono como texto en Excel para conservar sus dígitos.','Una fila por servicio. Solo clientes y perritos existentes. Importes sin IGV opcionales; se conservan precios históricos informados. Máximo 5 MB y 5.000 filas.').replace('Descargar ejemplo: 25 clientes','Descargar ejemplo: 150 atenciones').replace('Cargar clientes CSV','Cargar atenciones CSV').replace('El ejemplo contiene datos ficticios: 25 clientes, 45 perritos y teléfonos sintéticos no autorizados para comunicaciones.','Primero carga el ejemplo de 25 clientes y 45 perritos. Este CSV contiene 150 atenciones y 200 filas de servicios. No ejecuta comunicaciones.').replace('<th>Cliente / DNI</th><th>Teléfono / correo</th><th>Perrito / datos</th><th>IDs</th>','<th>Atención / fecha Lima</th><th>Cliente / perrito</th><th>Servicio / opciones</th><th>Subtotal sin IGV</th>');
    if(prefix)markup=markup.replace(/(id|aria-labelledby)="([^"]+)"/g,(_,attr,id)=>attr+'="'+prefix+id+'"');
    document.getElementById(attention?'attention-csv-import-root':'csv-import-root').innerHTML=markup;
    const show=text=>{el('csv-message').hidden=!text;el('csv-message').textContent=text;};
    function reset(){version++;review=null;page=1;waiting=false;el('csv-review').hidden=true;el('csv-file').value='';show('');}
    function render(){
      if(!review)return;
      const r=review.result,counts=r.counts,totalPages=Math.max(1,Math.ceil(r.rows.length/20));page=Math.min(page,totalPages);
      el('csv-review').hidden=false;el('csv-filename').textContent='Archivo: '+review.name;
      el('csv-counts').textContent=attention?counts.newAttentions+' atenciones nuevas · '+counts.registered+' ya registradas · '+counts.serviceRows+' filas · Total nuevo '+money(counts.total):counts.newOwners+' clientes nuevos · '+counts.reusedOwners+' reutilizados · '+counts.newPets+' perritos nuevos · '+counts.registered+' filas ya registradas';
      el('csv-issues-summary').textContent=r.errors.length+' errores · '+r.warnings.length+' avisos. Los detalles se muestran para las filas de esta página.';
      const visible=r.rows.slice((page-1)*20,page*20),lines=new Set(visible.map(row=>row.line));
      el('csv-issues').replaceChildren();
      for(const [kind,list] of [['Error',r.errors],['Aviso',r.warnings]])for(const issue of list){
        if(issue.line&&!lines.has(issue.line))continue;
        const li=document.createElement('li');li.textContent=kind+' · '+(issue.line?'Fila '+issue.line:'Base')+' · '+(issue.attentionId?issue.attentionId+' · ':'')+issue.column+': '+issue.message;el('csv-issues').append(li);
      }
      el('csv-rows').replaceChildren();
      for(const row of visible){
        const tr=document.createElement('tr'),d=row.data;
        const cells=attention?[String(row.line),d.atencion_id+' / '+d.fecha+' '+d.hora,d.cliente_id+' / '+d.perrito_id,[d.servicio,d.modalidad,d.componentes,d.extras].filter(Boolean).join(' / '),Number.isSafeInteger(row.subtotal)?money(row.subtotal):'No calculado',row.status]:[String(row.line),d.cliente_nombre+' / '+d.cliente_dni,d.cliente_telefono+' / '+d.cliente_correo,d.perrito_nombre+' / '+[d.peso_kg?d.peso_kg+' kg':'',d.tamano,d.pelaje].filter(Boolean).join(', '),(row.ownerId||d.cliente_id||'Por generar')+' / '+(row.petId||d.perrito_id||'Por generar'),row.status];
        for(let i=0;i<cells.length;i++){const td=document.createElement('td');td.dataset.label=(attention?['Fila','Atención / fecha Lima','Cliente / perrito','Servicio / opciones','Subtotal sin IGV','Estado']:['Fila','Cliente / DNI','Teléfono / correo','Perrito / datos','IDs','Estado'])[i];td.textContent=cells[i];tr.append(td);}el('csv-rows').append(tr);
      }
      el('csv-page').textContent='Página '+page+' de '+totalPages+' · '+r.rows.length+' filas';el('csv-prev').disabled=page===1;el('csv-next').disabled=page===totalPages;
      el('csv-confirm').disabled=waiting||review.stale||!r.canImport||App.hasPending();
      if(review.stale)show('La base cambió desde la revisión. Cancela y vuelve a revisar el CSV. Si el cambio fue en otra pestaña, recarga primero la aplicación.');
      else if(!r.errors.length&&!r.canImport)show('No hay registros nuevos para incorporar.');
    }
    el('csv-open').addEventListener('click',()=>{if(App.hasPending()){show('Resuelve o cancela el guardado pendiente antes de cargar otro archivo.');return;}el('csv-file').click();});
    el('csv-file').addEventListener('change',async()=>{
      const file=el('csv-file').files[0];el('csv-file').value='';if(!file)return;
      if(App.hasPending()){show('Resuelve el guardado pendiente antes de cargar otro archivo.');return;}
      reset();const token=version;show('Leyendo CSV…');
      try{
        if(file.size>C.MAX_BYTES)throw Error('El CSV supera el límite de 5 MB.');
        const source=await file.text();if(token!==version)return;
        if(App.hasPending())throw Error('Hay un guardado pendiente. Resuélvelo antes de revisar el CSV.');
        review={name:file.name||'archivo.csv',result:C.prepare(App.getWorkspace(),source),stale:false};show('');render();el('csv-review-title').focus();
      }catch(error){if(token===version)show(error.message);}
    });
    el('csv-prev').addEventListener('click',()=>{page--;render();});el('csv-next').addEventListener('click',()=>{page++;render();});
    el('csv-cancel').addEventListener('click',()=>{App.clearPending(scope);reset();el('csv-open').focus();});
    el('csv-confirm').addEventListener('click',()=>{
      if(waiting||!review||!review.result.canImport||App.hasPending())return;
      if(review.stale||JSON.stringify(App.getWorkspace())!==review.result.baseFingerprint){review.stale=true;render();return;}
      waiting=true;render();
      const current=review;
      try{
        App.commit(current.result.candidate,()=>{reset();show('Carga CSV guardada correctamente.');App.message(attention?'Atenciones históricas incorporadas desde CSV.':'Clientes y perritos incorporados desde CSV.');el('csv-open').focus();},scope,false,current.result.baseFingerprint);
        if(review){waiting=false;render();show(el('data-message').textContent||'La carga todavía no se guardó. Abre Datos y sincronización para resolver el guardado pendiente.');}
      }catch(error){waiting=false;render();show(error.message);}
    });
    App.subscribe(()=>{if(review){review.stale=true;render();}});
    g.addEventListener('storage',event=>{if((event.key===null||event.key===g.PetDoctorWorkspace.KEY)&&review){review.stale=true;render();}});
    App.register(scope,{isDirty:()=>!!review,onLogout:reset,onBaseReplaced:reset});
    return {reset};
  }
  g.PetDoctorRegistryCsvView={mount};
})(globalThis);
