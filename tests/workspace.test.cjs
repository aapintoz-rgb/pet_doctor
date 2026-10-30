const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../assets/workspace.js');
const F = require('../assets/files.js');
const { defaults } = require('../assets/catalog.js');

const owner = { name: 'Ána Pérez', dni: '00123456', contact: '+51 (999) 123-456', email:'ana@example.com' };
const pet = { name: 'Lúna', weightKg: 12.5, size: null, coat: 'long' };
function setup() { return W.saveClient(W.empty(), { owner, pets: [pet, { ...pet, name: 'Toby', weightKg: null, size: 'small' }] }); }
function stateFor(result) {
  const state = defaults(); state.selections.consulta.included = true;
  state.pet.ownerId = result.ownerId; state.pet.petId = result.petId;
  return state;
}
function memory(initial = {}) {
  const data = new Map(Object.entries(initial)); let blocked = false;
  return { data, block(value) { blocked = value; }, getItem: key => data.get(key) ?? null, setItem(key, value) { if (blocked) throw Error('quota'); data.set(key, value); } };
}
const meta = { id: 'attention-1', createdAt: '2026-10-30T15:00:00.000Z' };

test('Un cliente con varios perritos: IDs estables, incorporación y edición sin modificar el origen', () => {
  const result = setup(), original = JSON.stringify(result.workspace);
  assert.equal(result.workspace.pets.length, 2); assert.equal(result.workspace.owners[0].dni, '00123456');
  const added = W.saveClient(result.workspace, { owner: result.workspace.owners[0], pets: [{ ...pet, name: 'Max' }] });
  assert.equal(added.workspace.pets.length, 3);
  assert.ok(added.workspace.pets.every(item => item.ownerId === result.ownerId));
  const changed = W.saveClient(added.workspace, { owner: { ...added.workspace.owners[0], name: 'Ana Actualizada' }, pets: [{ ...added.workspace.pets[0], name: 'Luna Nueva' }] });
  assert.equal(changed.workspace.pets[0].id, result.petId); assert.equal(changed.workspace.pets.length, 3);
  assert.equal(JSON.stringify(result.workspace), original);
});

test('Campos obligatorios, DNI único con ceros, teléfonos compartidos y nombres repetidos', () => {
  for (const bad of [{ name: '' }, { dni: '123' }, { dni: '1234567a' }, { dni: 12345678 }, { contact: '123' }, { contact: 'abcdefghi' }, { contact: '1234567890123456' }]) assert.throws(() => W.saveClient(W.empty(), { owner: { ...owner, ...bad }, pets: [pet] }));
  assert.throws(() => W.saveClient(W.empty(), { owner, pets: [] }));
  assert.throws(() => W.saveClient(W.empty(), { owner, pets: [{ ...pet, name: ' ' }] }));
  assert.throws(() => W.saveClient(W.empty(), { owner, pets: [{ ...pet, weightKg: -1 }] }));
  assert.throws(() => W.saveClient(W.empty(), { owner, pets: [{ ...pet, size: 'small' }] }));
  const initial = setup();
  assert.throws(() => W.saveClient(initial.workspace, { owner, pets: [pet] }), /DNI/);
  const shared = W.saveClient(initial.workspace, { owner: { ...owner, dni: '87654321' }, pets: [pet] });
  assert.equal(shared.workspace.owners.length, 2);
  const duplicate = W.saveClient(initial.workspace, { owner: initial.workspace.owners[0], pets: [{ ...pet, name: 'Luna' }] });
  assert.match(duplicate.warning, /mismo nombre/);
});

test('Buscador por nombre, DNI, teléfono y perrito; resultados explícitos y límite 20', () => {
  const { workspace } = setup();
  for (const query of ['ana perez', '00123', '999123456', '+51 999 123', 'luna']) assert.ok(W.search(workspace, query).total > 0, query);
  const result = W.search(workspace, 'luna');
  assert.equal(result.items[0].pet.name, 'Lúna'); assert.equal(result.items[0].owner.dni, owner.dni);
  assert.equal(W.search(workspace, 'missing').total, 0);
  const many = W.empty();
  for (let i = 0; i < 25; i++) many.owners.push({ id: 'o-' + i, name: 'Cliente ' + i, dni: String(i).padStart(8, '0'), contact: '999123456' });
  assert.equal(W.search(many, 'cliente').total, 25); assert.equal(W.search(many, 'cliente').items.length, 20);
});

