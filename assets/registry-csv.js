(function(g){
  'use strict';
  const W=g.PetDoctorWorkspace || require('./workspace.js');
  const D=g.PetDoctorRecords||require('./records.js');
  const LEGACY_HEADERS=['cliente_id','cliente_nombre','cliente_dni','cliente_telefono','cliente_correo','perrito_id','perrito_nombre','peso_kg','tamano','pelaje'];
  const EXTRA_HEADERS=['cliente_distrito','especie','raza','sexo','edad_anios','edad_meses','fecha_referencia_edad'];
  const HEADERS=[...LEGACY_HEADERS,...EXTRA_HEADERS];
  const MAX_BYTES=5*1024*1024,MAX_ROWS=5000;
  const norm=value=>String(value??'').normalize('NFC').trim();
  const phone=value=>norm(value).replace(/\D/g,'');
  const petName=value=>norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function bytes(source){let n=0;for(const c of source){const cp=c.codePointAt(0);n+=cp<128?1:cp<2048?2:cp<65536?3:4;}return n;}
  function parse(source,headers=HEADERS,optional=[]){
    if(typeof source!=='string')throw Error('El CSV debe contener texto.');
    if(bytes(source)>MAX_BYTES)throw Error('El CSV supera el límite de 5 MB.');
    if(source.includes('\ufffd')||source.includes('\0'))throw Error('El CSV contiene texto corrupto. Guárdalo como UTF-8.');
    source=source.replace(/^\ufeff/,'');
    let quoted=false,semis=0;
    for(let i=0;i<source.length;i++){
      const c=source[i];if(c==='"'){if(quoted&&source[i+1]==='"'){i++;continue;}quoted=!quoted;}
      if(!quoted){if(c==='\r'||c==='\n')break;if(c===';')semis++;}
    }
    const sep=semis?';':','; // Se decide con la cabecera, nunca con decimales.
    const records=[];let row=[],field='',state='plain',line=1,start=1;
    function finish(){
      row.push(field);
      if(!(row.length===1&&!row[0].trim()))records.push({line:start,values:row});
      if(records.length>MAX_ROWS+1)throw Error('El CSV supera el límite de 5.000 filas de datos.');
      row=[];field='';state='plain';
    }
    for(let i=0;i<source.length;i++){
      const c=source[i];
      if(state==='quoted'){
        if(c==='"'){if(source[i+1]==='"'){field+='"';i++;}else state='closed';}
        else{field+=c;if(c==='\n'||(c==='\r'&&source[i+1]!=='\n'))line++;}
        continue;
      }
      if(c===sep){row.push(field);field='';state='plain';continue;}
      if(c==='\r'||c==='\n'){finish();if(c==='\r'&&source[i+1]==='\n')i++;line++;start=line;continue;}
      if(state==='closed'){if(c===' '||c==='\t')continue;throw Error('Fila '+line+': hay texto después de cerrar una celda entre comillas.');}
      if(c==='"'){if(field)throw Error('Fila '+line+': comilla inesperada dentro de una celda.');state='quoted';}
      else field+=c;
    }
    if(state==='quoted')throw Error('Fila '+start+': celda entre comillas sin cerrar.');
    if(field||row.length||state==='closed')finish();
    if(!records.length)throw Error('El CSV está vacío.');
    const header=records.shift().values.map(norm);
    if(new Set(header).size!==header.length)throw Error('La cabecera contiene columnas duplicadas.');
    const legacy=headers===HEADERS&&!EXTRA_HEADERS.some(h=>header.includes(h));
    const required=legacy?LEGACY_HEADERS:headers.filter(h=>!optional.includes(h));
    const unknown=header.filter(h=>!headers.includes(h)),missing=required.filter(h=>!header.includes(h));
    if(unknown.length||missing.length)throw Error('Cabecera inválida.'+(unknown.length?' Columnas desconocidas: '+unknown.join(', ')+'.':'')+(missing.length?' Faltan: '+missing.join(', ')+'.':''));
    return {delimiter:sep,legacy,header,records:records.map(record=>({...record,data:Object.fromEntries(headers.map(h=>[h,header.includes(h)?record.values[header.indexOf(h)]??'':''])),aligned:record.values.length===header.length}))};
  }
  function prepare(workspace,source){
    const parsed=parse(source),candidate=W.read(JSON.stringify(workspace)),baseFingerprint=JSON.stringify(workspace);
    const errors=[],warnings=[],rows=[],owners=new Map(candidate.owners.map(o=>[o.dni,o])),ownerIds=new Map(candidate.owners.map(o=>[o.id,o])),pets=new Map(candidate.pets.map(p=>[p.id,p]));
    if(parsed.legacy)warnings.push({line:1,column:'cabecera',message:'Formato heredado: los datos nuevos ausentes quedan sin registrar.'});
    const usedOwners=new Set(),newOwners=new Set();let newPets=0,registered=0;
    const sizes={pequeno:'small',mediano:'medium',grande:'large'},coats={corto:'short',largo:'long'};
    const sameOwner=(a,b)=>norm(a.name)===norm(b.name)&&phone(a.contact)===phone(b.contact)&&norm(a.email)===norm(b.email)&&(parsed.legacy||norm(a.district)===b.district);
    const samePet=(a,b)=>a.ownerId===b.ownerId&&norm(a.name)===norm(b.name)&&a.weightKg===b.weightKg&&a.size===b.size&&a.coat===b.coat&&(parsed.legacy||a.breed===b.breed&&a.sex===b.sex&&JSON.stringify(a.ageReference)===JSON.stringify(b.ageReference));
    for(const record of parsed.records){
      const d=Object.fromEntries(Object.entries(record.data).map(([k,v])=>[k,norm(v)])),row={line:record.line,data:d,status:'Por revisar'},initial=errors.length;
      rows.push(row);
      const error=(column,message)=>errors.push({line:record.line,column,message});
      const warn=(column,message)=>warnings.push({line:record.line,column,message});
      if(!record.aligned){error('fila','La cantidad de celdas no coincide con la cabecera.');row.status='Error';continue;}
      for(const [field,max] of [['cliente_id',100],['cliente_nombre',200],['cliente_telefono',200],['cliente_correo',254],['perrito_id',100],['perrito_nombre',200]])if(d[field].length>max)error(field,'Supera '+max+' caracteres.');
      if(!d.cliente_nombre)error('cliente_nombre','El nombre del cliente es obligatorio.');
      if(!/^\d{8}$/.test(d.cliente_dni))error('cliente_dni','El DNI debe tener exactamente ocho dígitos; impórtalo como texto.');
      if(!W.completeOwner({name:d.cliente_nombre,dni:d.cliente_dni,contact:d.cliente_telefono})){
        if(!/^[+\d\s().-]+$/.test(d.cliente_telefono)||d.cliente_telefono.replace(/\D/g,'').length<7||d.cliente_telefono.replace(/\D/g,'').length>15)error('cliente_telefono','Se necesita un teléfono de 7 a 15 dígitos con separadores habituales.');
      }
      if(!W.validEmail(d.cliente_correo)||/[\s,;<>]/.test(d.cliente_correo))error('cliente_correo','Se necesita una única dirección de correo válida.');
      if(!d.perrito_nombre)error('perrito_nombre','El nombre del perrito es obligatorio.');
      let extra=D.petExtras({});
      if(!parsed.legacy)try{
        if(!D.text(d.cliente_distrito,'distrito',100))throw Error('El distrito es obligatorio.');
        if(d.especie!=='canino')throw Error('La especie debe ser canino.');
        if(!/^\d+$/.test(d.edad_anios)||!/^\d+$/.test(d.edad_meses))throw Error('Completa años y meses enteros.');
        extra=D.petExtras({breed:d.raza,sex:({macho:'male',hembra:'female',no_determinado:'undetermined'})[d.sexo],registeredOn:d.fecha_referencia_edad,ageReference:D.makeAge(Number(d.edad_anios),Number(d.edad_meses),d.fecha_referencia_edad)});
        D.requirePet(extra);
      }catch(e){error('datos del registro',e.message);}
      let weight=null;
      if(d.peso_kg){
        if(!/^\d+(?:[.,]\d+)?$/.test(d.peso_kg))error('peso_kg','Usa un número positivo sin separadores de miles.');
        else{weight=Number(d.peso_kg.replace(',','.'));if(!Number.isFinite(weight)||weight<=0)error('peso_kg','El peso debe ser mayor que cero.');}
      }
      if(d.tamano&&!Object.hasOwn(sizes,d.tamano))error('tamano','Usa pequeno, mediano o grande.');
      if(d.pelaje&&!Object.hasOwn(coats,d.pelaje))error('pelaje','Usa corto o largo.');
      if(d.peso_kg&&d.tamano)error('peso_kg','Elige peso o tamaño, no ambos.');
      if(errors.length!==initial){row.status='Error';continue;}
      let owner=owners.get(d.cliente_dni);
      const draft={name:d.cliente_nombre,dni:d.cliente_dni,contact:d.cliente_telefono,email:d.cliente_correo,district:d.cliente_distrito};
      if(owner){
        if(d.cliente_id&&d.cliente_id!==owner.id)error('cliente_id','El ID no coincide con el cliente de ese DNI.');
        if(!sameOwner(owner,draft))error('cliente_nombre/cliente_telefono/cliente_correo','Los datos difieren de los del mismo DNI. No se sobrescriben clientes.');
      }else{
        if(d.cliente_id&&ownerIds.has(d.cliente_id))error('cliente_id','Ese ID ya corresponde a otro DNI.');
        if(errors.length===initial){owner={id:d.cliente_id||W.newId(),...draft};candidate.owners.push(owner);owners.set(owner.dni,owner);ownerIds.set(owner.id,owner);newOwners.add(owner.id);}
      }
      if(errors.length!==initial){row.status='Conflicto';continue;}
      usedOwners.add(owner.id);row.ownerId=owner.id;
      const pet={id:d.perrito_id||W.newId(),ownerId:owner.id,name:d.perrito_nombre,weightKg:weight,size:d.tamano?sizes[d.tamano]:null,coat:d.pelaje?coats[d.pelaje]:null,...extra};
      const prior=d.perrito_id?pets.get(d.perrito_id):null;
      if(prior){
        if(!samePet(prior,pet))error('perrito_id','Ese ID pertenece a otro dueño o tiene datos distintos.');
        else{registered++;row.status='Ya registrado';row.petId=prior.id;}
      }else{
        const homonyms=candidate.pets.filter(p=>p.ownerId===owner.id&&petName(p.name)===petName(pet.name));
        if(homonyms.length&&!d.perrito_id)error('perrito_id','Nombre ambiguo para este dueño: usa el ID existente o uno nuevo si es otro perrito.');
        else{
          if(homonyms.length)warn('perrito_nombre','Este dueño tiene perritos con el mismo nombre. Se distinguen por ID.');
          candidate.pets.push(pet);pets.set(pet.id,pet);newPets++;row.petId=pet.id;row.status='Perrito nuevo';
        }
      }
      if(errors.length!==initial)row.status='Conflicto';
    }
    const counts={newOwners:newOwners.size,reusedOwners:[...usedOwners].filter(id=>!newOwners.has(id)).length,newPets,registered};
    let clean=null;
    if(!errors.length){
      try{candidate.updatedAt=new Date().toISOString();clean=W.read(JSON.stringify(candidate));}
      catch(e){errors.push({line:0,column:'base',message:e.message});}
    }
    return {baseFingerprint,rows,errors,warnings,counts,candidate:errors.length?null:clean,canImport:!errors.length&&(counts.newOwners>0||newPets>0)};
  }
  function serialize(records){const cell=v=>/[";\r\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':String(v);return '\ufeff'+records.map(row=>row.map(cell).join(';')).join('\r\n')+'\r\n';}
  function template(){return serialize([HEADERS]);}
  function exampleRows(count=10){
    const names=['Ana Ejemplo','Luis Demostración','María Prueba','José Modelo','Lucía Ensayo','Carlos Ficticio','Elena Muestra','Óscar Ejemplo','Sofía Demostración','Andrés Prueba'];
    const dogs=['Luna','Toby','Nala','Max','Kira','Coco','Milo','Lola','Bruno','Nina','Duna','Pipo "Chiqui"','Simba','Mora','Sol'];
    const more=['Beatriz','Diego','Inés','Javier','Paula','Mateo','Rocío','Gabriel','Valeria','Hugo','Teresa','Iván','Clara','Nicolás','Julia'];
    if(count===25)names.push(...more.map(name=>name+' Ejemplo'));
    const rows=[HEADERS];let pet=0;
    names.forEach((name,i)=>{for(let j=0;j<(i<5?1:2);j++){
      const n=pet++;rows.push(['csv-demo-cliente-'+String(i+1).padStart(2,'0'),name,String(i+1).padStart(8,'0'),'000000'+String(i+1).padStart(3,'0'),'cliente'+(i+1)+'@example.com','csv-demo-perrito-'+String(n+1).padStart(2,'0'),dogs[n]||'Perrito de prueba '+String(n+1),n%3===0?'12,5':'',n%3===1?['pequeno','mediano','grande'][n%3]:'',n%3===2?'':n%2?'largo':'corto',['Surco','Barranco','Miraflores','San Borja','Jesús María'][i%5],'canino',n%2?'Mestizo':'Desconocida',n%3===0?'no_determinado':n%2?'hembra':'macho',String(1+n%8),String(n%12),'2026-08-21']);
    }});return rows;
  }
  const api={HEADERS,LEGACY_HEADERS,MAX_BYTES,MAX_ROWS,parse,prepare,serialize,template,exampleRows,example:()=>serialize(exampleRows()),example25:()=>serialize(exampleRows(25))};
  g.PetDoctorRegistryCsv=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
