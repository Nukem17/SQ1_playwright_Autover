#!/usr/bin/env bash
# Draait in Docker: maak ook na een testfout de samenvatting.
set -euo pipefail
run_dir="$1"
run_started="$2"
mode="$3"
shift 3

# Metadata blijft lokaal beschikbaar, ook als de eerste opslagpoging niet lukt.
node scripts/elasticsearch-results.mjs start "$run_dir" "$run_started" || \
  echo 'Startregistratie niet opgeslagen; lokale rapportage en eindopslag worden nog geprobeerd.' >&2
export LANCYR_TESTDATA_ARCHIVE="$run_dir/TESTDATA.json"

test_exit=0
if [[ "${LANCYR_LINT_SUITE:-}" == autoverzekering || "${LANCYR_LINT_SUITE:-}" == schade ]]; then
  node scripts/with-elasticsearch-data.mjs "$@" || test_exit=$?
else
  "$@" || test_exit=$?
fi

summary_exit=0
node scripts/summarize-lancyr-run.mjs "$run_dir" "$run_started" "$test_exit" "$mode" || summary_exit=$?
if [[ "$mode" == headless-visual-* ]]; then
  node scripts/create-visual-overview.mjs "$run_dir" "$mode" || summary_exit=$?
fi

storage_exit=0
node scripts/elasticsearch-results.mjs finish "$run_dir" "$test_exit" || storage_exit=$?

# Een rapportagefout mag een testfout niet maskeren of een groene run opleveren.
if (( test_exit != 0 )); then
  exit "$test_exit"
fi
if (( summary_exit != 0 )); then exit "$summary_exit"; fi
exit "$storage_exit"
