#!/usr/bin/env bash
# Kies een test zonder de losse startcommando’s te hoeven onthouden.
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

# Hiermee kan de menukoppeling worden gecontroleerd zonder Docker of websiteverkeer.
dry_run=0
report_only=0
if [[ "${1:-}" == --dry-run && $# == 1 ]]; then
  dry_run=1
elif [[ "${1:-}" == --reports && $# == 1 ]]; then
  report_only=1
elif [[ $# != 0 ]]; then
  echo 'Gebruik: bash scripts/testmenu.sh [--dry-run|--reports]' >&2
  exit 2
fi

# Blijf vragen bij een onbekende keuze; einde van de invoer sluit het menu netjes af.
choose() {
  local prompt="$1" allowed="$2" default="$3"
  while true; do
    if ! read -r -p "$prompt" choice; then echo; exit 0; fi
    choice="${choice:-$default}"
    case " $allowed " in *" $choice "*) return ;; esac
    echo "Kies één van: $allowed."
  done
}

if (( report_only )); then
  action=5
else
printf '\nLancyr — testmenu\n\n'
echo '1. Autoverzekeringsfunnel testen'
echo '2. Schade melden testen'
echo '3. Beide functionele suites uitvoeren'
echo '4. Visuele tests uitvoeren (Chromium)'
echo '5. Rapportage openen/starten'
echo '0. Afsluiten'
choose 'Wat wil je doen? ' '0 1 2 3 4 5' '0'
action="$choice"
fi
[[ "$action" != 0 ]] || exit 0

if [[ "$action" == 5 ]]; then
  if (( dry_run )); then
    echo 'bash scripts/view-reports.sh'
    exit 0
  fi
  # Een bestaande rapportserver hoeft niet nogmaals op dezelfde poort te starten.
  if command -v curl >/dev/null && curl --fail --silent --max-time 2 http://localhost:8070/api/runs >/dev/null; then
    echo 'De rapportserver draait al. Open http://localhost:8070'
    exit 0
  fi
  echo 'Open http://localhost:8070 zodra de server gereed is. Laat deze terminal open.'
  exec bash scripts/view-reports.sh
fi

mode=headless
browser=all
scenario=standaard
if [[ "$action" != 4 ]]; then
  printf '\nBrowser\n1. Alle browsers\n2. Chromium\n3. Firefox\n4. WebKit\n'
  choose 'Keuze [1]: ' '1 2 3 4' '1'
  case "$choice" in 1) browser=all ;; 2) browser=chromium ;; 3) browser=firefox ;; 4) browser=webkit ;; esac
  printf '\nUitvoering\n1. Zonder browservenster\n2. Met virtueel scherm in Docker (geen zichtbaar venster op je computer)\n'
  if [[ "$action" == 1 ]]; then
    echo '3. Live meekijken via noVNC (zichtbare browser in de viewer)'
    choose 'Keuze [1]: ' '1 2 3' '1'
  else
    choose 'Keuze [1]: ' '1 2' '1'
  fi
  case "$choice" in 2) mode=headed ;; 3) mode=visible ;; esac
fi
if [[ "$action" == 1 || "$action" == 3 ]]; then
  echo
  echo 'De autoverzekeringssuite gebruikt één database-scenario per run.'
  echo 'Bijvoorbeeld standaard of testgebruiker-anna. De runner controleert of het bestaat.'
  if ! read -r -p 'Scenario-ID [standaard]: ' scenario; then echo; exit 0; fi
  scenario="${scenario:-standaard}"
fi

if [[ "$mode" == visible ]]; then
  echo
  echo 'Wacht totdat de viewer klaarstaat en open dan deze URL in Live Preview of je browser:'
  echo 'http://localhost:6080/vnc.html?autoconnect=true&resize=scale'
  echo 'Verbind met de viewer en druk daarna in deze terminal op Enter om de tests te starten.'
  echo 'Na de tests druk je opnieuw op Enter om de viewer af te sluiten.'
fi

# Voer beide suites ook uit als de eerste fouten vindt. Bewaar wel de foutstatus.
result=0
run_suite() {
  local label="$1"; shift
  printf '\n%s\n' "$label"
  if (( dry_run )); then printf '%q ' bash "$@"; printf '\n'; return; fi
  local status=0
  bash "$@" || status=$?
  if (( status == 130 || status == 143 )); then exit "$status"; fi
  if (( status != 0 )); then
    result=1
    echo "$label: er zijn testfouten of uitvoeringsproblemen (exitcode $status). Bekijk de uitvoer hierboven."
  else
    echo "$label: afgerond zonder fouten."
  fi
}
case "$action" in
  1) run_suite 'Autoverzekering' scripts/run-lancyr-browsers.sh "$mode" "$scenario" "$browser" ;;
  2) run_suite 'Schade melden' scripts/run-schade-regressie.sh "$mode" "$browser" ;;
  3)
    run_suite 'Autoverzekering' scripts/run-lancyr-browsers.sh "$mode" "$scenario" "$browser"
    run_suite 'Schade melden' scripts/run-schade-regressie.sh "$mode" "$browser"
    ;;
  4) run_suite 'Visuele controle — bestaande referentie vergelijken' scripts/run-lancyr-visual.sh check ;;
esac
if (( ! dry_run )); then
  echo
  echo 'Beschikbare rapporten staan in test-runs/. Iedere suite krijgt een eigen runmap.'
  echo 'Rapportage: http://localhost:8070'
  echo 'Server nog niet gestart? Kies de VS Code-taak “Lancyr: rapportage openen” of menuoptie 5.'
fi
exit "$result"
