#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
mode="${1:-headless}"
browser="${2:-all}"
if [[ $# -gt 2 || "$mode" != headless && "$mode" != headed || "$browser" != all && "$browser" != chromium && "$browser" != firefox && "$browser" != webkit ]]; then
  echo 'Gebruik: bash scripts/run-schade-regressie.sh [headless|headed] [all|chromium|firefox|webkit]' >&2
  exit 2
fi
browser_command=(npx playwright test)
if [[ "$mode" == headed ]]; then browser_command=(xvfb-run -a npx playwright test --headed); fi
project_options=()
if [[ "$browser" != all ]]; then project_options=("--project=$browser"); fi

docker build -t sq1-playwright .
docker run --rm --user "$(id -u):$(id -g)" \
  -v "$project_dir/testdata:/app/testdata" sq1-playwright node scripts/init-testdata.mjs
docker run --rm --user "$(id -u):$(id -g)" \
  -v "$project_dir/testdata:/app/testdata:ro" sq1-playwright node -e \
  "const data=require('./testdata/regressie.ts').haalRegressieSetOp(); console.log(data.paginas.length+' pagina’s en '+data.scenarios.length+' scenario’s gevalideerd.');"

mkdir -p test-runs
run_dir="$(mktemp -d "$project_dir/test-runs/$(date +%Y-%m-%d_%H-%M-%S)_schade-regressie_XXXXXX")"
mkdir -p "$run_dir/html" "$run_dir/test-results"
container_dir="/app/test-runs/$(basename "$run_dir")"
echo "Run: ${run_dir#$project_dir/}"
docker run --rm --init --ipc=host --user "$(id -u):$(id -g)" \
  -e PLAYWRIGHT_HTML_OPEN=never \
  -e "PLAYWRIGHT_HTML_OUTPUT_DIR=$container_dir/html" \
  -e "PLAYWRIGHT_JSON_OUTPUT_FILE=$container_dir/results.json" \
  -v "$run_dir:$container_dir" -v "$project_dir/testdata:/app/testdata:ro" \
  sq1-playwright bash scripts/run-and-summarize.sh "$container_dir" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$mode-schade-regressie" \
  "${browser_command[@]}" test/schade-melden "${project_options[@]}" \
  --workers=2 --retries=0 --output="$container_dir/test-results" --reporter=list,html,json
