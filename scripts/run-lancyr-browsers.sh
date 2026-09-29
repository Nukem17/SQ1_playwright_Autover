#!/usr/bin/env bash
# Stop bij echte scriptfouten en bij variabelen die niet bestaan.
set -euo pipefail

# Draai altijd vanuit de projectmap, ook als het script elders wordt gestart.
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

# Beide modi gebruiken dezelfde tests, browsers en rapportage.
mode="${1:-headless}"
if [[ $# -gt 1 || "$mode" != headless && "$mode" != headed && "$mode" != visible ]]; then
  echo 'Gebruik: bash scripts/run-lancyr-browsers.sh [headless|headed|visible]' >&2
  exit 2
fi
image=sq1-playwright
container_options=()
projects=(--project=chromium --project=firefox --workers=2)
browser_command=(npx playwright test)
if [[ "$mode" == visible ]]; then
  if [[ ! -t 0 || ! -t 1 ]]; then
    echo 'Visible vereist een interactieve terminal. Gebruik headed voor CI.' >&2
    exit 2
  fi
  image=sq1-playwright-viewer
  container_options=(-it -p 127.0.0.1:6080:6080)
  projects=(--project=chromium --workers=1)
  browser_command=(npx playwright test --headed)
fi
if [[ "$mode" == headed ]]; then
  browser_command=(xvfb-run -a npx playwright test --headed)
fi

# Je kunt het kenteken overschrijven; anders gebruiken we de vaste testwaarde.
test_plate="${LANCYR_TEST_KENTEKEN:-88-LSV-7}"

# Bij een Docker-probleem ontstaat er nog geen lege runmap.
docker build -t sq1-playwright .
if [[ "$mode" == visible ]]; then
  docker build -f docker/Dockerfile.viewer -t "$image" .
fi
run_started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Iedere run krijgt een eigen map. De willekeurige suffix voorkomt overschrijven.
mkdir -p test-runs
run_dir="$(mktemp -d "$project_dir/test-runs/$(date +%Y-%m-%d_%H-%M-%S)_${mode}_XXXXXX")"
mkdir -p "$run_dir/html" "$run_dir/test-results"

echo "Run: ${run_dir#$project_dir/}"
echo "Browsermodus: $mode"
container_run_dir="/app/test-runs/$(basename "$run_dir")"

# De runmap en het centrale overzicht zijn gekoppeld aan bestanden op de host.
# --user voorkomt bestanden van root/nobody die je later niet kunt verwijderen.
# De Playwright-commando's draaien IN de container, in beide browsers.
# Bewaar ook bij een mislukte test de exitcode, zodat de samenvatting nog wordt gemaakt.
docker run "${container_options[@]}" --rm --init --ipc=host --user "$(id -u):$(id -g)" \
  -e "LANCYR_TEST_KENTEKEN=$test_plate" \
  -e PLAYWRIGHT_HTML_OPEN=never \
  -e "PLAYWRIGHT_HTML_OUTPUT_DIR=$container_run_dir/html" \
  -e "PLAYWRIGHT_JSON_OUTPUT_FILE=$container_run_dir/results.json" \
  -v "$run_dir:$container_run_dir" \
  --mount "type=bind,source=$project_dir/TESTRESULTATEN-lancyr.md,target=/app/TESTRESULTATEN-lancyr.md" \
  "$image" bash scripts/run-and-summarize.sh "$container_run_dir" "$run_started" "$mode" \
  "${browser_command[@]}" test/lancyr-autoverzekering.spec.ts \
  "${projects[@]}" \
  --output="$container_run_dir/test-results" --reporter=list,html,json
