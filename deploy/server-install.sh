#!/usr/bin/env bash

set -euo pipefail

DOMAIN=avantfix.ru
HOSTS=(avantfix.ru www.avantfix.ru belgorod.avantfix.ru oskol.avantfix.ru gubkin.avantfix.ru)
CITIES=(belgorod oskol gubkin)
DEPLOY_USER="${DEPLOY_USER:-deploy}"
REPO_URL="${REPO_URL:-git@github.com:ProstyGospody/avantfixv2.git}"
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
apt-get install -y -qq nginx rsync curl ca-certificates git sudo certbot ufw >/dev/null
note "nginx, rsync, git, certbot, ufw"

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

say "Память"
mem=$(awk '/^MemTotal:/{print int($2/1024)}' /proc/meminfo)
if [[ $mem -ge 2048 ]]; then
  note "$mem МБ, хватает"
elif [[ -f /swapfile ]]; then
  note "$mem МБ, подкачка уже есть"
else
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  note "$mem МБ — добавлен файл подкачки 2 ГБ, иначе сборка не влезет"
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

say "Репозиторий"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" /srv/avantfix
home=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
sudo -u "$DEPLOY_USER" mkdir -p "$home/.ssh"
if [[ ! -f "$home/.ssh/github" ]]; then
  sudo -u "$DEPLOY_USER" ssh-keygen -t ed25519 -f "$home/.ssh/github" -N "" -C "avantfix server" >/dev/null
  note "ключ для github создан"
fi
if ! grep -q "Host github.com" "$home/.ssh/config" 2>/dev/null; then
  printf 'Host github.com\n  IdentityFile %s/.ssh/github\n  IdentitiesOnly yes\n' "$home" \
    | sudo -u "$DEPLOY_USER" tee -a "$home/.ssh/config" >/dev/null
  chmod 600 "$home/.ssh/config"
fi
if ! grep -q "github.com" "$home/.ssh/known_hosts" 2>/dev/null; then
  ssh-keyscan -t ed25519 github.com 2>/dev/null | sudo -u "$DEPLOY_USER" tee -a "$home/.ssh/known_hosts" >/dev/null
fi
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$home/.ssh"

repo_ready=0
if [[ -d /srv/avantfix/repo/.git ]]; then
  repo_ready=1
  note "уже склонирован"
elif sudo -u "$DEPLOY_USER" git clone --quiet "$REPO_URL" /srv/avantfix/repo 2>/dev/null; then
  repo_ready=1
  note "склонирован $REPO_URL"
else
  note "клонировать не вышло — ключ ещё не добавлен в github"
fi

install -m 755 "$HERE/update.sh" /usr/local/bin/avantfix-update
install -d /etc/avantfix
if [[ ! -f /etc/avantfix/build.env ]]; then
  cat > /etc/avantfix/build.env <<'CFG'
METRIKA_BELGOROD=
METRIKA_OSKOL=
METRIKA_GUBKIN=
CFG
  chmod 644 /etc/avantfix/build.env
fi
note "команда обновления: avantfix-update"

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

if [[ $repo_ready -eq 0 ]]; then
  note "добавьте этот ключ в github → Settings → Deploy keys (без права записи):"
  echo
  cat "$home/.ssh/github.pub" | sed 's/^/    /'
  echo
  note "потом повторите запуск setup.sh — репозиторий склонируется"
else
  note "выкладывать: ssh $DEPLOY_USER@$DOMAIN avantfix-update"
fi

if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  echo
  note "когда DNS доедет, добрать сертификат и включить TLS:"
  note "  bash /opt/avantfix-setup/server-install.sh"
fi

if ! grep -q "METRIKA_BELGOROD=." /etc/avantfix/build.env; then
  echo
  note "номера счётчиков метрики: /etc/avantfix/build.env"
fi

if ! grep -q "TELEGRAM_TOKEN" /etc/systemd/system/avantfix-lead.service; then
  echo
  note "заявки сейчас копятся только в /var/log/avantfix/leads.jsonl"
  note "телеграм и почта включаются переменными в юните, см. deploy/README.md"
fi
