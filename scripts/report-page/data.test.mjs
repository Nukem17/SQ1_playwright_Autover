import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readRuns, renderPage, safeFile } from './data.mjs';
import { explainError, failedStep, explainAttempt } from './error-explanation.mjs';
import { classifyTest } from './classification.mjs';

test('Onderdeelindeling ondersteunt nieuwe namen en bestaande rapporten zonder onbekende tests te raden', () => {
  const legacy = {file:'test/lancyr-autoverzekering.spec.ts',title:'doorloop de funnel tot vlak vóór Sluit af'};
  assert.deepEqual(classifyTest(legacy,{},[],'Functioneel'), {area:'Autoverzekering',testGroup:'Klantreis',kind:'Functioneel'});
  assert.equal(classifyTest({file:'test/lancyr-visual.spec.ts'}, {}, [], 'Functioneel').testGroup, 'Visuele controle');
  assert.equal(classifyTest({file:'test/nieuw.spec.ts'}, {}, [], 'Functioneel').area, 'Niet ingedeeld');
  assert.equal(classifyTest({}, {}, [{type:'Funnel',description:'Oud onderdeel'}], 'Functioneel').area, 'Oud onderdeel');
  assert.equal(classifyTest({}, {}, [{type:'Funnel',description:'Oud onderdeel'},{type:'Onderdeel',description:'Contactpagina'}], 'Functioneel').area, 'Contactpagina');
  assert.deepEqual(classifyTest(legacy, {}, [
    {type:'Onderdeel',description:'Contactpagina'},
    {type:'Testgroep',description:'Formulierweergave'},
    {type:'Testsoort',description:'Visueel'},
  ], 'Functioneel'), {area:'Contactpagina',testGroup:'Formulierweergave',kind:'Visueel'});
});

