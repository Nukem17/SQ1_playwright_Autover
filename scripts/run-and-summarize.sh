#!/usr/bin/env bash
# Draait in Docker: maak ook na een testfout de samenvatting.
set -euo pipefail
run_dir="$1"
run_started="$2"
mode="$3"
shift 3

test_exit=0
"$@" || test_exit=$?

summary_exit=0
node scripts/summarize-lancyr-run.mjs "$run_dir" "$run_started" "$test_exit" "$mode" || summary_exit=$?

# Een rapportagefout mag een testfout niet maskeren of een groene run opleveren.
if (( test_exit != 0 )); then
  exit "$test_exit"
fi
exit "$summary_exit"
