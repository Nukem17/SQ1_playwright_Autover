#!/usr/bin/env bash
# Start de schade-melden-tests met Docker en bewaar de resultaten in een eigen map.
# Stop bij een fout, een ontbrekende shellvariabele of een mislukt deel van een commandoreeks.
set -euo pipefail
# Werk vanuit de projectmap, ook als je dit script vanuit een andere map start.
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
# Zonder argumenten draaien alle drie browsers zonder zichtbaar browservenster.
mode="${1:-headless}"
browser="${2:-all}"
# Accepteer alleen de ondersteunde keuzes; geef bij een typefout de juiste schrijfwijze.
if [[ $# -gt 2 || "$mode" != headless && "$mode" != headed || "$browser" != all && "$browser" != chromium && "$browser" != firefox && "$browser" != webkit ]]; then
  echo 'Gebruik: bash scripts/run-schade-regressie.sh [headless|headed] [all|chromium|firefox|webkit]' >&2
  exit 2
fi
# Headed gebruikt een virtueel scherm in Docker; de browserkeuze wordt apart toegevoegd.
browser_command=(npx playwright test)
if [[ "$mode" == headed ]]; then browser_command=(xvfb-run -a npx playwright test --headed); fi
project_options=()
if [[ "$browser" != all ]]; then project_options=("--project=$browser"); fi

# Bouw een image met de huidige testcode en benodigde browsers.
docker build -t sq1-playwright .
# Pas nieuwe database-migraties toe. Bestaande testgegevens blijven behouden.
docker run --rm --user "$(id -u):$(id -g)" \
  -v "$project_dir/testdata:/app/testdata" sq1-playwright node scripts/init-testdata.mjs
# Controleer de gegevens vóór de testrun. Deze container mag de database alleen lezen.
docker run --rm --user "$(id -u):$(id -g)" \
  -v "$project_dir/testdata:/app/testdata:ro" sq1-playwright node -e \
  "const data=require('./testdata/regressie.ts').haalRegressieSetOp(); console.log(data.paginas.length+' pagina’s en '+data.scenarios.length+' scenario’s gevalideerd.');"

# Geef iedere run een unieke map, zodat eerdere rapporten bewaard blijven.
mkdir -p test-runs
run_dir="$(mktemp -d "$project_dir/test-runs/$(date +%Y-%m-%d_%H-%M-%S)_schade-regressie_XXXXXX")"
mkdir -p "$run_dir/html" "$run_dir/test-results"
container_dir="/app/test-runs/$(basename "$run_dir")"
echo "Run: ${run_dir#$project_dir/}"
# Draai twee tests tegelijk en probeer fouten niet automatisch opnieuw.
# Bewaar HTML, JSON en foutbijlagen; maak daarna de leesbare samenvatting.
# Een falende test geeft ook een foutstatus terug aan degene die dit script start.
docker run --rm --init --ipc=host --user "$(id -u):$(id -g)" \
  -e PLAYWRIGHT_HTML_OPEN=never \
  -e "PLAYWRIGHT_HTML_OUTPUT_DIR=$container_dir/html" \
  -e "PLAYWRIGHT_JSON_OUTPUT_FILE=$container_dir/results.json" \
  -v "$run_dir:$container_dir" -v "$project_dir/testdata:/app/testdata:ro" \
  sq1-playwright bash scripts/run-and-summarize.sh "$container_dir" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$mode-schade-regressie" \
  "${browser_command[@]}" test/schade-melden "${project_options[@]}" \
  --workers=2 --retries=0 --output="$container_dir/test-results" --reporter=list,html,json
