#!/usr/bin/env bash
# Root-owned helper installed once. Only application release activation is privileged.
set -euo pipefail
[[ "$EUID" -eq 0 && "$#" -eq 1 && "$1" =~ ^[0-9a-f]{40}$ ]] || { echo 'Usage: tienlo-activate COMMIT_SHA' >&2; exit 2; }
RELEASE="/opt/tienlo-releases/$1"
[[ -d "$RELEASE" && "$(realpath "$RELEASE")" == "$RELEASE" ]] || { echo 'Invalid release directory' >&2; exit 2; }
[[ -f "$RELEASE/server.py" && -f "$RELEASE/index.html" ]] || { echo 'Incomplete release' >&2; exit 2; }
[[ -z "$(find "$RELEASE" -type l -print -quit)" ]] || { echo 'Release must not contain symlinks' >&2; exit 2; }
[[ ! -e "$RELEASE/data" ]] || { echo 'Database must not be deployed with code' >&2; exit 2; }
exec 9>/run/lock/tienlo-deploy.lock
flock -w 120 9
# Preserve account data and all /etc environment files/drop-ins, including port 18080.
runuser -u tienlo -- /usr/bin/python3 /usr/local/libexec/tienlo-backup.py --database /var/lib/tienlo/tienlo.sqlite3
PREVIOUS="$(readlink -f /opt/tienlo)"
[[ -d "$PREVIOUS" ]] || { echo 'Current application not found' >&2; exit 2; }
if [[ ! -L /opt/tienlo ]]; then
  PREVIOUS="/opt/tienlo-releases/bootstrap-$(date -u +%Y%m%d-%H%M%S)-$$"
  systemctl stop tienlo
  mv /opt/tienlo "$PREVIOUS"
  ln -s "$PREVIOUS" /opt/tienlo
fi
switch_to() {
  local link
  link="$(mktemp -u /opt/.tienlo-link.XXXXXXXX)"
  ln -s "$1" "$link"
  mv -Tf "$link" /opt/tienlo
}
healthy() {
  local pid port
  for attempt in $(seq 1 25); do
    pid="$(systemctl show tienlo --property=MainPID --value)"
    if [[ "$pid" =~ ^[1-9][0-9]*$ && -r "/proc/$pid/environ" ]]; then
      port="$(/usr/bin/python3 - "$pid" <<'PY'
import sys
try:
    values=dict(item.split(b'=',1) for item in open('/proc/'+sys.argv[1]+'/environ','rb').read().split(b'\0') if b'=' in item)
    print(int(values.get(b'TIENLO_PORT',b'8080')))
except (OSError,ValueError): print(0)
PY
)"
      if systemctl is-active --quiet tienlo && curl -fsS --max-time 2 "http://127.0.0.1:$port/api/health" 2>/dev/null | /usr/bin/python3 -c 'import sys,json; x=json.load(sys.stdin); sys.exit(0 if x.get("ok") and x.get("storage")=="sqlite" else 1)' 2>/dev/null; then
        return 0
      fi
    fi
    sleep 1
  done
  return 1
}
switch_to "$RELEASE"
if systemctl restart tienlo && healthy; then
  echo "DEPLOYED $1"
else
  echo 'Health check failed; restoring previous code.' >&2
  switch_to "$PREVIOUS"
  systemctl restart tienlo
  healthy || echo 'Rollback health check failed; inspect journalctl -u tienlo.' >&2
  exit 1
fi
