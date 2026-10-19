import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { localElasticsearch, normalizeMapping, projectRoot } from './elasticsearch-local.mjs';

const directory = new URL('elasticsearch/indices/', projectRoot);

// Alleen nieuwe velden toevoegen; bestaande types en instellingen mogen niet veranderen.
function onlyAddedFields(existing, desired) {
  const { properties: oldProperties = {}, ...oldSettings } = existing;
  const { properties: newProperties = {}, ...newSettings } = desired;
  return isDeepStrictEqual(oldSettings, newSettings)
    && Object.entries(oldProperties).every(([name, field]) => newProperties[name]
      && onlyAddedFields(field, newProperties[name]));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length && args[0] !== '--add-fields')) {
    throw new Error('Gebruik: node scripts/elasticsearch-setup.mjs [--add-fields]');
  }
  const request = await localElasticsearch();

  const definitions = [];
  for (const file of (await readdir(directory)).filter(file => file.endsWith('.json')).sort()) {
    const name = file.slice(0, -5);
    if (!/^sq1-[a-z-]+-v1$/.test(name)) throw new Error(`Onverwachte indexnaam: ${name}`);
    const definition = JSON.parse(await readFile(new URL(file, directory), 'utf8'));
    const existing = await request(`${name}/_mapping`);
    const oldMapping = normalizeMapping(existing.data[name]?.mappings);
    const desiredMapping = normalizeMapping(definition.mappings);
    const changed = existing.status === 200 && !isDeepStrictEqual(oldMapping, desiredMapping);
    if (changed && !(args[0] === '--add-fields' && onlyAddedFields(oldMapping, desiredMapping))) {
      throw new Error(`Mapping van ${name} wijkt af. Geen gegevens gewijzigd; beoordeel een nieuwe schemaversie.`);
    }
    definitions.push({ name, definition, exists: existing.status === 200, changed });
  }
  // Controleer eerst alle bestaande mappings voordat ontbrekende indices worden gemaakt.
  for (const { name, definition, exists, changed } of definitions) {
    if (changed) {
      const updated = await request(`${name}/_mapping`, 'PUT', definition.mappings);
      if (updated.status !== 200 || !updated.data.acknowledged) throw new Error(`Mappingwijziging niet bevestigd: ${name}`);
      console.log(`Ontbrekende velden toegevoegd: ${name}`);
    }
    if (!exists) {
      const created = await request(name, 'PUT', definition);
      if (created.status !== 200 || !created.data.acknowledged) throw new Error(`Aanmaken niet bevestigd: ${name}`);
    }
    const count = await request(`${name}/_count`);
    if (count.status !== 200) throw new Error(`Tellen mislukt: ${name}`);
    console.log(`${exists ? 'Bestaat, mapping akkoord' : 'Aangemaakt'}: ${name} (${count.data.count} documenten)`);
  }
}

main().catch(error => {
  console.error(`Elasticsearch-inrichting mislukt: ${error.message}`);
  console.error(`Definities: ${fileURLToPath(directory)}`);
  process.exitCode = 1;
});
