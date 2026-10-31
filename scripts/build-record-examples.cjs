// Ejemplos ficticios reproducibles; conserva fixtures anteriores una sola vez.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'examples'),fixtures=path.join(root,'tests/fixtures/v2');
fs.mkdirSync(fixtures,{recursive:true});
for(const name of ['clientes-perritos-ejemplo-10.csv','clientes-perritos-ejemplo-25.csv','atenciones-ejemplo-150.csv','registro-demo.json','base-v2-vacia.json']){
  const dest=path.join(fixtures,name);if(!fs.existsSync(dest))fs.writeFileSync(dest,cp.execFileSync('git',['show','9d23c5f:examples/'+name],{cwd:root}));
}
const R=require('../assets/registry-csv.js'),A=require('../assets/attention-csv.js'),W=require('../assets/workspace.js');
for(const [name,source]of [['clientes-perritos-ejemplo-10.csv',R.example()],['clientes-perritos-ejemplo-25.csv',R.example25()],['clientes-perritos-plantilla.csv',R.template()],['atenciones-ejemplo-150.csv',A.example()],['atenciones-plantilla.csv',A.template()]])fs.writeFileSync(path.join(out,name),source,'utf8');
const records=R.prepare(W.empty(),R.example()).candidate;
fs.writeFileSync(path.join(out,'registro-demo.json'),JSON.stringify(W.exportRegistry(records),null,2)+'\n');
fs.writeFileSync(path.join(out,'base-v3-vacia.json'),JSON.stringify(W.empty(),null,2)+'\n');
console.log('Ejemplos v3 generados; fixtures v2 conservados.');
