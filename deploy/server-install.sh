#!/usr/bin/env bash

set -euo pipefail

DOMAIN=avantfix.ru
HOSTS=(avantfix.ru www.avantfix.ru belgorod.avantfix.ru oskol.avantfix.ru gubkin.avantfix.ru)
CITIES=(belgorod oskol gubkin)
DEPLOY_USER="${DEPLOY_USER:-deploy}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
PUBKEY="${1:-}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
note() { printf '  %s\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Запускать от root" >&2
  exit 1
fi

say "Пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx rsync curl ca-certificates certbot ufw >/dev/null
note "nginx, rsync, certbot, ufw"

say "Node"
need_node=1
if command -v node >/dev/null 2>&1; then
  major=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
  minor=$(node -p "process.versions.node.split('.')[1]" 2>/dev/null || echo 0)
  if [[ "$major" -gt 22 ]] || { [[ "$major" -eq 22 ]] && [[ "$minor" -ge 12 ]]; }; then
    need_node=0
    note "уже стоит $(node -v)"
  fi
fi
if [[ $need_node -eq 1 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs >/dev/null
  note "установлен $(node -v)"
fi

say "Пользователь $DEPLOY_USER"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER" >/dev/null
  note "создан"
else
  note "уже есть"
fi

if [[ -n "$PUBKEY" ]]; then
  home=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
  mkdir -p "$home/.ssh"
  touch "$home/.ssh/authorized_keys"
  if ! grep -qF "$PUBKEY" "$home/.ssh/authorized_keys"; then
    printf '%s\n' "$PUBKEY" >> "$home/.ssh/authorized_keys"
    note "ключ добавлен"
  else
    note "ключ уже был"
  fi
  chmod 700 "$home/.ssh"
  chmod 600 "$home/.ssh/authorized_keys"
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "$home/.ssh"
fi

say "Каталоги"
for city in "${CITIES[@]}"; do
  mkdir -p "/var/www/avantfix/$city/releases"
done
mkdir -p /var/www/certbot /opt/avantfix /var/log/avantfix
chown -R "$DEPLOY_USER:$DEPLOY_USER" /var/www/avantfix
chown -R www-data:www-data /var/log/avantfix
note "/var/www/avantfix, /opt/avantfix, /var/log/avantfix"

say "Приём заявок"
install -m 644 "$HERE/lead-service.mjs" "$HERE/mailer.mjs" /opt/avantfix/
install -m 644 "$HERE/avantfix-lead.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now avantfix-lead >/dev/null 2>&1 || systemctl restart avantfix-lead
sleep 1
if systemctl is-active --quiet avantfix-lead; then
  note "служба работает на 127.0.0.1:8787"
else
  note "служба не поднялась — journalctl -u avantfix-lead"
fi

say "Nginx"
install -d /etc/nginx/snippets
install -m 644 "$HERE/nginx/avantfix-common.conf" /etc/nginx/snippets/
install -m 644 "$HERE/nginx/avantfix-tls.conf" /etc/nginx/snippets/
rm -f /etc/nginx/sites-enabled/default

if ! nginx -V 2>&1 | grep -q brotli; then
  sed -i 's/^brotli/#brotli/' "$HERE/nginx/avantfix.conf"
  note "модуля brotli нет — строки отключены"
fi

cat > /etc/nginx/sites-available/avantfix <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${HOSTS[*]};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 404;
    }
}
EOF
ln -sf /etc/nginx/sites-available/avantfix /etc/nginx/sites-enabled/avantfix
nginx -t >/dev/null 2>&1 && systemctl reload nginx
note "временный конфиг на 80 порту поднят"

say "Сертификаты"
resolved=0
myip=$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
for host in "${HOSTS[@]}"; do
  ip=$(getent hosts "$host" | awk '{print $1}' | head -1 || true)
  if [[ "$ip" == "$myip" ]]; then resolved=$((resolved + 1)); fi
done
note "на этот сервер указывает имён: $resolved из ${#HOSTS[@]}"

if [[ $resolved -eq ${#HOSTS[@]} ]]; then
  args=()
  for host in "${HOSTS[@]}"; do args+=(-d "$host"); done
  if [[ -n "$CERTBOT_EMAIL" ]]; then
    args+=(-m "$CERTBOT_EMAIL")
  else
    args+=(--register-unsafely-without-email)
  fi
  if certbot certonly --webroot -w /var/www/certbot --non-interactive --agree-tos \
      --keep-until-expiring "${args[@]}" >/dev/null 2>&1; then
    note "сертификат получен"
  else
    note "certbot не отработал — запустите вручную, команда ниже"
  fi
fi

if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  install -m 644 "$HERE/nginx/avantfix.conf" /etc/nginx/sites-available/avantfix
  if nginx -t >/dev/null 2>&1; then
    systemctl reload nginx
    note "боевой конфиг с TLS включён"
    install -d /etc/letsencrypt/renewal-hooks/deploy
    cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'HOOK'
#!/usr/bin/env bash
systemctl reload nginx
HOOK
    chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
    note "перезагрузка nginx после продления настроена"
  else
    note "конфиг не проходит проверку:"
    nginx -t 2>&1 | sed 's/^/    /'
  fi
else
  note "сертификата нет — оставлен временный конфиг на 80 порту"
fi

say "Файрвол"
ssh_port=$(sshd -T 2>/dev/null | awk '/^port /{print $2}' | head -1)
ssh_port="${ssh_port:-22}"
ufw allow "$ssh_port/tcp" >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true
note "открыты $ssh_port, 80, 443"

say "Готово"
note "выкладывать: DEPLOY_HOST=$DEPLOY_USER@$DOMAIN ./deploy/release.sh --build"
if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  echo
  note "когда DNS доедет, добрать сертификат и включить TLS:"
  note "  bash /opt/avantfix-setup/server-install.sh"
fi
if ! grep -q "TELEGRAM_TOKEN" /etc/systemd/system/avantfix-lead.service; then
  echo
  note "заявки сейчас копятся только в /var/log/avantfix/leads.jsonl"
  note "телеграм и почта включаются переменными в юните, см. deploy/README.md"
fi
