#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
docker build -t sq1-playwright .
mkdir -p test-runs
echo 'Open http://localhost:8070 in je browser of VS Code Simple Browser. Stop met Ctrl+C.'
docker run --rm --init --user "$(id -u):$(id -g)" -p 127.0.0.1:8070:8070 \
  -e REPORT_HOST=0.0.0.0 -v "$project_dir/test-runs:/app/test-runs:ro" \
  sq1-playwright node scripts/report-page/server.mjs
