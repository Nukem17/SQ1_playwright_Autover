import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const [runDir, mode = 'headless-visual-check'] = process.argv.slice(2);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
const artifacts = files(join(runDir, 'test-results'));
const find = name => artifacts.find(path => basename(path) === name);
let passed = false;
try {
  const { stats } = JSON.parse(readFileSync(join(runDir, 'results.json'), 'utf8'));
  passed = stats.expected === 1 && stats.unexpected === 0 && stats.skipped === 0 && stats.flaky === 0;
} catch { /* Een ontbrekend rapport mag nooit als geslaagd worden getoond. */ }
const referenceRun = mode.endsWith('-reference');
const diff = find('autoverzekering-start-diff.png');
const status = referenceRun ? 'Referentie opgenomen — nog zelf beoordelen' : passed ? 'Geslaagd — geen visuele afwijking gevonden' : diff ? 'Gefaald — visuele afwijking gevonden' : 'Vergelijking niet geslaagd — bekijk het testrapport';
const imageDir = join(runDir, 'overzicht-beelden');
mkdirSync(imageDir, { recursive: true });
function card(title, caption, source, target, missing) {
  let content = `<p class="empty">${escape(missing)}</p>`;
  if (source && existsSync(source)) {
    copyFileSync(source, join(imageDir, target));
    content = `<a href="overzicht-beelden/${target}" target="_blank"><img src="overzicht-beelden/${target}" alt="${escape(title)}"></a>`;
  }
  return `<section><h2>${title}</h2><p>${caption}</p>${content}</section>`;
}
const reference = find('autoverzekering-start-expected.png') ?? 'test/autoverzerkeringsfunnel/lancyr-visual.spec.ts-snapshots/autoverzekering-start-chromium-linux.png';
const actual = find('autoverzekering-start-actual.png') ?? find('actueel.png');
const cards = [
  card('1. Zo hoort het', 'De opgeslagen referentie voor deze vergelijking.', reference, 'referentie.png', 'Geen referentie beschikbaar.'),
  card('2. Zo ziet het er nu uit', 'De actuele pagina tijdens deze testrun.', actual, 'actueel.png', 'Geen actuele screenshot beschikbaar.'),
  card('3. Dit wijkt af', 'Gemarkeerde pixels laten zien waar de beelden verschillen.', diff, 'verschil.png', passed && !referenceRun ? 'Geen verschil gevonden. De visuele test is geslaagd.' : referenceRun ? 'Dit is een referentieopname. Voer daarna de gewone vergelijking uit.' : 'Geen verschilafbeelding beschikbaar. Bekijk het testrapport voor de oorzaak.'),
].join('\n');
writeFileSync(join(runDir, 'VISUEEL-OVERZICHT.html'), `<!doctype html>
<html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Visuele vergelijking — Lancyr</title>
<style>
body{font:16px/1.5 system-ui,sans-serif;background:#f5f3f7;color:#24172c;margin:0;padding:32px}h1{margin:0;font-size:30px}h2{font-size:20px;margin:0}header{margin-bottom:24px}.status{font-weight:700;padding:12px 16px;background:${passed ? '#e0f3e5' : '#fff0d8'};border-radius:8px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}section{background:white;border:1px solid #ddd4e2;border-radius:10px;padding:18px}section p{min-height:48px;color:#594e60}img{width:100%;height:auto;border:1px solid #ddd;box-sizing:border-box}.empty{padding:32px 16px;background:#f5f3f7;border-radius:8px}a{color:#560773}footer{margin-top:24px}@media(max-width:1000px){.grid{grid-template-columns:1fr}}
</style>
<header><h1>Visuele vergelijking van de autoverzekeringspagina</h1>
<p>${escape(basename(runDir))}</p><p class="status">${escape(status)}</p>
<p>${mode.endsWith('-demo') ? 'Demonstratie: het kentekenveld is alleen in de testbrowser 60 pixels naar rechts verschoven.' : 'De pagina wordt vergeleken met de opgeslagen referentie.'} Klik op een afbeelding om deze op volledige grootte te bekijken.</p></header>
<main class="grid">${cards}</main>
<footer><a href="html/index.html">Volledig Playwright-rapport</a><p>De extra foutenscreenshots en traces blijven in de runmap beschikbaar voor technisch onderzoek.</p></footer></html>`);
console.log(`Visueel overzicht: ${join(runDir, 'VISUEEL-OVERZICHT.html')}`);
