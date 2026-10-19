import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildExport, newRun, publishExport, startRun } from './elasticsearch-results.mjs';
import { projectRoot } from './elasticsearch-local.mjs';
import { localElasticsearch } from './elasticsearch-local.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'sq1-results-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'html'));
  await mkdir(join(directory, 'test-results'));
  await writeFile(join(directory, 'html/index.html'), '<html>rapport</html>');
  await writeFile(join(directory, 'test-results/screenshot.png'), Buffer.from([1, 2, 3]));
  await writeFile(join(directory, 'test-results/trace.zip'), Buffer.from([4, 5, 6]));
  const run = newRun(directory, '2026-10-16T10:00:00Z', { LANCYR_LINT_SUITE: 'autoverzekering', LANCYR_RUN_TRIGGER: 'schedule' });
  await writeFile(join(directory, 'RUN-METADATA.json'), JSON.stringify(run));
  await writeFile(join(directory, 'TESTDATA.json'), JSON.stringify({ funnel: [{ id: 'standaard', kenteken: 'voorbeeld' }], paginas: [], scenarios: [] }));
  const report = {
    config: { workers: 2 }, stats: { expected: 0, unexpected: 1, flaky: 1, skipped: 1 }, errors: [],
    suites: [{ title: 'bestand', specs: [], suites: [{ title: 'groep', specs: [{
      id: 'test-1', title: 'funnel', file: 'test.spec.ts', line: 5, tests: [
        { projectName: 'chromium', status: 'flaky', expectedStatus: 'passed', annotations: [{ type: 'Testdata', description: 'Elasticsearch-scenario: standaard' }], results: [
          { status: 'failed', retry: 0, duration: 20, startTime: run.gestartOp, errors: [{ message: 'verwachting mislukt', stack: 'stack' }], attachments: [{ name: 'screenshot', contentType: 'image/png', path: `/app/test-runs/${directory.split('/').at(-1)}/test-results/screenshot.png` }] },
          { status: 'passed', retry: 1, duration: 10, startTime: run.gestartOp, attachments: [{ name: 'trace', contentType: 'application/zip', path: join(directory, 'test-results/trace.zip') }] },
        ] },
        { projectName: 'firefox', status: 'unexpected', results: [{ status: 'failed', retry: 0, duration: 5, startTime: run.gestartOp, errors: [{ message: 'fout' }] }] },
        { projectName: 'webkit', status: 'skipped', results: [] },
      ],
    }] }] }],
  };
  await writeFile(join(directory, 'results.json'), JSON.stringify(report));
  return { directory, run, report };
}

async function server() {
  const mappings = {};
  for (const index of ['sq1-testruns-v1', 'sq1-testresultaten-v1', 'sq1-artefacten-v1']) {
    mappings[index] = JSON.parse(await readFile(new URL(`elasticsearch/indices/${index}.json`, projectRoot), 'utf8')).mappings;
  }
  const documents = new Map();
  const requests = [];
  async function request(path, method = 'GET', body) {
    requests.push({ path, method });
    const [index, action, encoded] = path.split('?')[0].split('/');
    if (action === '_mapping') return { status: 200, data: { [index]: { mappings: mappings[index] } } };
    if (index === '_bulk') {
      const lines = body.trim().split('\n').map(line => JSON.parse(line));
      const items = [];
      for (let i = 0; i < lines.length; i += 2) {
        const metadata = lines[i].index;
        documents.set(`${metadata._index}/${metadata._id}`, lines[i + 1]);
        items.push({ index: { status: request.failBulk && i === 0 ? 400 : 201 } });
      }
      return { status: 200, data: { errors: false, items } };
    }
    const key = `${index}/${decodeURIComponent(encoded)}`;
    if (method === 'PUT') {
      if (action === '_create' && documents.has(key)) return { status: 409, data: {} };
      documents.set(key, structuredClone(body));
      return { status: 201, data: {} };
    }
    return { status: 200, data: { _source: documents.get(key) } };
  }
  return { request, documents, requests };
}

