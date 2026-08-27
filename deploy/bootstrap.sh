#!/usr/bin/env bash

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ProstyGospody/avantfixv2.git}"
BRANCH="${BRANCH:-main}"
REPO_DIR=/srv/avantfix/repo

if [[ $EUID -ne 0 ]]; then
  echo "Запускать от root" >&2
  exit 1
fi

if [[ ! -t 0 ]] && [[ -e /dev/tty ]]; then
  exec < /dev/tty
fi

printf '\n\033[1mКод\033[0m\n'

if ! command -v git >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq git ca-certificates >/dev/null
fi

install -d /srv/avantfix

if [[ -d "$REPO_DIR/.git" ]]; then
  git -C "$REPO_DIR" fetch --quiet --prune origin
  git -C "$REPO_DIR" reset --quiet --hard "origin/$BRANCH"
else
  git clone --quiet --branch "$BRANCH" "$REPO_URL" "$REPO_DIR"
fi

printf '  %s\n' "$(git -C "$REPO_DIR" log -1 --format='%h %s')"

exec bash "$REPO_DIR/deploy/server-setup.sh"
