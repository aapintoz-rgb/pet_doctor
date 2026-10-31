(function(g){
  'use strict';
  const W=g.PetDoctorWorkspace||require('./workspace.js'),H=g.PetDoctorHistory||require('./history.js');
  const MAX_BYTES=50*1024*1024,MAX_ROWS=60000;
  const HEADERS=['formato_version','exportado_en','atencion_id','fecha','hora','estado','moneda','cliente_id','perrito_id','vinculo_registrado','cliente_nombre','cliente_dni','perrito_nombre','cliente_distrito','subtotal_atencion_pen','igv_atencion_pen','total_atencion_pen','observaciones','servicio_codigo','servicio_nombre','subtotal_servicio_pen','igv_servicio_pen','total_servicio_pen','cliente_actual_json','perrito_actual_json','cliente_historico_json','perrito_historico_json','atencion_json','estado_cotizacion_json','servicio_json'];
  const clone=v=>JSON.parse(JSON.stringify(v));
  const fail=m=>{throw Error(m);};
  function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v);}
  function amount(v){if(!Number.isSafeInteger(v)||v<0)fail('Importe inválido o fuera de rango.');return v;}
  function sum(values){let n=0;for(const v of values){if(!Number.isSafeInteger(v)||!Number.isSafeInteger(n+=v))fail('Importe fuera de rango.');}return n;}
  function check(a){const p=a.quote?.pricing;if(!p||!Array.isArray(p.services)||!p.services.length)fail('Falta el desglose de servicios.');const ids=new Set();for(const s of p.services){if(typeof s.id!=='string'||!s.id||ids.has(s.id))fail('Servicio repetido o sin código.');ids.add(s.id);if(typeof s.name!=='string'||!Array.isArray(s.lines)||!s.lines.length||s.lines.some(l=>typeof l.label!=='string')||sum(s.lines.map(l=>l.amount))!==amount(s.subtotal)||sum([s.subtotal,amount(s.tax)])!==amount(s.total))fail('Los componentes o importes del servicio no concilian.');}for(const k of ['subtotal','tax','total'])if(sum(p.services.map(s=>s[k]))!==amount(p[k]))fail('Los servicios no concilian con la atención.');if(sum([p.subtotal,p.tax])!==p.total)fail('Subtotal + IGV no concilia.');if(a.quote.currency!=='PEN')fail('Moneda distinta de PEN.');}
  const pen=n=>(n/100).toFixed(2).replace('.',',');
  function row(a,s,owner,pet,stamp){const p=a.quote.pricing,identity=a.quote.state.pet,parts=H.dateParts(a.performedAt),meta=clone(a);delete meta.ownerSnapshot;delete meta.petSnapshot;delete meta.quote.state;delete meta.quote.pricing.services;
    return ['1',stamp,a.id,parts.date,parts.time,a.status,a.quote.currency,a.registration?.ownerId||identity.ownerId||'',a.registration?.petId||identity.petId||'',a.registration?'si':'no',a.ownerSnapshot?.name??identity.ownerName??'',a.ownerSnapshot?.dni||'',identity.name||'',a.ownerSnapshot?.district||'',pen(p.subtotal),pen(p.tax),pen(p.total),a.observations||'',s.id,s.name,pen(s.subtotal),pen(s.tax),pen(s.total),JSON.stringify(owner??null),JSON.stringify(pet??null),JSON.stringify(a.ownerSnapshot??null),JSON.stringify(a.petSnapshot??null),JSON.stringify(meta),JSON.stringify(a.quote.state),JSON.stringify(s)];
  }
  const dangerous=s=>/^[\s\u0000-\u001f\u007f]*[=+@-]/u.test(s)||/^[\t\r\n]/.test(s);
  function encode(v){let s=String(v);if(s.startsWith("'")||dangerous(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  function decode(s){return s.startsWith("'")&&(s.slice(1).startsWith("'")||dangerous(s.slice(1)))?s.slice(1):s;}
  function exportCsv(workspace,stamp=new Date().toISOString()){
    const ws=W.read(JSON.stringify(workspace)),owners=new Map(ws.owners.map(o=>[o.id,o])),pets=new Map(ws.pets.map(p=>[p.id,p]));if(!ws.attentions.length)fail('No hay atenciones guardadas para exportar.');
    const rows=[HEADERS.join(';')];let count=0;
    for(const a of ws.attentions){try{check(a);for(const s of a.quote.pricing.services){if(++count>MAX_ROWS)fail('Máximo 60.000 servicios.');const id=a.registration?.ownerId||a.quote.state.pet.ownerId,pid=a.registration?.petId||a.quote.state.pet.petId;rows.push(row(a,s,owners.get(id),pets.get(pid),stamp).map(encode).join(';'));}}catch(e){fail('Atención '+a.id+': '+e.message);}}
    const text='\ufeff'+rows.join('\r\n')+'\r\n';if(new TextEncoder().encode(text).length>MAX_BYTES)fail('El CSV supera 50 MB. Conserva un respaldo JSON completo.');return text;
  }
  const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
  async function read(source,{signal,onProgress=()=>{}}={}){
    if(typeof source!=='string'||new TextEncoder().encode(source).length>MAX_BYTES)fail('CSV inválido o superior a 50 MB.');
    if(source.includes('\ufffd')||source.includes('\0'))fail('Texto corrupto: utiliza CSV UTF-8.');
    source=source.replace(/^\ufeff/,'');const ws=W.empty(),owners=new Map(),pets=new Map(),attentions=new Map(),metas=new Map(),seen=new Set();let fields=[],cell='',state='plain',line=1,start=1,count=-1,header=false,stamp;
    function abort(){if(signal?.aborted)throw Error('Carga cancelada.');}
    function entity(map,value,label){if(value===null)return;if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.id!=='string')fail(label+' inválido.');if(map.has(value.id)&&canonical(map.get(value.id))!==canonical(value))fail(label+' contradictorio para ID '+value.id+'.');map.set(value.id,value);}
    function finish(){fields.push(cell);if(fields.length===1&&!fields[0]){fields=[];cell='';state='plain';return;}if(!header){if(fields.length!==HEADERS.length||fields.some((h,i)=>h!==HEADERS[i]))fail('Cabecera incompatible: carga el CSV para Analítica generado en Datos y sincronización.');header=true;}
      else{count++;if(count>=MAX_ROWS)fail('Máximo 60.000 filas de servicios.');const f=fields.map(decode);let id=f[2]||'sin ID';try{
        if(f.length!==HEADERS.length)fail('Cantidad de columnas incorrecta.');if(f[0]!=='1')fail('Versión de CSV incompatible.');if(!Number.isFinite(Date.parse(f[1])))fail('Fecha de exportación inválida.');if(stamp&&stamp!==f[1])fail('Fechas de exportación contradictorias.');stamp=f[1];
        const owner=JSON.parse(f[23]),pet=JSON.parse(f[24]),os=JSON.parse(f[25]),ps=JSON.parse(f[26]),meta=JSON.parse(f[27]),qstate=JSON.parse(f[28]),service=JSON.parse(f[29]);
        if(meta.id!==id||meta.quote?.id!==id||Object.hasOwn(meta,'ownerSnapshot')||Object.hasOwn(meta,'petSnapshot')||Object.hasOwn(meta.quote,'state')||Object.hasOwn(meta.quote.pricing,'services'))fail('Metadatos contradictorios.');
        const a={...meta,quote:{...meta.quote,state:qstate,pricing:{...meta.quote.pricing,services:[]}}};if(os!==null)a.ownerSnapshot=os;if(ps!==null)a.petSnapshot=ps;
        if(canonical(f)!==canonical(row(a,service,owner,pet,stamp)))fail('Las columnas visibles no coinciden con los datos JSON o importes.');
        if(owner&&owner.id!==f[7]||pet&&(pet.id!==f[8]||pet.ownerId!==f[7]))fail('Relación de cliente/perrito incorrecta.');entity(owners,owner,'Cliente');entity(pets,pet,'Perrito');
        const key=id+'\0'+service.id;if(seen.has(key))fail('Servicio repetido.');seen.add(key);
        const signature=canonical([meta,qstate,os,ps]);if(metas.has(id)&&metas.get(id)!==signature)fail('Datos contradictorios en la misma atención.');metas.set(id,signature);
        if(!attentions.has(id)){if(attentions.size>=10000)fail('Máximo 10.000 atenciones.');attentions.set(id,a);}attentions.get(id).quote.pricing.services.push(service);
      }catch(e){fail('Fila '+start+' · atención '+id+': '+e.message);}}
      fields=[];cell='';state='plain';
    }
    for(let i=0;i<source.length;i++){
      if(i%32768===0){abort();onProgress({percent:Math.floor(i/source.length*85),rows:count+1});await pause();}
      const c=source[i];if(state==='quoted'){if(c==='"'){if(source[i+1]==='"'){cell+='"';i++;}else state='closed';}else{cell+=c;if(c==='\n'||c==='\r'&&source[i+1]!=='\n')line++;}continue;}
      if(c===';'){fields.push(cell);cell='';state='plain';continue;}if(c==='\r'||c==='\n'){finish();if(c==='\r'&&source[i+1]==='\n')i++;line++;start=line;continue;}
      if(state==='closed')fail('Fila '+line+': texto después de comillas.');if(c==='"'){if(cell)fail('Fila '+line+': comilla inesperada.');state='quoted';}else cell+=c;
    }
    if(state==='quoted')fail('Fila '+start+': comillas sin cerrar.');if(cell||fields.length||state==='closed')finish();if(!header||!attentions.size)fail('El CSV no contiene servicios.');
    ws.owners=[...owners.values()];ws.pets=[...pets.values()];ws.attentions=[...attentions.values()];ws.updatedAt=stamp;
    for(let i=0;i<ws.attentions.length;i++){if(i%100===0){abort();onProgress({percent:85+Math.floor(i/ws.attentions.length*14),rows:count+1});await pause();}try{check(ws.attentions[i]);}catch(e){fail('Atención '+ws.attentions[i].id+': '+e.message);}}
    abort();const clean=W.read(JSON.stringify(ws));onProgress({percent:100,rows:count+1});return clean;
  }
  const api={HEADERS,MAX_BYTES,MAX_ROWS,exportCsv,read,check};g.PetDoctorAnalyticsCsv=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
