# Развёртывание

Российский VPS (Timeweb / Beget / Selectel), Ubuntu 22.04+, Nginx, Node 22.12+.

РФ-хостинг здесь не предпочтение, а требование: 152-ФЗ обязывает хранить
персональные данные россиян на серверах в России, а заявки с форм — это
персональные данные. Плюс это даёт TTFB 20–50 мс по области и подтверждает
региональность для Яндекса.

## 1. Сборка

Локально или в CI:

```bash
npm ci
npm run build
```

На выходе — три независимых каталога:

```
dist/belgorod/   → avantfix.ru
dist/oskol/      → oskol.avantfix.ru
dist/gubkin/     → gubkin.avantfix.ru
```

## 2. Выкладка

Один раз, перед первым выпуском, — папки на сервере. Владелец здесь тот
пользователь, под которым ходит ssh, а не www-data: заливает файлы он,
а Nginx их только читает.

```bash
sudo mkdir -p /var/www/avantfix/{belgorod,oskol,gubkin}/releases
sudo chown -R deploy:deploy /var/www/avantfix
```

Дальше — одной командой с рабочей машины:

```bash
DEPLOY_HOST=deploy@avantfix.ru ./deploy/release.sh --build
```

Скрипт собирает три города, прогоняет проверки по собранному (ссылки,
якоря, классы без стилей), заливает каждый город в свою папку выпуска
и переключает симлинк.

Раскладка на сервере:

```
/var/www/avantfix/belgorod/
  releases/2026-08-27-120500/   ← выпуски, храним последние пять
  releases/2026-08-27-093000/
  current → releases/2026-08-27-120500
```

Nginx смотрит в `current`, поэтому выкладка меняет ровно одну ссылку.
Это важнее, чем кажется: копирование пятисот файлов идёт секунды, и всё
это время посетитель видел бы смесь версий — новый HTML со ссылкой
на ещё не доехавший CSS. С симлинком промежуточного состояния нет.

Файлы, не изменившиеся с прошлого раза, не заливаются заново, а жёстко
линкуются на предыдущий выпуск (`rsync --link-dest`): выпуск занимает
место только под то, что реально поменялось.

### Откат

```bash
DEPLOY_HOST=deploy@avantfix.ru ./deploy/release.sh --rollback
```

Переставляет симлинк на предыдущий выпуск — секунда, без пересборки
и без заливки. Посмотреть, что лежит на сервере: `--list`.

### Обычный цикл обновления

1. Правки в коде или данных.
2. `npm run dev` — посмотреть локально.
3. `DEPLOY_HOST=… ./deploy/release.sh --build`.
4. Если что-то не так — `--rollback`, разбираться уже без спешки.

Тексты, цены, марки и неисправности лежат в `src/data/`; правка там —
это тоже обычное обновление через тот же цикл, отдельной админки нет
и для статического сайта не нужно.

### Автоматическая выкладка

Пуш в `main` собирает и раскатывает сайт сам —
[.github/workflows/deploy.yml](../.github/workflows/deploy.yml). Можно
запустить и руками: вкладка Actions, кнопка Run workflow.

Сборка идёт по городам отдельно: у каждого свой счётчик Метрики, а его
номер попадает в HTML на этапе сборки — одной переменной на три города
не обойтись.

Что завести в настройках репозитория, Settings → Secrets and variables → Actions.

**Секреты:**

| Имя | Что это |
|---|---|
| `DEPLOY_HOST` | `deploy@avantfix.ru` |
| `DEPLOY_KEY` | приватный ключ целиком, вместе со строками BEGIN и END |
| `DEPLOY_KNOWN_HOSTS` | отпечаток сервера |

**Переменные** (не секреты — номера счётчиков и так видны в коде страницы):

| Имя | Что это |
|---|---|
| `METRIKA_BELGOROD` | номер счётчика для avantfix.ru |
| `METRIKA_OSKOL` | для oskol.avantfix.ru |
| `METRIKA_GUBKIN` | для gubkin.avantfix.ru |

Ключ для выкладки — отдельный, не тот, которым вы сами ходите на сервер:

```bash
ssh-keygen -t ed25519 -f avantfix-deploy -N "" -C "github actions"
ssh-copy-id -i avantfix-deploy.pub deploy@avantfix.ru
```

Содержимое `avantfix-deploy` кладётся в `DEPLOY_KEY`, после чего файл
с диска лучше стереть — он больше нигде не нужен.

Отпечаток сервера:

```bash
ssh-keyscan avantfix.ru
```

