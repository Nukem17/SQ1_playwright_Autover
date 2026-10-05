import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium, expect } from '@playwright/test';

test('Alle bestaande runners leveren centrale JSON- en HTML-resultaten', () => {
  for (const file of ['scripts/run-lancyr-browsers.sh', 'scripts/run-lancyr-visual.sh']) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /test-runs\//);
    assert.match(source, /PLAYWRIGHT_JSON_OUTPUT_FILE=.*results\.json/);
    assert.match(source, /PLAYWRIGHT_HTML_OUTPUT_DIR=.*\/html/);
    assert.match(source, /--reporter=list,html,json/);
    assert.match(source, /scripts\/run-and-summarize\.sh/);
  }
});

test('Nieuwe runs en resultaten verschijnen live; filters, details en foutmelding blijven betrouwbaar', { timeout: 60000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'report-live-'));
  const report = (browser='chromium', scenario='anna') => ({
    stats: { startTime: new Date().toISOString(), duration: 100 },
    suites: [{ title:'bestand', specs:[{title:'Voorbeeldtest', tests:[{
      status:'expected', projectName:browser, annotations:[{type:'Testdata',description:scenario}], results:[{status:'passed',duration:100}],
    }]}]}],
  });
  mkdirSync(join(root,'eerste'));
  writeFileSync(join(root,'eerste/results.json'),JSON.stringify(report()));
  const server=spawn(process.execPath,[resolve('scripts/report-page/server.mjs')],{env:{...process.env,REPORT_RUNS_DIR:root,PORT:'8079',REPORT_HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
  let browser;
  try {
    await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw Error('Server stopped')}),new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('Server timeout')),5000);t.unref()})]);
    browser=await chromium.launch();
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:8079');
    await expect(page.locator('.run')).toHaveCount(1);
    await page.selectOption('#browser','chromium');
    await page.locator('.run>summary').click();
    await page.locator('.test>summary').click();
    mkdirSync(join(root,'nieuwe-run'));
    // No reload or click: polling must discover the run.
    await expect(page.locator('#count')).toContainText('van 2 runs',{timeout:15000});
    await expect(page.locator('#browser')).toHaveValue('chromium');
    await expect(page.locator('#eerste')).toHaveAttribute('open','');
    await expect(page.locator('#eerste .test')).toHaveAttribute('open','');
    await page.click('#reset');
    await expect(page.locator('#nieuwe-run')).toContainText('Onvolledig / onbekend');
    writeFileSync(join(root,'nieuwe-run/results.json'),JSON.stringify(report('firefox','bram')));
    await expect(page.locator('#nieuwe-run')).toContainText('Geslaagd',{timeout:15000});
    await expect(page.locator('#browser option[value="firefox"]')).toHaveCount(1);
    await expect(page.locator('#scenario option[value="bram"]')).toHaveCount(1);
    await page.route('**/api/runs',route=>route.abort());
    await page.click('#refresh');
    await expect(page.locator('#sync')).toContainText('verouderd');
    await expect(page.locator('.run')).toHaveCount(2);
    await page.unroute('**/api/runs');
    await page.click('#refresh');
    await expect(page.locator('#sync')).toContainText('Laatst gecontroleerd');
  } finally {
    if(browser)await browser.close();
    server.kill();await once(server,'exit').catch(()=>{});
    rmSync(root,{recursive:true,force:true});
  }
});
