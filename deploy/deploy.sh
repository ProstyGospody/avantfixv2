#!/usr/bin/env bash

set -euo pipefail

STATE="$HOME/.config/avantfix"
KEY="${DEPLOY_KEY:-$HOME/.ssh/avantfix-deploy}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
REPO_URL="${REPO_URL:-git@github.com:ProstyGospody/avantfixv2.git}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
note() { printf '  %s\n' "$*"; }

SERVER="${1:-}"
if [[ -z "$SERVER" ]] && [[ -f "$STATE/host" ]]; then
  SERVER="$(cat "$STATE/host")"
fi

if [[ -z "$SERVER" ]]; then
  cat >&2 <<'EOF'
Разворачивает и обновляет сайт на сервере.

  ./deploy/deploy.sh root@1.2.3.4

Первый запуск ставит всё с нуля и спросит доступы к почте.
Дальше достаточно ./deploy/deploy.sh — адрес сервера запомнится,
сервер сам подтянет свежий код с github и пересоберёт сайт.
EOF
  exit 1
fi

for tool in ssh rsync ssh-keygen; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Нет $tool" >&2; exit 1; }
done

if ! git -C "$HERE/.." diff --quiet HEAD 2>/dev/null; then
  note "в рабочей копии есть незакоммиченные правки — сервер их не увидит"
fi

if [[ -n "$(git -C "$HERE/.." log '@{u}..' --oneline 2>/dev/null || true)" ]]; then
  note "есть неотправленные коммиты — сервер соберёт то, что уже на github"
fi

say "Ключ"
if [[ ! -f "$KEY" ]]; then
  ssh-keygen -t ed25519 -f "$KEY" -N "" -C "avantfix deploy" >/dev/null
  note "создан $KEY"
else
  note "$KEY"
fi
PUBKEY="$(cat "$KEY.pub")"

say "Сервер"
ssh "$SERVER" "mkdir -p /opt/avantfix-setup"
rsync -az --delete "$HERE/" "$SERVER:/opt/avantfix-setup/"
note "$SERVER"

mkdir -p "$STATE"
printf '%s\n' "$SERVER" > "$STATE/host"

ssh -t "$SERVER" "DEPLOY_USER='$DEPLOY_USER' REPO_URL='$REPO_URL' bash /opt/avantfix-setup/server-setup.sh '$PUBKEY'"

HOST_ONLY="${SERVER#*@}"

say "Дальше"
note "обновить сайт:  ./deploy/deploy.sh"
note "откатиться:     ssh -i $KEY $DEPLOY_USER@$HOST_ONLY avantfix-update --rollback"
note "список выпусков: ssh -i $KEY $DEPLOY_USER@$HOST_ONLY avantfix-update --list"