test('Export bewaart pogingen apart, telt tests eenmaal en koppelt snapshots en bestandmetadata', async t => {
  const { directory, run } = await fixture(t);
  const bundle = await buildExport(directory, 1, '2026-10-16T10:01:00Z');
  assert.equal(bundle.run.id, run.id);
  assert.equal(bundle.run.status, 'failed');
  assert.deepEqual(bundle.run.aantallen, { geslaagd: 0, gefaald: 1, instabiel: 1, overgeslagen: 1 });
  assert.equal(bundle.results.length, 4);
  assert.equal(new Set(bundle.results.map(item => item.id)).size, 4);
  assert.equal(bundle.results[0].testdataSnapshot.id, 'standaard');
  assert.equal(bundle.results[0].scenarioId, 'lokaal:autoverzekering:standaard');
  assert.equal(bundle.results[0].stack, 'stack');
  assert.equal(bundle.results[3].status, 'skipped');
  assert.equal(bundle.results[3].details.nietGestart, true);
  const screenshot = bundle.artifacts.find(item => item.soort === 'screenshot');
  assert.equal(screenshot.resultaatId, bundle.results[0].id);
  assert.equal(screenshot.grootteBytes, 3);
  assert.equal(screenshot.sha256.length, 64);
  assert.match(screenshot.pad, /^test-runs\//);
  assert.ok(bundle.artifacts.some(item => item.soort === 'trace'));
  assert.equal(bundle.artifacts.some(item => item.pad.endsWith('ELASTICSEARCH-EXPORT.json')), false);
  assert.deepEqual(JSON.parse(await readFile(join(directory, 'ELASTICSEARCH-EXPORT.json'), 'utf8')), bundle);
});

test('Vroege fouten, ontbrekende/ongeldige JSON en onderbreking blijven als run bewaard', async t => {
  const { directory } = await fixture(t);
  await rm(join(directory, 'results.json'));
  let bundle = await buildExport(directory, 1);
  assert.equal(bundle.run.status, 'failed');
  assert.match(bundle.run.foutmelding, /vroeg gestopt/);
  assert.equal(bundle.results.length, 0);
  await writeFile(join(directory, 'results.json'), '{');
  bundle = await buildExport(directory, 143);
  assert.equal(bundle.run.status, 'interrupted');
  assert.match(bundle.run.foutmelding, /ongeldig/);
});

test('Bulkfouten worden per item herkend; retry behoudt IDs en voltooit de run pas na alle documenten', async t => {
  const { directory, run } = await fixture(t);
  const bundle = await buildExport(directory, 1);
  const api = await server();
  api.request.failBulk = true;
  await assert.rejects(publishExport(bundle, api.request), /Niet alle/);
  assert.equal(api.documents.has(`sq1-testruns-v1/${run.id}`), false);
  api.request.failBulk = false;
  await publishExport(bundle, api.request);
  const count = api.documents.size;
  await publishExport(bundle, api.request);
  assert.equal(api.documents.size, count);
  assert.equal(api.documents.get(`sq1-testruns-v1/${run.id}`).opslagStatus, 'complete');
});

test('Startregistratie blijft lokaal bestaan bij uitval van Elasticsearch', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sq1-start-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await assert.rejects(startRun(directory, '2026-10-16T10:00:00Z', async () => { throw new Error('offline'); }), /offline/);
  const metadata = JSON.parse(await readFile(join(directory, 'RUN-METADATA.json'), 'utf8'));
  assert.equal(metadata.status, 'running');
  await assert.rejects(startRun(directory, '2026-10-16T10:00:00Z', async () => {}), /EEXIST/);
});

test('De daadwerkelijk gebruikte JSON-bijlage heeft voorrang op de gearchiveerde invoer', async t => {
  const { directory, report } = await fixture(t);
  report.suites[0].suites[0].specs[0].tests[0].results[0].attachments.push({
    name: 'Gebruikte testdata uit Elasticsearch', contentType: 'application/json',
    body: Buffer.from(JSON.stringify({ id: 'standaard', kenteken: 'daadwerkelijk-gebruikt' })).toString('base64'),
  });
  await writeFile(join(directory, 'results.json'), JSON.stringify(report));
  const bundle = await buildExport(directory, 1);
  assert.equal(bundle.results[0].testdataSnapshot.kenteken, 'daadwerkelijk-gebruikt');
  assert.equal(bundle.results[1].testdataSnapshot.kenteken, 'voorbeeld');
});

