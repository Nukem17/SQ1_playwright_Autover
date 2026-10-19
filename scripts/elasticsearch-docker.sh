#!/usr/bin/env bash
# Wordt gesourced door de testrunners; project_dir is daar al ingesteld.
data_network="${ELASTICSEARCH_DOCKER_NETWORK:-sq1-local-elasticsearch_default}"
if [[ "$data_network" == sq1-local-elasticsearch_default && -z "${ELASTICSEARCH_URL:-}" ]]; then
  echo 'Elasticsearch automatisch starten/controleren...'
  bash "$project_dir/scripts/elasticsearch.sh" start
fi
if [[ ! -f "$project_dir/.local/elasticsearch.env" ]]; then
  echo 'Elasticsearch-login ontbreekt; controleer .local/elasticsearch.env.' >&2
  exit 1
fi
if ! docker network inspect "$data_network" >/dev/null 2>&1; then
  echo "Elasticsearch-netwerk ontbreekt: $data_network" >&2
  exit 1
fi
run_commit="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || true)}"
run_branch="${GITHUB_REF_NAME:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)}"
container_data_options=(--network "$data_network" --env-file "$project_dir/.local/elasticsearch.env"
  -e "ELASTICSEARCH_URL=${ELASTICSEARCH_URL:-http://elasticsearch:9200}"
  -e "LANCYR_GIT_COMMIT=$run_commit" -e "LANCYR_GIT_BRANCH=$run_branch"
  -e "LANCYR_RUN_TRIGGER=${GITHUB_EVENT_NAME:-handmatig}"
  -e "LANCYR_TEST_ENVIRONMENT=${LANCYR_TEST_ENVIRONMENT:-lokaal}")

# De runner heeft de actuele image al gebouwd. Voorbereiding vereist geen lokale Node.js.
prepare_testdata() {
  docker run --rm "${container_data_options[@]}" sq1-playwright node scripts/elasticsearch-setup.mjs
  docker run --rm "${container_data_options[@]}" sq1-playwright node scripts/elasticsearch-seed.mjs --missing-only
}
