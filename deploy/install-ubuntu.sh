#!/usr/bin/env bash
# Run from the extracted release on Ubuntu, as root. Keeps DB outside application code.
set -euo pipefail
DOMAIN="${1:-mkt.ddnsfree.com}"
SOURCE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
[[ "$EUID" -eq 0 ]] || { echo 'Run with sudo/root.' >&2; exit 1; }
[[ "$DOMAIN" =~ ^[a-zA-Z0-9.-]+$ ]] || { echo 'Invalid domain.' >&2; exit 1; }
[[ -f "$SOURCE/server.py" && -d "$SOURCE/js" ]] || { echo 'Release is incomplete.' >&2; exit 1; }
DOMAIN_PATTERN="${DOMAIN//./\\.}"
if command -v nginx >/dev/null 2>&1 && nginx -T 2>&1 | grep -E "server_name[[:space:]]+[^;]*${DOMAIN_PATTERN}([[:space:];])" >/dev/null; then
  if [[ ! -L /etc/nginx/sites-enabled/tienlo ]]; then
    echo "Domain $DOMAIN already has an Nginx site. No changes made. Inspect its config before adding the game." >&2
    exit 1
  fi
fi
if systemctl is-active --quiet apache2; then
  echo 'Apache is active. No changes made; configure a reverse proxy for the game first.' >&2
  exit 1
fi
if command -v ss >/dev/null 2>&1; then
  LISTENERS="$(ss -H -ltnp '( sport = :80 or sport = :443 )')"
  if [[ -n "$LISTENERS" ]] && printf '%s\n' "$LISTENERS" | grep -v '"nginx"' >/dev/null; then
    echo 'Port 80/443 is used by another service. No changes made; inspect the existing reverse proxy first.' >&2
    exit 1
  fi
fi
python3 -c 'import sys; assert sys.version_info >= (3,11), "Python 3.11+ required (Ubuntu 24.04 recommended)"'
apt-get update
apt-get install -y python3 nginx certbot python3-certbot-nginx
id tienlo >/dev/null 2>&1 || useradd --system --home /var/lib/tienlo --shell /usr/sbin/nologin tienlo
install -d -o tienlo -g tienlo -m 700 /var/lib/tienlo
install -d -m 755 /opt/tienlo
if [[ -f /opt/tienlo/server.py ]]; then
  install -d -m 700 /var/backups/tienlo
  tar -czf "/var/backups/tienlo/code-$(date -u +%Y%m%d-%H%M%S).tar.gz" -C /opt/tienlo .
fi
if [[ "$SOURCE" != /opt/tienlo ]]; then
  cp -a "$SOURCE/server.py" "$SOURCE/community.py" "$SOURCE/equipment.py" "$SOURCE/index.html" "$SOURCE/README.md" "$SOURCE/GAMEPLAY.md" "$SOURCE/DEPLOYMENT.md" /opt/tienlo/
  for folder in js css Character Map Item Skill deploy; do cp -a "$SOURCE/$folder" /opt/tienlo/; done
fi
chmod -R a+rX /opt/tienlo
if [[ ! -f /etc/tienlo.env ]]; then
  sed "s/mkt.ddnsfree.com/$DOMAIN/g" /opt/tienlo/deploy/tienlo.env.example > /etc/tienlo.env
  chmod 600 /etc/tienlo.env
else
  echo 'Keeping existing /etc/tienlo.env; verify TIENLO_ORIGIN matches this domain.'
fi
install -m 644 /opt/tienlo/deploy/tienlo.service /etc/systemd/system/tienlo.service
if [[ ! -f /etc/nginx/sites-available/tienlo ]]; then
  sed "s/mkt.ddnsfree.com/$DOMAIN/g" /opt/tienlo/deploy/nginx.conf > /etc/nginx/sites-available/tienlo
fi
if [[ ! -e /etc/nginx/sites-enabled/tienlo ]]; then
  ln -s /etc/nginx/sites-available/tienlo /etc/nginx/sites-enabled/tienlo
fi
nginx -t
systemctl daemon-reload
systemctl enable --now tienlo
systemctl restart tienlo
systemctl reload nginx
certbot --nginx -d "$DOMAIN" --redirect
curl --fail "https://$DOMAIN/api/health"
echo "Game is ready at https://$DOMAIN/"
