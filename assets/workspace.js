(function (g) {
  'use strict';
  const F = g.PetDoctorFiles || require('./files.js');
  const KEY = 'pet-doctor.workspace.v2', LEGACY_KEY = 'pet-doctor.quotes-master.v1';
  const fail = message => { throw new Error(message); };
  const clone = value => JSON.parse(JSON.stringify(value));
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const digits = value => String(value).replace(/\D/g, '');
  function str(value, label, max = 200) {
    if (typeof value !== 'string' || value.length > max) fail('Campo inválido: ' + label + '.');
    return value.trim();
  }
  function id(value) { const result = str(value, 'identificador', 100); if (!result) fail('El identificador no puede estar vacío.'); return result; }
  function newId() { return g.crypto?.randomUUID?.() || 'PD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12); }
  function empty() { return { type: 'pet-doctor.workspace', version: 2, currency: 'PEN', updatedAt: null, owners: [], pets: [], quotes: [], attentions: [] }; }
  function completeOwner(owner) {
    return !!owner && !!owner.name.trim() && /^\d{8}$/.test(owner.dni) && /^[+\d\s().-]+$/.test(owner.contact) && digits(owner.contact).length >= 7 && digits(owner.contact).length <= 15;
  }
  function validEmail(value) { return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
  function registry(value) {
    const base = F.readRegistry(JSON.stringify({ type: 'pet-doctor.registry', version: 1, owners: value.owners, pets: value.pets }));
    const dnis = new Set();
    base.owners = base.owners.map((owner, index) => {
      const dni = str(value.owners[index].dni ?? '', 'DNI', 8);
      if (dni && !/^\d{8}$/.test(dni)) fail('El DNI debe tener exactamente 8 dígitos.');
      if (dni && dnis.has(dni)) fail('DNI duplicado: ' + dni + '.');
      if (dni) dnis.add(dni);
      const email = str(value.owners[index].email ?? '', 'correo', 254);
      if (email && !validEmail(email)) fail('El correo del cliente no es válido.');
      return { ...owner, name: owner.name.trim(), contact: owner.contact.trim(), dni, email };
    });
    base.pets = base.pets.map(pet => ({ ...pet, name: pet.name.trim(), size: pet.weightKg !== null ? null : pet.size }));
    return base;
  }
  function read(source) {
    let value; try { value = JSON.parse(source); } catch { fail('El archivo no contiene un JSON válido.'); }
    if (!value || value.type !== 'pet-doctor.workspace' || value.version !== 2 || value.currency !== 'PEN') fail('Se necesita una base Pet Doctor versión 2 y moneda PEN.');
    const records = registry(value);
    const master = F.readQuotesMaster(JSON.stringify({ ...value, type: 'pet-doctor.quotes-master', version: 1 }));
    const clean = { ...empty(), ...records, quotes: master.quotes, attentions: master.attentions, updatedAt: master.updatedAt };
    clean.attentions.forEach(attention => {
      // Los registros anteriores sin esta marca se preservan como históricos.
      if (attention.registration !== undefined) {
        const p = attention.quote.state.pet;
        const selected = requireSelection(clean, attention.registration.ownerId, attention.registration.petId);
        if (p.ownerId !== selected.owner.id || p.petId !== selected.pet.id) fail('La identidad de una atención no coincide con su registro.');
      }
    });
    return clone(clean);
  }
  function migrate(source) {
    const master = F.readQuotesMaster(source);
    return { ...empty(), updatedAt: master.updatedAt, quotes: master.quotes, attentions: master.attentions };
  }
  function readBackup(source) {
    let value; try { value = JSON.parse(source); } catch { fail('El archivo no contiene un JSON válido.'); }
    return value?.type === 'pet-doctor.workspace' ? read(source) : migrate(source);
  }
  function requireSelection(workspace, ownerId, petId) {
    const owner = workspace.owners.find(item => item.id === ownerId);
    const pet = workspace.pets.find(item => item.id === petId);
    if (!owner || !pet || pet.ownerId !== owner.id || !pet.name.trim()) fail('Selecciona o registra un cliente y su perrito.');
    if (!completeOwner(owner)) fail('Completa nombre, DNI y teléfono del cliente en «Editar datos».');
    return { owner, pet };
  }
  function hasSelection(workspace, ownerId, petId) { try { requireSelection(workspace, ownerId, petId); return true; } catch { return false; } }
  function search(workspace, query, limit = 20) {
    const q = normalize(query), phone = digits(query);
    const ownerMatch = owner => !q || normalize(owner.name).includes(q) || normalize(owner.email).includes(q) || owner.dni.includes(q) || (phone.length > 0 && digits(owner.contact).includes(phone));
    const matches = [];
    const owners = new Map(workspace.owners.map(owner => [owner.id, owner]));
    for (const owner of workspace.owners) if (ownerMatch(owner)) matches.push({ owner, pet: null });
    for (const pet of workspace.pets) if (q && normalize(pet.name).includes(q)) matches.push({ owner: owners.get(pet.ownerId), pet });
    return { items: matches.slice(0, limit), total: matches.length };
  }
  function mergeRegistry(workspace, source) {
    let value; try { value = JSON.parse(source); } catch { fail('El archivo no contiene un JSON válido.'); }
    if (value?.type !== 'pet-doctor.registry' || value.version !== 1) fail('Se necesita un registro Pet Doctor versión 1.');
    const incoming = registry(value), next = clone(workspace);
    for (const owner of incoming.owners) {
      if (next.owners.some(item => item.id === owner.id)) fail('Conflicto de ID de cliente: ' + owner.id + '. No se importó ningún registro.');
      if (owner.dni && next.owners.some(item => item.dni === owner.dni)) fail('Conflicto de DNI: ' + owner.dni + '. No se importó ningún registro.');
      next.owners.push(owner);
    }
    for (const pet of incoming.pets) {
      if (next.pets.some(item => item.id === pet.id)) fail('Conflicto de ID de perrito: ' + pet.id + '. No se importó ningún registro.');
      next.pets.push(pet);
    }
    next.updatedAt = new Date().toISOString();
    return read(JSON.stringify(next));
  }
  function saveClient(workspace, draft) {
    const next = clone(workspace), ownerId = draft.owner.id || newId();
    const previous = next.owners.find(item => item.id === ownerId);
    if (draft.owner.id && !previous) fail('El cliente ya no existe.');
    const addingPets = draft.operation === 'addPets';
    if (addingPets && !previous) fail('Selecciona un cliente existente para agregar perritos.');
    const owner = addingPets ? { ...previous } : { id: ownerId, name: str(draft.owner.name, 'nombre del cliente'), dni: str(draft.owner.dni, 'DNI', 8), contact: str(draft.owner.contact, 'teléfono'), email: str(draft.owner.email ?? '', 'correo', 254) };
    if (!completeOwner(owner)) fail('Completa el nombre, un DNI de 8 dígitos y un teléfono de 7 a 15 dígitos.');
    if (!addingPets && !validEmail(owner.email)) fail('El correo del cliente es obligatorio y debe ser válido.');
    if (next.owners.some(item => item.id !== ownerId && item.dni === owner.dni)) fail('Ese DNI ya pertenece a otro cliente. Búscalo antes de registrar uno nuevo.');
    if (!Array.isArray(draft.pets) || (!previous && draft.pets.length === 0)) fail('Agrega al menos un perrito.');
    const petIds = new Set(), pets = draft.pets.map(item => {
      const petId = item.id || newId();
      if (petIds.has(petId)) fail('Perrito duplicado en el formulario.');
      petIds.add(petId);
      if (item.id && !next.pets.some(pet => pet.id === petId && pet.ownerId === ownerId)) fail('El perrito no pertenece al cliente seleccionado.');
      const pet = { id: petId, ownerId, name: str(item.name, 'nombre del perrito'), weightKg: item.weightKg ?? null, size: item.size ?? null, coat: item.coat ?? null };
      if (!pet.name) fail('Cada perrito necesita un nombre.');
      if (pet.weightKg !== null && pet.size !== null) fail('Elige peso exacto o rango, no ambos.');
      return pet;
    });
    if (previous) next.owners[next.owners.indexOf(previous)] = owner; else next.owners.push(owner);
    pets.forEach(pet => { const index = next.pets.findIndex(item => item.id === pet.id); if (index >= 0) next.pets[index] = pet; else next.pets.push(pet); });
    next.updatedAt = new Date().toISOString();
    const clean = read(JSON.stringify(next));
    const names = clean.pets.filter(pet => pet.ownerId === ownerId).map(pet => normalize(pet.name));
    return { workspace: clean, ownerId, petId: pets[0]?.id || null, warning: new Set(names).size < names.length ? 'Este cliente tiene perritos con el mismo nombre. Usa su código para distinguirlos.' : '' };
  }
  function saveAttention(workspace, state, meta) {
    const next = read(JSON.stringify(workspace)), selected = requireSelection(next, state.pet.ownerId, state.pet.petId);
    const previous = next.attentions.find(attention => attention.id === meta.id);
    if (previous && (!previous.registration || previous.registration.ownerId !== selected.owner.id || previous.registration.petId !== selected.pet.id)) fail('Esta atención conserva su cliente y perrito. Usa «Nueva» para registrar otra.');
    const snapshot = F.validateState(state);
    snapshot.pet.name = selected.pet.name; snapshot.pet.ownerName = selected.owner.name; snapshot.pet.contact = selected.owner.contact;
    const attention = F.makeAttention(snapshot, meta, previous?.performedAt, next);
    attention.registration = { ownerId: selected.owner.id, petId: selected.pet.id };
    attention.ownerSnapshot = clone(selected.owner);
    const index = next.attentions.findIndex(item => item.id === attention.id);
    if (index >= 0) next.attentions[index] = attention;
    else { if (next.attentions.length >= 10000) fail('La base admite hasta 10 000 atenciones.'); next.attentions.push(attention); }
    next.updatedAt = new Date().toISOString();
    return read(JSON.stringify(next));
  }
  function createStore(storage) {
    let current = empty(), error = '', expected = null, damaged = false;
    try {
      expected = storage.getItem(KEY);
      if (expected) current = read(expected);
      else {
        const old = storage.getItem(LEGACY_KEY);
        if (old) { current = migrate(old); storage.setItem(KEY, JSON.stringify(current)); expected = JSON.stringify(current); }
      }
    } catch (err) { error = 'No se pudo abrir o migrar la base local: ' + err.message + ' La base anterior se conserva. Puedes cargar un respaldo.'; damaged = !!expected; }
    return {
      get: () => clone(current), error: () => error,
      commit(candidate, { replace = false } = {}) {
        const clean = read(JSON.stringify(candidate));
        if (damaged && !replace) fail('La base local no se pudo leer. Carga un respaldo antes de sobrescribirla.');
        let latest;
        try { latest = storage.getItem(KEY); } catch { fail('No se pudo acceder al almacenamiento. Reintenta o descarga el respaldo pendiente.'); }
        if (!replace && latest !== expected) fail('La base cambió en otra pestaña. Descarga el respaldo pendiente y recarga antes de continuar.');
        try { storage.setItem(KEY, JSON.stringify(clean)); } catch { fail('No se pudo guardar en el navegador. Reintenta o descarga el respaldo pendiente.'); }
        expected = JSON.stringify(clean); current = clean; error = ''; damaged = false;
        return clone(current);
      },
    };
  }
  const api = { KEY, LEGACY_KEY, empty, read, readBackup, migrate, completeOwner, validEmail, requireSelection, hasSelection, search, mergeRegistry, saveClient, saveAttention, createStore, newId };
  g.PetDoctorWorkspace = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
