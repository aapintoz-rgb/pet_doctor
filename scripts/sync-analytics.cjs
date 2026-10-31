// Sincronización reproducible: solo escribe dependencias dentro de analitica/.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),target=path.join(root,'analitica');
const files=['catalog.js','pricing.js','files.js','workspace.js','registry-csv.js','attention-csv.js','history.js'];
const examples=['clientes-perritos-ejemplo-25.csv','clientes-perritos-plantilla.csv','atenciones-ejemplo-150.csv','atenciones-plantilla.csv'];
const hashes={};
for(const [folder,list,output] of [['assets',files,'lib'],['examples',examples,'examples']]){
  fs.mkdirSync(path.join(target,output),{recursive:true});
  for(const name of list){let bytes=fs.readFileSync(path.join(root,folder,name));if(output==='lib')bytes=Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'),'utf8');fs.writeFileSync(path.join(target,output,name),bytes);hashes[output+'/'+name]=crypto.createHash('sha256').update(bytes).digest('hex');}
}
for(const name of ['echarts.min.js','LICENSE-echarts.txt','NOTICE-echarts.txt'])hashes['vendor/'+name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(target,'vendor',name))).digest('hex');
fs.writeFileSync(path.join(target,'dependencies.json'),JSON.stringify({version:1,echarts:'6.0.0',sha256:hashes},null,2)+'\n');
console.log('Analítica: '+files.length+' módulos puros y '+examples.length+' ejemplos sincronizados.');
