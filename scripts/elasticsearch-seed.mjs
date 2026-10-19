import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createRequire } from 'node:module';
import { localElasticsearch, normalizeMapping, projectRoot } from './elasticsearch-local.mjs';

// Dezelfde ingebouwde TypeScript-loader als de bestaande gegevenslaagtests.
const require = createRequire(import.meta.url);
const { valideerTestscenario } = require('../testdata/scenarios.ts');
const { valideerRegressieSet } = require('../testdata/regressie.ts');

const environment = 'lokaal';
const suites = { funnel: 'autoverzekering', regression: 'schade-melden' };
const indices = {
  funnel: 'sq1-autoverzekering-scenarios-v1',
  pages: 'sq1-regressie-paginas-v1',
  scenarios: 'sq1-regressie-scenarios-v1',
};

// Encodeer elk onderdeel afzonderlijk: een dubbele punt in een bron-ID blijft uniek.
export function documentId(suite, id) {
  return [environment, suite, id].map(encodeURIComponent).join(':');
}

export async function readSeed(seedPath = new URL('testdata/seed.json', projectRoot)) {
  const seed = JSON.parse(await readFile(seedPath, 'utf8'));
  if (seed.schemaVersie !== 1 || !['funnel', 'paginas', 'scenarios'].every(key => Array.isArray(seed[key]) && seed[key].length)) {
    throw new Error('De JSON-bron bevat geen volledige testdataset met schemaVersie 1.');
  }
  for (const key of ['funnel', 'paginas', 'scenarios']) {
    if (seed[key].some(row => !row || typeof row.id !== 'string' || !row.id.trim())
      || new Set(seed[key].map(row => row.id)).size !== seed[key].length) throw new Error(`${key}: ontbrekende of dubbele IDs.`);
  }
  const documents = [];
  const updatedAt = new Date().toISOString();
  function add(index, suite, gegevens) {
    const id = documentId(suite, gegevens.id);
    documents.push({ index, id, document: { id, suite, omgeving: environment,
      schemaVersie: 1, bijgewerktOp: updatedAt, gegevens } });
  }
  for (const row of seed.funnel) add(indices.funnel, suites.funnel, valideerTestscenario(row));
  const parts = new Set([...seed.paginas, ...seed.scenarios].map(row => row.onderdeel));
  for (const part of parts) {
    const set = valideerRegressieSet(seed.paginas.filter(row => row.onderdeel === part), seed.scenarios.filter(row => row.onderdeel === part), part);
    for (const page of set.paginas) add(indices.pages, suites.regression, page);
    for (const scenario of set.scenarios) add(indices.scenarios, suites.regression, scenario);
  }
  return documents;
}

// Controleer ook onbekende JSON-velden vóór de eerste schrijfactie naar Elasticsearch.
function validateMapping(value, mapping, path) {
  if (value === null) return;
  if (Array.isArray(value)) {
    for (const item of value) validateMapping(item, mapping, path);
    return;
  }
  if (mapping.properties) {
    if (!value || typeof value !== 'object') throw new Error(`${path}: verwacht een object.`);
    for (const [key, item] of Object.entries(value)) {
      if (!mapping.properties[key]) throw new Error(`${path}.${key}: onbekend veld.`);
      validateMapping(item, mapping.properties[key], `${path}.${key}`);
    }
  } else {
    const valid = ['keyword', 'text'].includes(mapping.type) ? typeof value === 'string'
      : ['integer', 'long'].includes(mapping.type) ? Number.isSafeInteger(value)
        : mapping.type === 'date' && typeof value === 'string' && Number.isFinite(Date.parse(value))
          && (mapping.format !== 'strict_date' || (/^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value).toISOString().slice(0, 10) === value));
    if (!valid) throw new Error(`${path}: ongeldig gegevenstype.`);
  }
}

function sameDocument(actual, expected) {
  if (!actual) return false;
  // Een herhaalde inrichting wijzigt de oorspronkelijke importtijd niet.
  const { bijgewerktOp: actualTime, ...actualData } = actual;
  const { bijgewerktOp: expectedTime, ...expectedData } = expected;
  return typeof actualTime === 'string' && Number.isFinite(Date.parse(actualTime))
    && typeof expectedTime === 'string' && isDeepStrictEqual(actualData, expectedData);
}