test('Eén run kan tests uit meerdere onderdelen en testsoorten bevatten', () => {
  const root=mkdtempSync(join(tmpdir(),'report-areas-'));
  try {
    mkdirSync(join(root,'mixed'));
    const makeTest=(area,kind)=>({title:'Controle',tests:[{status:'expected',annotations:[
      {type:'Onderdeel',description:area},{type:'Testgroep',description:'Startpagina'},{type:'Testsoort',description:kind},
    ],results:[{status:'passed'}]}]});
    writeFileSync(join(root,'mixed/results.json'),JSON.stringify({stats:{},suites:[{specs:[makeTest('Autoverzekering','Functioneel'),makeTest('Contactpagina','Visueel')]}]}));
    const [run]=readRuns(root);
    assert.equal(run.kind,'Gemengd');
    assert.deepEqual(run.tests.map(t=>t.area),['Autoverzekering','Contactpagina']);
    assert.deepEqual(run.tests.map(t=>t.kind),['Functioneel','Visueel']);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('Ook onbekende fouten krijgen hun eigen stap en een feitelijke uitleg over het vervolg', () => {
  const first = {message:'Nieuwe onbekende fout'};
  const second = {message:'Andere onbekende fout'};
  const steps = [
    {title:'Controleer adres',steps:[{title:'Binnenste controle',error:first}]},
    {title:'Controleer premie',error:second},
  ];
  const explanations = explainAttempt({status:'failed',errors:[first,second],steps});
  assert.match(explanations[0].title, /Controleer adres/);
  assert.match(explanations[0].consequence, /daarna nog teststappen uitgevoerd/);
  assert.match(explanations[1].title, /Controleer premie/);
  assert.match(explanations[1].consequence, /geen volgende teststappen vastgelegd/);
  const decorated = explainAttempt({status:'failed',errors:[{message:'\u001b[31mNieuwe onbekende fout\u001b[0m\n\n> 42 | controle();\n    at test.ts:42:1'}],steps})[0];
  assert.equal(decorated.step, 'Controleer adres');
  assert.equal(explainAttempt({status:'failed',errors:[first],steps:[steps[0],steps[0]]})[0].step, '');
  const unmatched = explainAttempt({status:'failed',errors:[{message:'Fout buiten deze stappen'}],steps})[0];
  assert.equal(unmatched.step, '');
  assert.match(unmatched.consequence, /niet bij welke stap/);
  assert.match(explainAttempt({status:'timedOut'})[0].title, /tijd.*verstreken/);
  assert.match(explainAttempt({status:'interrupted'})[0].title, /onderbroken/);
  assert.deepEqual(explainAttempt({status:'passed'}), []);
});

test('Foutuitleg onderscheidt de paginaovergang van de dekkingscontrole zonder oorzaak te verzinnen', () => {
  const step = '3. Vul adres en persoonlijke situatie in';
  const navigation = 'Error: expect(page).toHaveURL(expected) failed\nExpected pattern: /bereken-autopremie/\nReceived string: "https://www.lancyr.nl/prive/maak-een-account/"\nTimeout: 5000ms';
  const result = explainError(navigation, step);
  assert.match(result.title, /Na “Volgende”/);
  assert.match(result.expected, /5 seconden/);
  assert.match(result.observed, /schadevrije jaren was nog niet bereikt/);
  assert.match(result.cause, /niet vastgesteld/);
  assert.doesNotMatch(explainError(navigation).observed, /schadevrije jaren/);
  const visibility = explainError("Error: expect(locator).toBeVisible() failed\nLocator: getByRole('heading', { name: 'Kies je dekking' })\nTimeout: 60000ms");
  assert.match(visibility.title, /Kies je dekking/);
  assert.match(visibility.expected, /60 seconden/);
  assert.doesNotMatch(visibility.observed, /schadevrije jaren/);
  assert.equal(failedStep([{title:step,error:{message:'fout'},steps:[{title:'expect',error:{}}]}]), step);
  assert.match(explainError('Een onbekende fout').title, /stap is niet vastgelegd/);
});
test('Oudere/geneste runs, retries, bijlagen en onvolledige rapporten', () => {
  const root=mkdtempSync(join(tmpdir(),'reports-'));
  try {
    const id='2026-10-02_demo',dir=join(root,id);
    mkdirSync(join(dir,'test-results'),{recursive:true});mkdirSync(join(root,'onvolledig'));
    writeFileSync(join(dir,'test-results','trace.zip'),'fixture');
    writeFileSync(join(dir,'results.json'),JSON.stringify({stats:{startTime:'2026-10-02T10:00:00Z',duration:100},suites:[{title:'bestand',suites:[{title:'groep',specs:[{title:'test',tests:[{status:'flaky',projectName:'chromium',annotations:[{type:'Testdata',description:'anna'}],results:[{status:'failed',errors:[{message:'\u001b[31mFout\u001b[0m'}],attachments:[{name:'trace',path:`/app/test-runs/${id}/test-results/trace.zip`}]},{status:'passed',retry:1,attachments:[{name:'data',contentType:'application/json',body:Buffer.from('{"id":"anna"}').toString('base64')}]}]}]}]}]}]}));
    const runs=readRuns(root),r=runs.find(r=>r.id===id);
    assert.equal(r.status,'flaky');assert.equal(r.demo,true);assert.equal(r.tests[0].scenario,'anna');assert.equal(r.tests[0].attempts.length,2);assert.equal(r.tests[0].attempts[0].errors[0],'Fout');assert.match(r.tests[0].attempts[0].attachments[0].url,/trace.zip$/);assert.equal(r.tests[0].attempts[1].attachments[0].body,'{"id":"anna"}');assert.equal(runs.find(r=>r.id==='onvolledig').status,'unknown');
    writeFileSync(join(dir,'results.json'),'{');assert.equal(readRuns(root).find(r=>r.id===id).status,'unknown');
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('Rapporttekst kan geen script invoegen; bestanden buiten runmap zijn afgeschermd',()=>{
  const root=mkdtempSync(join(tmpdir(),'reports-safe-'));
  try{writeFileSync(join(root,'ok.txt'),'ok');symlinkSync('/etc/passwd',join(root,'escape'));
    assert.equal(safeFile(root,'../etc/passwd'),null);assert.equal(safeFile(root,'escape'),null);assert.ok(safeFile(root,'ok.txt'));
    const html=renderPage('<script>const r=/*REPORT_DATA*/[];</script>',[{title:'</script><script>alert(1)</script>'}]);
    assert.equal((html.match(/<script>/g)||[]).length,1);assert.match(html,/\\u003c/);
    assert.deepEqual(readRuns(join(root,'missing')),[]);
  }finally{rmSync(root,{recursive:true,force:true});}
});
