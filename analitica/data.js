(function(g){
  'use strict';
  const W=g.PetDoctorWorkspace||require('./lib/workspace.js'),R=g.PetDoctorRegistryCsv||require('./lib/registry-csv.js'),A=g.PetDoctorAttentionCsv||require('./lib/attention-csv.js'),H=g.PetDoctorHistory||require('./lib/history.js');
  const C=g.PetDoctorCatalog||require('./lib/catalog.js').catalog;
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const clone=v=>JSON.parse(JSON.stringify(v));
  const fail=m=>{throw Error(m);};
  function sum(values){let result=0;for(const v of values){if(!Number.isSafeInteger(v))fail('El importe debe ser un entero de céntimos.');result+=v;if(!Number.isSafeInteger(result))fail('Importe fuera del rango seguro.');}return result;}
  function amount(v){if(!Number.isSafeInteger(v)||v<0)fail('Importe histórico inválido o incompleto.');return v;}
  function normalize(workspace){
    const rows=[],ids=new Set(),owners=new Map(workspace.owners.map(o=>[o.id,o])),pets=new Map(workspace.pets.map(p=>[p.id,p]));
    for(const a of workspace.attentions){
      try{
        if(ids.has(a.id))fail('ID de atención duplicado.');ids.add(a.id);
        if(a.status!=='realizada')fail('Solo se admiten atenciones realizadas.');
        const q=a.quote,p=q.pricing,identity=q.state.pet,parts=H.dateParts(a.performedAt);
        if(q.currency!=='PEN')fail('La moneda debe ser PEN.');
        if(!p.services.length)fail('Falta el desglose por servicios; usa la base JSON completa.');
        const ownerId=a.registration?.ownerId,petId=a.registration?.petId;
        const linked=!!(ownerId&&petId&&owners.has(ownerId)&&pets.get(petId)?.ownerId===ownerId);
        const serviceIds=new Set(),services=[];
        for(let i=0;i<p.services.length;i++){
          const s=p.services[i];amount(s.subtotal);amount(s.tax);amount(s.total);
          if(typeof s.name!=='string'||!s.name.trim()||s.name.length>500)fail('Nombre histórico del servicio inválido.');
          if(sum([s.subtotal,s.tax])!==s.total||!Array.isArray(s.lines)||!s.lines.length||sum(s.lines.map(l=>l.amount))!==s.subtotal)fail('El desglose del servicio no concilia con sus importes.');
          const code=typeof s.id==='string'&&Object.hasOwn(C.services,s.id)?s.id:'unclassified';
          if(code!=='unclassified'&&serviceIds.has(code))fail('Servicio duplicado dentro de la atención.');serviceIds.add(code);
          services.push({...s,code,index:i});
        }
        for(const field of ['subtotal','tax','total'])if(sum(services.map(s=>s[field]))!==amount(p[field]))fail('Los servicios no concilian con el '+field+' de la atención.');
        if(sum([p.subtotal,p.tax])!==p.total)fail('Subtotal + IGV no coincide con total.');
        const weekday=(new Date(parts.date+'T00:00:00Z').getUTCDay()+6)%7;
        for(const s of services)rows.push({attentionId:a.id,performedAt:a.performedAt,date:parts.date,time:parts.time,hour:Number(parts.time.slice(0,2)),weekday,ownerId:linked?ownerId:null,petId:linked?petId:null,ownerName:a.ownerSnapshot?.name??identity.ownerName??'Sin nombre',petName:identity.name||'Sin nombre',serviceCode:s.code,serviceName:s.name||'Servicio sin nombre',serviceIndex:s.index,subtotal:s.subtotal,tax:s.tax,total:s.total,attentionTotal:p.total,attention:a});
      }catch(e){fail('Atención '+a.id+': '+e.message);}
    }
    sum(rows.map(r=>r.total));return rows;
  }
  function validate(workspace){const clean=W.read(JSON.stringify(workspace));normalize(clean);return clean;}
  function dataset(workspace,meta={}){return {workspace:validate(workspace),meta:{demo:meta.demo===true,name:String(meta.name||'Archivo cargado').slice(0,200)}};}
  function empty(){return dataset(W.empty(),{name:'Sin datos'});}
  function demo(){const owners=R.prepare(W.empty(),R.example25());const records=A.prepare(owners.candidate,A.example());if(records.errors.length)fail(records.errors[0].message);return dataset(records.candidate,{demo:true,name:'Demostración · 25 clientes / 45 perritos / 150 atenciones'});}
  function prepare(current,kind,text,name){
    try{
      let candidate,result,mode='incorporar',warnings=[];
      if(kind==='demo'){candidate=demo();mode='reemplazar';}
      else if(kind==='json'){
        if(new Blob([text]).size>20*1024*1024)fail('El JSON supera 20 MB.');
        let value;try{value=JSON.parse(text);}catch{fail('El archivo no contiene JSON válido.');}
        if(value?.type==='pet-doctor.analytics'){if(value.version!==1)fail('Respaldo de Analítica incompatible.');candidate=dataset(value.workspace,value.meta);}
        else candidate=dataset(value,{demo:false,name});mode='reemplazar';
      }else if(kind==='owners'||kind==='attentions'){
        result=(kind==='owners'?R:A).prepare(current.workspace,text);
        if(result.errors.length)return {...result,mode,canImport:false};
        candidate=dataset(result.candidate,{demo:false,name});warnings=result.warnings;
      }else fail('Formato no admitido.');
      const flat=normalize(candidate.workspace);
      return {candidate,mode,errors:[],warnings,canImport:result?result.canImport:true,counts:{owners:candidate.workspace.owners.length,pets:candidate.workspace.pets.length,attentions:candidate.workspace.attentions.length,services:flat.length,total:sum(flat.map(r=>r.total))},changes:result?.counts};
    }catch(e){return {candidate:null,mode:kind==='json'||kind==='demo'?'reemplazar':'incorporar',canImport:false,errors:[{line:0,column:'archivo',message:e.message+(kind==='attentions'&&/Cabecera/.test(e.message)?' El CSV del historial es un reporte: usa la plantilla detallada o JSON completo.':'')}],warnings:[]};}
  }
  function options(rows){
    const owners=new Map(),pets=new Map(),services=new Map();
    for(const r of [...rows].sort((a,b)=>a.performedAt.localeCompare(b.performedAt))){if(r.ownerId)owners.set(r.ownerId,{id:r.ownerId,name:r.ownerName});if(r.petId)pets.set(r.petId,{id:r.petId,name:r.petName,ownerId:r.ownerId});services.set(r.serviceCode,{id:r.serviceCode,name:r.serviceCode==='unclassified'?'Sin clasificar':r.serviceName});}
    return {owners:[...owners.values()],pets:[...pets.values()],services:[...services.values()]};
  }
  function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
  const initialFilters=()=>({from:'',to:'',services:[],owner:'',pet:'',weekday:'',hour:'',frequency:'',search:''});
  function reconcile(filters,rows){
    const next={...initialFilters(),...filters,services:[...(filters.services||[])]},o=options(rows);let changed=false;
    for(const [key,values] of [['owner',o.owners],['pet',o.pets]])if(next[key]&&!values.some(v=>v.id===next[key])){next[key]='';changed=true;}
    if(next.pet&&next.owner&&!o.pets.some(p=>p.id===next.pet&&p.ownerId===next.owner)){next.pet='';changed=true;}
    next.services=next.services.filter(id=>o.services.some(s=>s.id===id));if(next.services.length!==(filters.services||[]).length)changed=true;
    return {filters:next,changed};
  }
  function query(rows,filters={},settings={}){
    const f={...initialFilters(),...filters},q=norm(f.search);
    if((f.from&&!validDate(f.from))||(f.to&&!validDate(f.to))||(f.from&&f.to&&f.from>f.to))fail('El intervalo de fechas no es válido.');
    if(f.weekday!==''&&!/^[0-6]$/.test(String(f.weekday)))fail('Día de semana inválido.');
    if(f.hour!==''&&!/^(?:[0-9]|1[0-9]|2[0-3])$/.test(String(f.hour)))fail('Hora inválida.');
    if(!['','1','2','3','4+'].includes(f.frequency))fail('Frecuencia inválida.');
    const base=rows.filter(r=>(!f.from||r.date>=f.from)&&(!f.to||r.date<=f.to)&&(!f.services.length||f.services.includes(r.serviceCode))&&(!f.owner||r.ownerId===f.owner)&&(!f.pet||r.petId===f.pet)&&(f.weekday===''||r.weekday===Number(f.weekday))&&(f.hour===''||r.hour===Number(f.hour))&&(!q||norm([r.attentionId,r.ownerName,r.petName].join(' ')).includes(q)));
    const visits=new Map();for(const r of base)if(r.ownerId){if(!visits.has(r.ownerId))visits.set(r.ownerId,new Set());visits.get(r.ownerId).add(r.attentionId);}
    const band=n=>n>=4?'4+':String(n),distribution=['1','2','3','4+'].map(key=>({key,label:key+' atenciones',value:[...visits.values()].filter(v=>band(v.size)===key).length}));
    const selected=f.frequency?base.filter(r=>r.ownerId&&band(visits.get(r.ownerId).size)===f.frequency):base;
    const atts=new Map(),clients=new Map(),pets=new Set(),services=new Map(),heat=new Map(),trend=new Map(),unknown=new Set();
    const group=settings.group||'day';if(!['day','week','month'].includes(group))fail('Agrupación inválida.');
    function bucket(date){if(group==='month')return date.slice(0,7);if(group==='day')return date;const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
    for(const r of selected){
      if(!atts.has(r.attentionId))atts.set(r.attentionId,{id:r.attentionId,date:r.date,time:r.time,ownerName:r.ownerName,petName:r.petName,services:[],subtotal:0,tax:0,total:0,attentionTotal:r.attentionTotal,attention:r.attention});
      const a=atts.get(r.attentionId);a.services.push(r.serviceName);a.subtotal=sum([a.subtotal,r.subtotal]);a.tax=sum([a.tax,r.tax]);a.total=sum([a.total,r.total]);
      if(r.ownerId){if(!clients.has(r.ownerId))clients.set(r.ownerId,{id:r.ownerId,name:r.ownerName,subtotal:0,attentions:new Set()});const c=clients.get(r.ownerId);c.name=r.ownerName;c.subtotal=sum([c.subtotal,r.subtotal]);c.attentions.add(r.attentionId);}else unknown.add(r.attentionId);
      if(r.petId)pets.add(r.petId);
      if(!services.has(r.serviceCode))services.set(r.serviceCode,{id:r.serviceCode,name:r.serviceCode==='unclassified'?'Sin clasificar':r.serviceName,subtotal:0,count:0});const s=services.get(r.serviceCode);s.subtotal=sum([s.subtotal,r.subtotal]);s.count++;
      const h=r.weekday+'|'+r.hour;if(!heat.has(h))heat.set(h,new Set());heat.get(h).add(r.attentionId);
      const key=bucket(r.date);if(!trend.has(key))trend.set(key,{key,subtotal:0,attentions:new Set()});const t=trend.get(key);t.subtotal=sum([t.subtotal,r.subtotal]);t.attentions.add(r.attentionId);
    }
    const subtotal=sum(selected.map(r=>r.subtotal)),tax=sum(selected.map(r=>r.tax)),total=sum([subtotal,tax]),recurring=[...clients.values()].filter(c=>c.attentions.size>=2).length;
    const list=[...atts.values()].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)||a.id.localeCompare(b.id));
    const series=[...trend.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(t=>({...t,count:t.attentions.size}));
    return {rows:selected,attentions:list,kpis:{subtotal,tax,total,attentions:atts.size,services:selected.length,clients:clients.size,pets:pets.size,ticket:atts.size?Math.round(subtotal/atts.size):null,recurrence:clients.size?recurring/clients.size:null,unlinked:unknown.size},services:[...services.values()],topClients:[...clients.values()].map(c=>({...c,count:c.attentions.size})),heat:Array.from({length:168},(_,i)=>({weekday:Math.floor(i/24),hour:i%24,count:heat.get(Math.floor(i/24)+'|'+i%24)?.size||0})),trend:series,distribution,group};
  }
  function quickRange(kind,rows,now=new Date()){
    const today=H.dateParts(now).date,from=new Date(today+'T00:00:00Z');
    if(kind==='all'){const dates=rows.map(r=>r.date).sort();return {from:dates[0]||'',to:dates.at(-1)||''};}
    if(kind==='year')return {from:today.slice(0,4)+'-01-01',to:today};
    if(!['30','90'].includes(kind))fail('Periodo rápido inválido.');from.setUTCDate(from.getUTCDate()-Number(kind)+1);return {from:from.toISOString().slice(0,10),to:today};
  }
  function cell(value){let s=String(value??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  function csv(selection){
    const headers=['atencion_id','fecha','hora','zona_horaria','cliente_id','cliente_nombre','perrito_id','perrito_nombre','servicio_codigo','servicio_nombre','subtotal_pen','igv_pen','total_pen'];
    const pen=v=>(v/100).toFixed(2).replace('.',',');
    return '\ufeff'+[headers,...selection.rows.map(r=>[r.attentionId,r.date,r.time,'America/Lima',r.ownerId||'',r.ownerName,r.petId||'',r.petName,r.serviceCode,r.serviceName,pen(r.subtotal),pen(r.tax),pen(r.total)])].map(row=>row.map(cell).join(';')).join('\r\n')+'\r\n';
  }
  const backup=data=>JSON.stringify({type:'pet-doctor.analytics',version:1,workspace:data.workspace,meta:data.meta},null,2);
  async function prepareCsv(text,name,options={}){try{const C=g.PetDoctorAnalyticsCsv||require('./lib/analytics-csv.js');const workspace=await C.read(text,options);if(options.signal?.aborted)throw Error('Carga cancelada.');const candidate=dataset(workspace,{name,demo:false}),rows=normalize(candidate.workspace);return {candidate,mode:'reemplazar',errors:[],warnings:[],canImport:true,counts:{owners:workspace.owners.length,pets:workspace.pets.length,attentions:workspace.attentions.length,services:rows.length,total:sum(rows.map(r=>r.total))}};}catch(e){if(options.signal?.aborted)throw e;return {candidate:null,mode:'reemplazar',canImport:false,errors:[{line:0,column:'archivo',message:e.message}],warnings:[]};}}
  const api={normalize,validate,dataset,empty,demo,prepare,prepareCsv,options,initialFilters,reconcile,query,quickRange,csv,backup,sum};g.PetDoctorAnalyticsData=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
