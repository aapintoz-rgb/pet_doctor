(function (g) {
  'use strict';
  const catalog = {
    version: 'academico-2026-01', taxPercent: 18, currency: 'PEN',
    services: {
      consulta: { name: 'Consulta general', short: 'Consulta', description: 'El primer paso para cuidar su bienestar.', image: 'consulta' },
      vacunas: { name: 'Vacunas', short: 'Vacunas', description: 'Cotiza las aplicaciones que necesitas consultar.', image: 'vacunas' },
      desparasitacion: { name: 'Desparasitación', short: 'Desparasitación', description: 'Opciones de cuidado interno y externo.', image: 'desparasitacion' },
      grooming: { name: 'Baño y grooming', short: 'Grooming', description: 'Un momento de cuidado, de la nariz a la cola.', image: 'grooming' },
      guarderia: { name: 'Guardería', short: 'Guardería', description: 'Compañía y diversión durante el día.', image: 'guarderia' },
      inteligencia: { name: 'Evaluación de inteligencia', short: 'Aprendizaje', description: 'Descubre cómo aprende a través del juego.', image: 'inteligencia' }
    },
    sizes: { small: { name: 'Pequeño', range: 'Hasta 10 kg', factor: 100, daycare: 0 }, medium: { name: 'Mediano', range: 'Más de 10 a 25 kg', factor: 130, daycare: 500 }, large: { name: 'Grande', range: 'Más de 25 kg', factor: 160, daycare: 1000 } },
    consultation: { first: 6000, followup: 4000, report: 1500 },
    vaccines: { rabies: { name: 'Antirrábica', price: 3500 }, multiple: { name: 'Múltiple canina', price: 6500 }, bordetella: { name: 'Bordetella', price: 5500 } },
    deworming: { internal: { small: 2000, medium: 3000, large: 4000 }, external: { small: 3500, medium: 5500, large: 7500 }, discount: 500 },
    grooming: {
      components: { bath: { name: 'Baño', price: 3500 }, dry: { name: 'Secado', price: 1500 }, cut: { name: 'Corte de pelo', price: 2500 }, nails: { name: 'Corte de uñas', price: 1000 }, brush: { name: 'Cepillado', price: 2000 }, ears: { name: 'Limpieza externa de orejas', price: 1000 }, hydration: { name: 'Hidratación cosmética', price: 1500 } },
      plans: { essential: { name: 'Esencial', components: ['bath', 'dry'], discount: 0 }, complete: { name: 'Completo', components: ['bath', 'dry', 'cut', 'nails'], discount: 1000 }, premium: { name: 'Premium', components: ['bath', 'dry', 'cut', 'nails', 'brush', 'ears'], discount: 1500 } },
      hairComponents: ['bath', 'dry', 'cut', 'brush'], coat: 1500, knots: 2000
    },
    daycare: { half: 3000, full: 5000, walk: 1200, food: 1000 },
    learning: { exploration: { name: 'Exploración', price: 5000, description: '30 minutos y resumen de observaciones.' }, profile: { name: 'Perfil', price: 9000, description: '60 minutos e informe escrito.' }, support: { name: 'Acompañamiento', price: 13000, description: 'Perfil y orientación posterior de 30 minutos.' } }
  };
  function defaults() {
    return { pet: { sizeMode: 'range', size: null, weightKg: null, coat: null, knots: null, name: '', ownerName: '', contact: '', petId: null, ownerId: null }, selections: {
      consulta: { included: false, kind: 'first', report: false }, vacunas: { included: false, items: [] },
      desparasitacion: { included: false, kind: 'internal' },
      grooming: { included: false, mode: 'plan', plan: 'essential', items: [], hydration: false },
      guarderia: { included: false, duration: 'half', walk: false, food: false },
      inteligencia: { included: false, plan: 'exploration' }
    } };
  }
  function freeze(o) { Object.values(o).forEach(v => { if (v && typeof v === 'object') freeze(v); }); return Object.freeze(o); }
  g.PetDoctorCatalog = freeze(catalog);
  g.PetDoctorDefaults = defaults;
  if (typeof module !== 'undefined') module.exports = { catalog, defaults };
})(globalThis);
