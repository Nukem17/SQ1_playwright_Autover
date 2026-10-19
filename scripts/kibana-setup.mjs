import { readFile } from 'node:fs/promises';
import { projectRoot } from './elasticsearch-local.mjs';

// Eenmalige gegevensweergaven; bij herhalen blijven bestaande voorkeuren behouden.
const views = [
  { id: 'sq1-testresultaten', title: 'sq1-testresultaten-v1', name: 'Testresultaten', timeFieldName: 'gestartOp' },
  { id: 'sq1-testruns', title: 'sq1-testruns-v1', name: 'Testruns', timeFieldName: 'gestartOp' },
  { id: 'sq1-artefacten', title: 'sq1-artefacten-v1', name: 'Artefactverwijzingen', timeFieldName: 'aangemaaktOp' },
  { id: 'sq1-funnelscenarios', title: 'sq1-autoverzekering-scenarios-v1', name: 'Autoverzekering – scenario’s' },
  { id: 'sq1-regressiescenarios', title: 'sq1-regressie-scenarios-v1', name: 'Regressie – scenario’s' },
  { id: 'sq1-regressiepaginas', title: 'sq1-regressie-paginas-v1', name: 'Regressie – pagina’s' },
];

async function main() {
  let password = process.env.ELASTIC_PASSWORD;
  if (!password) {
    const env = await readFile(new URL('.local/elasticsearch.env', projectRoot), 'utf8');
    password = /^ELASTIC_PASSWORD=([a-f0-9]+)$/m.exec(env)?.[1];
  }
  if (!password) throw new Error('Lokaal Elasticsearch-wachtwoord ontbreekt.');
  async function request(path, method = 'GET', body) {
    let response;
    try {
      response = await fetch(new URL(path, process.env.KIBANA_URL ?? 'http://127.0.0.1:5601'), {
        method,
        headers: { Authorization: `Basic ${Buffer.from(`elastic:${password}`).toString('base64')}`,
          'Content-Type': 'application/json', 'kbn-xsrf': 'sq1-local-setup' },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30_000),
      });
    } catch { throw new Error('Kibana is niet bereikbaar. Start eerst: bash scripts/kibana.sh start'); }
    if (!response.ok && response.status !== 404) throw new Error(`${path}: HTTP ${response.status}`);
    return { status: response.status, data: await response.json() };
  }
  for (const view of views) {
    const existing = await request(`api/data_views/data_view/${view.id}`);
    if (existing.status === 404) {
      const created = await request('api/data_views/data_view', 'POST', { data_view: view });
      if (created.status !== 200 || created.data.data_view.id !== view.id) throw new Error(`Aanmaken mislukt: ${view.name}`);
      console.log(`Gegevensweergave aangemaakt: ${view.name}`);
    } else {
      if (existing.data.data_view.title !== view.title || (existing.data.data_view.timeFieldName || undefined) !== view.timeFieldName) {
        throw new Error(`Bestaande weergave wijkt af: ${view.id}. Geen voorkeuren overschreven.`);
      }
      console.log(`Gegevensweergave beschikbaar: ${view.name}`);
    }
  }
  const current = await request('api/data_views/default');
  if (!current.data.data_view_id) {
    await request('api/data_views/default', 'POST', { data_view_id: views[0].id, force: false });
  }
  console.log('Open Discover, kies een gegevensweergave en zet voor resultaten de periode op de laatste 7 dagen.');
}

main().catch(error => { console.error(`Kibana-inrichting mislukt: ${error.message}`); process.exitCode = 1; });
