const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { mkdtempSync, readFileSync, readdirSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { haalRegressieSetOp } = require('./regressie.ts');
function setup() {
  const dir=mkdtempSync(join(tmpdir(),'schade-data-')), path=join(dir,'data.sqlite');
  const db=new DatabaseSync(path);
  db.exec(readFileSync('testdata/seed.sql','utf8'));
  for(const file of readdirSync('testdata/migrations').filter(f=>f.endsWith('.sql')).sort()) db.exec(readFileSync(join('testdata/migrations',file),'utf8'));
  return {db,path,close(){db.close();rmSync(dir,{recursive:true,force:true});}};
}
test('Regressiegegevens dekken de CSV-selectie en reageren op SQL-wijzigingen',()=>{
  const f=setup();
  try{
    const data=haalRegressieSetOp('Schade melden',f.path);
    assert.equal(data.paginas.length,14);
    assert.equal(data.scenarios.length,18);
    assert.equal(data.paginas.reduce((n,p)=>n+p.bron.regels.length,0),27);
    assert.equal(new Set(data.paginas.map(p=>p.pad)).size,14);
    f.db.prepare('UPDATE regressie_paginas SET verwachteTitel = ? WHERE id = ?').run('Goedgekeurde nieuwe titel','schade-start');
    assert.equal(haalRegressieSetOp('Schade melden',f.path).paginas.find(p=>p.id==='schade-start').verwachteTitel,'Goedgekeurde nieuwe titel');
    assert.equal(f.db.prepare("SELECT schadevrij FROM autoverzekering_scenarios WHERE id='testgebruiker-anna'").get().schadevrij,'0');
    assert.throws(()=>haalRegressieSetOp("' OR 1=1 --",f.path),/Geen volledige regressieset/);
    assert.throws(()=>haalRegressieSetOp('Schade melden',join(tmpdir(),'niet-bestaande-regressie-db.sqlite')),/ontbreekt/);
  }finally{f.close();}
});
test('Ongeldige pagina’s, ontbrekende doelen en onbekende acties stoppen vóór de browser start',()=>{
  const f=setup();
  try{
    f.db.exec("UPDATE regressie_paginas SET pad='//ander.example/' WHERE id='schade-start'");
    assert.throws(()=>haalRegressieSetOp('Schade melden',f.path),/lokaal Lancyr-pad/);
    f.db.exec("UPDATE regressie_paginas SET pad='/schade-melden/' WHERE id='schade-start'");
    assert.throws(()=>f.db.exec("UPDATE regressie_scenarios SET doelPaginaId='bestaat-niet' WHERE id='SCH-NAV-eenzijdig'"),/FOREIGN KEY/);
    f.db.exec("UPDATE regressie_paginas SET onderdeel='Ander onderdeel' WHERE id='schade-eenzijdig'");
    assert.throws(()=>haalRegressieSetOp('Schade melden',f.path),/(bron|doel)pagina ontbreekt/);
    f.db.exec("UPDATE regressie_paginas SET onderdeel='Schade melden' WHERE id='schade-eenzijdig'");
    f.db.exec("UPDATE regressie_scenarios SET instellingen='geen json' WHERE id='SCH-FAQ-ANTWOORD'");
    assert.throws(()=>haalRegressieSetOp('Schade melden',f.path),/JSON-object/);
    f.db.exec("UPDATE regressie_scenarios SET type='willekeurige-code' WHERE id='SCH-FAQ-ANTWOORD'");
    assert.throws(()=>haalRegressieSetOp('Schade melden',f.path),/onbekend scenariotype/);
  }finally{f.close();}
});
