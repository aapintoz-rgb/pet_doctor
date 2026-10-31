(function(g){
  'use strict';
  const templates=[{id:'appointment',name:'Coordinación de cita',date:true},{id:'reminder',name:'Recordatorio de cita',date:true},{id:'followup',name:'Seguimiento de atención',date:false}];
  const clean=v=>String(v??'').normalize('NFC').replace(/[\r\n]+/g,' ').trim();
  function build({template,owner,pet,date='',time='',now=new Date()}){
    const t=templates.find(t=>t.id===template);if(!t)throw Error('Selecciona una plantilla.');
    if(!owner||!pet||pet.ownerId!==owner.id)throw Error('Selecciona un perrito de este cliente.');
    let when='';
    if(t.date){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Completa una fecha y hora válidas de Lima.');
      if(Date.parse(date+'T'+time+':00-05:00')<=Number(now))throw Error('La fecha y hora de la cita deben ser futuras (Lima).');
      when=date.split('-').reverse().join('/')+' a las '+time+' (Lima)';
    }
    const name=clean(owner.name),dog=clean(pet.name);
    const content={
      appointment:{subject:'Coordinación de cita para '+dog,message:'Hola, '+name+'. Desde Pet Doctor proponemos una cita para '+dog+' el '+when+'. Responde este correo para confirmar o solicitar otro horario. Quedamos atentos.'},
      reminder:{subject:'Recordatorio de cita para '+dog,message:'Hola, '+name+'. Te recordamos la cita coordinada para '+dog+' el '+when+'. Si necesitas cambiar el horario, responde este correo. Gracias por confiar en Pet Doctor.'},
      followup:{subject:'Seguimiento de '+dog,message:'Hola, '+name+'. Desde Pet Doctor queremos saber cómo se encuentra '+dog+' después de su atención. Responde este correo si deseas coordinar un control o compartir alguna consulta. Estamos para ayudarte.'}
    };
    return content[t.id];
  }
  function mount({container,subject,message,getWorkspace,getOwnerId,onChange}){
    const panel=document.createElement('fieldset');panel.id='email-templates';panel.hidden=true;
    panel.innerHTML='<legend>Preparar un correo</legend><label>Plantilla<select id="email-template"><option value="">Redacción libre</option>'+templates.map(t=>'<option value="'+t.id+'">'+t.name+'</option>').join('')+'</select></label><div id="email-template-fields" hidden><label>Perrito involucrado<select id="email-template-pet"><option value="">Selecciona un perrito</option></select></label><div id="email-template-schedule"><label>Fecha de cita · Lima<input id="email-template-date" type="date"></label><label>Hora de cita · Lima<input id="email-template-time" type="time" step="60"></label></div><button id="email-template-apply" type="button" class="secondary-button">Aplicar plantilla y reemplazar asunto y mensaje</button><p class="field-hint">Revisa y edita el texto antes de enviar. Indicar un horario no reserva una cita en una agenda.</p></div><p id="email-template-status" role="status" hidden></p>';
    container.insertBefore(panel,subject.closest('label'));
    const el=id=>panel.querySelector('#'+id);let applied=null;
    function status(text){el('email-template-status').textContent=text;el('email-template-status').hidden=!text;}
    const signature=()=>JSON.stringify(['email-template','email-template-pet','email-template-date','email-template-time'].map(id=>el(id).value));
    function fields(){const t=templates.find(t=>t.id===el('email-template').value);if(!t)applied=null;el('email-template-fields').hidden=!t;el('email-template-schedule').hidden=!t?.date;status(applied?'Aplica de nuevo la plantilla si cambias sus datos.':'');}
    el('email-template').onchange=fields;
    function reset(email){applied=null;panel.hidden=!email;el('email-template').value='';el('email-template-date').value='';el('email-template-time').value='';el('email-template-pet').replaceChildren(new Option('Selecciona un perrito',''));for(const p of getWorkspace().pets.filter(p=>p.ownerId===getOwnerId()))el('email-template-pet').append(new Option(p.name+' · '+p.id.slice(-8),p.id));fields();}
    function validate(){if(!applied){if(el('email-template').value)throw Error('Aplica la plantilla o selecciona Redacción libre.');return;}if(applied.signature!==signature())throw Error('Cambiaste los datos de la plantilla. Aplícala de nuevo antes de revisar.');const ws=getWorkspace(),pet=ws.pets.find(p=>p.id===applied.id&&p.ownerId===getOwnerId());if(!pet||pet.name!==applied.name)throw Error('El perrito de la plantilla cambió. Vuelve a aplicar la plantilla y revisa el mensaje.');}
    el('email-template-apply').onclick=()=>{
      try{const ws=getWorkspace(),owner=ws.owners.find(o=>o.id===getOwnerId()),pet=ws.pets.find(p=>p.id===el('email-template-pet').value);const text=build({template:el('email-template').value,owner,pet,date:el('email-template-date').value,time:el('email-template-time').value});subject.value=text.subject;message.value=text.message;applied={id:pet.id,name:pet.name,signature:signature()};onChange();status('Plantilla aplicada. Puedes editar el asunto y el mensaje; se mantienen los límites de 200 y 360 caracteres.');}
      catch(e){status(e.message);}
    };
    return {reset,validate,lock(value){for(const n of panel.querySelectorAll('input,select,button'))n.disabled=value;}};
  }
  const api={templates,build,mount};g.PetDoctorEmailTemplates=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
