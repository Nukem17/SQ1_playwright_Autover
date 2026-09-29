#!/usr/bin/env bash
# Alleen de viewer-image gebruikt dit entrypoint. De testopdracht komt via "$@".
set -euo pipefail
export DISPLAY=:99
pids=()
cleanup() {
  trap - EXIT INT TERM
  if (( ${#pids[@]} )); then
    kill "${pids[@]}" 2>/dev/null || true
    wait "${pids[@]}" 2>/dev/null || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

Xvfb "$DISPLAY" -screen 0 1440x1000x24 -nolisten tcp &
pids+=("$!")
for attempt in {1..50}; do
  [[ -S /tmp/.X11-unix/X99 ]] && break
  kill -0 "${pids[0]}"
  sleep 0.1
done
[[ -S /tmp/.X11-unix/X99 ]] || { echo 'Xvfb startte niet.' >&2; exit 1; }

# Alleen meekijken: muis/toetsenbord van de viewer beïnvloeden de test niet.
# VNC blijft intern; de hostrunner publiceert alleen noVNC op localhost.
x11vnc -display "$DISPLAY" -localhost -rfbport 5900 -nopw -forever -shared -viewonly -noxdamage &
pids+=("$!")
websockify --web=/usr/share/novnc 6080 127.0.0.1:5900 &
pids+=("$!")

python3 - <<'PY'
import socket, time, urllib.request
for attempt in range(100):
    try:
        with socket.create_connection(('127.0.0.1', 5900), timeout=1) as connection:
            assert connection.recv(12).startswith(b'RFB ')
        with urllib.request.urlopen('http://127.0.0.1:6080/vnc.html', timeout=1) as response:
            assert response.status == 200
        break
    except (OSError, AssertionError):
        time.sleep(0.1)
else:
    raise SystemExit('Viewer startte niet binnen de wachttijd.')
PY

echo 'Open http://localhost:6080/vnc.html?autoconnect=true&resize=scale'
if [[ -t 0 ]]; then
  read -r -p 'Verbind met de viewer en druk hier op Enter om de tests te starten. '
fi

"$@" &
test_pid=$!
pids+=("$test_pid")
test_exit=0
wait "$test_pid" || test_exit=$?
if [[ -t 0 ]]; then
  read -r -p 'Tests afgerond. Druk op Enter om de viewer af te sluiten. ' || true
fi
exit "$test_exit"
