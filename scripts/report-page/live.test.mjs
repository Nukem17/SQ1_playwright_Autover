import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium, expect } from '@playwright/test';

test('Alle bestaande runners leveren centrale JSON- en HTML-resultaten', () => {
  for (const file of ['scripts/run-lancyr-browsers.sh', 'scripts/run-lancyr-visual.sh', 'scripts/run-schade-regressie.sh']) {
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
      status:'expected', projectName:browser, annotations:[{type:'Testdata',description:scenario},{type:'Onderdeel',description:'Autoverzekering'},{type:'Testgroep',description:'Pagina en invoer'}], results:[{status:'passed',duration:100}],
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
    await page.locator('#advanced>summary').click();
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
    // A failed test appears first, with evidence before technical data.
    const mixed=report('firefox','SQLite-scenario: testgebruiker-bram');
    mixed.suites[0].specs.push({title:'Premie berekenen',tests:[{
      status:'unexpected',projectName:'firefox',annotations:[{type:'Testdata',description:'SQLite-scenario: testgebruiker-bram'},{type:'Onderdeel',description:'Autoverzekering'},{type:'Testgroep',description:'Klantreis'}],
      results:[{status:'failed',duration:200,steps:[{title:'Controleer de premie',error:{message:'Premie ontbreekt\nDetails van de fout'}}],errors:[{message:'Premie ontbreekt\nDetails van de fout'}],stdout:[{text:'Technisch log'}]}],
    }]});
    writeFileSync(join(root,'nieuwe-run/results.json'),JSON.stringify(mixed));
    await page.click('#refresh');
    const run=page.locator('#nieuwe-run');
    await expect(run.locator(':scope>summary')).toContainText('Bram · Functionele test');
    await expect(run.locator('.result-counts')).toHaveText('1 geslaagd · 1 gefaald');
    await run.locator(':scope>summary').click();
    await expect(run.locator('.test').first().locator('summary').first()).toContainText('Premie berekenen');
    await expect(run.locator('.error-preview')).toBeVisible();
    await expect(run.locator('.error-preview')).toHaveText('Stap “Controleer de premie” is niet geslaagd.');
    await run.getByText('Bekijk fout',{exact:true}).click();
    await expect(run.getByRole('heading',{name:'Wat ging er mis?'})).toBeVisible();
    await expect(run.getByText('Na deze mislukte stap zijn geen volgende teststappen vastgelegd.',{exact:false})).toBeVisible();
    await expect(run.getByText('Technisch log',{exact:true})).not.toBeVisible();
    await expect(run.getByRole('heading',{name:'Oorspronkelijke foutmelding'})).not.toBeVisible();
    await run.getByText('Technische details en bijlagen',{exact:true}).first().click();
    await expect(run.getByRole('heading',{name:'Oorspronkelijke foutmelding'})).toBeVisible();
    await page.getByRole('button',{name:'Met fouten',exact:true}).click();
    await expect(page.locator('.run')).toHaveCount(1);
    await expect(page.locator('.test')).toHaveCount(1);
    await expect(page.getByRole('button',{name:'Met fouten',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'Geslaagd',exact:true}).click();
    await expect(page.locator('.test')).toHaveCount(2);
    await page.click('#reset');
    await page.locator('#advanced>summary').click();
    await expect(page.locator('#browser')).not.toBeVisible();
    // A separate page is discovered without changing the page; one run can contain both.
    mixed.suites[0].specs.push({title:'Controleer het contactformulier',tests:[{
      status:'expected',projectName:'chromium',annotations:[
        {type:'Onderdeel',description:'Contactpagina'},
        {type:'Testgroep',description:'Formulierweergave'},
        {type:'Testsoort',description:'Visueel'},
      ],results:[{status:'passed',duration:50}],
    }]});
    writeFileSync(join(root,'nieuwe-run/results.json'),JSON.stringify(mixed));
    await page.click('#refresh');
    await expect(page.locator('#area option[value="Contactpagina"]')).toHaveCount(1);
    await expect(page.locator('.run')).toHaveCount(2);
    await page.selectOption('#area','Contactpagina');
    await expect(page.locator('.run')).toHaveCount(1);
    await expect(page.locator('.test')).toHaveCount(1);
    await expect(page.locator('#count')).toContainText('1 testresultaten');
    await page.locator('#nieuwe-run>summary').click();
    await expect(page.locator('.test-group>h3')).toHaveText('Contactpagina · Formulierweergave');
    await page.locator('.test>summary').click();
    await page.locator('#advanced>summary').click();
    await page.selectOption('#kind','Visueel');
    await page.selectOption('#testGroup','Formulierweergave');
    await expect(page.locator('.test')).toHaveCount(1);
    await page.reload();
    await expect(page.locator('#area')).toHaveValue('Contactpagina');
    await expect(page.locator('#testGroup')).toHaveValue('Formulierweergave');
    await expect(page.locator('.test')).toHaveCount(1);
    await page.click('#reset');
    await expect(page.locator('.run')).toHaveCount(2);
    await expect(page.locator('.test')).toHaveCount(4);
    await expect(page.locator('.area-section>h2').filter({hasText:'Meerdere onderdelen'})).toHaveCount(1);
    await page.setViewportSize({width:375,height:812});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);

  } finally {
    if(browser)await browser.close();
    server.kill();await once(server,'exit').catch(()=>{});
    rmSync(root,{recursive:true,force:true});
  }
});

