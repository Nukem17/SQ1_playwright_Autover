import { readFile } from 'node:fs/promises';

export const projectRoot = new URL('../', import.meta.url);

export function normalizeMapping(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(normalizeMapping);
  return Object.fromEntries(Object.entries(value)
    .filter(([key, item]) => !(key === 'type' && item === 'object' && value.properties))
    .map(([key, item]) => [key, normalizeMapping(item)]));
}

export async function localElasticsearch() {
  let password = process.env.ELASTIC_PASSWORD;
  if (!password) {
    const env = await readFile(new URL('.local/elasticsearch.env', projectRoot), 'utf8');
    password = /^ELASTIC_PASSWORD=([a-f0-9]+)$/m.exec(env)?.[1];
  }
  if (!password) throw new Error('Lokaal wachtwoord ontbreekt. Start eerst scripts/elasticsearch.sh start.');
  const base = new URL(process.env.ELASTICSEARCH_URL ?? 'http://127.0.0.1:9200');
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
    throw new Error('ELASTICSEARCH_URL moet een HTTP(S)-serveradres zonder inloggegevens of pad zijn.');
  }
  const authorization = `Basic ${Buffer.from(`elastic:${password}`).toString('base64')}`;
  return async function request(path, method = 'GET', body) {
    let response;
    try { response = await fetch(new URL(path, base), {
      method,
      headers: { Authorization: authorization, 'Content-Type': typeof body === 'string' ? 'application/x-ndjson' : 'application/json' },
      body: typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    }); } catch {
      throw new Error('Elasticsearch is niet bereikbaar of antwoordt niet op tijd. Controleer de container en verbinding.');
    }
    const data = await response.json();
    if (!response.ok && ![404, 409].includes(response.status)) {
      throw new Error(`${method} ${path}: HTTP ${response.status} (${data.error?.type ?? 'onbekende fout'}).`);
    }
    return { status: response.status, data };
  };
}
