import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve('testdata/local.sqlite');
if (existsSync(target)) {
  console.log('Bestaande testdatabase behouden: testdata/local.sqlite');
} else {
  const temporary = `${target}.${process.pid}.tmp`;
  const db = new DatabaseSync(temporary);
  try {
    db.exec(readFileSync('testdata/seed.sql', 'utf8'));
    db.close();
    renameSync(temporary, target);
    console.log('Testdatabase aangemaakt vanuit testdata/seed.sql');
  } catch (error) {
    if (db.isOpen) db.close();
    rmSync(temporary, { force: true });
    throw error;
  }
}