// Controleer dat één controle met drie browsers als één uitklapbare rij verschijnt.
test('Regressiecontroles groeperen browsers en behouden fouten, filters en open details', { timeout: 60000 }, async () => {
  const root=mkdtempSync(join(tmpdir(),'report-groups-'));
  const result={stats:{startTime:new Date().toISOString(),duration:100},suites:[{title:'schade',specs:[{title:'Hoofdtitel controleren',file:'pagina.spec.ts',tests:['chromium','firefox','webkit'].map(browser=>({
    status:browser==='firefox'?'unexpected':'expected',projectName:browser,annotations:[{type:'Onderdeel',description:'Schade melden'},{type:'Testgroep',description:'Pagina-inhoud'},{type:'Regressiecase',description:'SCH-H1'}],
    results:[{status:browser==='firefox'?'failed':'passed',duration:100,errors:browser==='firefox'?[{message:'Hoofdtitel ontbreekt'}]:[]}],
  }))}]}]};
  mkdirSync(join(root,'groep-run'));writeFileSync(join(root,'groep-run/results.json'),JSON.stringify(result));
  const server=spawn(process.execPath,[resolve('scripts/report-page/server.mjs')],{env:{...process.env,REPORT_RUNS_DIR:root,PORT:'8078',REPORT_HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
  let browser;
  try{
    await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw Error('Server stopped')}),new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('Server timeout')),5000);t.unref()})]);
    browser=await chromium.launch();const page=await browser.newPage();
    await page.goto('http://127.0.0.1:8078');
    await page.locator('.run>summary').click();
    await expect(page.locator('.regression-group')).toHaveCount(1);
    await expect(page.locator('.case')).toHaveCount(1);
    await expect(page.locator('.regression-group>summary')).toContainText('1 gefaald');
    await expect(page.locator('.case>summary')).not.toBeVisible();
    await page.locator('.regression-group>summary').click();
    await expect(page.locator('.case>summary')).toContainText('firefox: Gefaald');
    await page.locator('.case>summary').click();
    await expect(page.locator('.test')).toHaveCount(3);
    await page.locator('.test>summary').first().click();
    await expect(page.getByRole('heading',{name:'Wat ging er mis?'})).toBeVisible();
    result.stats.duration=200;writeFileSync(join(root,'groep-run/results.json'),JSON.stringify(result));
    await page.click('#refresh');
    await expect(page.locator('.regression-group')).toHaveAttribute('open','');
    await expect(page.locator('.case')).toHaveAttribute('open','');
    await expect(page.getByRole('heading',{name:'Wat ging er mis?'})).toBeVisible();
    await page.getByRole('button',{name:'Met fouten',exact:true}).click();
    await expect(page.locator('.case')).toHaveCount(1);await expect(page.locator('.test')).toHaveCount(1);
    await expect(page.locator('.regression-group>summary')).toContainText('1 browserresultaten');
    await page.fill('#search','SCH-H1');await expect(page.locator('.case')).toHaveCount(1);
    await page.setViewportSize({width:375,height:812});
    await page.locator('.run>summary').click();await page.locator('.regression-group>summary').click();await page.locator('.case>summary').click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }finally{
    if(browser)await browser.close();server.kill();await once(server,'exit').catch(()=>{});rmSync(root,{recursive:true,force:true});
  }
});
