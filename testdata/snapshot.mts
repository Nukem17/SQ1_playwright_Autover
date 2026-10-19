import { readFileSync } from 'node:fs';

export interface TestdataSnapshot {
  schemaVersie: number;
  omgeving: string;
  opgehaaldOp: string;
  funnel: Record<string, unknown>[];
  paginas: Record<string, unknown>[];
  scenarios: Record<string, unknown>[];
}

export function leesElasticsearchSnapshot(): TestdataSnapshot {
  const path = process.env.LANCYR_TESTDATA_SNAPSHOT;
  if (!path) throw new Error('Elasticsearch-testdata is nog niet geladen. Start via het Docker-keuzemenu of node scripts/with-elasticsearch-data.mjs <commando> [argumenten].');
  const data = JSON.parse(readFileSync(path, 'utf8')) as TestdataSnapshot;
  if (data.schemaVersie !== 1 || data.omgeving !== (process.env.LANCYR_TEST_ENVIRONMENT ?? 'lokaal')
    || !Array.isArray(data.funnel) || !Array.isArray(data.paginas) || !Array.isArray(data.scenarios)) {
    throw new Error('Ongeldige Elasticsearch-testdatasnapshot. Start een nieuwe run.');
  }
  return data;
}
