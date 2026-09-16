#!/usr/bin/env bash
set -euo pipefail

# Draai altijd vanuit de projectmap, ook als het script elders wordt gestart.
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

test_plate="${LANCYR_TEST_KENTEKEN:-88-LSV-7}"

# Bij een Docker-probleem ontstaat er nog geen lege runmap.
docker build -t sq1-playwright .
run_started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Iedere run krijgt een eigen map. De willekeurige suffix voorkomt overschrijven.
mkdir -p test-runs
run_dir="$(mktemp -d "$project_dir/test-runs/$(date +%Y-%m-%d_%H-%M-%S)_XXXXXX")"
mkdir -p "$run_dir/html" "$run_dir/test-results"

echo "Run: ${run_dir#$project_dir/}"

# Bewaar de exitcode ook bij een mislukte test, zodat het overzicht altijd wordt gemaakt.
if docker run --rm --init --ipc=host --user "$(id -u):$(id -g)" \
  -e "LANCYR_TEST_KENTEKEN=$test_plate" \
  -e PLAYWRIGHT_HTML_OPEN=never \
  -e PLAYWRIGHT_HTML_OUTPUT_DIR=/app/run-output/html \
  -e PLAYWRIGHT_JSON_OUTPUT_FILE=/app/run-output/results.json \
  -v "$run_dir:/app/run-output" \
  sq1-playwright npx playwright test test/lancyr-autoverzekering.spec.ts \
  --project=chromium --output=/app/run-output/test-results --reporter=list,html,json; then
  test_exit=0
else
  test_exit=$?
fi

node scripts/summarize-lancyr-run.mjs "$run_dir" "$run_started" "$test_exit"
exit "$test_exit"
