(function(g){
  'use strict';
  const days=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const money=v=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN',maximumFractionDigits:2}).format(v);
  function specs(result,settings){
    const theme={color:['#21665b','#d78660','#779e8b','#a5ba69','#8c89ac','#c4a473','#789db1'],animation:false,textStyle:{fontFamily:'system-ui, sans-serif',color:'#31483f'},tooltip:{trigger:'item',renderMode:'richText'},grid:{left:12,right:20,top:20,bottom:26,containLabel:true}};
    const monetary=settings.trendMeasure!=='count',sm=settings.serviceMeasure!=='count',cm=settings.clientMeasure!=='count';
    const serviceRows=[...result.services].sort((a,b)=>(sm?b.subtotal-a.subtotal:b.count-a.count)||a.name.localeCompare(b.name));
    const clients=[...result.topClients].sort((a,b)=>(cm?b.subtotal-a.subtotal:b.count-a.count)||a.name.localeCompare(b.name)).slice(0,10);
    const compact=v=>new Intl.NumberFormat('es-PE',{notation:'compact',maximumFractionDigits:1}).format(v);
    const bar=(data,labels,isMoney)=>({...theme,grid:{...theme.grid,bottom:40},xAxis:{type:'value',name:isMoney?'S/ sin IGV':'Cantidad',nameLocation:'middle',nameGap:27,minInterval:isMoney?0:1,splitNumber:3,axisLabel:{hideOverlap:true,formatter:v=>isMoney?compact(v):String(v)}},yAxis:{type:'category',data:labels,inverse:true,axisLabel:{width:110,overflow:'truncate'}},series:[{type:'bar',data,barMaxWidth:28,itemStyle:{borderRadius:[0,5,5,0]}}]});
    const trendData=result.trend.map(t=>({value:monetary?t.subtotal/100:t.count,key:t.key}));
    return {
      trend:{option:{...theme,tooltip:{trigger:'axis',renderMode:'richText'},xAxis:{type:'category',data:result.trend.map(t=>t.key),axisLabel:{hideOverlap:true}},yAxis:{type:'value',axisLabel:{formatter:v=>monetary?money(v):String(v)}},series:[{type:monetary?'line':'bar',data:trendData,smooth:false,showSymbol:result.trend.length<40,areaStyle:monetary?{opacity:0.08}:undefined}]},headers:['Periodo',monetary?'Importe sin IGV':'Atenciones'],rows:result.trend.map(t=>[t.key,monetary?money(t.subtotal/100):t.count])},
      services:{option:bar(serviceRows.map(s=>({value:sm?s.subtotal/100:s.count,id:s.id})),serviceRows.map(s=>s.name),sm),headers:['Servicio',sm?'Importe sin IGV':'Servicios'],rows:serviceRows.map(s=>[s.name,sm?money(s.subtotal/100):s.count])},
      heat:{option:{...theme,grid:{left:12,right:20,top:10,bottom:62,containLabel:true},tooltip:{renderMode:'richText',formatter:p=>days[p.data.weekday]+' '+String(p.data.hour).padStart(2,'0')+':00 · '+p.data.count+' atenciones'},xAxis:{type:'category',data:Array.from({length:24},(_,h)=>String(h).padStart(2,'0')),axisLabel:{interval:2}},yAxis:{type:'category',data:days,inverse:true},visualMap:{min:0,max:Math.max(1,...result.heat.map(h=>h.count)),orient:'horizontal',left:'center',bottom:0,inRange:{color:['#edf2e9','#21665b']}},series:[{type:'heatmap',data:result.heat.map(h=>({...h,value:[h.hour,h.weekday,h.count]})),itemStyle:{borderColor:'#ffffff',borderWidth:2}}]},headers:['Día','Hora','Atenciones'],rows:result.heat.map(h=>[days[h.weekday],String(h.hour).padStart(2,'0')+':00',h.count])},
      clients:{option:bar(clients.map(c=>({value:cm?c.subtotal/100:c.count,id:c.id})),clients.map(c=>c.name),cm),headers:['Cliente',cm?'Importe sin IGV':'Atenciones'],rows:clients.map(c=>[c.name,cm?money(c.subtotal/100):c.count])},
      frequency:{option:{...theme,xAxis:{type:'category',data:['1','2','3','4+']},yAxis:{type:'value',minInterval:1},series:[{type:'bar',data:result.distribution.map(d=>({value:d.value,key:d.key})),barMaxWidth:42,itemStyle:{color:'#d78660',borderRadius:[5,5,0,0]}}]},headers:['Atenciones por cliente','Clientes'],rows:result.distribution.map(d=>[d.key,d.value])}
    };
  }
  function mount(onSelect){
    const charts=new Map();
    function render(result,settings){
      const all=specs(result,settings);
      for(const [key,spec] of Object.entries(all)){
        const target=document.getElementById('chart-'+key),empty=document.getElementById('empty-'+key),table=document.getElementById('table-'+key);
        const has=key==='frequency'?result.distribution.some(d=>d.value>0):key==='clients'?result.topClients.length>0:result.rows.length>0;
        target.hidden=!has;empty.hidden=has;table.replaceChildren();
        const header=document.createElement('tr');for(const label of spec.headers){const th=document.createElement('th');th.scope='col';th.textContent=label;header.append(th);}const head=document.createElement('thead');head.append(header);table.append(head);
        const body=document.createElement('tbody');for(const values of spec.rows){const tr=document.createElement('tr');for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);}table.append(body);
        if(!g.echarts){empty.hidden=false;empty.textContent='Gráfico no disponible. Consulta la tabla de valores.';target.hidden=true;continue;}
        if(!has)continue;
        if(!charts.has(key)){const chart=g.echarts.init(target,null,{renderer:'svg'});chart.on('click',p=>{if(p.componentType==='series')onSelect(key,p.data);});charts.set(key,chart);}
        charts.get(key).setOption(spec.option,true);charts.get(key).resize();
      }
    }
    const resize=()=>{for(const chart of charts.values())chart.resize();};g.addEventListener('resize',resize);
    return {render,destroy(){g.removeEventListener('resize',resize);for(const c of charts.values())c.dispose();charts.clear();}};
  }
  g.PetDoctorAnalyticsCharts={specs,mount};if(typeof module!=='undefined')module.exports={specs};
})(globalThis);
