#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
mode="${1:-check}"
if [[ $# -gt 1 || "$mode" != check && "$mode" != reference && "$mode" != demo ]]; then
  echo 'Gebruik: bash scripts/run-lancyr-visual.sh [check|reference|demo]' >&2
  exit 2
fi

# Alleen reference mag de referentie schrijven. Gewone runs vervangen hem nooit.
snapshot_dir="$project_dir/test/lancyr-visual.spec.ts-snapshots"
mkdir -p "$snapshot_dir"
snapshot_mount="$snapshot_dir:/app/test/lancyr-visual.spec.ts-snapshots:ro"
update=none
if [[ "$mode" == reference ]]; then
  snapshot_mount="$snapshot_dir:/app/test/lancyr-visual.spec.ts-snapshots"
  update=all
  echo 'Referentie maken/vernieuwen: beoordeel de PNG zelf voordat je deze als juist accepteert.'
fi

docker build -t sq1-playwright .
mkdir -p test-runs
run_dir="$(mktemp -d "$project_dir/test-runs/$(date +%Y-%m-%d_%H-%M-%S)_visual-${mode}_XXXXXX")"
container_dir="/app/test-runs/$(basename "$run_dir")"
echo "Run: ${run_dir#$project_dir/}"
docker run --rm --init --ipc=host --user "$(id -u):$(id -g)" \
  -e "LANCYR_VISUAL_MODE=$mode" \
  -e PLAYWRIGHT_HTML_OPEN=never \
  -e "PLAYWRIGHT_HTML_OUTPUT_DIR=$container_dir/html" \
  -e "PLAYWRIGHT_JSON_OUTPUT_FILE=$container_dir/results.json" \
  -v "$run_dir:$container_dir" -v "$snapshot_mount" \
  sq1-playwright bash scripts/run-and-summarize.sh "$container_dir" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "headless-visual-$mode" \
  npx playwright test test/lancyr-visual.spec.ts --project=chromium \
  --workers=1 --retries=0 --update-snapshots="$update" \
  --output="$container_dir/test-results" --reporter=list,html,json
