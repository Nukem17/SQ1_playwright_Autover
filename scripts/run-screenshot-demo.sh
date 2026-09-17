#!/usr/bin/env bash
set -euo pipefail

# Net als de gewone runner: vanuit de projectmap bouwen en een eigen runmap maken.
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
docker build -t sq1-playwright .

mkdir -p test-runs
run_dir="$(mktemp -d "$project_dir/test-runs/screenshot-demo_$(date +%Y-%m-%d_%H-%M-%S)_XXXXXX")"
mkdir -p "$run_dir/html" "$run_dir/test-results"

# De test hoort te falen. Door -v blijven screenshot en rapport buiten Docker staan.
# Daarna controleren we of er ook echt een PNG is gemaakt.
if docker run --rm --init --ipc=host --user "$(id -u):$(id -g)" \
  -e RUN_SCREENSHOT_DEMO=1 \
  -e PLAYWRIGHT_HTML_OPEN=never \
  -e PLAYWRIGHT_HTML_OUTPUT_DIR=/app/demo-output/html \
  -v "$run_dir:/app/demo-output" \
  sq1-playwright npx playwright test test/screenshot-demo.spec.ts \
  --project=chromium --output=/app/demo-output/test-results --reporter=list,html; then
  echo 'De demonstratie faalde niet zoals verwacht.' >&2
  exit 1
fi

screenshot="$(rg --files --no-ignore "$run_dir/test-results" -g '*.png' | head -n 1 || true)"
if [[ -z "$screenshot" ]]; then
  echo 'De test faalde, maar er is geen screenshot gevonden.' >&2
  exit 1
fi

echo "Screenshot gemaakt: ${screenshot#$project_dir/}"
echo "HTML-rapport: ${run_dir#$project_dir/}/html/index.html"
