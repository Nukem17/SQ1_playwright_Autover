import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { documentId, seedDocuments, readSeed } from './elasticsearch-seed.mjs';
import { projectRoot } from './elasticsearch-local.mjs';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'sq1-import-test-'));
  const path = join(directory, 'seed.json');
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(path, await readFile(new URL('testdata/seed.json', projectRoot)));
  return path;
}

// Kleine HTTP-vervanger: controleert het seedgedrag zonder de echte server te wijzigen.
async function server() {
  const mappings = {};
  for (const file of await readdir(new URL('elasticsearch/indices/', projectRoot))) {
    const definition = JSON.parse(await readFile(new URL(`elasticsearch/indices/${file}`, projectRoot), 'utf8'));
    mappings[file.slice(0, -5)] = definition.mappings;
  }
  const stored = new Map();
  let writes = 0;
  let corruptReads = false;
  async function request(path, method = 'GET', body) {
    const [index, action, encoded] = path.split('/');
    const key = `${index}/${decodeURIComponent(encoded ?? '')}`;
    if (action === '_mapping') return { status: 200, data: { [index]: { mappings: mappings[index] } } };
    if (action === '_count') {
      const filters = body.query.bool.filter.map(filter => Object.entries(filter.term)[0]);
      return { status: 200, data: { count: [...stored].filter(([key, value]) => key.startsWith(`${index}/`) && filters.every(([field, expected]) => value[field] === expected)).length } };
    }
    if (action === '_refresh') { corruptReads = request.corruptAfterWrite; return { status: 200, data: { _shards: { failed: 0 } } }; }
    if (action === '_doc') {
      const value = stored.get(key);
      return value ? { status: 200, data: { _source: corruptReads ? { ...value, suite: 'verkeerd' } : structuredClone(value) } } : { status: 404, data: {} };
    }
    assert.equal(action, '_create');
    assert.equal(method, 'PUT');
    if (stored.has(key)) return { status: 409, data: {} };
    writes++;
    stored.set(key, structuredClone(body));
    return { status: 201, data: {} };
  }
  return { request, stored, get writes() { return writes; } };
}

test('Directe inrichting bewaart alle gegevens en kan herhaald worden zonder documenten of tijden te wijzigen', async t => {
  const path = await fixture(t);
  const before = await readFile(path);
  const documents = await readSeed(path);
  assert.equal(documents.length, 38);
  const scenario = documents.find(item => item.document.gegevens.id === 'SCH-FAQ-UITKLAPPEN');
  assert.match(scenario.document.gegevens.instellingen.melding, /opnieuw klikken/);
  assert.ok(Array.isArray(documents[0].document.gegevens.extraDekkingen));
  const api = await server();
  assert.equal((await seedDocuments(documents, api.request)).created, 38);
  const saved = structuredClone([...api.stored]);
  const repeated = structuredClone(documents);
  for (const item of repeated) item.document.bijgewerktOp = '2030-01-01T00:00:00.000Z';
  assert.equal((await seedDocuments(repeated, api.request)).created, 0);
  assert.equal((await seedDocuments(repeated, api.request, { verifyOnly: true })).verified, 38);
  assert.deepEqual([...api.stored], saved);
  assert.deepEqual(await readFile(path), before);
  assert.notEqual(documentId('suite', 'a:b'), documentId('suite:a', 'b'));
});

test('Ongeldige bron of verbroken paginaverwijzing wordt afgewezen', async t => {
  const path = await fixture(t);
  const seed = JSON.parse(await readFile(path, 'utf8'));
  const scenario = seed.scenarios.find(row => row.id === 'SCH-FAQ-UITKLAPPEN');
  scenario.instellingen = 'geen object';
  await writeFile(path, JSON.stringify(seed));
  await assert.rejects(readSeed(path), /JSON-object/);
  scenario.instellingen = {};
  scenario.bronPaginaId = 'ontbreekt';
  await writeFile(path, JSON.stringify(seed));
  await assert.rejects(readSeed(path), /bronpagina ontbreekt/);
});

test('Afwijkende bestaande inhoud en onbekende velden stoppen vóór de eerste schrijfactie', async t => {
  const documents = await readSeed(await fixture(t));
  const api = await server();
  const last = documents.at(-1);
  api.stored.set(`${last.index}/${last.id}`, { ...last.document, suite: 'gewijzigd' });
  await assert.rejects(seedDocuments(documents, api.request), /bestaande inhoud wijkt af/);
  assert.equal(api.writes, 0);
  api.stored.clear();
  last.document.gegevens.onbekend = 'veld';
  await assert.rejects(seedDocuments(documents, api.request), /onbekend veld/);
  assert.equal(api.writes, 0);
});

test('Controlemodus schrijft niets en terugleescontrole ontdekt afwijkende opslag', async t => {
  const documents = await readSeed(await fixture(t));
  const api = await server();
  await assert.rejects(seedDocuments(documents, api.request, { verifyOnly: true }), /document ontbreekt/);
  assert.equal(api.writes, 0);
  api.request.corruptAfterWrite = true;
  await assert.rejects(seedDocuments(documents, api.request), /Terugleescontrole mislukt/);
});

test('Dubbele IDs en onvolledige begindata worden vóór opslag afgewezen', async t => {
  const path = await fixture(t);
  const seed = JSON.parse(await readFile(path, 'utf8'));
  seed.funnel.push(structuredClone(seed.funnel[0]));
  await writeFile(path, JSON.stringify(seed));
  await assert.rejects(readSeed(path), /dubbele IDs/);
  seed.funnel = [];
  await writeFile(path, JSON.stringify(seed));
  await assert.rejects(readSeed(path), /volledige testdataset/);
});

test('Automatische voorbereiding vult alleen ontbrekende documenten aan en behoudt eigen wijzigingen en extra records', async t => {
  const documents = await readSeed(await fixture(t));
  const api = await server();
  const first = documents[0];
  const changed = structuredClone(first.document);
  changed.gegevens.schadevrij = '7';
  api.stored.set(`${first.index}/${first.id}`, changed);
  const extra = { ...structuredClone(changed), id: 'lokaal:autoverzekering:eigen-scenario' };
  extra.gegevens.id = 'eigen-scenario';
  api.stored.set(`${first.index}/${extra.id}`, extra);
  assert.equal((await seedDocuments(documents, api.request, { missingOnly: true })).created, 37);
  assert.equal((await seedDocuments(documents, api.request, { missingOnly: true })).created, 0);
  assert.equal(api.stored.size, 39);
  assert.deepEqual(api.stored.get(`${first.index}/${first.id}`), changed);
  assert.deepEqual(api.stored.get(`${first.index}/${extra.id}`), extra);
  await assert.rejects(seedDocuments(documents, api.request, { verifyOnly: true }), /bestaande inhoud wijkt af/);
});
