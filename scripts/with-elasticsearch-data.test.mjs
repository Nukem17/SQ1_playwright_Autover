import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { loadTestdata } from './with-elasticsearch-data.mjs';
import { readSeed } from './elasticsearch-seed.mjs';

const require = createRequire(import.meta.url);
const { haalTestscenarioOp } = require('../testdata/scenarios.ts');
const { haalRegressieSetOp } = require('../testdata/regressie.ts');

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'sq1-provider-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const documents = await readSeed();
  async function request(endpoint, method, body) {
    assert.equal(method, 'POST');
    const index = endpoint.split('/')[0];
    const filters = body.query.bool.filter.map(item => Object.entries(item.term)[0]);
    const hits = documents.filter(item => item.index === index && filters.every(([field, expected]) =>
      field === 'gegevens.id' ? item.document.gegevens.id === expected : item.document[field] === expected))
      .map(item => ({ _id: item.id, _source: structuredClone(item.document) }));
    return { status: 200, data: { hits: { total: { value: hits.length, relation: 'eq' }, hits } } };
  }
  return { documents, request, directory };
}

test('Elasticsearch levert dezelfde objecten en de loaders gebruiken uitsluitend de Elasticsearch-snapshot', async t => {
  const source = await fixture(t);
  const data = await loadTestdata(source.request, 'all');
  assert.equal(data.funnel.length, 1);
  assert.equal(data.paginas.length, 14);
  assert.equal(data.scenarios.length, 18);
  const path = join(source.directory, 'snapshot.json');
  await writeFile(path, JSON.stringify(data));
  const keys = ['LANCYR_TESTDATA_SNAPSHOT'];
  const previous = keys.map(key => process.env[key]);
  try {
    process.env.LANCYR_TESTDATA_SNAPSHOT = path;
    assert.deepEqual(await haalTestscenarioOp(), data.funnel[0]);
    assert.equal(haalRegressieSetOp().paginas.length, 14);
    delete process.env.LANCYR_TESTDATA_SNAPSHOT;
    await assert.rejects(haalTestscenarioOp(), /nog niet geladen/);
    assert.throws(() => haalRegressieSetOp(), /nog niet geladen/);
  } finally {
    keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; });
  }
});

test('Scenarioselectie, ontbrekende indices en onvolledige zoekresultaten geven een fout', async t => {
  const source = await fixture(t);
  const data = await loadTestdata(source.request, 'autoverzekering', 'lokaal', 'testgebruiker-bram');
  assert.equal(data.funnel[0].bestuurder, 'Partner');
  assert.equal(data.paginas.length, 0);
  await assert.rejects(loadTestdata(source.request, 'autoverzekering', 'lokaal', 'onbekend'), /ontbreekt/);
  await assert.rejects(loadTestdata(async () => ({ status: 404 }), 'schade'), /import/);
  await assert.rejects(loadTestdata(async () => ({ status: 200, data: { hits: { total: { value: 1001, relation: 'eq' }, hits: [] } } }), 'schade'), /onvolledig/);
  await assert.rejects(loadTestdata(async () => ({ status: 200, data: { timed_out: true } }), 'schade'), /niet volledig/);
});

test('Gewijzigde Elasticsearch-gegevens worden opnieuw gevalideerd, inclusief paginaverwijzingen', async t => {
  const source = await fixture(t);
  const funnel = source.documents.find(item => item.document.gegevens.id === 'standaard');
  funnel.document.gegevens.postcode = 'fout';
  await assert.rejects(loadTestdata(source.request, 'autoverzekering'), /Postcode/);
  const scenario = source.documents.find(item => item.index.includes('regressie-scenarios'));
  scenario.document.gegevens.bronPaginaId = 'ontbreekt';
  await assert.rejects(loadTestdata(source.request, 'schade'), /bronpagina ontbreekt/);
});

test('Een onjuiste document-ID of schemaversie wordt niet als testdata geaccepteerd', async t => {
  const source = await fixture(t);
  const funnel = source.documents.find(item => item.document.gegevens.id === 'standaard');
  funnel.document.schemaVersie = 2;
  await assert.rejects(loadTestdata(source.request, 'autoverzekering'), /ongeldig document/);
  funnel.document.schemaVersie = 1;
  funnel.id = 'verkeerde-id';
  await assert.rejects(loadTestdata(source.request, 'autoverzekering'), /ongeldig document/);
});
