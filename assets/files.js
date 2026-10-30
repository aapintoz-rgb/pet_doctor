(function (g) {
  'use strict';
  const C = g.PetDoctorCatalog || require('./catalog.js').catalog;
  const defaults = g.PetDoctorDefaults || require('./catalog.js').defaults;
  const pricing = g.PetDoctorPricing || require('./pricing.js');
  const fail = message => { throw new Error(message); };
  const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  function text(x, label, max = 200) { if (typeof x !== 'string' || x.length > max) fail('Campo inválido: ' + label + '.'); return x; }
  function choice(x, choices, label) { if (!choices.includes(x)) fail('Opción inválida: ' + label + '.'); return x; }
  function bool(x, label) { if (typeof x !== 'boolean') fail('Valor inválido: ' + label + '.'); return x; }
  function list(x, keys, label) {
    if (!Array.isArray(x) || x.length > keys.length || new Set(x).size !== x.length) fail('Lista inválida: ' + label + '.');
    return x.map(v => choice(v, keys, label));
  }
  function identifier(x, label) { return x === null ? null : text(x, label, 100); }
  function validateState(x) {
    if (!obj(x) || !obj(x.pet) || !obj(x.selections)) fail('Faltan los datos de mascota o servicios.');
    const clean = defaults(), p = x.pet, q = clean.pet;
    q.sizeMode = choice(p.sizeMode, ['range', 'weight'], 'modo de tamaño');
    q.size = choice(p.size, [null, ...Object.keys(C.sizes)], 'tamaño');
    if (p.weightKg !== null && (typeof p.weightKg !== 'number' || !Number.isFinite(p.weightKg) || p.weightKg <= 0)) fail('El peso debe ser mayor que cero.');
    q.weightKg = p.weightKg;
    if (q.sizeMode === 'range' && q.weightKg !== null) fail('Un rango no debe contener un peso exacto.');
    if (q.sizeMode === 'weight' && q.size !== null) fail('El tamaño se calcula a partir del peso.');
    q.coat = choice(p.coat, [null, 'short', 'long'], 'pelaje');
    q.knots = choice(p.knots, [null, true, false], 'nudos');
    for (const k of ['name', 'ownerName', 'contact']) q[k] = text(p[k], k);
    q.petId = identifier(p.petId, 'identificador de mascota');
    q.ownerId = identifier(p.ownerId, 'identificador de dueño');
    for (const id of Object.keys(C.services)) {
      const s = x.selections[id], d = clean.selections[id];
      if (!obj(s)) fail('Falta el servicio ' + id + '.');
      d.included = bool(s.included, id);
      if (id === 'consulta') { d.kind = choice(s.kind, ['first', 'followup'], id); d.report = bool(s.report, 'informe'); }
      if (id === 'vacunas') d.items = list(s.items, Object.keys(C.vaccines), id);
      if (id === 'desparasitacion') d.kind = choice(s.kind, ['internal', 'external', 'both'], id);
      if (id === 'grooming') {
        d.mode = choice(s.mode, ['plan', 'individual'], 'modo grooming');
        d.plan = choice(s.plan, Object.keys(C.grooming.plans), 'plan grooming');
        d.items = list(s.items, Object.keys(C.grooming.components), 'componentes grooming');
        d.hydration = bool(s.hydration, 'hidratación');
        if (d.mode === 'plan' && d.items.length) fail('El plan no puede contener componentes individuales.');
        if (d.mode === 'individual' && d.hydration) fail('En modo individual la hidratación debe ser un componente.');
      }
      if (id === 'guarderia') { d.duration = choice(s.duration, ['half', 'full'], 'duración'); d.walk = bool(s.walk, 'paseo'); d.food = bool(s.food, 'alimentación'); }
      if (id === 'inteligencia') d.plan = choice(s.plan, Object.keys(C.learning), 'plan aprendizaje');
    }
    return clean;
  }
  function parseJSON(source) { try { return JSON.parse(source); } catch { fail('El archivo no contiene un JSON válido.'); } }
  function readQuote(source) {
    const file = parseJSON(source);
    if (!obj(file) || file.type !== 'pet-doctor.quote' || file.version !== 1) fail('Se necesita una cotización Pet Doctor, versión 1.');
    text(file.id, 'identificador', 100); text(file.pricingVersion, 'versión de tarifas', 100);
    if (typeof file.createdAt !== 'string' || !Number.isFinite(Date.parse(file.createdAt))) fail('Fecha de creación inválida.');
    const state = validateState(file.state);
    if (!obj(file.pricing) || !Array.isArray(file.pricing.services)) fail('Falta el desglose de precios.');
    for (const k of ['subtotal','tax','total']) if (!Number.isSafeInteger(file.pricing[k]) || file.pricing[k] < 0) fail('Importe guardado inválido.');
    if (file.pricing.subtotal + file.pricing.tax !== file.pricing.total) fail('Los importes guardados no coinciden.');
    return { state, id: file.id, createdAt: file.createdAt, pricingVersion: file.pricingVersion, previousTotal: file.pricing.total };
  }
  function makeQuote(state, meta) {
    const clean = validateState(state), result = pricing.calculate(clean);
    if (!result.complete) fail('Completa los servicios incluidos antes de guardar.');
    return { type: 'pet-doctor.quote', version: 1, id: meta.id, createdAt: meta.createdAt, exportedAt: new Date().toISOString(), pricingVersion: C.version, currency: C.currency, taxPercent: C.taxPercent, state: clean, pricing: result };
  }
  function readRegistry(source) {
    const file = parseJSON(source);
    if (!obj(file) || file.type !== 'pet-doctor.registry' || file.version !== 1 || !Array.isArray(file.owners) || !Array.isArray(file.pets)) fail('Se necesita un registro Pet Doctor, versión 1, con owners y pets.');
    if (file.owners.length > 10000 || file.pets.length > 10000) fail('El registro admite hasta 10 000 dueños y 10 000 mascotas.');
    const ownerIds = new Set(), petIds = new Set();
    const owners = file.owners.map(o => {
      if (!obj(o)) fail('Dueño inválido.');
      const id = text(o.id, 'id dueño', 100);
      if (!id.trim() || ownerIds.has(id)) fail('Los identificadores de dueños deben ser únicos y no vacíos.'); ownerIds.add(id);
      return { id, name: text(o.name, 'nombre dueño'), contact: o.contact === undefined ? '' : text(o.contact, 'contacto') };
    });
    const pets = file.pets.map(p => {
      if (!obj(p)) fail('Mascota inválida.');
      const id = text(p.id, 'id mascota', 100), ownerId = text(p.ownerId, 'dueño de mascota', 100);
      if (!id.trim() || petIds.has(id)) fail('Los identificadores de mascotas deben ser únicos y no vacíos.'); petIds.add(id);
      if (!ownerIds.has(ownerId)) fail('Una mascota hace referencia a un dueño inexistente.');
      const weightKg = p.weightKg ?? null;
      if (weightKg !== null && (typeof weightKg !== 'number' || !Number.isFinite(weightKg) || weightKg <= 0)) fail('El peso registrado debe ser mayor que cero.');
      return { id, ownerId, name: text(p.name, 'nombre mascota'), weightKg, size: choice(p.size ?? null, [null, ...Object.keys(C.sizes)], 'tamaño registrado'), coat: choice(p.coat ?? null, [null,'short','long'], 'pelaje registrado') };
    });
    return { owners, pets };
  }
  function emptyQuotesMaster() {
    return { type: 'pet-doctor.quotes-master', version: 1, currency: C.currency, updatedAt: null, quotes: [], attentions: [] };
  }
  function readQuotesMaster(source) {
    const file = parseJSON(source);
    if (!obj(file) || file.type !== 'pet-doctor.quotes-master' || file.version !== 1 || file.currency !== C.currency || !Array.isArray(file.quotes)) fail('Se necesita una base maestra de cotizaciones Pet Doctor, versión 1 y moneda PEN.');
    if (file.quotes.length > 10000) fail('La base maestra admite hasta 10 000 cotizaciones.');
    const ids = new Set();
    const quotes = file.quotes.map(quote => {
      const validated = readQuote(JSON.stringify(quote));
      if (ids.has(validated.id)) fail('La base contiene identificadores de cotización duplicados.');
      ids.add(validated.id);
      return quote;
    });
    const attentions = file.attentions === undefined ? [] : file.attentions;
    if (!Array.isArray(attentions) || attentions.length > 10000) fail('La base admite hasta 10 000 atenciones.');
    const attentionIds = new Set();
    attentions.forEach(attention => {
      readAttention(attention);
      if (attentionIds.has(attention.id)) fail('La base contiene identificadores de atención duplicados.');
      attentionIds.add(attention.id);
    });
    return { type: file.type, version: file.version, currency: file.currency, updatedAt: typeof file.updatedAt === 'string' ? file.updatedAt : null, quotes, attentions };
  }
  function upsertQuote(master, quote) {
    const cleanMaster = readQuotesMaster(JSON.stringify(master));
    readQuote(JSON.stringify(quote));
    const index = cleanMaster.quotes.findIndex(item => item.id === quote.id);
    if (index >= 0) cleanMaster.quotes[index] = quote;
    else cleanMaster.quotes.push(quote);
    cleanMaster.updatedAt = new Date().toISOString();
    return cleanMaster;
  }
  function readAttention(attention) {
    if (!obj(attention) || attention.type !== 'pet-doctor.attention' || attention.version !== 1 || attention.status !== 'realizada') fail('Atención inválida: se requiere estado realizada.');
    if (typeof attention.id !== 'string' || !attention.id.trim() || attention.id.length > 100) fail('Identificador de atención inválido.');
    if (typeof attention.performedAt !== 'string' || !Number.isFinite(Date.parse(attention.performedAt))) fail('Fecha de atención inválida.');
    const quote = readQuote(JSON.stringify(attention.quote));
    if (quote.id !== attention.id || !pricing.calculate(quote.state).complete) fail('La atención debe contener servicios completos y el mismo identificador.');
    return attention;
  }
  function registeredPet(state, registry) {
    const owner = registry?.owners?.find(item => item.id === state.pet.ownerId);
    const pet = registry?.pets?.find(item => item.id === state.pet.petId && item.ownerId === owner?.id);
    const phone = owner?.contact?.replace(/\D/g, '') || '';
    if (!owner?.name?.trim() || !/^\d{8}$/.test(owner.dni) || !/^[+\d\s().-]+$/.test(owner.contact) || phone.length < 7 || phone.length > 15 || !pet?.name?.trim()) fail('Selecciona o registra un cliente completo y su perrito.');
    return { owner, pet };
  }
  function makeAttention(state, meta, performedAt = new Date().toISOString(), registry) {
    const selected = registeredPet(state, registry), clean = validateState(state);
    clean.pet.name = selected.pet.name; clean.pet.ownerName = selected.owner.name; clean.pet.contact = selected.owner.contact;
    return readAttention({ type: 'pet-doctor.attention', version: 1, id: meta.id, status: 'realizada', performedAt, quote: makeQuote(clean, meta) });
  }
  function upsertAttention(master, attention, registry) {
    const cleanMaster = readQuotesMaster(JSON.stringify(master));
    readAttention(attention);
    registeredPet(attention.quote.state, registry);
    const index = cleanMaster.attentions.findIndex(item => item.id === attention.id);
    if (index >= 0) {
      const previous = cleanMaster.attentions[index];
      if (previous.quote.state.pet.ownerId !== attention.quote.state.pet.ownerId || previous.quote.state.pet.petId !== attention.quote.state.pet.petId) fail('Usa «Nueva» para cambiar el cliente o perrito de una atención.');
      cleanMaster.attentions[index] = { ...attention, performedAt: previous.performedAt };
    }
    else {
      if (cleanMaster.attentions.length >= 10000) fail('La base admite hasta 10 000 atenciones.');
      cleanMaster.attentions.push(attention);
    }
    cleanMaster.updatedAt = new Date().toISOString();
    return cleanMaster;
  }
  const api = { makeAttention, readAttention, upsertAttention, validateState, readQuote, makeQuote, readRegistry, emptyQuotesMaster, readQuotesMaster, upsertQuote };
  g.PetDoctorFiles = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