test('Artefacten buiten de runmap worden niet gelezen of geïmporteerd', async t => {
  const { directory, report } = await fixture(t);
  report.suites[0].suites[0].specs[0].tests[0].results[0].attachments[0].path = '/buiten-de-runmap/screenshot.png';
  await writeFile(join(directory, 'results.json'), JSON.stringify(report));
  await assert.rejects(buildExport(directory, 1), /buiten de runmap/);
});

test('De runner bewaart rapporten en behoudt testfouten als opslag mislukt', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sq1-runner-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'scripts'));
  await writeFile(join(directory, 'scripts/elasticsearch-results.mjs'), "if(process.argv[2]==='finish')process.exit(Number(process.env.MOCK_STORAGE_EXIT));\n");
  await writeFile(join(directory, 'scripts/summarize-lancyr-run.mjs'), "import {writeFileSync} from 'node:fs';writeFileSync(process.argv[2]+'/SAMENVATTING.md','samenvatting');\n");
  const command = "require('node:fs').writeFileSync('html-rapport.html','rapport');process.exit(Number(process.env.MOCK_TEST_EXIT));";
  const runner = fileURLToPath(new URL('./run-and-summarize.sh', import.meta.url));
  for (const [testExit, storageExit, expected] of [[0, 5, 5], [7, 5, 7], [0, 0, 0]]) {
    let actual = 0;
    try {
      await promisify(execFile)('bash', [runner, directory, '2026-10-16T10:00:00Z', 'headless', process.execPath, '-e', command], {
        cwd: directory, env: { ...process.env, LANCYR_LINT_SUITE: 'visueel', MOCK_STORAGE_EXIT: String(storageExit), MOCK_TEST_EXIT: String(testExit) },
      });
    } catch (error) { actual = error.code; }
    assert.equal(actual, expected);
    assert.equal(await readFile(join(directory, 'html-rapport.html'), 'utf8'), 'rapport');
    assert.equal(await readFile(join(directory, 'SAMENVATTING.md'), 'utf8'), 'samenvatting');
  }
});

test('Lokale Elasticsearch bewaart de volledige export en CLI-retry maakt geen duplicaten', {
  skip: process.env.RUN_ELASTICSEARCH_INTEGRATION !== '1',
}, async t => {
  const { directory } = await fixture(t);
  const bundle = await buildExport(directory, 1);
  // Alleen uniek benoemde validatierecords; opruimen raakt geen bestaande runs.
  bundle.run.omgeving = 'technische-validatie';
  bundle.run.suite = 'technische-validatie';
  for (const result of bundle.results) {
    result.omgeving = bundle.run.omgeving;
    result.suite = bundle.run.suite;
  }
  await writeFile(join(directory, 'ELASTICSEARCH-EXPORT.json'), JSON.stringify(bundle));
  const request = await localElasticsearch();
  const records = [
    ['sq1-testruns-v1', bundle.run],
    ...bundle.results.map(doc => ['sq1-testresultaten-v1', doc]),
    ...bundle.artifacts.map(doc => ['sq1-artefacten-v1', doc]),
  ];
  t.after(async () => {
    const body = records.map(([index, doc]) => JSON.stringify({ delete: { _index: index, _id: doc.id } })).join('\n') + '\n';
    const response = await request('_bulk?refresh=wait_for', 'POST', body);
    assert.equal(response.status, 200);
    assert.equal(response.data.errors, false);
  });
  await publishExport(bundle, request);
  for (const [index, document] of records) {
    const actual = await request(`${index}/_doc/${encodeURIComponent(document.id)}`);
    assert.deepEqual(actual.data._source, document);
  }
  await promisify(execFile)(process.execPath, [fileURLToPath(new URL('./elasticsearch-results.mjs', import.meta.url)), 'retry', directory]);
  const results = await request('sq1-testresultaten-v1/_count', 'POST', { query: { term: { runId: bundle.run.id } } });
  assert.equal(results.data.count, bundle.results.length);
  assert.equal(JSON.parse(await readFile(join(directory, 'ELASTICSEARCH-STATUS.json'), 'utf8')).status, 'stored');
});
