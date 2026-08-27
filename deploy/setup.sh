#!/usr/bin/env bash

set -euo pipefail

SERVER="${1:-${SETUP_HOST:-}}"
KEY="${SETUP_KEY:-$HOME/.ssh/avantfix-deploy}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
note() { printf '  %s\n' "$*"; }

if [[ -z "$SERVER" ]]; then
  cat >&2 <<'EOF'
Подготовка сервера одной командой.

  ./deploy/setup.sh root@1.2.3.4

Ставит nginx, node и certbot, заводит пользователя для выкладки,
поднимает приём заявок, включает файрвол и выпускает сертификаты,
если DNS уже указывает на этот сервер.

Повторный запуск безопасен: всё, что уже сделано, пропускается.
EOF
  exit 1
fi

for tool in ssh rsync ssh-keygen; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Нет $tool" >&2; exit 1; }
done

say "Ключ для выкладки"
if [[ ! -f "$KEY" ]]; then
  ssh-keygen -t ed25519 -f "$KEY" -N "" -C "avantfix deploy" >/dev/null
  note "создан $KEY"
else
  note "уже есть $KEY"
fi
PUBKEY="$(cat "$KEY.pub")"

say "Загрузка на сервер"
ssh "$SERVER" "mkdir -p /opt/avantfix-setup"
rsync -az --delete "$HERE/" "$SERVER:/opt/avantfix-setup/"
note "deploy/ → /opt/avantfix-setup"

ssh -t "$SERVER" "DEPLOY_USER='$DEPLOY_USER' bash /opt/avantfix-setup/server-install.sh '$PUBKEY'"

HOST_ONLY="${SERVER#*@}"

say "Дальше"
note "проверить вход:   ssh -i $KEY $DEPLOY_USER@$HOST_ONLY"
note "первый выпуск:    DEPLOY_HOST=$DEPLOY_USER@$HOST_ONLY ./deploy/release.sh --build"
echo
note "если ключ не подхватывается, добавьте его в ~/.ssh/config:"
note "  Host $HOST_ONLY"
note "    IdentityFile $KEY"
