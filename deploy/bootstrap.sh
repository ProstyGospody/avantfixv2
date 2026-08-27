#!/usr/bin/env bash

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ProstyGospody/avantfixv2.git}"
BRANCH="${BRANCH:-main}"
REPO_DIR=/srv/avantfix/repo

printf '\n\033[1mAvantFix\033[0m — развёртывание на %s\n' "$(hostname)"

if [[ ! -f /etc/debian_version ]]; then
  echo "Это не Ubuntu или Debian. Скрипт запускают на сервере, под root." >&2
  exit 1
fi

if [[ $EUID -ne 0 ]]; then
  echo "Запускать от root" >&2
  exit 1
fi

if [[ ! -t 0 ]] && [[ -e /dev/tty ]]; then
  exec < /dev/tty
fi

printf '\n\033[1mКод\033[0m\n'

if ! command -v git >/dev/null 2>&1; then
  printf '  ставлю git, это займёт минуту\n'
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq git ca-certificates >/dev/null
fi

install -d /srv/avantfix

if [[ -d "$REPO_DIR/.git" ]]; then
  owner=$(stat -c %U "$REPO_DIR")
  as_owner=(runuser -u "$owner" --)
  [[ "$owner" == root ]] && as_owner=()
  "${as_owner[@]}" git -C "$REPO_DIR" fetch --quiet --prune origin
  "${as_owner[@]}" git -C "$REPO_DIR" reset --quiet --hard "origin/$BRANCH"
else
  as_owner=()
  git clone --quiet --branch "$BRANCH" "$REPO_URL" "$REPO_DIR"
fi

printf '  %s\n' "$("${as_owner[@]}" git -C "$REPO_DIR" log -1 --format='%h %s')"

exec bash "$REPO_DIR/deploy/server-setup.sh"
