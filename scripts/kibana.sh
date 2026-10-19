#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
action="${1:-start}"
if [[ $# -gt 1 || "$action" != start && "$action" != stop && "$action" != status && "$action" != check ]]; then
  echo 'Gebruik: bash scripts/kibana.sh [start|stop|status|check]' >&2
  exit 2
fi
elastic_env="$project_dir/.local/elasticsearch.env"
kibana_env="$project_dir/.local/kibana.env"
if [[ "$action" == start ]]; then
  bash scripts/elasticsearch.sh start
  if [[ ! -f "$kibana_env" ]]; then
    (
      umask 077
      for key in KIBANA_SYSTEM_PASSWORD KIBANA_SECURITY_KEY KIBANA_SAVED_OBJECTS_KEY KIBANA_REPORTING_KEY; do
        value="$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')"
        printf '%s=%s\n' "$key" "$value"
      done > "$kibana_env"
    )
    echo 'Kibana-servicewachtwoord en vaste encryptiesleutels opgeslagen in .local/kibana.env (buiten Git).'
  fi
fi
if [[ ! -f "$elastic_env" || ! -f "$kibana_env" ]]; then
  echo 'Kibana is nog niet ingericht. Gebruik: bash scripts/kibana.sh start' >&2
  exit 1
fi
compose=(docker compose --env-file "$elastic_env" --env-file "$kibana_env" -f docker/elasticsearch.compose.yml --profile ui)
case "$action" in
  start)
    password="$(sed -n 's/^KIBANA_SYSTEM_PASSWORD=//p' "$kibana_env")"
    if [[ ! "$password" =~ ^[a-f0-9]{64}$ ]]; then
      echo 'Ongeldig Kibana-servicewachtwoord in .local/kibana.env.' >&2
      exit 1
    fi
    # Alleen stdin draagt het nieuwe wachtwoord; druk geen credentials af.
    printf '{"password":"%s"}' "$password" | "${compose[@]}" exec -T elasticsearch bash -c \
      'curl --fail --silent --show-error --user "elastic:$ELASTIC_PASSWORD" -H "Content-Type: application/json" --data-binary @- http://localhost:9200/_security/user/kibana_system/_password > /dev/null'
    "${compose[@]}" up -d --wait --wait-timeout 360 kibana
    echo 'Kibana: http://localhost:5601 (login: elastic; wachtwoord uit .local/elasticsearch.env).'
    ;;
  stop) "${compose[@]}" stop kibana ;;
  status) "${compose[@]}" ps kibana ;;
  check)
    "${compose[@]}" exec -T kibana curl --fail --silent --show-error http://localhost:5601/api/status
    echo
    ;;
esac