export async function seedDocuments(documents, request, { verifyOnly = false, missingOnly = false } = {}) {
  const groups = Map.groupBy(documents, item => item.index);
  const pending = [];
  // Alle brongegevens, mappings en bestaande documenten controleren vóór schrijven.
  for (const [index, group] of groups) {
    const definition = JSON.parse(await readFile(new URL(`elasticsearch/indices/${index}.json`, projectRoot), 'utf8'));
    for (const item of group) validateMapping(item.document, definition.mappings, index);
    const mapping = await request(`${index}/_mapping`);
    if (mapping.status !== 200 || !isDeepStrictEqual(normalizeMapping(mapping.data[index]?.mappings), normalizeMapping(definition.mappings))) {
      throw new Error(`${index}: mapping ontbreekt of wijkt af. Controleer eerst het setupscript.`);
    }
    let existingCount = 0;
    for (const item of group) {
      const existing = await request(`${index}/_doc/${encodeURIComponent(item.id)}`);
      if (existing.status === 404) {
        if (verifyOnly) throw new Error(`${index}: document ontbreekt (${item.id}).`);
        pending.push(item);
      } else if (existing.status !== 200 || (!missingOnly && !sameDocument(existing.data._source, item.document))) {
        throw new Error(`${index}: bestaande inhoud wijkt af (${item.id}). Niets overschreven.`);
      } else existingCount++;
    }
    const count = await request(`${index}/_count`, 'POST', { query: { bool: { filter: [
      { term: { omgeving: environment } }, { term: { suite: group[0].document.suite } },
    ] } } });
    if (count.status !== 200 || (!missingOnly && count.data.count !== existingCount)) {
      throw new Error(`${index}: afwijkend aantal bestaande documenten voor deze suite/omgeving.`);
    }
  }
  let createdCount = 0;
  for (const item of pending) {
    const created = await request(`${item.index}/_create/${encodeURIComponent(item.id)}`, 'PUT', item.document);
    // Bij een gelijktijdige inrichting nooit bestaande inhoud overschrijven.
    if (created.status === 409) {
      const existing = await request(`${item.index}/_doc/${encodeURIComponent(item.id)}`);
      if (existing.status !== 200 || (!missingOnly && !sameDocument(existing.data._source, item.document))) throw new Error(`Gelijktijdig gewijzigd document: ${item.id}`);
    } else if (created.status !== 201) throw new Error(`Aanmaken mislukt: ${item.id}`);
    else createdCount++;
  }
  for (const [index, group] of groups) {
    if (!verifyOnly) {
      const refresh = await request(`${index}/_refresh`, 'POST');
      if (refresh.status !== 200 || refresh.data._shards.failed) throw new Error(`Verversen mislukt: ${index}`);
    }
    for (const item of group) {
      const stored = await request(`${index}/_doc/${encodeURIComponent(item.id)}`);
      if (stored.status !== 200 || (!missingOnly && !sameDocument(stored.data._source, item.document))) throw new Error(`Terugleescontrole mislukt: ${item.id}`);
    }
    const count = await request(`${index}/_count`, 'POST', { query: { bool: { filter: [
      { term: { omgeving: environment } }, { term: { suite: group[0].document.suite } },
    ] } } });
    if (count.status !== 200 || (!missingOnly && count.data.count !== group.length)) throw new Error(`Aantalcontrole mislukt: ${index}`);
  }
  return { created: createdCount, verified: documents.length,
    counts: Object.fromEntries([...groups].map(([index, group]) => [index, group.length])) };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length && !['--dry-run', '--verify', '--missing-only'].includes(args[0]))) {
    throw new Error('Gebruik: node scripts/elasticsearch-seed.mjs [--dry-run|--verify|--missing-only]');
  }
  const documents = await readSeed();
  if (args[0] === '--dry-run') {
    for (const [index, group] of Map.groupBy(documents, item => item.index)) {
      const definition = JSON.parse(await readFile(new URL(`elasticsearch/indices/${index}.json`, projectRoot), 'utf8'));
      for (const item of group) validateMapping(item.document, definition.mappings, index);
      console.log(`${index}: ${group.length} bronrecords gevalideerd.`);
    }
    console.log('Alleen broncontrole; geen verbinding met Elasticsearch en niets geschreven.');
    return;
  }
  const result = await seedDocuments(documents, await localElasticsearch(), { verifyOnly: args[0] === '--verify', missingOnly: args[0] === '--missing-only' });
  for (const [index, count] of Object.entries(result.counts)) console.log(`${index}: ${count} ${args[0] === '--missing-only' ? 'verplichte documenten beschikbaar' : 'documenten volledig gecontroleerd'}.`);
  console.log(args[0] === '--missing-only' ? `${result.created} ontbrekende documenten aangemaakt; bestaande gegevens behouden.` : `${result.created} nieuw; ${result.verified} teruggelezen en inhoudelijk gelijk aan JSON-begindata.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`Testdata-inrichting mislukt: ${error.message}`);
    process.exitCode = 1;
  });
}
