const [host, key] = process.argv.slice(2);

if (!host || !key) {
  console.error('нужны хост и ключ: node indexnow.mjs <host> <key>');
  process.exit(1);
}

const input = await new Promise((resolve) => {
  let text = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => (text += chunk));
  process.stdin.on('end', () => resolve(text));
});

const urlList = [...new Set(input.split('\n').map((s) => s.trim()).filter(Boolean))];

if (urlList.length === 0) {
  console.log(`${host}: страницы не менялись`);
  process.exit(0);
}

const LIMIT = 10000;
if (urlList.length > LIMIT) urlList.length = LIMIT;

const response = await fetch('https://yandex.com/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList,
  }),
});

const verdict = {
  200: 'принято',
  202: 'принято, ключ проверяется',
  400: 'неверный формат запроса',
  403: 'ключ не подошёл',
  422: 'адреса не с этого хоста или ключ не совпал',
  429: 'слишком часто',
}[response.status];

console.log(`${host}: ${urlList.length} стр. → ${response.status} ${verdict ?? ''}`.trim());

if (response.status >= 400) process.exit(1);
