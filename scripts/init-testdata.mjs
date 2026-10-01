import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const target = resolve('testdata/local.sqlite');
const fresh = !existsSync(target);
const temporary = `${target}.${randomUUID()}.tmp`;
const db = new DatabaseSync(fresh ? temporary : target);
try {
  db.exec('BEGIN IMMEDIATE');
  if (fresh) db.exec(readFileSync('testdata/seed.sql', 'utf8'));
  let version = db.prepare('PRAGMA user_version').get().user_version;
  for (const file of readdirSync('testdata/migrations').filter(file => /^\d+-.*\.sql$/.test(file)).sort()) {
    const next = Number(file.split('-')[0]);
    if (next > version) {
      db.exec(readFileSync(`testdata/migrations/${file}`, 'utf8'));
      version = next;
      console.log(`Testdatabase bijgewerkt: ${file}`);
    }
  }
  db.exec('COMMIT');
  db.close();
  if (fresh) renameSync(temporary, target);
  console.log(fresh ? 'Testdatabase aangemaakt.' : 'Bestaande testdatabase behouden; migraties eenmaal toegepast.');
} catch (error) {
  if (db.isOpen) { db.exec('ROLLBACK'); db.close(); }
  if (fresh) rmSync(temporary, { force: true });
  throw error;
}
