const { test } = require('node:test');
const assert = require('node:assert/strict');
const { valideerRegressieSet } = require('./regressie.ts');
const seed = require('./seed.json');
const validate = (pages, scenarios) => valideerRegressieSet(pages, scenarios, 'Schade melden');

test('Regressie-begindata dekt de 14 pagina’s, 18 scenario’s en 27 CSV-meldingen', () => {
  const data = validate(structuredClone(seed.paginas), structuredClone(seed.scenarios));
  assert.equal(data.paginas.length, 14);
  assert.equal(data.scenarios.length, 18);
  assert.equal(data.paginas.reduce((n, page) => n + page.bron.regels.length, 0), 27);
  assert.equal(new Set(data.paginas.map(page => page.pad)).size, 14);
});

test('Ongeldige paden, verwijzingen, objecten en actietypen worden afgewezen', () => {
  const pages = () => structuredClone(seed.paginas);
  const scenarios = () => structuredClone(seed.scenarios);
  const invalidPages = pages();
  invalidPages[0].pad = '//ander.example/';
  assert.throws(() => validate(invalidPages, scenarios()), /lokaal Lancyr-pad/);
  for (const [field, value, pattern] of [['bronPaginaId', 'ontbreekt', /bronpagina ontbreekt/], ['doelPaginaId', 'ontbreekt', /doelpagina ontbreekt/], ['instellingen', 'geen object', /JSON-object/], ['type', 'onbekend', /onbekend scenariotype/]]) {
    const rows = scenarios();
    const row = rows.find(item => item.type === 'navigatie');
    row[field] = value;
    assert.throws(() => validate(pages(), rows), pattern);
  }
  assert.throws(() => validate([], scenarios()), /Geen volledige regressieset/);
});
