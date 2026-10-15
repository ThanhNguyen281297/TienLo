#!/usr/bin/env bash
# Run once in the existing root SSH session; argument is a public key, never a private key.
set -euo pipefail
[[ "$EUID" -eq 0 && "$#" -eq 1 && -f "$1" ]] || { echo 'Usage: sudo bash setup-cicd.sh /path/actions.pub' >&2; exit 2; }
SOURCE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$SOURCE/activate-release.sh" && -f "$SOURCE/backup.py" ]] || { echo 'Bootstrap files missing' >&2; exit 2; }
PUBLIC_KEY="$(tr -d '\r\n' < "$1")"
[[ "$PUBLIC_KEY" =~ ^ssh-ed25519[[:space:]][A-Za-z0-9+/=]+([[:space:]].*)?$ ]] || { echo 'Expected an Ed25519 PUBLIC key.' >&2; exit 2; }
[[ -f /etc/tienlo.env ]] || { echo 'Install and verify the game first.' >&2; exit 2; }
tr -d '\r' < /etc/tienlo.env | grep -qx 'TIENLO_DB=/var/lib/tienlo/tienlo.sqlite3' || { echo 'Database location differs. Inspect before configuring CI.' >&2; exit 2; }
[[ -f /var/lib/tienlo/tienlo.sqlite3 ]] || { echo 'Expected database not found.' >&2; exit 2; }
apt-get update
apt-get install -y rsync curl sudo util-linux
id tienlo-deploy >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/tienlo-deploy --shell /bin/bash tienlo-deploy
install -d -o tienlo-deploy -g tienlo-deploy -m 755 /opt/tienlo-releases
install -d -o tienlo-deploy -g tienlo-deploy -m 700 /var/lib/tienlo-deploy/.ssh
AUTH=/var/lib/tienlo-deploy/.ssh/authorized_keys
touch "$AUTH"
LINE="restrict $PUBLIC_KEY"
grep -qxF "$LINE" "$AUTH" || printf '%s\n' "$LINE" >> "$AUTH"
chown tienlo-deploy:tienlo-deploy "$AUTH"
chmod 600 "$AUTH"
install -d -m 755 /usr/local/libexec
install -o root -g root -m 755 "$SOURCE/activate-release.sh" /usr/local/sbin/tienlo-activate
install -o root -g root -m 644 "$SOURCE/backup.py" /usr/local/libexec/tienlo-backup.py
printf 'tienlo-deploy ALL=(root) NOPASSWD: /usr/local/sbin/tienlo-activate *\n' > /etc/sudoers.d/tienlo-deploy
chmod 440 /etc/sudoers.d/tienlo-deploy
visudo -cf /etc/sudoers.d/tienlo-deploy
printf 'Ready. SSH user: tienlo-deploy; releases: /opt/tienlo-releases\n'
printf 'Existing service, database, Nginx and port settings were preserved.\n'
