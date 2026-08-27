#!/usr/bin/env bash

set -euo pipefail

REPO="${AVANTFIX_REPO:-/srv/avantfix/repo}"
ROOT="${AVANTFIX_ROOT:-/var/www/avantfix}"
BRANCH="${AVANTFIX_BRANCH:-main}"
ENV_FILE="${AVANTFIX_ENV:-/etc/avantfix/build.env}"
KEEP="${AVANTFIX_KEEP:-5}"
CITIES=(belgorod oskol gubkin)

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
note() { printf '  %s\n' "$*"; }

current_of() { basename "$(readlink "$ROOT/$1/current" 2>/dev/null || echo -)"; }

switch_to() {
  ln -sfn "$2" "$ROOT/$1/current.tmp"
  mv -Tf "$ROOT/$1/current.tmp" "$ROOT/$1/current"
}

if [[ "${1:-}" == "--list" ]]; then
  for city in "${CITIES[@]}"; do
    say "$city"
    { ls -1t "$ROOT/$city/releases" 2>/dev/null || true; } | head -"$KEEP" | sed 's/^/    /'
    note "сейчас: $(current_of "$city")"
  done
  exit 0
fi

exec 9>/tmp/avantfix-update.lock
if ! flock -n 9; then
  echo "Обновление уже идёт" >&2
  exit 1
fi

if [[ "${1:-}" == "--rollback" ]]; then
  say "Откат"
  for city in "${CITIES[@]}"; do
    cur="$(current_of "$city")"
    prev=$(ls -1t "$ROOT/$city/releases" 2>/dev/null | grep -vx "$cur" | head -1 || true)
    if [[ -z "$prev" ]]; then
      note "$city: откатывать не на что"
      continue
    fi
    switch_to "$city" "$ROOT/$city/releases/$prev"
    note "$city: $cur → $prev"
  done
  exit 0
fi

if [[ ! -d "$REPO/.git" ]]; then
  echo "Нет репозитория в $REPO" >&2
  exit 1
fi

cd "$REPO"

say "Код"
git fetch --quiet --prune origin
git reset --quiet --hard "origin/$BRANCH"
git clean --quiet -fdx dist
note "$(git log -1 --format='%h %s')"

say "Зависимости"
npm ci --no-audit --no-fund --silent

set -a
[[ -f "$ENV_FILE" ]] && . "$ENV_FILE"
set +a

say "Сборка"
for city in "${CITIES[@]}"; do
  var="METRIKA_${city^^}"
  PUBLIC_METRIKA_ID="${!var:-}" npm run --silent "build:$city"
  note "$city"
done

say "Проверки"
node scripts/links.mjs
node scripts/anchors.mjs
node scripts/orphan-classes.mjs

STAMP="$(date +%Y-%m-%d-%H%M%S)"
say "Выпуск $STAMP"
for city in "${CITIES[@]}"; do
  target="$ROOT/$city/releases/$STAMP"
  mkdir -p "$ROOT/$city/releases"
  prev=$(ls -1t "$ROOT/$city/releases" 2>/dev/null | head -1 || true)
  link=()
  [[ -n "$prev" ]] && link=(--link-dest="$ROOT/$city/releases/$prev")
  rsync -a --delete "${link[@]}" "$REPO/dist/$city/" "$target/"
  switch_to "$city" "$target"
  note "$city → $STAMP"
done

say "Чистка"
for city in "${CITIES[@]}"; do
  (cd "$ROOT/$city/releases" && ls -1t | tail -n +$((KEEP + 1)) | xargs -r rm -rf)
done
note "оставлено по $KEEP выпусков"

say "Готово"
note "откатиться: avantfix-update --rollback"
