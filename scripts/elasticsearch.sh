#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
action="${1:-start}"
if [[ $# -gt 1 || "$action" != start && "$action" != stop && "$action" != status && "$action" != check ]]; then
  echo 'Gebruik: bash scripts/elasticsearch.sh [start|stop|status|check]' >&2
  exit 2
fi

env_file="$project_dir/.local/elasticsearch.env"
if [[ ! -f "$env_file" ]]; then
  if [[ "$action" != start ]]; then
    echo 'Elasticsearch is nog niet ingericht. Gebruik: bash scripts/elasticsearch.sh start' >&2
    exit 1
  fi
  # Geheim buiten Git en de Docker-buildcontext; niet afdrukken in logs.
  (
    umask 077
    mkdir -p "$project_dir/.local"
    password="$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')"
    printf 'ELASTIC_PASSWORD=%s\n' "$password" > "$env_file"
  )
  echo 'Lokaal wachtwoord aangemaakt in .local/elasticsearch.env (buiten Git).'
fi

compose=(docker compose --env-file "$env_file" -f docker/elasticsearch.compose.yml)
case "$action" in
  start)
    "${compose[@]}" up -d --wait --wait-timeout 180
    echo 'Elasticsearch bereikbaar op http://localhost:9200 (gebruiker: elastic).'
    echo 'Gezondheid controleren: bash scripts/elasticsearch.sh check'
    ;;
  stop)
    "${compose[@]}" --profile ui down
    echo 'Container gestopt. Het datavolume en lokale wachtwoord blijven behouden.'
    ;;
  status) "${compose[@]}" --profile ui ps ;;
  check)
    "${compose[@]}" exec -T elasticsearch bash -c \
      'curl --fail --silent --show-error --user "elastic:$ELASTIC_PASSWORD" "http://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=10s"'
    echo
    ;;
esac
