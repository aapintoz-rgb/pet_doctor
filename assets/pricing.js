(function (g) {
  'use strict';
  const C = g.PetDoctorCatalog || require('./catalog.js').catalog;
  function sizeOf(pet) {
    if (pet.sizeMode === 'weight') {
      const w = pet.weightKg;
      return typeof w === 'number' && Number.isFinite(w) && w > 0 ? (w <= 10 ? 'small' : w <= 25 ? 'medium' : 'large') : null;
    }
    return Object.hasOwn(C.sizes, pet.size) ? pet.size : null;
  }
  function groomingItems(s) { return s.mode === 'plan' ? C.grooming.plans[s.plan].components : s.items; }
  function needsCoat(s) { return groomingItems(s).some(id => C.grooming.hairComponents.includes(id)); }
  function servicePrice(id, state, catalog = C) {
    const c = catalog, p = state.pet, s = state.selections[id], size = sizeOf(p);
    const lines = [], missing = [];
    const add = (label, amount) => lines.push({ label, amount });
    if (['desparasitacion', 'grooming', 'guarderia'].includes(id) && !size) missing.push('Indica el tamaño o un peso mayor que cero.');
    if (id === 'consulta') {
      add(s.kind === 'first' ? 'Primera consulta' : 'Consulta de control', c.consultation[s.kind]);
      if (s.report) add('Informe escrito ampliado', c.consultation.report);
    }
    if (id === 'vacunas') {
      if (!s.items.length) missing.push('Selecciona al menos una vacuna.');
      s.items.forEach(k => add(c.vaccines[k].name, c.vaccines[k].price));
    }
    if (id === 'desparasitacion' && size) {
      if (s.kind !== 'external') add('Desparasitación interna', c.deworming.internal[size]);
      if (s.kind !== 'internal') add('Desparasitación externa', c.deworming.external[size]);
      if (s.kind === 'both') add('Descuento por ambas modalidades', -c.deworming.discount);
    }
    if (id === 'grooming') {
      const items = groomingItems(s);
      if (!items.length) missing.push('Selecciona al menos un componente.');
      items.forEach(k => add(c.grooming.components[k].name, c.grooming.components[k].price));
      if (s.mode === 'plan') {
        const plan = c.grooming.plans[s.plan];
        if (plan.discount) add('Descuento del plan ' + plan.name, -plan.discount);
        if (s.hydration) add('Hidratación cosmética', c.grooming.components.hydration.price);
      }
      const base = lines.reduce((sum, l) => sum + l.amount, 0);
      if (size && c.sizes[size].factor !== 100) add('Ajuste por tamaño ' + c.sizes[size].name.toLowerCase() + ' (× ' + (c.sizes[size].factor / 100).toFixed(2).replace('.', ',') + ')', Math.round(base * c.sizes[size].factor / 100) - base);
      if (needsCoat(s)) {
        if (!['short', 'long'].includes(p.coat)) missing.push('Confirma el tipo de pelaje.');
        if (typeof p.knots !== 'boolean') missing.push('Confirma si necesita desenredado.');
        if (p.coat === 'long') add('Pelaje largo o denso', c.grooming.coat);
        if (p.knots === true) add('Desenredado por nudos', c.grooming.knots);
      }
    }
    if (id === 'guarderia') {
      add(s.duration === 'half' ? 'Media jornada · hasta 4 horas' : 'Jornada completa · hasta 8 horas', c.daycare[s.duration]);
      if (size && c.sizes[size].daycare) add('Ajuste por tamaño ' + c.sizes[size].name.toLowerCase(), c.sizes[size].daycare);
      if (s.walk) add('Paseo individual · 20 minutos', c.daycare.walk);
      if (s.food) add('Alimentación del establecimiento', c.daycare.food);
    }
    if (id === 'inteligencia') add('Plan ' + c.learning[s.plan].name, c.learning[s.plan].price);
    return { id, name: c.services[id].name, lines, missing, complete: !missing.length, subtotal: lines.reduce((sum, l) => sum + l.amount, 0) };
  }
  function calculate(state, catalog = C) {
    const services = Object.keys(catalog.services).filter(id => state.selections[id].included).map(id => servicePrice(id, state, catalog));
    const subtotal = services.filter(s => s.complete).reduce((sum, s) => sum + s.subtotal, 0);
    const tax = Math.round(subtotal * catalog.taxPercent / 100);
    let assigned = 0;
    const taxable = services.filter(s => s.complete);
    taxable.forEach(s => { s.tax = Math.floor(s.subtotal * catalog.taxPercent / 100); assigned += s.tax; });
    const ranked = [...taxable].sort((a,b) => (b.subtotal * catalog.taxPercent % 100) - (a.subtotal * catalog.taxPercent % 100));
    for (let i = 0; i < tax - assigned; i++) ranked[i].tax++;
    services.forEach(s => { s.total = s.complete ? s.subtotal + s.tax : null; });
    return { services, subtotal, tax, total: subtotal + tax, complete: services.length > 0 && services.every(s => s.complete) };
  }
  const api = { sizeOf, groomingItems, needsCoat, servicePrice, calculate };
  g.PetDoctorPricing = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
