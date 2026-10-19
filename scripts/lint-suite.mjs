import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
// Gedeelde JavaScript/TypeScript-code die deze runners gebruiken.
const common = [
  'eslint.config.mjs',
  'playwright.config.ts',
  'scripts/playwright-global-setup.mjs',
  'scripts/lint-suite.mjs',
  'scripts/summarize-lancyr-run.mjs',
  'scripts/elasticsearch-results.mjs',
  'scripts/elasticsearch-local.mjs',
];

const dataFiles = ['scripts/with-elasticsearch-data.mjs', 'scripts/elasticsearch-local.mjs',
  'testdata/snapshot.mts', 'testdata/scenarios.ts', 'testdata/regressie.ts'];
export const suiteFiles = {
  autoverzekering: [...common, ...dataFiles, 'test/autoverzerkeringsfunnel/lancyr-autoverzekering.spec.ts'],
  schade: [...common, ...dataFiles, 'test/schade-melden/**/*.ts'],
  visueel: [...common, 'test/autoverzerkeringsfunnel/lancyr-visual.spec.ts', 'scripts/create-visual-overview.mjs'],
};

export async function lintSuite(suite = 'all') {
  const files = suite === 'all' ? [...new Set(Object.values(suiteFiles).flat())] : suiteFiles[suite];
  if (!files) throw new Error(`Onbekende lintsuite: ${suite}. Kies all, autoverzekering, schade of visueel.`);
  console.log(`ESLint vóór de browsertests: ${suite} (testcode, helpers en gedeelde configuratie/scripts).`);
  const eslint = new ESLint({ cwd: projectRoot });
  const results = await eslint.lintFiles(files);
  const output = (await eslint.loadFormatter('stylish')).format(results);
  if (output) console.log(output);
  const errors = results.reduce((total, result) => total + result.errorCount, 0);
  const warnings = results.reduce((total, result) => total + result.warningCount, 0);
  if (errors || warnings) throw new Error(`Browsertests geblokkeerd: ESLint vond ${errors} fouten en ${warnings} waarschuwingen.`);
  console.log('ESLint geslaagd; de browsertests mogen starten.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  lintSuite(process.argv[2]).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
