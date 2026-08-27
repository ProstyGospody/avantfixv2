#!/usr/bin/env bash

set -euo pipefail

HOST="${DEPLOY_HOST:-}"
ROOT="${DEPLOY_ROOT:-/var/www/avantfix}"
CITIES=(belgorod oskol gubkin)
KEEP="${DEPLOY_KEEP:-5}"

if [[ -z "$HOST" ]]; then
  echo "Не задан DEPLOY_HOST. Пример:" >&2
  echo "  DEPLOY_HOST=deploy@avantfix.ru ./deploy/release.sh --build" >&2
  exit 1
fi

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

if [[ "${1:-}" == "--list" ]]; then
  for city in "${CITIES[@]}"; do
    say "$city"
    ssh "$HOST" "ls -1t $ROOT/$city/releases 2>/dev/null | head -$KEEP; \
                 echo -n 'сейчас: '; readlink $ROOT/$city/current || echo '—'"
  done
  exit 0
fi

if [[ "${1:-}" == "--rollback" ]]; then
  say "Откат на предыдущий выпуск"
  for city in "${CITIES[@]}"; do
    ssh "$HOST" "set -e
      cd $ROOT/$city/releases
      current=\$(basename \$(readlink $ROOT/$city/current))
      previous=\$(ls -1t | grep -v \"^\$current\$\" | head -1)
      if [ -z \"\$previous\" ]; then echo '$city: откатывать не на что'; exit 1; fi
      ln -sfn $ROOT/$city/releases/\$previous $ROOT/$city/current.tmp
      mv -Tf $ROOT/$city/current.tmp $ROOT/$city/current
      echo \"$city: \$current → \$previous\""
  done
  exit 0
fi

if [[ "${1:-}" == "--build" ]]; then
  say "Сборка"
  npm run build
fi

for city in "${CITIES[@]}"; do
  if [[ ! -f "dist/$city/index.html" ]]; then
    echo "Нет dist/$city — соберите: npm run build" >&2
    exit 1
  fi
done

say "Проверки"
node scripts/links.mjs
node scripts/anchors.mjs
node scripts/orphan-classes.mjs

STAMP="$(date +%Y-%m-%d-%H%M%S)"
say "Выпуск $STAMP"

for city in "${CITIES[@]}"; do
  target="$ROOT/$city/releases/$STAMP"

  ssh "$HOST" "mkdir -p $ROOT/$city/releases"

  previous=$(ssh "$HOST" "ls -1t $ROOT/$city/releases 2>/dev/null | head -1" || true)
  link_dest=""
  [[ -n "$previous" ]] && link_dest="--link-dest=$ROOT/$city/releases/$previous"

  rsync -az --delete $link_dest "dist/$city/" "$HOST:$target/"

  ssh "$HOST" "ln -sfn $target $ROOT/$city/current.tmp && \
               mv -Tf $ROOT/$city/current.tmp $ROOT/$city/current"

  echo "  $city → $STAMP"
done

say "Чистка: держим последние $KEEP"
for city in "${CITIES[@]}"; do
  ssh "$HOST" "cd $ROOT/$city/releases && ls -1t | tail -n +$((KEEP + 1)) | xargs -r rm -rf"
done

say "Готово. Откатиться: ./deploy/release.sh --rollback"
