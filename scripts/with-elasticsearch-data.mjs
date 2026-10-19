import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { localElasticsearch } from './elasticsearch-local.mjs';

const require = createRequire(import.meta.url);
const { valideerTestscenario } = require('../testdata/scenarios.ts');
const { valideerRegressieSet } = require('../testdata/regressie.ts');

export async function loadTestdata(request, suite, environment = 'lokaal', scenario = 'standaard') {
  if (!['autoverzekering', 'schade', 'all'].includes(suite)) throw new Error(`Onbekende testdatasuite: ${suite}`);
  const result = { schemaVersie: 1, omgeving: environment, opgehaaldOp: new Date().toISOString(), funnel: [], paginas: [], scenarios: [] };
  async function search(index, sourceSuite, extraFilter = []) {
    const response = await request(`${index}/_search`, 'POST', {
      size: 1000, track_total_hits: true, sort: [{ id: 'asc' }],
      query: { bool: { filter: [{ term: { omgeving: environment } }, { term: { suite: sourceSuite } }, ...extraFilter] } },
    });
    if (response.status !== 200) throw new Error(`${index} ontbreekt. Voer eerst de inrichting en testdata-import uit.`);
    if (response.data.timed_out || response.data._shards?.failed) throw new Error(`${index}: Elasticsearch kon de zoekopdracht niet volledig uitvoeren.`);
    const hits = response.data.hits;
    if (!hits || hits.total.relation !== 'eq' || hits.total.value !== hits.hits.length) {
      throw new Error(`${index}: dataset is onvolledig of groter dan 1000 documenten. Verklein de selectie of voeg paginering toe.`);
    }
    return hits.hits.map(hit => {
      const doc = hit._source;
      const expectedId = [environment, sourceSuite, doc.gegevens?.id].map(encodeURIComponent).join(':');
      if (doc.schemaVersie !== 1 || doc.omgeving !== environment || doc.suite !== sourceSuite
        || !doc.gegevens?.id || doc.id !== expectedId || hit._id !== expectedId) {
        throw new Error(`${index}: ongeldig document of verkeerde suite/omgeving.`);
      }
      return doc.gegevens;
    });
  }
  if (suite === 'autoverzekering' || suite === 'all') {
    const rows = await search('sq1-autoverzekering-scenarios-v1', 'autoverzekering', [{ term: { 'gegevens.id': scenario } }]);
    if (rows.length !== 1) throw new Error(`Testscenario '${scenario}' ontbreekt of is niet uniek in Elasticsearch.`);
    result.funnel = rows.map(valideerTestscenario);
    if (process.env.LANCYR_FUNNEL_DEMO === '1' && result.funnel[0].verwachteUitkomst !== 'winkelwagen') {
      throw new Error('Funnel-demo vereist een scenario dat de winkelwagen bereikt.');
    }
  }
  if (suite === 'schade' || suite === 'all') {
    const pages = await search('sq1-regressie-paginas-v1', 'schade-melden');
    const scenarios = await search('sq1-regressie-scenarios-v1', 'schade-melden');
    const parts = new Set([...pages, ...scenarios].map(row => row.onderdeel));
    if (!parts.size) throw new Error('Geen regressiegegevens in Elasticsearch. Controleer de import.');
    for (const part of parts) {
      const valid = valideerRegressieSet(pages.filter(row => row.onderdeel === part), scenarios.filter(row => row.onderdeel === part), part);
      result.paginas.push(...valid.paginas);
      result.scenarios.push(...valid.scenarios);
    }
  }
  return result;
}

async function main() {
  const command = process.argv.slice(2);
  if (!command.length) throw new Error('Gebruik: node scripts/with-elasticsearch-data.mjs <commando> [argumenten]');
  const suite = process.env.LANCYR_LINT_SUITE ?? 'all';
  const data = await loadTestdata(await localElasticsearch(), suite, process.env.LANCYR_TEST_ENVIRONMENT ?? 'lokaal', process.env.LANCYR_TEST_SCENARIO ?? 'standaard');
  if (process.env.LANCYR_TESTDATA_ARCHIVE) {
    await writeFile(process.env.LANCYR_TESTDATA_ARCHIVE, JSON.stringify(data, null, 2), { mode: 0o600 });
  }
  const directory = await mkdtemp(join(tmpdir(), 'sq1-testdata-'));
  try {
    const path = join(directory, 'snapshot.json');
    await writeFile(path, JSON.stringify(data), { mode: 0o600 });
    console.log(`Elasticsearch-testdata geladen: ${data.funnel.length} funnelscenario, ${data.paginas.length} pagina's, ${data.scenarios.length} regressiescenario's.`);
    const env = { ...process.env, LANCYR_TESTDATA_SNAPSHOT: path };
    delete env.ELASTIC_PASSWORD;
    const child = spawn(command[0], command.slice(1), { stdio: 'inherit', env });
    const forward = signal => child.kill(signal);
    const interrupt = () => forward('SIGINT');
    const terminate = () => forward('SIGTERM');
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', terminate);
    try {
      process.exitCode = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('exit', (code, signal) => resolve(code ?? (signal === 'SIGINT' ? 130 : 143)));
      });
    } finally {
      process.off('SIGINT', interrupt);
      process.off('SIGTERM', terminate);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`Testdata laden mislukt: ${error.message}`);
    process.exitCode = 1;
  });
}
