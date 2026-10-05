import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readRuns, renderPage, safeFile } from './data.mjs';
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
