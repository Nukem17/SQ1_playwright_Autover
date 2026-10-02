import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface AutoverzekeringScenario {
  id: string;
  kenteken: string;
  verwachtVoertuig: string;
  postcode: string;
  huisnummer: string;
  straat: string;
  plaats: string;
  geboortedatum: string;
  ondernemer: string;
  gezin: string;
  privacy: string;
  bestuurder: string;
  schadevrij: string;
  kilometrage: string;
  ingangsMaand: number;
  ingangsDag: number;
  dekking: string;
  dekkingTitel: string;
  dekkingWinkelwagen: string;
  extraDekkingen: string[];
  aanbodProductId: string;
  geboortedatumPartner: string | null;
  verwachteUitkomst: 'winkelwagen' | 'bestuurder-geblokkeerd';
  geselecteerdeExtras: string[];
}

// Tests kennen alleen deze functie; een toekomstige API kan hetzelfde object leveren.
export async function haalTestscenarioOp(
  id = process.env.LANCYR_TEST_SCENARIO ?? 'standaard',
  databasePath = process.env.LANCYR_TEST_DATABASE ?? 'testdata/local.sqlite',
): Promise<AutoverzekeringScenario> {
  const path = resolve(databasePath);
  if (!existsSync(path)) throw new Error(`Testdatabase ontbreekt: ${path}. Start via scripts/run-lancyr-browsers.sh.`);
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const row = db.prepare('SELECT * FROM autoverzekering_scenarios WHERE id = ?').get(id);
    if (!row) throw new Error(`Testscenario '${id}' bestaat niet in de database.`);
    const strings = ['id', 'kenteken', 'verwachtVoertuig', 'postcode', 'huisnummer', 'straat', 'plaats',
      'geboortedatum', 'ondernemer', 'gezin', 'privacy', 'bestuurder', 'schadevrij', 'kilometrage',
      'dekking', 'dekkingTitel', 'dekkingWinkelwagen', 'extraDekkingen'] as const;
    for (const field of strings) {
      if (typeof row[field] !== 'string' || !row[field].trim()) throw new Error(`Testscenario '${id}': ${field} moet ingevuld zijn.`);
    }
    if (!/^\d{4}[A-Z]{2}$/.test(String(row.postcode))) throw new Error('Postcode moet vier cijfers en twee hoofdletters bevatten.');
    const birth = String(row.geboortedatum);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || !Number.isFinite(Date.parse(birth)) || new Date(birth).toISOString().slice(0, 10) !== birth) throw new Error('Ongeldige geboortedatum; gebruik YYYY-MM-DD.');
    for (const field of ['schadevrij', 'kilometrage']) {
      if (!/^\d+$/.test(String(row[field]))) throw new Error(`${field} moet een niet-negatief geheel getal zijn.`);
    }
    for (const field of ['ondernemer', 'privacy']) {
      if (!['Ja', 'Nee'].includes(String(row[field]))) throw new Error(`${field} moet Ja of Nee zijn.`);
    }
    for (const field of ['gezin', 'dekking']) {
      if (!/^[a-z][a-z0-9_]*$/.test(String(row[field]))) throw new Error(`Ongeldige keuzecode: ${field}.`);
    }
    const month = Number(row.ingangsMaand), day = Number(row.ingangsDag);
    const date = new Date(Date.UTC(2025, month - 1, day));
    if (!Number.isInteger(month) || !Number.isInteger(day) || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error('Ongeldige jaarlijkse ingangsdatum (29 februari wordt niet ondersteund).');
    let extras: unknown;
    try { extras = JSON.parse(String(row.extraDekkingen)); } catch { throw new Error('extraDekkingen moet een JSON-lijst bevatten.'); }
    if (!Array.isArray(extras) || !extras.every(value => typeof value === 'string' && value.trim())) throw new Error('extraDekkingen moet een lijst met teksten zijn.');
    if (!/^\d+$/.test(String(row.aanbodProductId))) throw new Error('aanbodProductId moet een productnummer zijn.');
    if (!['Ikzelf', 'Partner', 'Kind-inwonend'].includes(String(row.bestuurder))) throw new Error('Onbekende bestuurder.');
    if (!['gezin_met_kinderen', 'alleenstaande_met_kinderen', 'gezin_zonder_kinderen', 'alleenstaande_zonder_kinderen'].includes(String(row.gezin))) throw new Error('Onbekende gezinssamenstelling.');
    if (!['7500', '10000', '12000', '15000', '20000', '25000', '30000', '35000'].includes(String(row.kilometrage))) throw new Error('Onbekende kilometragekeuze.');
    if (!['wa', 'bc', 'vc'].includes(String(row.dekking))) throw new Error('Onbekende dekking.');
    if (!['winkelwagen', 'bestuurder-geblokkeerd'].includes(String(row.verwachteUitkomst))) throw new Error('Onbekende verwachteUitkomst; initialiseer de database via de runner.');
    if ((row.bestuurder === 'Kind-inwonend') !== (row.verwachteUitkomst === 'bestuurder-geblokkeerd')) throw new Error('Kind-inwonend moet bestuurder-geblokkeerd verwachten.');
    if (row.bestuurder === 'Partner') {
      const partner = String(row.geboortedatumPartner);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(partner) || !Number.isFinite(Date.parse(partner)) || new Date(partner).toISOString().slice(0, 10) !== partner) throw new Error('Partner vereist een geldige geboortedatumPartner.');
    }
    let selected: unknown;
    try { selected = JSON.parse(String(row.geselecteerdeExtras)); } catch { throw new Error('geselecteerdeExtras moet een JSON-lijst bevatten.'); }
    if (!Array.isArray(selected) || new Set(selected).size !== selected.length || !selected.every(value => extras.includes(value))) throw new Error('geselecteerdeExtras moet unieke namen uit extraDekkingen bevatten.');
    return { ...row, extraDekkingen: extras, geselecteerdeExtras: selected } as unknown as AutoverzekeringScenario;
  } finally {
    db.close();
  }
}

export function bepaalIngangsdatum(gegevens: AutoverzekeringScenario, vandaag = new Date()): string {
  let year = vandaag.getFullYear();
  if (vandaag >= new Date(year, gegevens.ingangsMaand - 1, gegevens.ingangsDag)) year++;
  return `${year}-${String(gegevens.ingangsMaand).padStart(2, '0')}-${String(gegevens.ingangsDag).padStart(2, '0')}`;
}
