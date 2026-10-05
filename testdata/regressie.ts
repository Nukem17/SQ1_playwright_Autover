import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface RegressiePagina {
  id: string; onderdeel: string; naam: string; pad: string;
  verwachteTitel: string; verwachteHoofdtitel: string; verwachteStatus: number;
  bron: { bestand?: string; regels?: number[]; issues?: string[]; melding?: string };
}
export interface RegressieScenario {
  id: string; onderdeel: string; naam: string;
  type: 'navigatie' | 'faq-uitklappen' | 'faq-antwoord' | 'paginering' | 'url-variant' | 'extern-link';
  bronPaginaId: string; doelPaginaId: string | null;
  instellingen: { doelPad?: string; doelUrl?: string; linkTekst?: string; verwachteHoofdtitel?: string; antwoordTekst?: string; verwachtePagina?: number };
}
export const LANCYR_ORIGIN = 'https://www.lancyr.nl';

function text(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} moet ingevuld zijn.`);
}
function localPath(value: unknown, field: string) {
  text(value, field);
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || new URL(value, LANCYR_ORIGIN).origin !== LANCYR_ORIGIN) throw new Error(`${field} moet een lokaal Lancyr-pad zijn.`);
}
function object(value: unknown, field: string): any {
  try {
    const parsed = JSON.parse(String(value));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {}
  throw new Error(`${field} moet een JSON-object zijn.`);
}

// Synchronous loading allows a separate Playwright test per database record.
// This reader never creates data or falls back to hardcoded page expectations.
export function haalRegressieSetOp(onderdeel = 'Schade melden', databasePath = process.env.LANCYR_TEST_DATABASE ?? 'testdata/local.sqlite') {
  const path = resolve(databasePath);
  if (!existsSync(path)) throw new Error(`Testdatabase ontbreekt: ${path}. Start via scripts/run-schade-regressie.sh.`);
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const pages = db.prepare('SELECT * FROM regressie_paginas WHERE onderdeel = ? ORDER BY id').all(onderdeel);
    const scenarios = db.prepare('SELECT * FROM regressie_scenarios WHERE onderdeel = ? ORDER BY id').all(onderdeel);
    if (!pages.length || !scenarios.length) throw new Error(`Geen volledige regressieset voor '${onderdeel}'. Initialiseer de testdatabase.`);
    const paginas: RegressiePagina[] = pages.map(row => {
      for (const field of ['id','onderdeel','naam','verwachteTitel','verwachteHoofdtitel']) text(row[field],`${row.id}: ${field}`);
      localPath(row.pad, `${row.id}: pad`);
      if (!Number.isInteger(row.verwachteStatus) || Number(row.verwachteStatus) < 100 || Number(row.verwachteStatus) > 599) throw new Error(`${row.id}: ongeldige verwachteStatus.`);
      const bron = object(row.bron, `${row.id}: bron`);
      return { ...row, bron } as unknown as RegressiePagina;
    });
    const ids = new Set(paginas.map(p => p.id));
    const regels: RegressieScenario[] = scenarios.map(row => {
      for (const field of ['id','onderdeel','naam','type','bronPaginaId']) text(row[field],`${row.id}: ${field}`);
      if (!['navigatie','faq-uitklappen','faq-antwoord','paginering','url-variant','extern-link'].includes(String(row.type))) throw new Error(`${row.id}: onbekend scenariotype.`);
      if (!ids.has(String(row.bronPaginaId))) throw new Error(`${row.id}: bronpagina ontbreekt binnen het onderdeel.`);
      const instellingen = object(row.instellingen,`${row.id}: instellingen`);
      if (['navigatie','paginering','url-variant'].includes(String(row.type)) && !ids.has(String(row.doelPaginaId))) throw new Error(`${row.id}: doelpagina ontbreekt binnen het onderdeel.`);
      if (row.type === 'url-variant' && ![1,2].includes(instellingen.verwachtePagina)) throw new Error(`${row.id}: verwachtePagina moet 1 of 2 zijn.`);
      if (row.type === 'faq-antwoord' || row.type === 'faq-uitklappen') {
        localPath(instellingen.doelPad, `${row.id}: doelPad`);
        text(instellingen.verwachteHoofdtitel, `${row.id}: verwachteHoofdtitel`);
        text(instellingen.antwoordTekst, `${row.id}: antwoordTekst`);
      }
      if (row.type === 'extern-link') {
        text(instellingen.linkTekst, `${row.id}: linkTekst`);
        text(instellingen.doelUrl, `${row.id}: doelUrl`);
        if (new URL(instellingen.doelUrl).protocol !== 'https:') throw new Error(`${row.id}: doelUrl moet HTTPS gebruiken.`);
      }
      return { ...row, instellingen } as unknown as RegressieScenario;
    });
    return { paginas, scenarios: regels };
  } finally { db.close(); }
}
