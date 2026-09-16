import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const [runDirectory, startedAt, exitCode] = process.argv.slice(2);
const reportFile = join(runDirectory, 'results.json');
const overviewFile = 'TESTRESULTATEN-lancyr.md';
const runName = basename(runDirectory);

function amsterdamTime(iso) {
  return new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'medium',
  }).format(new Date(iso));
}

function allSpecs(suites) {
  return suites.flatMap(suite => [...suite.specs, ...allSpecs(suite.suites ?? [])]);
}

const finishedAt = new Date().toISOString();
const timestamp = `${amsterdamTime(startedAt)} – ${amsterdamTime(finishedAt)}`;
let result = 'NIET UITGEVOERD';
let detail = 'Geen JSON-resultaat; bekijk de terminaluitvoer.';
let testLines = [];

try {
  const report = JSON.parse(readFileSync(reportFile, 'utf8'));
  const { expected, unexpected, flaky, skipped } = report.stats;
  result = `${expected} geslaagd, ${unexpected} gefaald, ${flaky} instabiel, ${skipped} overgeslagen`;
  detail = unexpected || flaky ? 'Bekijk de fout in het rapport en de trace.' : 'Alle uitgevoerde controles geslaagd.';
  testLines = allSpecs(report.suites).map(spec => {
    const labels = { expected: 'GESLAAGD', unexpected: 'GEFAALD', flaky: 'INSTABIEL', skipped: 'OVERGESLAGEN' };
    const status = spec.tests.map(item => labels[item.status] ?? item.status).join(', ');
    const firstError = spec.tests.flatMap(item => item.results.flatMap(run => run.errors ?? []))[0];
    const shortError = firstError?.message?.split('\n')[0];
    return `- **${status}** — ${spec.title}${shortError ? ` — ${shortError}` : ''}`;
  });
} catch {
  result = exitCode === '0' ? 'ONBEKEND' : 'NIET UITGEVOERD';
}

const summary = [
  `# Lancyr-test — ${timestamp}`,
  '',
  `**Uitslag:** ${result}`,
  '',
  `**Runmap:** \`test-runs/${runName}/\``,
  '',
  ...testLines,
  '',
  `**HTML-rapport:** \`html/index.html\``,
  `**Screenshots en traces bij fouten:** \`test-results/\``,
  '',
].join('\n');
writeFileSync(join(runDirectory, 'SAMENVATTING.md'), summary);

const tableHeader = '| --- | --- | --- | --- |\n';
const overview = readFileSync(overviewFile, 'utf8');
const newRow = `| ${timestamp} | ${result} | \`test-runs/${runName}/SAMENVATTING.md\` | ${detail} |`;
if (!overview.includes(tableHeader)) {
  throw new Error(`Tabelkop ontbreekt in ${overviewFile}`);
}
writeFileSync(overviewFile, overview.replace(tableHeader, `${tableHeader}${newRow}\n`));

console.log(`\nSamenvatting: test-runs/${runName}/SAMENVATTING.md`);
console.log(`HTML-rapport: test-runs/${runName}/html/index.html`);
console.log(`Uitslag: ${result}`);
