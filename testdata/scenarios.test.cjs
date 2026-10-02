const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { mkdtempSync, readFileSync, rmSync, mkdirSync, cpSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { haalTestscenarioOp, bepaalIngangsdatum } = require('./scenarios.ts');
test('SQL-wijzigingen ophalen, scenarioselectie en validatie', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'lancyr-data-'));
  const path = join(dir, 'test.sqlite');
  const db = new DatabaseSync(path);
  try {
    db.exec(readFileSync('testdata/seed.sql', 'utf8'));
    db.exec(readFileSync('testdata/migrations/001-variatie.sql', 'utf8'));
    const original = await haalTestscenarioOp('standaard', path);
    db.prepare('UPDATE autoverzekering_scenarios SET schadevrij = ? WHERE id = ?').run('7', 'standaard');
    const updated = await haalTestscenarioOp('standaard', path);
    assert.equal(updated.schadevrij, '7');
    assert.notEqual(original.schadevrij, updated.schadevrij);
    await assert.rejects(haalTestscenarioOp('onbekend', path), /bestaat niet/);
    await assert.rejects(haalTestscenarioOp("' OR 1=1 --", path), /bestaat niet/);
    await assert.rejects(haalTestscenarioOp('standaard', join(dir, 'ontbreekt.sqlite')), /ontbreekt/);
    db.exec("UPDATE autoverzekering_scenarios SET postcode = ''");
    await assert.rejects(haalTestscenarioOp('standaard', path), /postcode moet ingevuld/);
    db.prepare('UPDATE autoverzekering_scenarios SET postcode = ?, geboortedatum = ?').run(original.postcode, '2000-02-30');
    await assert.rejects(haalTestscenarioOp('standaard', path), /geboortedatum/);
    assert.equal(bepaalIngangsdatum(original, new Date(2026, 8, 19)), '2026-09-20');
    assert.equal(bepaalIngangsdatum(original, new Date(2026, 8, 20)), '2027-09-20');
    console.log(`Bewijs: SQL UPDATE schadevrij ${original.schadevrij} naar ${updated.schadevrij}; opnieuw opgehaald zonder gewijzigde testcode.`);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Variaties vereisen passende partnergegevens en verwachte uitkomst', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'lancyr-variatie-'));
  const path = join(dir, 'test.sqlite');
  const db = new DatabaseSync(path);
  try {
    db.exec(readFileSync('testdata/seed.sql', 'utf8'));
    db.exec(readFileSync('testdata/migrations/001-variatie.sql', 'utf8'));
    const rows = db.prepare('SELECT id FROM autoverzekering_scenarios').all();
    const scenarios = await Promise.all(rows.map(row => haalTestscenarioOp(row.id, path)));
    assert.equal(new Set(scenarios.map(s => s.gezin)).size, 4);
    assert.equal(new Set(scenarios.map(s => s.bestuurder)).size, 3);
    assert.equal(new Set(scenarios.map(s => s.dekking)).size, 3);
    db.exec("UPDATE autoverzekering_scenarios SET geboortedatumPartner = NULL WHERE id='testgebruiker-bram'");
    await assert.rejects(haalTestscenarioOp('testgebruiker-bram', path), /geboortedatumPartner/);
    db.exec("UPDATE autoverzekering_scenarios SET verwachteUitkomst='winkelwagen' WHERE id='testgebruiker-daan'");
    await assert.rejects(haalTestscenarioOp('testgebruiker-daan', path), /Kind-inwonend/);
    db.exec("UPDATE autoverzekering_scenarios SET geselecteerdeExtras='[\"Onbekende dekking\"]' WHERE id='testgebruiker-anna'");
    await assert.rejects(haalTestscenarioOp('testgebruiker-anna', path), /geselecteerdeExtras/);
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});


test('Initialisatie migreert bestaande data eenmaal en behoudt latere wijzigingen', () => {
  const { execFileSync } = require('node:child_process');
  const { resolve } = require('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'lancyr-migratie-'));
  const path = join(dir, 'testdata/local.sqlite');
  const init = resolve('scripts/init-testdata.mjs');
  try {
    mkdirSync(join(dir, 'testdata'));
    cpSync('testdata/seed.sql', join(dir, 'testdata/seed.sql'));
    cpSync('testdata/migrations', join(dir, 'testdata/migrations'), { recursive: true });
    let db = new DatabaseSync(path);
    db.exec(readFileSync('testdata/seed.sql', 'utf8'));
    db.exec("UPDATE autoverzekering_scenarios SET straat='Eigen straat' WHERE id='testgebruiker-bram'");
    db.close();
    execFileSync(process.execPath, [init], { cwd: dir });
    db = new DatabaseSync(path);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
    const bram = db.prepare("SELECT * FROM autoverzekering_scenarios WHERE id='testgebruiker-bram'").get();
    assert.equal(bram.straat, 'Eigen straat');
    assert.equal(bram.bestuurder, 'Partner');
    db.exec("UPDATE autoverzekering_scenarios SET kilometrage='15000' WHERE id='testgebruiker-bram'");
    db.close();
    execFileSync(process.execPath, [init], { cwd: dir });
    db = new DatabaseSync(path);
    assert.equal(db.prepare("SELECT kilometrage FROM autoverzekering_scenarios WHERE id='testgebruiker-bram'").get().kilometrage, '15000');
    db.close();
    rmSync(path);
    execFileSync(process.execPath, [init], { cwd: dir });
    db = new DatabaseSync(path);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
    assert.equal(db.prepare('SELECT count(*) AS n FROM autoverzekering_scenarios').get().n, 6);
    db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
