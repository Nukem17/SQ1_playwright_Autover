import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { suiteFiles } from './lint-suite.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

async function fixture(check) {
  const dir = mkdtempSync(join(tmpdir(), 'suite-lint-'));
  try {
    const files = new Set(Object.values(suiteFiles).flat());
    for (const pattern of files) {
      const file = pattern.replace('**/*.ts', 'voorbeeld.ts');
      mkdirSync(dirname(join(dir, file)), { recursive: true });
      writeFileSync(join(dir, file), 'export {};\n');
    }
    for (const file of ['eslint.config.mjs', 'scripts/lint-suite.mjs', 'scripts/playwright-global-setup.mjs']) {
      copyFileSync(join(root, file), join(dir, file));
    }
    symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
    const module = await import(pathToFileURL(join(dir, 'scripts/lint-suite.mjs')).href);
    await check(dir, module);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('De gekozen suite controleert gedeelde code en negeert fouten in een andere suite', async () => {
  await fixture(async (dir, { lintSuite }) => {
    writeFileSync(join(dir, 'test/schade-melden/voorbeeld.ts'), 'const kapot = ;\n');
    await lintSuite('autoverzekering');
    await assert.rejects(lintSuite('schade'), /Browsertests geblokkeerd/);
    await assert.rejects(lintSuite('all'), /Browsertests geblokkeerd/);
    writeFileSync(join(dir, 'playwright.config.ts'), 'const ongebruikt = 1;\n');
    await assert.rejects(lintSuite('autoverzekering'), /Browsertests geblokkeerd/);
  });
});

test('Alle suites zijn bruikbaar en een onbekende suite wordt geweigerd', async () => {
  await fixture(async (_dir, { lintSuite }) => {
    for (const suite of Object.keys(suiteFiles)) await lintSuite(suite);
    await assert.rejects(lintSuite('onbekend'), /Onbekende lintsuite/);
  });
});

test('De Playwright-opstartcontrole propageert lintfouten', async () => {
  await fixture(async (dir) => {
    writeFileSync(join(dir, 'playwright.config.ts'), 'const ongebruikt = 1;\n');
    const { default: globalSetup } = await import(pathToFileURL(join(dir, 'scripts/playwright-global-setup.mjs')).href);
    await assert.rejects(globalSetup(), /Browsertests geblokkeerd/);
  });
});
