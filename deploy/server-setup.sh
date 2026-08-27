#!/usr/bin/env bash

set -euo pipefail

DOMAIN=avantfix.ru
HOSTS=(avantfix.ru www.avantfix.ru belgorod.avantfix.ru oskol.avantfix.ru gubkin.avantfix.ru)
CITIES=(belgorod oskol gubkin)
DEPLOY_USER="${DEPLOY_USER:-deploy}"
REPO_URL="${REPO_URL:-git@github.com:ProstyGospody/avantfixv2.git}"
REPO_DIR=/srv/avantfix/repo
MARKER=/etc/avantfix/.installed
PUBKEY="${1:-}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
note() { printf '  %s\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Запускать от root" >&2
  exit 1
fi

install -d /etc/avantfix

fresh=1
if [[ -f $MARKER ]] && [[ "${AVANTFIX_REINSTALL:-}" != "1" ]]; then
  fresh=0
fi

ask() {
  local name="$1" prompt="$2" default="${3:-}" hidden="${4:-}" value=""
  if [[ -n "$hidden" ]]; then
    read -rsp "  $prompt: " value
    echo
  elif [[ -n "$default" ]]; then
    read -rp "  $prompt [$default]: " value
    value="${value:-$default}"
  else
    read -rp "  $prompt: " value
  fi
  printf -v "$name" '%s' "$value"
}

if [[ $fresh -eq 1 ]]; then
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
fi

HOME_DIR=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$HOME_DIR/.ssh"

if [[ -n "$PUBKEY" ]]; then
  touch "$HOME_DIR/.ssh/authorized_keys"
  if ! grep -qF "$PUBKEY" "$HOME_DIR/.ssh/authorized_keys"; then
    printf '%s\n' "$PUBKEY" >> "$HOME_DIR/.ssh/authorized_keys"
  fi
  chmod 600 "$HOME_DIR/.ssh/authorized_keys"
fi

if [[ $fresh -eq 1 ]]; then
  say "Каталоги"
  for city in "${CITIES[@]}"; do
    mkdir -p "/var/www/avantfix/$city/releases"
  done
  mkdir -p /var/www/certbot /opt/avantfix /var/log/avantfix /srv/avantfix
  chown -R "$DEPLOY_USER:$DEPLOY_USER" /var/www/avantfix /srv/avantfix
  chown -R www-data:www-data /var/log/avantfix
  note "/var/www/avantfix, /srv/avantfix, /var/log/avantfix"
fi

if [[ ! -f /etc/avantfix/lead.env ]]; then
  if [[ ! -t 0 ]]; then
    echo "Нужен интерактивный запуск: ssh -t" >&2
    exit 1
  fi
  say "Почта для заявок"
  note "на этот ящик будут падать заявки с форм"
  echo
  ask SMTP_HOST "сервер" "smtp.yandex.ru"
  ask SMTP_PORT "порт" "465"
  ask SMTP_USER "ящик, с которого слать"
  ask SMTP_PASS "пароль приложения" "" hidden
  while printf '%s' "$SMTP_PASS" | grep -q '["\\]'; do
    note "кавычки и обратные слэши systemd не переварит — введите заново"
    ask SMTP_PASS "пароль приложения" "" hidden
  done
  ask MAIL_TO "кому слать, через запятую" "$SMTP_USER"
  MAIL_TO="${MAIL_TO// /}"
  umask 077
  cat > /etc/avantfix/lead.env <<CFG
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
MAIL_TO=$MAIL_TO
CFG
  umask 022
  chmod 600 /etc/avantfix/lead.env
  note "записано в /etc/avantfix/lead.env"
fi

if [[ ! -f /etc/avantfix/build.env ]]; then
  METRIKA_BELGOROD=""
  METRIKA_OSKOL=""
  METRIKA_GUBKIN=""
  if [[ -t 0 ]]; then
    say "Счётчики Метрики"
    note "по одному на город, можно пропустить и вписать позже"
    echo
    ask METRIKA_BELGOROD "белгород"
    ask METRIKA_OSKOL "старый оскол"
    ask METRIKA_GUBKIN "губкин"
  fi
  cat > /etc/avantfix/build.env <<CFG
METRIKA_BELGOROD=$METRIKA_BELGOROD
METRIKA_OSKOL=$METRIKA_OSKOL
METRIKA_GUBKIN=$METRIKA_GUBKIN
CFG
  chmod 644 /etc/avantfix/build.env
  note "записано в /etc/avantfix/build.env"
fi

say "Репозиторий"
if [[ ! -f "$HOME_DIR/.ssh/github" ]]; then
  sudo -u "$DEPLOY_USER" ssh-keygen -t ed25519 -f "$HOME_DIR/.ssh/github" -N "" -C "avantfix server" >/dev/null
fi
if ! grep -q "Host github.com" "$HOME_DIR/.ssh/config" 2>/dev/null; then
  printf 'Host github.com\n  IdentityFile %s/.ssh/github\n  IdentitiesOnly yes\n' "$HOME_DIR" >> "$HOME_DIR/.ssh/config"
  chmod 600 "$HOME_DIR/.ssh/config"
fi
if ! grep -q "github.com" "$HOME_DIR/.ssh/known_hosts" 2>/dev/null; then
  ssh-keyscan -t ed25519 github.com 2>/dev/null >> "$HOME_DIR/.ssh/known_hosts"
fi
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$HOME_DIR/.ssh"

if [[ -d "$REPO_DIR/.git" ]]; then
  note "на месте"
else
  while ! sudo -u "$DEPLOY_USER" -H git clone --quiet "$REPO_URL" "$REPO_DIR" 2>/dev/null; do
    echo
    note "добавьте ключ в github → репозиторий → Settings → Deploy keys,"
    note "галку Allow write access не ставьте:"
    echo
    sed 's/^/    /' "$HOME_DIR/.ssh/github.pub"
    echo
    if [[ ! -t 0 ]]; then
      echo "Нужен интерактивный запуск: ssh -t" >&2
      exit 1
    fi
    read -rp "  добавили — Enter, чтобы продолжить: " _
  done
  note "склонирован"
fi

say "Приём заявок"
install -m 644 "$HERE/lead-service.mjs" "$HERE/mailer.mjs" /opt/avantfix/
install -m 644 "$HERE/avantfix-lead.service" /etc/systemd/system/
install -m 755 "$HERE/update.sh" /usr/local/bin/avantfix-update
systemctl daemon-reload
systemctl enable avantfix-lead >/dev/null 2>&1 || true
systemctl restart avantfix-lead
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

if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
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
  note "временный конфиг на 80 порту"

  say "Сертификаты"
  myip=$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
  resolved=0
  for host in "${HOSTS[@]}"; do
    ip=$(getent hosts "$host" | awk '{print $1}' | head -1 || true)
    [[ "$ip" == "$myip" ]] && resolved=$((resolved + 1))
  done
  note "на этот сервер указывает имён: $resolved из ${#HOSTS[@]}"

  if [[ $resolved -eq ${#HOSTS[@]} ]]; then
    args=()
    for host in "${HOSTS[@]}"; do args+=(-d "$host"); done
    mail=$(grep -m1 '^SMTP_USER=' /etc/avantfix/lead.env | cut -d= -f2-)
    if [[ -n "$mail" ]]; then
      args+=(-m "$mail")
    else
      args+=(--register-unsafely-without-email)
    fi
    if certbot certonly --webroot -w /var/www/certbot --non-interactive --agree-tos \
        --keep-until-expiring "${args[@]}" >/dev/null 2>&1; then
      note "сертификат получен"
    else
      note "certbot не отработал — сайт останется на 80 порту"
    fi
  fi
fi

if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  install -m 644 "$HERE/nginx/avantfix.conf" /etc/nginx/sites-available/avantfix
  ln -sf /etc/nginx/sites-available/avantfix /etc/nginx/sites-enabled/avantfix
  if nginx -t >/dev/null 2>&1; then
    systemctl reload nginx
    note "конфиг с TLS включён"
    install -d /etc/letsencrypt/renewal-hooks/deploy
    cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'HOOK'
#!/usr/bin/env bash
systemctl reload nginx
HOOK
    chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
  else
    note "конфиг не проходит проверку:"
    nginx -t 2>&1 | sed 's/^/    /'
  fi
fi

if [[ $fresh -eq 1 ]]; then
  say "Файрвол"
  ssh_port=$(sshd -T 2>/dev/null | awk '/^port /{print $2}' | head -1)
  ssh_port="${ssh_port:-22}"
  ufw allow "$ssh_port/tcp" >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  ufw --force enable >/dev/null 2>&1 || true
  note "открыты $ssh_port, 80, 443"
fi

touch "$MARKER"

sudo -u "$DEPLOY_USER" -H /usr/local/bin/avantfix-update

say "Готово"
if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  note "сайт: https://$DOMAIN"
else
  note "сайт на 80 порту без TLS — когда DNS доедет, запустите скрипт ещё раз"
fi
