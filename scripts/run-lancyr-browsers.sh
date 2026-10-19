#!/usr/bin/env bash
# Stop bij echte scriptfouten en bij variabelen die niet bestaan.
set -euo pipefail

# Draai altijd vanuit de projectmap, ook als het script elders wordt gestart.
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

# Alle modi gebruiken de browserprojecten uit playwright.config.ts.
mode="${1:-headless}"
# De derde keuze is optioneel; bestaande startcommando’s blijven alle browsers gebruiken.
browser="${3:-all}"
if [[ $# -gt 3 || "$mode" != headless && "$mode" != headed && "$mode" != visible && "$mode" != funnel && "$mode" != funnel-demo || "$browser" != all && "$browser" != chromium && "$browser" != firefox && "$browser" != webkit ]]; then
  echo 'Gebruik: bash scripts/run-lancyr-browsers.sh [headless|headed|visible|funnel|funnel-demo] [scenario-id] [all|chromium|firefox|webkit]' >&2
  exit 2
fi
image=sq1-playwright
container_options=()
workers=2
browser_command=(npx playwright test)
test_options=()
if [[ "$browser" != all ]]; then test_options=("--project=$browser"); fi
if [[ "$mode" == funnel ]]; then
  # Alleen de echte klantreis; geen korte paginatests of kunstmatige foutdemo.
  test_options+=(--grep 'doorloop de funnel tot vlak vóór Sluit af$' --retries=0)
fi
if [[ "$mode" == funnel-demo && "$browser" != all && "$browser" != chromium ]]; then
  echo 'De funnel-demo ondersteunt alleen Chromium.' >&2
  exit 2
fi
funnel_demo=0
if [[ "$mode" == funnel-demo ]]; then
  funnel_demo=1
  workers=1
  test_options=(--project=chromium --grep 'doorloop de funnel tot vlak vóór Sluit af' --retries=0)
  echo 'DEMO: de gewone funnel draait headless in Chromium en faalt bewust bij de winkelwagen.'
fi
if [[ "$mode" == visible ]]; then
  if [[ ! -t 0 || ! -t 1 ]]; then
    echo 'Visible vereist een interactieve terminal. Gebruik headed voor CI.' >&2
    exit 2
  fi
  image=sq1-playwright-viewer
  container_options=(-it -p 127.0.0.1:6080:6080)
  workers=1
  browser_command=(npx playwright test --headed)
fi
if [[ "$mode" == headed ]]; then
  browser_command=(xvfb-run -a npx playwright test --headed)
fi

# De database bepaalt alle invoer; een los kenteken kan verwachtingen ongeldig maken.
scenario="${2:-${LANCYR_TEST_SCENARIO:-standaard}}"
if [[ -n "${LANCYR_TEST_KENTEKEN:-}" ]]; then
  echo 'LANCYR_TEST_KENTEKEN is vervangen door database-scenario’s. Pas het scenario in Elasticsearch aan.' >&2
  exit 2
fi

source "$project_dir/scripts/elasticsearch-docker.sh"

# Bij een Docker-probleem ontstaat er nog geen lege runmap.
docker build -t sq1-playwright .
prepare_testdata
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

# De runmap is gekoppeld aan een map op de host.
# --user voorkomt bestanden van root/nobody die je later niet kunt verwijderen.
# De Playwright-commando's draaien IN de container, in alle drie de browsers.
# Bewaar ook bij een mislukte test de exitcode, zodat de samenvatting nog wordt gemaakt.
docker run "${container_data_options[@]}" "${container_options[@]}" --rm --init --ipc=host --user "$(id -u):$(id -g)" \
  -e "LANCYR_TEST_SCENARIO=$scenario" \
  -e "LANCYR_FUNNEL_DEMO=$funnel_demo" \
  -e LANCYR_LINT_SUITE=autoverzekering \
  -e "CI=${CI:-}" \
  -e PLAYWRIGHT_HTML_OPEN=never \
  -e "PLAYWRIGHT_HTML_OUTPUT_DIR=$container_run_dir/html" \
  -e "PLAYWRIGHT_JSON_OUTPUT_FILE=$container_run_dir/results.json" \
  -v "$run_dir:$container_run_dir" \
  "$image" bash scripts/run-and-summarize.sh "$container_run_dir" "$run_started" "$mode" \
  "${browser_command[@]}" test/autoverzerkeringsfunnel/lancyr-autoverzekering.spec.ts \
  --workers="$workers" \
  "${test_options[@]}" \
  --output="$container_run_dir/test-results" --reporter=list,html,json
