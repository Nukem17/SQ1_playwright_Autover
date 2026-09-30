const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { haalTestscenarioOp, bepaalIngangsdatum } = require('./scenarios.ts');
test('SQL-wijzigingen ophalen, scenarioselectie en validatie', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'lancyr-data-'));
  const path = join(dir, 'test.sqlite');
  const db = new DatabaseSync(path);
  try {
    db.exec(readFileSync('testdata/seed.sql', 'utf8'));
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