test('Guardado exige relación válida incluso al invocar la capa de datos directamente', () => {
  const result = setup(), state = stateFor(result);
  const invalid = defaults(); invalid.selections.consulta.included = true; invalid.pet.name = 'Luna'; invalid.pet.ownerName = 'Ana';
  assert.throws(() => W.saveAttention(result.workspace, invalid, meta));
  assert.throws(() => F.makeAttention(invalid, meta));
  const other = W.saveClient(result.workspace, { owner: { ...owner, dni: '87654321' }, pets: [pet] });
  state.pet.ownerId = other.ownerId;
  assert.throws(() => W.saveAttention(other.workspace, state, meta));
  state.pet.ownerId = result.ownerId; state.pet.petId = 'does-not-exist';
  assert.throws(() => W.saveAttention(result.workspace, state, meta));
  const anonymousQuote = F.makeQuote(invalid, meta); assert.equal(anonymousQuote.pricing.total, 7080);
});

test('Atención realizada, actualización sin duplicados, vínculo fijo y snapshots independientes', () => {
  const result = setup(), state = stateFor(result);
  let workspace = W.saveAttention(result.workspace, state, meta);
  const first = JSON.parse(JSON.stringify(workspace.attentions[0]));
  assert.equal(first.status, 'realizada'); assert.equal(first.quote.state.pet.name, pet.name);
  assert.equal(first.ownerSnapshot.dni, owner.dni);
  state.selections.consulta.report = true;
  workspace = W.saveAttention(workspace, state, meta);
  assert.equal(workspace.attentions.length, 1); assert.equal(workspace.attentions[0].performedAt, first.performedAt);
  assert.equal(workspace.attentions[0].quote.pricing.total, 8850);
  state.pet.petId = result.workspace.pets[1].id;
  assert.throws(() => W.saveAttention(workspace, state, meta), /Nueva/);
  const changed = W.saveClient(workspace, { owner: { ...workspace.owners[0], name: 'Otro nombre' }, pets: [{ ...workspace.pets[0], name: 'Otro perrito' }] });
  assert.equal(changed.workspace.attentions[0].quote.state.pet.name, pet.name);
  assert.equal(changed.workspace.attentions[0].ownerSnapshot.name, owner.name);
  assert.deepEqual(W.read(JSON.stringify(changed.workspace)), changed.workspace);
});

test('Registro antiguo incompleto: incorporar, completar y rechazar conflictos sin pérdida', () => {
  const source = JSON.stringify({ type: 'pet-doctor.registry', version: 1, owners: [{ id: 'o1', name: 'Ana' }], pets: [{ id: 'p1', ownerId: 'o1', name: 'Luna' }] });
  const workspace = W.mergeRegistry(W.empty(), source);
  assert.equal(workspace.owners[0].dni, ''); assert.equal(W.hasSelection(workspace, 'o1', 'p1'), false);
  const state = defaults(); state.selections.consulta.included = true; state.pet.ownerId = 'o1'; state.pet.petId = 'p1';
  assert.throws(() => W.saveAttention(workspace, state, meta), /Completa/);
  const completed = W.saveClient(workspace, { owner: { ...workspace.owners[0], dni: owner.dni, contact: owner.contact, email:owner.email }, pets: [] });
  assert.equal(W.hasSelection(completed.workspace, 'o1', 'p1'), true);
  assert.throws(() => W.mergeRegistry(workspace, source), /Conflicto de ID/);
  const conflict = JSON.stringify({ type: 'pet-doctor.registry', version: 1, owners: [{ id: 'o2', ...owner }], pets: [] });
  assert.throws(() => W.mergeRegistry(completed.workspace, conflict), /Conflicto de DNI/);
  assert.equal(workspace.owners[0].dni, '');
});

