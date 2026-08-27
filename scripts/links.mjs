import fs from 'node:fs';
import path from 'node:path';

const CITIES = ['belgorod', 'oskol', 'gubkin'];
const ASSET = /\.(css|js|mjs|png|jpg|jpeg|webp|avif|svg|xml|txt|ico|json|webmanifest|woff2?)$/;

function pages(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...pages(full));
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function toUrl(file, root) {
  const rel = file.slice(root.length).split(path.sep).join('/');
  return rel.replace(/index\.html$/, '');
}

let problems = 0;

for (const city of CITIES) {
  const root = path.join('dist', city);
  if (!fs.existsSync(root)) continue;

  const files = pages(root);
  const exists = new Set(files.map((f) => toUrl(f, root)));

  const missing = new Map();

  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
      let url = m[1];
      if (ASSET.test(url)) continue;
      if (!url.endsWith('/')) url += '/';
      if (exists.has(url)) continue;

      if (!missing.has(url)) missing.set(url, new Set());
      missing.get(url).add(toUrl(file, root));
    }
  }

  for (const [url, from] of missing) {
    problems++;
    console.log(`${city}: нет ${url} — ссылаются ${[...from].slice(0, 3).join(', ')}`);
  }
}

console.log(
  problems ? `\nБитых внутренних ссылок: ${problems}` : '\nВсе внутренние ссылки ведут на существующие страницы.',
);
process.exitCode = problems ? 1 : 0;
