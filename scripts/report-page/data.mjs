import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { resolve, relative, sep, join } from 'node:path';
import { explainAttempt } from './error-explanation.mjs';
import { classifyTest } from './classification.mjs';
export const clean = value => String(value ?? '').replace(/\x1b\[[0-9;]*m/g, '');
export function safeFile(root, path) {
  try {
    const base = realpathSync(root), target = realpathSync(resolve(root, path));
    return target.startsWith(base + sep) && statSync(target).isFile() ? target : null;
  } catch { return null; }
}
export function readRuns(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory()).map(entry => {
    const id = entry.name, dir = join(root, id);
    const link = path => safeFile(root, `${id}/${path}`) ? '/runs/' + [id, ...path.split('/')].map(encodeURIComponent).join('/') : null;
    let summary = '';
    try { summary = readFileSync(safeFile(root, `${id}/SAMENVATTING.md`), 'utf8'); } catch {}
    const mode = summary.match(/\*\*Browsermodus:\*\* (.+)/)?.[1] || 'Niet vastgelegd';
    const kind = /visual/.test(mode + id) ? 'Visueel' : 'Functioneel';
    const demo = /demo/.test(mode + id), reference = /reference/.test(mode + id);
    const run = { id, kind, demo, reference, mode, report: link('html/index.html'), visual: link('VISUEEL-OVERZICHT.html'), json: link('results.json'), tests: [], errors: [] };
    try {
      const report = JSON.parse(readFileSync(safeFile(root, `${id}/results.json`), 'utf8'));
      if (!Array.isArray(report.suites) || !report.stats) throw new Error('Onvolledig resultaatbestand');
      run.start = report.stats.startTime; run.duration = report.stats.duration;
      run.errors = (report.errors || []).map(e => clean(e.message || e.stack));
      function visit(suites, parents = []) {
        for (const suite of suites) {
          for (const spec of suite.specs || []) for (const test of spec.tests || []) {
            const annotations = [...(test.annotations || []), ...(test.results || []).flatMap(r => r.annotations || [])];
            const scenario = annotations.find(a => a.type === 'Testdata')?.description || 'Geen scenario vastgelegd';
            const attempts = (test.results || []).map(result => ({
              status: result.status, duration: result.duration, retry: result.retry || 0,
              errors: (result.errors?.length ? result.errors : result.error ? [result.error] : []).map(e => clean(e.message || e.stack)),
              explanations: explainAttempt(result),
              logs: [...(result.stdout || []), ...(result.stderr || [])].map(l => clean(l.text || '')).filter(Boolean),
              attachments: (result.attachments || []).map(a => {
                let url = null;
                if (a.path) {
                  const marker = `/test-runs/${id}/`, offset = a.path.indexOf(marker);
                  const path = offset >= 0 ? a.path.slice(offset + marker.length) : relative(dir, resolve(dir, a.path));
                  url = link(path);
                }
                return { name: a.name, type: a.contentType || '', url, body: a.body && /json|text/.test(a.contentType) ? Buffer.from(a.body, 'base64').toString('utf8') : null };
              }),
            }));
            run.tests.push({ ...classifyTest(spec, suite, annotations, kind), title: spec.title, id: spec.id, file: spec.file || suite.file, line: spec.line, group: [...parents, suite.title].join(' › '), browser: test.projectName || 'Onbekend', status: test.status || 'unknown', expectedStatus: test.expectedStatus, scenario, annotations: [...new Map(annotations.map(a => [a.type + a.description, a])).values()], attempts, duration: attempts.reduce((n,a) => n + (a.duration || 0),0) });
          }
          visit(suite.suites || [], [...parents, suite.title]);
        }
      }
      visit(report.suites);
      const kinds = [...new Set(run.tests.map(t => t.kind))];
      if (kinds.length) run.kind = kinds.length === 1 ? kinds[0] : 'Gemengd';
      run.status = run.errors.length || run.tests.some(t => t.status === 'unexpected') ? 'unexpected' : run.tests.some(t => t.status === 'flaky') ? 'flaky' : !run.tests.length || run.tests.some(t => !['expected','skipped'].includes(t.status)) ? 'unknown' : run.tests.every(t => t.status === 'skipped') ? 'skipped' : 'expected';
    } catch { run.status = 'unknown'; run.errors.push('Resultaten ontbreken of zijn niet leesbaar. Deze run is mogelijk nog bezig of voortijdig gestopt.'); }
    return run;
  }).sort((a,b) => String(b.start || b.id).localeCompare(String(a.start || a.id)));
}
export function renderPage(template, runs) {
  return template.replace('/*REPORT_DATA*/[]', JSON.stringify(runs).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029'));
}
