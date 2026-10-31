(function(g){
  'use strict';
  const fail=m=>{throw Error(m);};
  const clone=v=>JSON.parse(JSON.stringify(v));
  function text(v,label,max=200){if(typeof v!=='string'||v.length>max)fail('Campo inválido: '+label+'.');return v.normalize('NFC').trim();}
  function today(now=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;}
  function date(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)fail('Fecha inválida: usa AAAA-MM-DD.');return value;}
  function shift(value,years,months){const [y,m,d]=date(value).split('-').map(Number);const yr=y-years;if(yr<1)fail('La edad excede el calendario admitido.');const day=Math.min(d,new Date(Date.UTC(yr,m,0)).getUTCDate());const index=yr*12+m-1-months,ny=Math.floor(index/12),nm=index%12;if(ny<100||ny>9999)fail('La edad excede el calendario admitido.');return new Date(Date.UTC(ny,nm,Math.min(day,new Date(Date.UTC(ny,nm+1,0)).getUTCDate()))).toISOString().slice(0,10);}
  function makeAge(years,months,asOf=today()){
    if(!Number.isSafeInteger(years)||years<0||!Number.isInteger(months)||months<0||months>11)fail('Edad: indica años enteros no negativos y meses de 0 a 11.');
    date(asOf);if(asOf>today())fail('La fecha de referencia no puede ser futura.');
    return {years,months,asOf,estimatedBirthDate:shift(asOf,years,months)};
  }
  function ageReference(v){if(v===null||v===undefined)return null;if(typeof v!=='object')fail('Referencia de edad inválida.');date(v.asOf);const clean=makeAge(v.years,v.months,v.asOf);if(v.estimatedBirthDate!==clean.estimatedBirthDate)fail('El nacimiento estimado no coincide con la edad de referencia.');return clean;}
  function ageAt(ref,on=today()){
    if(!ref)return null;date(on);const birth=ageReference(ref).estimatedBirthDate;if(on<birth)return null;
    const [y,m,d]=on.split('-').map(Number),[by,bm,bd]=birth.split('-').map(Number);let months=(y-by)*12+m-bm;
    if(d<Math.min(bd,new Date(Date.UTC(y,m,0)).getUTCDate()))months--;
    return {years:Math.floor(months/12),months:months%12};
  }
  function ageLabel(ref,on=today()){const a=ageAt(ref,on);return a?a.years+' años y '+a.months+' meses':'Edad no registrada';}
  function petExtras(p){
    if(p.species!==undefined&&p.species!=='canine')fail('Solo se admiten perros (Canino).');
    const sex=p.sex??null;if(![null,'male','female','undetermined'].includes(sex))fail('Sexo del perro inválido.');
    const registeredOn=p.registeredOn??null;if(registeredOn!==null){date(registeredOn);if(registeredOn>today())fail('La fecha de registro no puede ser futura.');}
    return {species:'canine',breed:text(p.breed??'','raza'),sex,registeredOn,ageReference:ageReference(p.ageReference)};
  }
  function requirePet(p){if(!text(p.breed??'','raza')||!p.sex||!p.ageReference)fail('Completa raza, sexo y edad del perrito.');petExtras(p);}
  const sexLabel=s=>({male:'Macho',female:'Hembra',undetermined:'No determinado'}[s]||'No registrado');
  function snapshot(p,on){return {...clone(p),ageAtAttention:ageAt(p.ageReference,on)};}
  function validateSnapshot(p){if(!p||typeof p!=='object')fail('Instantánea del perro inválida.');petExtras(p);if(p.ageAtAttention!==undefined&&p.ageAtAttention!==null){const a=p.ageAtAttention;if(!Number.isSafeInteger(a.years)||a.years<0||!Number.isInteger(a.months)||a.months<0||a.months>11)fail('Edad histórica inválida.');}return p;}
  const api={text,today,date,makeAge,ageReference,ageAt,ageLabel,petExtras,requirePet,sexLabel,snapshot,validateSnapshot};
  g.PetDoctorRecords=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
