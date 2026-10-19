import { readFile, writeFile, rename, readdir, stat, realpath } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { basename, join, relative, resolve, isAbsolute, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { localElasticsearch, normalizeMapping, projectRoot } from './elasticsearch-local.mjs';

const indices = { run: 'sq1-testruns-v1', results: 'sq1-testresultaten-v1', artifacts: 'sq1-artefacten-v1' };
const metadataFile = 'RUN-METADATA.json';
const bundleFile = 'ELASTICSEARCH-EXPORT.json';
const statusFile = 'ELASTICSEARCH-STATUS.json';
const contentTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webm': 'video/webm', '.zip': 'application/zip', '.html': 'text/html', '.json': 'application/json', '.md': 'text/markdown', '.txt': 'text/plain', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

async function json(path) { return JSON.parse(await readFile(path, 'utf8')); }
async function optionalJson(path) {
  try { return await json(path); } catch (error) { if (error.code === 'ENOENT') return undefined; throw error; }
}
async function save(path, data) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, path);
}
function suiteName(suite) { return suite === 'schade' ? 'schade-melden' : suite === 'visueel' ? 'visueel' : suite ?? 'onbekend'; }
function inside(path) { return path !== '..' && !path.startsWith('../') && !isAbsolute(path); }
function portable(path) { return path.split('\\').join('/'); }
function id(...parts) { return parts.map(part => encodeURIComponent(String(part))).join(':'); }

export function newRun(directory, startedAt, env = process.env) {
  if (!Number.isFinite(Date.parse(startedAt))) throw new Error('Ongeldige starttijd.');
  return {
    id: randomUUID(), schemaVersie: 1, suite: suiteName(env.LANCYR_LINT_SUITE),
    omgeving: env.LANCYR_TEST_ENVIRONMENT ?? 'lokaal', status: 'running', opslagStatus: 'pending',
    trigger: env.LANCYR_RUN_TRIGGER ?? 'handmatig', commit: env.LANCYR_GIT_COMMIT ?? '', branch: env.LANCYR_GIT_BRANCH ?? '',
    gestartOp: new Date(startedAt).toISOString(), rapportPad: `test-runs/${basename(directory)}/html/index.html`,
  };
}

async function checkMappings(request) {
  for (const index of Object.values(indices)) {
    const expected = await json(new URL(`elasticsearch/indices/${index}.json`, projectRoot));
    const actual = await request(`${index}/_mapping`);
    if (actual.status !== 200 || !isDeepStrictEqual(normalizeMapping(actual.data[index]?.mappings), normalizeMapping(expected.mappings))) {
      throw new Error(`${index}: mapping ontbreekt of wijkt af. Voer het setupscript uit (eventueel --add-fields).`);
    }
  }
}

