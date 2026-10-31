(function (g) {
  'use strict';
  const ZONE = 'America/Lima';
  const HEADERS = ['atencion_id','fecha_atencion','hora_atencion','zona_horaria','cliente_id','cliente_nombre','cliente_dni','cliente_telefono','perrito_id','perrito_nombre','servicios','subtotal_pen','igv_pen','total_pen','moneda','estado','vinculo_registrado','cliente_distrito','especie','raza','sexo','edad_anios','edad_meses','nacimiento_estimado','observaciones'];
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  function dateParts(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new Error('Fecha de atención inválida.');
    const p = Object.fromEntries(formatter.formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return { date: p.year + '-' + p.month + '-' + p.day, time: p.hour + ':' + p.minute + ':' + p.second };
  }
  function rows(workspace) {
    return workspace.attentions.filter(attention => attention.status === 'realizada').map(attention => {
      const pet = attention.quote.state.pet, owner = attention.ownerSnapshot || {}, parts = dateParts(attention.performedAt), registered = !!attention.registration;
      const serviceDetails = attention.quote.pricing.services.map(service => ({
        name: typeof service?.name === 'string' ? service.name : 'Servicio sin detalle',
        lines: Array.isArray(service?.lines) ? service.lines.filter(line => line && typeof line === 'object').map(line => ({ label: typeof line.label === 'string' ? line.label : 'Componente sin detalle', amount: Number.isSafeInteger(line.amount) ? line.amount : null })) : [],
        tax: Number.isSafeInteger(service?.tax) ? service.tax : null,
        total: Number.isSafeInteger(service?.total) ? service.total : null,
      }));
      return {
        id: attention.id, performedAt: attention.performedAt, date: parts.date, time: parts.time,
        ownerId: attention.registration?.ownerId || pet.ownerId || '', ownerName: owner.name ?? pet.ownerName ?? '',
        dni: owner.dni ?? '', contact: owner.contact ?? pet.contact ?? '',
        petId: attention.registration?.petId || pet.petId || '', petName: pet.name || '',
        district:owner.district||'',petSnapshot:attention.petSnapshot||null,observations:attention.observations||'',
        services: serviceDetails.map(service => service.name), serviceDetails,
        subtotal: attention.quote.pricing.subtotal, tax: attention.quote.pricing.tax, total: attention.quote.pricing.total,
        currency: attention.quote.currency || 'PEN', status: attention.status, registered,
        ownerKey: registered ? 'id:' + attention.registration.ownerId : 'unlinked',
        petKey: registered ? 'id:' + attention.registration.petId : 'unlinked',
        attention,
      };
    }).sort((a,b) => Date.parse(b.performedAt) - Date.parse(a.performedAt) || a.id.localeCompare(b.id));
  }
  function validDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(date + 'T00:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date;
  }
  function select(workspace, filters = {}) {
    const { from = '', to = '', owner = '', pet = '', search = '' } = filters;
    if ((from && !validDate(from)) || (to && !validDate(to))) throw new Error('Selecciona fechas válidas.');
    if (from && to && from > to) throw new Error('La fecha «Desde» no puede ser posterior a «Hasta».');
    const q = normalize(search);
    const selected = rows(workspace).filter(row => (!from || row.date >= from) && (!to || row.date <= to) && (!owner || row.ownerKey === owner) && (!pet || row.petKey === pet) && (!q || normalize([row.id,row.ownerName,row.dni,row.petName].join(' ')).includes(q)));
    return { rows: selected, count: selected.length, total: selected.reduce((sum,row) => sum + row.total, 0) };
  }
  function filterOptions(workspace, ownerKey = '') {
    const all = rows(workspace), owners = new Map(), pets = new Map();
    all.forEach(row => {
      if (!owners.has(row.ownerKey)) owners.set(row.ownerKey, { key: row.ownerKey, label: row.registered ? (row.ownerName || 'Sin nombre') + ' · DNI ' + (row.dni || 'No registrado') : 'Sin vínculo registrado' });
      if ((!ownerKey || row.ownerKey === ownerKey) && !pets.has(row.petKey)) pets.set(row.petKey, { key: row.petKey, label: row.registered ? (row.petName || 'Sin nombre') + ' · ' + (row.ownerName || 'Sin cliente') + ' · ' + row.petId.slice(-8) : 'Sin identificación registrada' });
    });
    return { owners: [...owners.values()], pets: [...pets.values()] };
  }
  function csvText(value) {
    let text = String(value ?? '');
    // Las comillas CSV no impiden que Excel ejecute fórmulas; fuerza texto ante prefijos peligrosos.
    if (/^[\s\u0000-\u001f\u007f]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  const amount = cents => (cents / 100).toFixed(2).replace('.', ',');
  function csv(selection) {
    const content = selection.rows.map(row => [row.id,row.date,row.time,ZONE,row.ownerId,row.ownerName,row.dni,row.contact,row.petId,row.petName,row.services.join(' | '),amount(row.subtotal),amount(row.tax),amount(row.total),row.currency,row.status,row.registered ? 'si' : 'no',row.district,row.petSnapshot?.species==='canine'?'canino':'',row.petSnapshot?.breed||'',row.petSnapshot?.sex||'',row.petSnapshot?.ageAtAttention?.years??'',row.petSnapshot?.ageAtAttention?.months??'',row.petSnapshot?.ageReference?.estimatedBirthDate||'',row.observations].map(csvText).join(';'));
    return '\uFEFF' + HEADERS.join(';') + '\r\n' + (content.length ? content.join('\r\n') + '\r\n' : '');
  }
  function filename(now = new Date()) { return 'pet-doctor-atenciones-' + dateParts(now).date + '.csv'; }
  const api = { ZONE, HEADERS, dateParts, rows, select, filterOptions, csv, filename };
  g.PetDoctorHistory = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
