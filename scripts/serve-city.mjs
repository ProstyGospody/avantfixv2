import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const [, , city = 'belgorod', portArg = '4322'] = process.argv;
const port = Number(portArg);
const root = path.resolve('dist', city);

if (!fs.existsSync(root)) {
  console.error(`Нет сборки ${root}. Сначала: npm run build:${city}`);
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const target = path.resolve(root, '.' + path.posix.normalize(clean));
  if (target !== root && !target.startsWith(root + path.sep)) return null;

  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    const index = path.join(target, 'index.html');
    return fs.existsSync(index) ? index : null;
  }
  return fs.existsSync(target) ? target : null;
}

http
  .createServer((req, res) => {
    const file = resolveFile(req.url ?? '/');

    if (!file) {
      const notFound = path.join(root, '404.html');
      const body = fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Не найдено';
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }

    res.writeHead(200, {
      'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`${city} → http://127.0.0.1:${port}`);
  });
