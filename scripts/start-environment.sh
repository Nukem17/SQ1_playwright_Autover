#!/usr/bin/env bash
# Eén startcommando: Docker regelt de server, indices, begindata en optionele webinterface.
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
if [[ $# -gt 1 || $# == 1 && "$1" != --kibana ]]; then
  echo 'Gebruik: bash scripts/start-environment.sh [--kibana]' >&2
  exit 2
fi
source "$project_dir/scripts/elasticsearch-docker.sh"
docker build -t sq1-playwright .
prepare_testdata
if [[ "${1:-}" == --kibana ]]; then
  bash scripts/kibana.sh start
  docker run --rm "${container_data_options[@]}" -e KIBANA_URL=http://kibana:5601 \
    sq1-playwright node scripts/kibana-setup.mjs
  echo 'Open http://localhost:5601/app/discover en kies Testresultaten (periode: Last 7 days).'
  echo 'Login: elastic. Het wachtwoord staat achter ELASTIC_PASSWORD= in .local/elasticsearch.env.'
fi
