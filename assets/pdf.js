(function (g) {
  'use strict';
  const { PDFDocument, StandardFonts, rgb } = g.PDFLib || {};
  const C = g.PetDoctorCatalog;
  const green = rgb?.(23/255,79/255,72/255), coral = rgb?.(207/255,118/255,93/255), cream = rgb?.(246/255,247/255,242/255), gray = rgb?.(83/255,103/255,94/255), line = rgb?.(217/255,226/255,216/255), white = rgb?.(1,1,1);
  const money = cents => new Intl.NumberFormat('es-PE', { style:'currency', currency:'PEN' }).format(cents/100);
  const safe = value => String(value ?? '').replace(/[–—]/g,'-').replace(/[^\x20-\x7E\xA0-\xFF]/g,'');
  function wrap(text, font, size, maxWidth) {
    const words = safe(text).split(/\s+/), lines = []; let current = '';
    for (const word of words) {
      const candidate = current ? current + ' ' + word : word;
      if (font.widthOfTextAtSize(candidate,size) <= maxWidth) current = candidate;
      else { if (current) lines.push(current); current = word; }
    }
    if (current) lines.push(current); return lines.length ? lines : [''];
  }
  async function loadIllustration(doc) {
    try {
      const image = new Image(); image.src = 'assets/images/consulta.webp'; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width=600; canvas.height=600;
      canvas.getContext('2d').drawImage(image,0,0,600,600);
      const bytes = await fetch(canvas.toDataURL('image/png')).then(r=>r.arrayBuffer());
      return doc.embedPng(bytes);
    } catch { return null; }
  }
  async function createQuotePdf(quote) {
    if (!PDFDocument) throw new Error('No se pudo cargar el generador de PDF.');
    const doc = await PDFDocument.create(), regular = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold), picture = await loadIllustration(doc);
    doc.setTitle('Cotización Pet Doctor '+quote.id); doc.setAuthor('Pet Doctor'); doc.setSubject('Cotización académica de servicios para mascotas'); doc.setCreator('Pet Doctor web');
    const width=595.28,height=841.89,margin=46,contentWidth=width-margin*2; let page,y,pageNumber=0;
    function addPage() {
      page=doc.addPage([width,height]);pageNumber++;y=height-44;
      page.drawRectangle({x:0,y:height-10,width,height:10,color:green});
      page.drawText('PET DOCTOR',{x:margin,y:y-8,size:15,font:bold,color:green});
      page.drawText('COTIZACIÓN DE SERVICIOS',{x:margin+118,y:y-7,size:8,font:bold,color:gray,characterSpacing:1.2});
      const pageLabel='Página '+pageNumber;
      page.drawText(pageLabel,{x:width-margin-regular.widthOfTextAtSize(pageLabel,8),y:y-7,size:8,font:regular,color:gray});
      y-=34;
    }
    function ensure(needed) { if (y-needed<58) addPage(); }
    function rule() { page.drawLine({start:{x:margin,y},end:{x:width-margin,y},thickness:.7,color:line}); y-=14; }
    function drawWrapped(text,x,size,font,color,maxWidth=contentWidth,leading=size*1.4) { const rows=wrap(text,font,size,maxWidth);rows.forEach(row=>{page.drawText(row,{x,y,size,font,color});y-=leading;});return rows.length; }
    addPage();
    page.drawRectangle({x:margin,y:y-105,width:contentWidth,height:105,color:cream,borderColor:line,borderWidth:.7});
    page.drawText('Cuidar empieza con un plan claro.',{x:margin+18,y:y-31,size:21,font:bold,color:green});
    page.drawText('Gracias por confiar en Pet Doctor.',{x:margin+18,y:y-54,size:10,font:regular,color:gray});
    page.drawText('Revisa los servicios elegidos y su inversión final.',{x:margin+18,y:y-71,size:10,font:regular,color:gray});
    if(picture) page.drawImage(picture,{x:width-margin-92,y:y-96,width:82,height:82});
    y-=127;
    const created = new Date(quote.createdAt).toLocaleDateString('es-PE',{year:'numeric',month:'long',day:'numeric'});
    page.drawText('COTIZACIÓN '+safe(quote.id).slice(0,34),{x:margin,y,size:9,font:bold,color:coral});
    page.drawText('Fecha: '+created,{x:width-margin-170,y,size:9,font:regular,color:gray});y-=25;
    const pet=quote.state.pet,sizeKey=g.PetDoctorPricing.sizeOf(pet),petName=pet.name||'Mascota sin identificar';
    page.drawText('Preparada para',{x:margin,y,size:8,font:bold,color:gray});y-=16;
    page.drawText(safe(petName),{x:margin,y,size:16,font:bold,color:green});
    if(sizeKey) page.drawText(C.sizes[sizeKey].name+(pet.sizeMode==='weight'?' · '+pet.weightKg+' kg':' · rango de peso'),{x:margin+220,y,size:9,font:regular,color:gray});y-=17;
    if(pet.ownerName||pet.contact){page.drawText(safe([pet.ownerName,pet.contact].filter(Boolean).join(' · ')),{x:margin,y,size:9,font:regular,color:gray});y-=18;}
    rule();
    for(const service of quote.pricing.services){
      ensure(65+service.lines.length*16);
      page.drawText(safe(service.name),{x:margin,y,size:12,font:bold,color:green});
      page.drawText(money(service.total),{x:width-margin-bold.widthOfTextAtSize(money(service.total),12),y,size:12,font:bold,color:green});y-=19;
      for(const item of service.lines){
        const label=wrap(item.label,regular,9,contentWidth-100);label.forEach((row,i)=>{page.drawText(row,{x:margin+10,y,size:9,font:regular,color:gray});if(i===0)page.drawText(money(item.amount),{x:width-margin-regular.widthOfTextAtSize(money(item.amount),9),y,size:9,font:regular,color:gray});y-=13;});
      }
      page.drawText('IGV asignado',{x:margin+10,y,size:8,font:regular,color:gray});page.drawText(money(service.tax),{x:width-margin-regular.widthOfTextAtSize(money(service.tax),8),y,size:8,font:regular,color:gray});y-=15;rule();
    }
    ensure(90); y-=2;
    for(const [label,value,size,font,color] of [['Subtotal sin IGV',quote.pricing.subtotal,10,regular,gray],['IGV (18%)',quote.pricing.tax,10,regular,gray],['TOTAL CON IGV',quote.pricing.total,15,bold,green]]){
      page.drawText(label,{x:width-margin-240,y,size,font,color});page.drawText(money(value),{x:width-margin-font.widthOfTextAtSize(money(value),size),y,size,font,color});y-=label==='TOTAL CON IGV'?25:18;
    }
    const beforeClosingPage=pageNumber;ensure(105);
    if(pageNumber>beforeClosingPage){
      page.drawRectangle({x:margin,y:y-135,width:contentWidth,height:135,color:cream,borderColor:line,borderWidth:.7});
      page.drawText('Cada cuidado cuenta.',{x:margin+20,y:y-40,size:22,font:bold,color:green});
      page.drawText('Tu selección ya está lista para revisar y confirmar.',{x:margin+20,y:y-66,size:10,font:regular,color:gray});
      page.drawText('Gracias por elegir una atención pensada para su bienestar.',{x:margin+20,y:y-84,size:10,font:regular,color:gray});
      if(picture)page.drawImage(picture,{x:width-margin-115,y:y-125,width:105,height:105});
      y-=160;
    }
    y-=2;
    page.drawRectangle({x:margin,y:y-72,width:contentWidth,height:72,color:cream,borderColor:line,borderWidth:.7});
    let boxY=y-15;page.drawText('INFORMACIÓN IMPORTANTE',{x:margin+15,y:boxY,size:7.8,font:bold,color:coral});boxY-=14;
    const disclaimer='Cotización referencial y académica. No constituye diagnóstico, prescripción, reserva de atención ni comprobante de pago. Vacunas y desparasitación requieren evaluación veterinaria. Precios sujetos a validación y vigentes por 7 días calendario. Los servicios y horarios dependen de disponibilidad.';
    for(const row of wrap(disclaimer,regular,7.8,contentWidth-30)){page.drawText(row,{x:margin+15,y:boxY,size:7.8,font:regular,color:gray});boxY-=10;}
    y-=84;
    ensure(48);drawWrapped('¿Listos para el próximo cuidado? Conserva esta cotización y contáctanos para confirmar disponibilidad.',margin,9,bold,green,contentWidth,12);
    for(const p of doc.getPages()){p.drawLine({start:{x:margin,y:35},end:{x:width-margin,y:35},thickness:.5,color:line});p.drawText('Pet Doctor · Tarifa académica · Moneda: soles (PEN)',{x:margin,y:22,size:7,font:regular,color:gray});}
    return doc.save();
  }
  g.PetDoctorPDF=Object.freeze({createQuotePdf});
})(globalThis);
