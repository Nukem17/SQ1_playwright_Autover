const { test } = require('node:test');
const assert = require('node:assert/strict');
const { valideerTestscenario, bepaalIngangsdatum } = require('./scenarios.ts');
const seed = require('./seed.json');

test('Alle funnelscenario’s zijn geldig en de jaarlijkse ingangsdatum blijft correct', () => {
  const scenarios = seed.funnel.map(row => valideerTestscenario(structuredClone(row)));
  assert.equal(scenarios.length, 6);
  assert.equal(new Set(scenarios.map(row => row.gezin)).size, 4);
  assert.equal(new Set(scenarios.map(row => row.bestuurder)).size, 3);
  assert.equal(new Set(scenarios.map(row => row.dekking)).size, 3);
  const original = scenarios.find(row => row.id === 'standaard');
  assert.equal(bepaalIngangsdatum(original, new Date(2026, 8, 19)), '2026-09-20');
  assert.equal(bepaalIngangsdatum(original, new Date(2026, 8, 20)), '2027-09-20');
});

test('Ongeldige invoer, partnergegevens, uitkomsten en dekkingen worden afgewezen', () => {
  const row = id => structuredClone(seed.funnel.find(item => item.id === id));
  assert.throws(() => valideerTestscenario({ ...row('standaard'), postcode: '' }), /postcode moet ingevuld/);
  assert.throws(() => valideerTestscenario({ ...row('standaard'), geboortedatum: '2000-02-30' }), /geboortedatum/);
  assert.throws(() => valideerTestscenario({ ...row('testgebruiker-bram'), geboortedatumPartner: null }), /geboortedatumPartner/);
  assert.throws(() => valideerTestscenario({ ...row('testgebruiker-daan'), verwachteUitkomst: 'winkelwagen' }), /Kind-inwonend/);
  assert.throws(() => valideerTestscenario({ ...row('testgebruiker-anna'), geselecteerdeExtras: ['Onbekende dekking'] }), /geselecteerdeExtras/);
  assert.throws(() => valideerTestscenario({ ...row('standaard'), extraDekkingen: '[]' }), /lijst met teksten/);
});