Вывод целиком — в `DEPLOY_KNOWN_HOSTS`. Без него пришлось бы отключать
проверку хоста, а это открытая дверь для подмены сервера между
раннером и вами.

Если проверки ссылок, якорей или классов не проходят, выкладка
не начинается — на сервер уезжает только то, что собралось и прошло
контроль.

## 3. Nginx

```bash
sudo cp deploy/nginx/avantfix-common.conf /etc/nginx/snippets/
sudo cp deploy/nginx/avantfix.conf /etc/nginx/sites-available/avantfix
sudo ln -sf /etc/nginx/sites-available/avantfix /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Сертификаты — одним запросом на все имена:

```bash
sudo certbot --nginx -d avantfix.ru -d www.avantfix.ru -d belgorod.avantfix.ru -d oskol.avantfix.ru -d gubkin.avantfix.ru
```

## 4. Приём заявок

```bash
sudo mkdir -p /opt/avantfix /var/log/avantfix
sudo cp deploy/lead-service.mjs deploy/mailer.mjs /opt/avantfix/
sudo chown -R www-data:www-data /var/log/avantfix
sudo cp deploy/avantfix-lead.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now avantfix-lead
```

Проверка:

```bash
curl -i -X POST http://127.0.0.1:8787/api/lead -d "name=Тест&phone=%2B79000000000&consent=on&city=belgorod"
```

Заявки пишутся в `/var/log/avantfix/leads.jsonl`. Журнал первичен: он
пишется до уведомлений, поэтому упавший канал заявку не теряет.

Дальше заявка уходит двумя независимыми путями — в Telegram и на почту.
Оба необязательны и включаются переменными в юните.

### Telegram

`TELEGRAM_TOKEN` от @BotFather и `TELEGRAM_CHAT_ID` чата, куда слать.

### Почта

```
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465          # 465 — шифрование сразу; 25/587 — открытое
SMTP_USER=zayavki@avantfix.ru
SMTP_PASS=…            # пароль приложения, не пароль от ящика
MAIL_TO=master@…, buh@…   # несколько адресов — через запятую
MAIL_FROM=             # необязательно, по умолчанию SMTP_USER
```

Отправка своя, без зависимостей — [mailer.mjs](mailer.mjs), около полутора
сотен строк на голом протоколе. Письмо уходит в UTF-8: тема по RFC 2047,
тело base64.

Пароль приложения берётся в почте: Яндекс — «Пароли приложений» в настройках
аккаунта, Mail.ru — «Пароли для внешних приложений». Обычный пароль от ящика
для SMTP не подойдёт и хранить его в юните не стоит.

Проверить, что почта уходит:

```bash
sudo systemctl restart avantfix-lead
curl -s -X POST http://127.0.0.1:8787/api/lead   --data-urlencode "name=Проверка" --data-urlencode "phone=+79000000000"   --data-urlencode "consent=on" --data-urlencode "city=belgorod"
sudo journalctl -u avantfix-lead -n 20 --no-pager
```

Если письма нет — в журнале сервиса будет строка с ответом сервера,
по нему сразу видно, что не так: логин, пароль, порт или адрес.

## 5. DNS

| Запись | Тип | Значение |
|---|---|---|
| `@` | A | IP сервера |
| `www` | A | IP сервера |
| `belgorod` | A | IP сервера |
| `oskol` | A | IP сервера |
| `gubkin` | A | IP сервера |

`www` и `belgorod` существуют только ради 301 на главный домен — так занятые
зеркала не достанутся никому другому и не разведут дубли.

## 6. После первого деплоя

- [ ] Яндекс.Вебмастер: добавить и подтвердить 3 хоста (`avantfix.ru`,
      `oskol.avantfix.ru`, `gubkin.avantfix.ru`) — каждый как отдельный сайт
- [ ] Присвоить каждому хосту свой регион
- [ ] Загрузить sitemap на каждом хосте
- [ ] Завести 3 счётчика Яндекс.Метрики и вписать их номера в переменные
      `METRIKA_BELGOROD`, `METRIKA_OSKOL`, `METRIKA_GUBKIN` в настройках репозитория
- [ ] Настроить цели: звонок, отправка формы, WhatsApp
- [ ] Прописать в юните `TELEGRAM_*` и `SMTP_*` — до этого заявки только в журнале
- [ ] Отправить тестовую заявку с сайта и убедиться, что пришла в оба канала
- [ ] Проверить страницы в валидаторе микроразметки Яндекса
- [ ] Прогнать главную и хабы через PageSpeed Insights на мобильном профиле
