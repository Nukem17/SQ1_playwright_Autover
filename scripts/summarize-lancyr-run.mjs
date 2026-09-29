import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

// Het shellscript geeft ook de browsermodus mee; oudere aanroepen blijven geldig.
const [runDirectory, startedAt, exitCode, mode = 'headless'] = process.argv.slice(2);
const reportFile = join(runDirectory, 'results.json');
const runName = basename(runDirectory);

// Zet de UTC-tijd uit de run om naar een leesbare Nederlandse datum en tijd.
function amsterdamTime(iso) {
  return new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'medium',
  }).format(new Date(iso));
}

// Playwright zet tests soms in geneste groepen. Deze functie verzamelt ze allemaal.
function allSpecs(suites) {
  return suites.flatMap(suite => [...suite.specs, ...allSpecs(suite.suites ?? [])]);
}

const finishedAt = new Date().toISOString();
const timestamp = `${amsterdamTime(startedAt)} – ${amsterdamTime(finishedAt)}`;
let result = 'NIET UITGEVOERD';
let testLines = [];

try {
  // De JSON-reporter levert aantallen en de uitslag per browser.
  const report = JSON.parse(readFileSync(reportFile, 'utf8'));
  const { expected, unexpected, flaky, skipped } = report.stats;
  result = `${expected} geslaagd, ${unexpected} gefaald, ${flaky} instabiel, ${skipped} overgeslagen`;
  testLines = allSpecs(report.suites).map(spec => {
    const labels = { expected: 'GESLAAGD', unexpected: 'GEFAALD', flaky: 'INSTABIEL', skipped: 'OVERGESLAGEN' };
    const status = spec.tests.map(item => `${item.projectName}: ${labels[item.status] ?? item.status}`).join(', ');
    const firstError = spec.tests.flatMap(item => item.results.flatMap(run => run.errors ?? []))[0];
    const shortError = firstError?.message?.split('\n')[0];
    return `- **${status}** — ${spec.title}${shortError ? ` — ${shortError}` : ''}`;
  });
} catch {
  // Ook zonder JSON (bijvoorbeeld een vroege crash) bewaren we een samenvatting.
  result = exitCode === '0' ? 'ONBEKEND' : 'NIET UITGEVOERD';
}

// Dit bestand hoort bij één run en blijft naast het HTML-rapport staan.
const summary = [
  `# Lancyr-test — ${timestamp}`,
  '',
  `**Uitslag:** ${result}`,
  '',
  `**Browsermodus:** ${mode}`,
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

console.log(`\nSamenvatting: test-runs/${runName}/SAMENVATTING.md`);
console.log(`HTML-rapport: test-runs/${runName}/html/index.html`);
console.log(`Uitslag: ${result}`);