test('Migración conserva historial anónimo y la clave anterior; corrupción no se sobrescribe', () => {
  const state = defaults(); state.selections.consulta.included = true;
  const quote = F.makeQuote(state, meta), master = F.emptyQuotesMaster(); master.quotes.push(quote);
  master.attentions.push({ type: 'pet-doctor.attention', version: 1, id: meta.id, status: 'realizada', performedAt: meta.createdAt, quote });
  const source = JSON.stringify(master), storage = memory({ [W.LEGACY_KEY]: source });
  const store = W.createStore(storage);
  assert.equal(storage.getItem(W.LEGACY_KEY), source); assert.ok(storage.getItem(W.KEY));
  assert.deepEqual(store.get().attentions, master.attentions); assert.equal(store.get().owners.length, 0);
  assert.deepEqual(W.readBackup(source).quotes, master.quotes);
  const corrupt = memory({ [W.KEY]: '{broken' }), blockedStore = W.createStore(corrupt);
  assert.ok(blockedStore.error()); assert.throws(() => blockedStore.commit(W.empty()));
  assert.equal(corrupt.getItem(W.KEY), '{broken');
  blockedStore.commit(W.empty(), { replace: true }); assert.equal(W.read(corrupt.getItem(W.KEY)).version, 2);
});

test('Transacción completa: fallo de cuota, reintento, recarga, respaldo y concurrencia', () => {
  const storage = memory(), store = W.createStore(storage), result = setup();
  storage.block(true); assert.throws(() => store.commit(result.workspace), /Reintenta/);
  assert.equal(store.get().owners.length, 0); assert.equal(storage.getItem(W.KEY), null);
  const backup = W.readBackup(JSON.stringify(result.workspace)); assert.equal(backup.pets.length, 2);
  storage.block(false); store.commit(backup); assert.deepEqual(W.createStore(storage).get(), backup);
  const other = W.createStore(storage); store.commit(W.saveAttention(store.get(), stateFor(result), meta));
  assert.throws(() => other.commit(backup), /otra pestaña/);
  assert.equal(W.read(storage.getItem(W.KEY)).attentions.length, 1);
});

test('Respaldos corruptos y relaciones de nuevas atenciones se rechazan completos', () => {
  for (const source of ['{broken', '{}', JSON.stringify({ ...W.empty(), version: 3 })]) assert.throws(() => W.readBackup(source));
  const result = setup(), workspace = W.saveAttention(result.workspace, stateFor(result), meta);
  workspace.pets = []; assert.throws(() => W.read(JSON.stringify(workspace)));
  const orphan = setup().workspace; orphan.pets[0].ownerId = 'missing'; assert.throws(() => W.read(JSON.stringify(orphan)));
});

test('Correo obligatorio al crear/editar, compartible y conservado en respaldos y snapshots nuevos',()=>{
  for(const email of ['',undefined,'no-es-correo','a\nb@example.com'])assert.throws(()=>W.saveClient(W.empty(),{owner:{...owner,email},pets:[pet]}),/correo/);
  const first=setup(),second=W.saveClient(first.workspace,{owner:{...owner,dni:'87654321'},pets:[pet]});
  assert.equal(second.workspace.owners[1].email,owner.email);
  const saved=W.saveAttention(first.workspace,stateFor(first),meta);assert.equal(saved.attentions[0].ownerSnapshot.email,owner.email);
  assert.equal(W.read(JSON.stringify(saved)).owners[0].email,owner.email);
  assert.ok(W.search(saved,'ANA@EXAMPLE.COM').total>0);
});

test('Cliente anterior sin correo mantiene atenciones y puede agregar perritos sin editar al dueño',()=>{
  const first=setup();delete first.workspace.owners[0].email;const legacy=W.read(JSON.stringify(first.workspace));
  assert.equal(legacy.owners[0].email,'');assert.equal(W.hasSelection(legacy,first.ownerId,first.petId),true);
  const saved=W.saveAttention(legacy,stateFor(first),meta);assert.equal(saved.attentions.length,1);
  assert.throws(()=>W.saveClient(legacy,{owner:legacy.owners[0],pets:[]}),/correo/);
  const added=W.saveClient(legacy,{operation:'addPets',owner:{...legacy.owners[0],name:'Cambio no permitido'},pets:[{...pet,name:'Max'}]});
  assert.equal(added.workspace.owners[0].name,owner.name);assert.equal(added.workspace.owners[0].email,'');assert.equal(added.workspace.pets.length,3);
});
