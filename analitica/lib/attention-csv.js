(function(g){
  'use strict';
  const R=g.PetDoctorRegistryCsv||require('./registry-csv.js'),W=g.PetDoctorWorkspace||require('./workspace.js');
  const F=g.PetDoctorFiles||require('./files.js'),P=g.PetDoctorPricing||require('./pricing.js');
  const C=g.PetDoctorCatalog||require('./catalog.js').catalog,defaults=g.PetDoctorDefaults||require('./catalog.js').defaults;
  const D=g.PetDoctorRecords||require('./records.js');
  const LEGACY_HEADERS=['atencion_id','fecha','hora','cliente_id','perrito_id','servicio','modalidad','componentes','extras','peso_kg','tamano','pelaje','nudos','subtotal_servicio_pen','subtotal_atencion_pen','igv_atencion_pen','total_atencion_pen'];
  const EXTRA_HEADERS=['cliente_distrito','especie','raza','sexo','edad_anios','edad_meses','observaciones'];
  const HEADERS=[...LEGACY_HEADERS,...EXTRA_HEADERS];
  const norm=v=>String(v??'').normalize('NFC').trim();
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  function localStamp(ms){const p=Object.fromEntries(formatter.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute+':'+p.second;}
  function limaInstant(date,time){
    const stamp=date+'T'+time,naive=Date.parse(stamp+'Z'),candidates=new Set();
    for(const delta of [-86400000,0,86400000]){
      const probe=naive+delta,offset=Date.parse(localStamp(probe)+'Z')-probe,candidate=naive-offset;
      if(localStamp(candidate)===stamp)candidates.add(candidate);
    }
    if(candidates.size!==1)throw Error('La hora es inexistente o ambigua en America/Lima. Indica otra hora inequívoca.');
    return new Date([...candidates][0]).toISOString();
  }
  function money(value){
    if(!/^\d+(?:[.,]\d{1,2})?$/.test(value))throw Error('Usa un importe no negativo con hasta dos decimales, sin miles.');
    const [whole,fraction='']=value.replace(',','.').split('.');
    const cents=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
    if(cents>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Importe fuera del rango seguro de cálculo.');
    return Number(cents);
  }
  function positive(value){if(!/^\d+(?:[.,]\d+)?$/.test(value)||!Number.isFinite(Number(value.replace(',','.')))||Number(value.replace(',','.'))<=0)throw Error('Indica un peso positivo, sin miles.');return Number(value.replace(',','.'));}
  function mapped(value,map){if(!Object.hasOwn(map,value))throw Error('Valor no admitido: '+value+'.');return map[value];}
  function list(value){if(!value)return [];const items=value.split('|').map(norm);if(items.some(x=>!x)||new Set(items).size!==items.length)throw Error('La lista contiene valores vacíos o duplicados.');return items;}
  function configure(state,d){
    if(!Object.hasOwn(C.services,d.servicio))throw Error('Servicio desconocido.');
    const s=state.selections[d.servicio];s.included=true;
    const components=list(d.componentes),extras=list(d.extras),mode=d.modalidad;
    const only=(values,allowed)=>{if(values.some(x=>!allowed.includes(x)))throw Error('Componentes o extras incompatibles con el servicio.');};
    if(d.servicio==='consulta'){s.kind=mapped(mode,{primera:'first',control:'followup'});only(components,[]);only(extras,['informe']);s.report=extras.includes('informe');}
    if(d.servicio==='vacunas'){if(mode)throw Error('Vacunas no usa modalidad.');only(extras,[]);s.items=components.map(x=>mapped(x,{antirrabica:'rabies',multiple:'multiple',bordetella:'bordetella'}));if(!s.items.length)throw Error('Selecciona al menos una vacuna.');}
    if(d.servicio==='desparasitacion'){s.kind=mapped(mode,{interna:'internal',externa:'external',ambas:'both'});only(components,[]);only(extras,[]);}
    if(d.servicio==='grooming'){
      if(mode==='individual'){s.mode='individual';only(extras,[]);s.items=components.map(x=>mapped(x,{bano:'bath',secado:'dry',corte:'cut',unas:'nails',cepillado:'brush',orejas:'ears',hidratacion:'hydration'}));if(!s.items.length)throw Error('Grooming individual necesita componentes.');}
      else{s.mode='plan';s.plan=mapped(mode,{esencial:'essential',completo:'complete',premium:'premium'});only(components,[]);only(extras,['hidratacion']);s.hydration=extras.includes('hidratacion');}
    }
    if(d.servicio==='guarderia'){s.duration=mapped(mode,{media:'half',completa:'full'});only(components,[]);only(extras,['paseo','alimentacion']);s.walk=extras.includes('paseo');s.food=extras.includes('alimentacion');}
    if(d.servicio==='inteligencia'){s.plan=mapped(mode,{exploracion:'exploration',perfil:'profile',acompanamiento:'support'});only(components,[]);only(extras,[]);}
  }
  function signature(selection,id){
    const s=JSON.parse(JSON.stringify(selection));if(s.items)s.items.sort();
    if(id==='grooming'){if(s.mode==='individual'){delete s.plan;delete s.hydration;}else delete s.items;}
    return Object.fromEntries(Object.keys(s).sort().map(key=>[key,s[key]]));
  }
  function prepare(workspace,source,{now=Date.now()}={}){
    const parsed=R.parse(source,HEADERS,EXTRA_HEADERS),candidate=W.read(JSON.stringify(workspace)),baseFingerprint=JSON.stringify(workspace);
    const groups=new Map(),rows=[],errors=[],warnings=[],existing=new Map(candidate.attentions.map(a=>[a.id,a]));
    if(!EXTRA_HEADERS.some(h=>parsed.header.includes(h)))warnings.push({line:1,column:'cabecera',message:'CSV histórico heredado: datos ampliados no informados se conservan sin registrar.'});
    const moments=new Map(candidate.attentions.map(a=>[(a.registration?.petId||a.quote.state.pet.petId)+'|'+new Date(a.performedAt).toISOString(),a.id]));
    let newAttentions=0,registered=0,total=0;
    for(const record of parsed.records){
      const d=Object.fromEntries(Object.entries(record.data).map(([k,v])=>[k,norm(v)]));
      const row={line:record.line,data:d,status:'Por revisar',aligned:record.aligned};rows.push(row);
      const key=d.atencion_id||'fila-sin-id-'+record.line;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);
    }
    for(const group of groups.values()){
      const first=group[0],id=first.data.atencion_id,prior=existing.get(id);let failed=false;
      const error=(row,column,message)=>{failed=true;errors.push({line:row.line,column,attentionId:id,message});};
      const warn=(row,column,message)=>warnings.push({line:row.line,column,attentionId:id,message});
      for(const row of group){
        if(!row.aligned)error(row,'fila','La cantidad de celdas no coincide con la cabecera.');
        for(const key of ['atencion_id','fecha','hora','cliente_id','perrito_id','servicio'])if(!row.data[key])error(row,key,'El campo es obligatorio.');
        for(const key of ['atencion_id','cliente_id','perrito_id'])if(row.data[key].length>100)error(row,key,'El identificador supera 100 caracteres.');
      }
      function common(column,parse=norm){
        let value;
        for(const row of group)if(row.data[column]){
          try{const next=parse(row.data[column]);if(value!==undefined&&!same(next,value))error(row,column,'Valores contradictorios dentro de la atención.');else value=next;}
          catch(e){error(row,column,e.message);}
        }
        return value;
      }
      const ownerId=common('cliente_id'),petId=common('perrito_id'),date=common('fecha'),time=common('hora');
      const historical={};
      for(const column of EXTRA_HEADERS)historical[column]=common(column);
      let age=null;
      try{
        if(historical.cliente_distrito!==undefined)D.text(historical.cliente_distrito,'distrito',100);
        if(historical.especie!==undefined&&historical.especie!=='canino')throw Error('Solo se admite especie canino.');
        if(historical.raza!==undefined)D.text(historical.raza,'raza');
        if(historical.sexo!==undefined&&!['macho','hembra','no_determinado'].includes(historical.sexo))throw Error('Sexo inválido.');
        if(historical.observaciones!==undefined)D.text(historical.observaciones,'observaciones',2000);
        if(historical.edad_anios!==undefined||historical.edad_meses!==undefined){if(!/^\d+$/.test(historical.edad_anios??'')||!/^\d+$/.test(historical.edad_meses??''))throw Error('Completa años y meses de la edad histórica.');age=D.makeAge(Number(historical.edad_anios),Number(historical.edad_meses),date);}
      }catch(e){error(first,'datos históricos',e.message);}
      let performedAt,selected;
      if(date&&time){
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time))error(first,'fecha/hora','Fecha u hora inexistente o con formato incorrecto.');
        else try{performedAt=limaInstant(date,time);if(Date.parse(performedAt)>Number(now))error(first,'fecha/hora','No se admiten atenciones futuras.');}catch(e){error(first,'fecha/hora',e.message);}
      }
      try{selected=W.requireSelection(workspace,ownerId,petId);}catch(e){error(first,'cliente_id/perrito_id',e.message);}
      const weight=common('peso_kg',positive),size=common('tamano',x=>mapped(x,{pequeno:'small',mediano:'medium',grande:'large'})),coat=common('pelaje',x=>mapped(x,{corto:'short',largo:'long'})),knots=common('nudos',x=>mapped(x,{si:true,no:false}));
      if(weight!==undefined&&size!==undefined)error(first,'peso_kg/tamano','Elige peso o tamaño, no ambos.');
      const controls={subtotal:common('subtotal_atencion_pen',money),tax:common('igv_atencion_pen',money),total:common('total_atencion_pen',money)};
      const amounts=new Map(),seenServices=new Set(),state=defaults();
      for(const row of group){
        const sid=row.data.servicio;
        if(seenServices.has(sid))error(row,'servicio','Un servicio no puede repetirse en la misma atención.');seenServices.add(sid);
        try{configure(state,row.data);}catch(e){error(row,'servicio/modalidad/componentes/extras',e.message);}
        if(row.data.subtotal_servicio_pen)try{amounts.set(sid,money(row.data.subtotal_servicio_pen));}catch(e){error(row,'subtotal_servicio_pen',e.message);}
      }
      if(failed){for(const row of group)row.status='Error';continue;}
      const basePet=prior?prior.quote.state.pet:selected.pet;
      const w=weight!==undefined?weight:size!==undefined?null:basePet.weightKg;
      const sz=weight!==undefined?null:size!==undefined?size:basePet.size;
      state.pet={...state.pet,name:selected.pet.name,ownerName:selected.owner.name,contact:selected.owner.contact,ownerId,petId,sizeMode:w!==null&&w!==undefined?'weight':'range',weightKg:w??null,size:sz??null,coat:coat??basePet.coat??null,knots:knots??(prior?basePet.knots:null)};
      try{
        F.validateState(state);
        if(prior){
          const ps=prior.petSnapshot;
          const savedHistorical={cliente_distrito:prior.ownerSnapshot?.district,especie:ps?.species==='canine'?'canino':undefined,raza:ps?.breed,sexo:({male:'macho',female:'hembra',undetermined:'no_determinado'})[ps?.sex],edad_anios:ps?.ageAtAttention?.years,edad_meses:ps?.ageAtAttention?.months,observaciones:prior.observations};
          for(const [key,value]of Object.entries(historical))if(value!==undefined&&String(savedHistorical[key]??'')!==value)throw Error('Los datos históricos explícitos difieren de la atención guardada: '+key+'.');
          if(prior.registration?.ownerId!==ownerId||prior.registration?.petId!==petId||new Date(prior.performedAt).toISOString()!==performedAt)throw Error('El ID existente tiene otro cliente, perrito o fecha. No se sobrescriben atenciones.');
          const saved=prior.quote.state;
          for(const key of ['sizeMode','weightKg','size','coat','knots'])if(!same(saved.pet[key],state.pet[key]))throw Error('Los datos tarifarios difieren de la atención guardada.');
          for(const sid of Object.keys(C.services))if(saved.selections[sid].included!==state.selections[sid].included||(state.selections[sid].included&&!same(signature(saved.selections[sid],sid),signature(state.selections[sid],sid))))throw Error('Servicios u opciones distintos para un ID existente.');
          for(const [sid,amount] of amounts)if(prior.quote.pricing.services.find(s=>s.id===sid)?.subtotal!==amount)throw Error('El importe explícito del servicio difiere del histórico guardado.');
          for(const [key,value] of Object.entries(controls))if(value!==undefined&&value!==prior.quote.pricing[key])throw Error('El '+key+' informado no coincide con el histórico guardado.');
          registered++;for(const row of group){row.status='Ya registrada';row.subtotal=prior.quote.pricing.services.find(s=>s.id===row.data.servicio)?.subtotal;}continue;
        }
        const attention=F.makeAttention(state,{id,createdAt:performedAt},performedAt,workspace),pricing=attention.quote.pricing;
        for(const service of pricing.services){
          const row=group.find(row=>row.data.servicio===service.id),amount=amounts.get(service.id);
          if(amount===undefined)warn(row,'subtotal_servicio_pen','Se aplica el catálogo actual a esta atención histórica.');
          else{
            if(amount!==service.subtotal){warn(row,'subtotal_servicio_pen','Importe histórico distinto del catálogo actual.');service.lines.push({label:'Ajuste por importe histórico',amount:amount-service.subtotal});service.subtotal=amount;}
            if(amount===0)warn(row,'subtotal_servicio_pen','Servicio gratuito con importe cero.');
          }
        }
        attention.quote.pricing=P.totalize(pricing.services);
        for(const [key,value] of Object.entries(controls))if(value!==undefined&&value!==attention.quote.pricing[key])error(first,key,'El importe de control no coincide exactamente con los servicios e IGV.');
        if(failed){for(const row of group)row.status='Error';continue;}
        const moment=petId+'|'+performedAt;if(moments.has(moment)&&moments.get(moment)!==id)warn(first,'fecha/hora','Otro ID de atención corresponde al mismo perrito e instante.');moments.set(moment,id);
        attention.registration={ownerId,petId};attention.ownerSnapshot={...JSON.parse(JSON.stringify(selected.owner)),district:historical.cliente_distrito||''};
        attention.petSnapshot=D.snapshot({id:petId,ownerId,name:state.pet.name,weightKg:state.pet.weightKg,size:state.pet.size,coat:state.pet.coat,...D.petExtras({breed:historical.raza||'',sex:({macho:'male',hembra:'female',no_determinado:'undetermined'})[historical.sexo]??null,ageReference:age})},date);
        attention.observations=historical.observaciones||'';
        candidate.attentions.push(attention);newAttentions++;total+=attention.quote.pricing.total;
        if(!Number.isSafeInteger(total))throw Error('El total de la carga excede el rango seguro.');
        for(const row of group){row.status='Atención nueva';row.subtotal=attention.quote.pricing.services.find(s=>s.id===row.data.servicio)?.subtotal;}
      }catch(e){error(first,'atencion',e.message);for(const row of group)row.status='Conflicto';}
    }
    let clean=null;
    if(!errors.length)try{if(newAttentions)candidate.updatedAt=new Date().toISOString();clean=W.read(JSON.stringify(candidate));}catch(e){errors.push({line:0,column:'base',attentionId:'',message:e.message});}
    return {baseFingerprint,rows,errors,warnings,counts:{newAttentions,registered,serviceRows:rows.length,total},candidate:errors.length?null:clean,canImport:!errors.length&&newAttentions>0};
  }
  const pen=cents=>(cents/100).toFixed(2).replace('.',',');
  function exampleRows(){
    const registry=R.prepare(W.empty(),R.example25()).candidate,rows=[HEADERS];
    const configs=[['consulta','primera','','informe'],['vacunas','','antirrabica|multiple',''],['desparasitacion','ambas','',''],['grooming','completo','','hidratacion'],['guarderia','completa','','paseo|alimentacion'],['inteligencia','perfil','','']];
    for(let i=0;i<150;i++){
      const pet=registry.pets[i%45],day=new Date(Date.UTC(2026,7,22+Math.floor(i*69/149))).toISOString().slice(0,10),hour=String(9+i%8).padStart(2,'0')+':'+(i%2?'30':'00')+':00';
      const services=[configs[i%6]];if((i+1)%3===0)services.push(configs[(i+1)%6]);
      const state=defaults();state.pet={...state.pet,weightKg:[8,15,30][i%3],sizeMode:'weight',coat:i%2?'long':'short',knots:i%7===0};
      const grouped=services.map((config,index)=>{
        let conf=[...config];if(conf[0]==='consulta'&&i%2)conf[1]='control';
        if(conf[0]==='grooming'&&i%4===1){conf[1]='individual';conf[2]='bano|secado|unas';conf[3]='';}
        const a=D.ageAt(pet.ageReference,day),owner=registry.owners.find(o=>o.id===pet.ownerId);
        const row=['csv-demo-atencion-'+String(i+1).padStart(3,'0'),day,hour,pet.ownerId,pet.id,...conf,index?'':String(state.pet.weightKg),'',index?'':i%2?'largo':'corto',index?'':state.pet.knots?'si':'no','','','','',owner.district,'canino',pet.breed,({male:'macho',female:'hembra',undetermined:'no_determinado'})[pet.sex],String(a.years),String(a.months),'Atención ficticia de demostración'];
        configure(state,Object.fromEntries(HEADERS.map((h,j)=>[h,row[j]])));rows.push(row);return row;
      });
      const price=P.calculate(state);
      for(const row of grouped){const svc=price.services.find(s=>s.id===row[5]);if(i%5!==0){const amount=i%29===4?0:svc.subtotal+(i%5===2?-250:i%5===3?350:0);row[13]=pen(amount);svc.subtotal=amount;}}
      const totals=P.totalize(price.services);if(i%4!==0){grouped[0][14]=pen(totals.subtotal);grouped[0][15]=pen(totals.tax);grouped[0][16]=pen(totals.total);}
    }
    return rows;
  }
  const api={HEADERS,LEGACY_HEADERS,MAX_BYTES:R.MAX_BYTES,MAX_ROWS:R.MAX_ROWS,money,prepare,template:()=>R.serialize([HEADERS]),exampleRows,example:()=>R.serialize(exampleRows())};
  g.PetDoctorAttentionCsv=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