export async function startRun(directory, startedAt, request) {
  const path = join(directory, metadataFile);
  // Eén runmap hoort bij precies één run. Niet opnieuw starten in een bestaande map.
  const run = newRun(directory, startedAt);
  await writeFile(path, `${JSON.stringify(run, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  await checkMappings(request);
  const response = await request(`${indices.run}/_create/${encodeURIComponent(run.id)}?refresh=wait_for`, 'PUT', run);
  if (response.status !== 201) throw new Error('Start van testrun niet opgeslagen.');
  return run;
}

function specs(suites = [], parents = []) {
  return suites.flatMap(suite => [
    ...(suite.specs ?? []).map(spec => ({ ...spec, titlePath: [...parents, suite.title, spec.title].filter(Boolean) })),
    ...specs(suite.suites, [...parents, suite.title].filter(Boolean)),
  ]);
}

// Zet ook paden uit een gedownload Docker-rapport om naar de huidige lokale runmap.
async function attachmentPath(directory, attachment) {
  let path = attachment.path;
  if (!path) return undefined;
  const prefix = `/test-runs/${basename(directory)}/`;
  const normalized = portable(path);
  if (normalized.includes(prefix)) path = normalized.slice(normalized.indexOf(prefix) + prefix.length);
  const candidate = isAbsolute(path) ? path : resolve(directory, path);
  const rel = portable(relative(directory, candidate));
  if (!inside(rel)) throw new Error('Artefactpad valt buiten de runmap.');
  const physical = await realpath(candidate);
  if (!inside(portable(relative(await realpath(directory), physical)))) throw new Error('Artefactverwijzing valt buiten de runmap.');
  return rel;
}

async function usedData(directory, attempt, test, archive) {
  for (const attachment of attempt.attachments ?? []) {
    if (attachment.contentType !== 'application/json' || !attachment.name.startsWith('Gebruikte ')) continue;
    const path = await attachmentPath(directory, attachment);
    const value = attachment.body ? JSON.parse(Buffer.from(attachment.body, 'base64').toString('utf8'))
      : path ? await json(join(directory, path)) : undefined;
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  }
  // Gebruik uitsluitend de gearchiveerde data van deze run, nooit de huidige database.
  const annotations = attempt.annotations ?? test.annotations ?? [];
  const regressionId = annotations.find(item => item.type === 'Regressiecase')?.description;
  if (regressionId && archive) {
    const scenario = archive.scenarios.find(row => row.id === regressionId);
    if (scenario) return { scenario, bron: archive.paginas.find(row => row.id === scenario.bronPaginaId), doel: archive.paginas.find(row => row.id === scenario.doelPaginaId) ?? null };
    return archive.paginas.find(row => row.id === regressionId);
  }
  // De korte funnel-paginatests gebruiken geen scenario: ken ze dus geen fictieve data toe.
  const scenarioId = annotations.find(item => item.type === 'Testdata')?.description?.split(': ').slice(1).join(': ');
  return scenarioId && archive ? archive.funnel.find(row => row.id === scenarioId) : undefined;
}

export async function buildExport(directory, exitCode, finishedAt = new Date().toISOString()) {
  directory = resolve(directory);
  const run = await json(join(directory, metadataFile));
  const end = new Date(finishedAt);
  if (!Number.isFinite(end.getTime()) || !Number.isInteger(exitCode) || exitCode < 0) throw new Error('Ongeldige eindtijd of exitcode.');
  Object.assign(run, { afgerondOp: end.toISOString(), duurMs: Math.max(0, end.getTime() - Date.parse(run.gestartOp)), exitCode, opslagStatus: 'complete' });
  let report;
  try { report = await json(join(directory, 'results.json')); } catch (error) {
    run.foutmelding = error.code === 'ENOENT' ? 'Geen Playwright-JSON: voorbereiding of uitvoering is vroeg gestopt.' : 'Playwright-JSON is ongeldig of niet leesbaar.';
  }
  if (report && (!report.stats || !Array.isArray(report.suites))) {
    run.foutmelding = 'Playwright-rapport mist stats of suites.';
    report = undefined;
  }
  const errors = (report?.errors ?? []).map(error => error.message ?? error.value ?? '').filter(Boolean);
  if (errors.length) run.foutmelding = errors.join('\n');
  run.status = [130, 143].includes(exitCode) ? 'interrupted'
    : !report || exitCode !== 0 || errors.length || report.stats.unexpected > 0 ? 'failed' : 'passed';
  run.aantallen = { geslaagd: report?.stats.expected ?? 0, gefaald: report?.stats.unexpected ?? 0,
    instabiel: report?.stats.flaky ?? 0, overgeslagen: report?.stats.skipped ?? 0 };
  if (Number.isInteger(report?.config?.workers)) run.workers = report.config.workers;
  const archive = await optionalJson(join(directory, 'TESTDATA.json'));
  const results = [];
  const owners = new Map();
  for (const spec of specs(report?.suites)) {
    for (const test of spec.tests ?? []) {
      const attempts = test.results?.length ? test.results : [{ status: test.status === 'skipped' ? 'skipped' : 'interrupted', retry: 0, duration: 0, workerIndex: -1, nietGestart: true }];
      for (const [attemptIndex, attempt] of attempts.entries()) {
        const testId = spec.id ?? createHash('sha256').update(JSON.stringify([spec.file, spec.line, spec.titlePath])).digest('hex');
        const project = test.projectName ?? test.projectId ?? 'onbekend';
        const resultId = id(run.id, testId, project, attempt.retry ?? attemptIndex);
        const snapshot = await usedData(directory, attempt, test, archive);
        const failure = (attempt.errors ?? (attempt.error ? [attempt.error] : []));
        const result = { id: resultId, runId: run.id, testId, schemaVersie: 1, suite: run.suite, omgeving: run.omgeving,
          browser: ['chromium', 'firefox', 'webkit'].includes(project) ? project : report.config?.projects?.find(p => p.name === project)?.use?.browserName ?? project,
          project, status: attempt.status, uitkomst: test.status, bestand: spec.file, titel: spec.titlePath.join(' › '),
          poging: attempt.retry ?? attemptIndex, workerIndex: attempt.workerIndex ?? -1, regel: spec.line,
          gestartOp: attempt.startTime ?? run.gestartOp, duurMs: Math.round(attempt.duration ?? 0),
          details: { expectedStatus: test.expectedStatus, timeout: test.timeout, tags: spec.tags ?? [],
            annotaties: attempt.annotations ?? test.annotations ?? [], fouten: failure, stappen: attempt.steps ?? [], stdout: attempt.stdout ?? [], stderr: attempt.stderr ?? [], nietGestart: attempt.nietGestart ?? false } };
        if (failure.length) {
          result.foutmelding = failure.map(error => error.message ?? error.value ?? '').join('\n');
          result.stack = failure.map(error => error.stack ?? '').filter(Boolean).join('\n');
        }
        if (snapshot) {
          result.testdataSnapshot = snapshot;
          if (run.suite === 'autoverzekering') {
            result.scenarioId = id(run.omgeving, run.suite, snapshot.id);
            result.scenarioIndex = 'sq1-autoverzekering-scenarios-v1';
          } else if (snapshot.scenario) {
            result.scenarioId = id(run.omgeving, run.suite, snapshot.scenario.id);
            result.scenarioIndex = 'sq1-regressie-scenarios-v1';
            result.paginaId = id(run.omgeving, run.suite, snapshot.scenario.bronPaginaId);
          } else if (run.suite === 'schade-melden') result.paginaId = id(run.omgeving, run.suite, snapshot.id);
        }
        results.push(result);
        for (const attachment of attempt.attachments ?? []) {
          const path = await attachmentPath(directory, attachment);
          if (path) owners.set(path, resultId);
        }
      }
    }
  }
  if (new Set(results.map(item => item.id)).size !== results.length) throw new Error('Dubbele resultaat-IDs in rapport.');
  const artifacts = [];
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const full = join(path, entry.name);
      if (entry.isDirectory()) { await walk(full); continue; }
      const rel = portable(relative(directory, full));
      if ([bundleFile, statusFile].includes(rel) || entry.name.endsWith('.tmp') || entry.name.endsWith(':Zone.Identifier')) continue;
      const info = await stat(full);
      const hash = createHash('sha256');
      for await (const part of createReadStream(full)) hash.update(part);
      const extension = extname(rel).toLowerCase();
      const artifact = { id: id(run.id, rel), runId: run.id, schemaVersie: 1, opslag: 'local',
        soort: extension === '.png' || extension === '.jpg' ? 'screenshot' : extension === '.zip' ? 'trace' : extension === '.html' ? 'rapport' : 'bestand',
        pad: `test-runs/${basename(directory)}/${rel}`, contentType: contentTypes[extension] ?? 'application/octet-stream',
        grootteBytes: info.size, sha256: hash.digest('hex'), aangemaaktOp: info.mtime.toISOString() };
      if (owners.has(rel)) artifact.resultaatId = owners.get(rel);
      artifacts.push(artifact);
    }
  }
  await walk(directory);
  const bundle = JSON.parse(JSON.stringify({ schemaVersie: 1, run, results, artifacts }));
  await save(join(directory, bundleFile), bundle);
  return bundle;
}

export async function publishExport(bundle, request) {
  await checkMappings(request);
  // Resultaten en artefacten eerst; een run wordt pas daarna als volledig opgeslagen gemarkeerd.
  const records = [...bundle.results.map(document => ({ index: indices.results, document })),
    ...bundle.artifacts.map(document => ({ index: indices.artifacts, document }))];
  for (let offset = 0; offset < records.length; offset += 100) {
    const chunk = records.slice(offset, offset + 100);
    const body = chunk.flatMap(({ index, document }) => [JSON.stringify({ index: { _index: index, _id: document.id } }), JSON.stringify(document)]).join('\n') + '\n';
    const response = await request('_bulk?refresh=wait_for', 'POST', body);
    if (response.status !== 200 || response.data.errors || response.data.items?.length !== chunk.length
      || response.data.items.some(item => ![200, 201].includes(item.index?.status))) {
      throw new Error('Niet alle resultaten of artefactverwijzingen zijn opgeslagen. Het lokale exportbestand blijft beschikbaar voor retry.');
    }
  }
  const response = await request(`${indices.run}/_doc/${encodeURIComponent(bundle.run.id)}?refresh=wait_for`, 'PUT', bundle.run);
  if (![200, 201].includes(response.status)) throw new Error('Eindstatus van testrun niet opgeslagen.');
  const stored = await request(`${indices.run}/_doc/${encodeURIComponent(bundle.run.id)}`);
  if (stored.status !== 200 || !isDeepStrictEqual(stored.data._source, bundle.run)) throw new Error('Controle van opgeslagen testrun mislukt.');
}

async function main() {
  const [action, inputDirectory, argument] = process.argv.slice(2);
  if (!inputDirectory || !['start', 'finish', 'retry'].includes(action)
    || process.argv.slice(2).length !== (action === 'retry' ? 2 : 3)
    || (action === 'finish' && !/^\d+$/.test(argument))) {
    throw new Error('Gebruik: node scripts/elasticsearch-results.mjs start <runmap> <starttijd> | finish <runmap> <exitcode> | retry <runmap>');
  }
  const directory = resolve(inputDirectory);
  try {
    // Metadata en export lokaal vastleggen vóór een netwerkverbinding wordt geprobeerd.
    if (action === 'start') {
      let request;
      try { request = await localElasticsearch(); } catch (error) {
        const run = newRun(directory, argument);
        await writeFile(join(directory, metadataFile), JSON.stringify(run, null, 2), { flag: 'wx', mode: 0o600 });
        throw error;
      }
      await startRun(directory, argument, request);
    } else {
      const bundle = action === 'finish' ? await buildExport(directory, Number(argument)) : await json(join(directory, bundleFile));
      const metadata = await json(join(directory, metadataFile));
      if (bundle.schemaVersie !== 1 || bundle.run.id !== metadata.id) throw new Error('Export hoort niet bij deze runmap.');
      await publishExport(bundle, await localElasticsearch());
      console.log(`Elasticsearch: run ${bundle.run.id}, ${bundle.results.length} testpogingen en ${bundle.artifacts.length} artefactverwijzingen opgeslagen.`);
    }
    await save(join(directory, statusFile), { status: action === 'start' ? 'running' : 'stored', bijgewerktOp: new Date().toISOString() });
  } catch (error) {
    await save(join(directory, statusFile), { status: 'pending', fout: error.message, bijgewerktOp: new Date().toISOString() });
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Elasticsearch-resultaatopslag mislukt: ${error.message}`); process.exitCode = 1; });
}
