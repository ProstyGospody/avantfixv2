import fs from 'node:fs';
import path from 'node:path';

const city = process.argv[2] ?? 'belgorod';
const dist = path.join('dist', city);
const out = path.join('preview', city);

const PAGES = [
  { url: '/', file: '1-glavnaya.html' },
  { url: '/remont-stiralnyh-mashin/', file: '2-hab-uslugi.html' },
  { url: '/remont-stiralnyh-mashin/ne-slivaet-vodu/', file: '3-neispravnost.html' },
  { url: '/remont-stiralnyh-mashin/ceny/', file: '4-ceny.html' },
  { url: '/kontakty/', file: '5-kontakty.html' },
];

const byUrl = new Map(PAGES.map((p) => [p.url, p.file]));

function readAsset(src) {
  const file = path.join(dist, src.replace(/^\//, ''));
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function inline(html) {
  html = html.replace(
    /<link rel="stylesheet" href="([^"]+)"[^>]*>/g,
    (m, src) => {
      const css = readAsset(src);
      return css ? `<style>${css}</style>` : m;
    },
  );

  html = html.replace(
    /<script type="module" src="([^"]+)"[^>]*><\/script>/g,
    (m, src) => {
      const js = readAsset(src);
      return js ? `<script type="module">${js}</script>` : '';
    },
  );

  const favicon = fs.existsSync(path.join(dist, 'favicon.svg'))
    ? fs.readFileSync(path.join(dist, 'favicon.svg'), 'utf8')
    : null;
  if (favicon) {
    const uri = `data:image/svg+xml;base64,${Buffer.from(favicon).toString('base64')}`;
    html = html.replace(/href="\/favicon\.svg"/, `href="${uri}"`);
  }
  html = html.replace(/<link rel="manifest"[^>]*>/, '');

  html = html.replace(/href="(\/[^"#]*)"/g, (m, url) => {
    const target = byUrl.get(url);
    return target ? `href="${target}"` : `href="#" data-нет-в-превью="${url}"`;
  });

  return html;
}

fs.mkdirSync(out, { recursive: true });

let total = 0;
for (const page of PAGES) {
  const src = path.join(dist, page.url, 'index.html');
  if (!fs.existsSync(src)) {
    console.error(`пропущено, нет файла: ${src}`);
    continue;
  }
  const html = inline(fs.readFileSync(src, 'utf8'));
  const dest = path.join(out, page.file);
  fs.writeFileSync(dest, html, 'utf8');
  total++;
  console.log(`${dest} — ${(Buffer.byteLength(html) / 1024).toFixed(0)} КБ`);
}

console.log(`\nГотово: ${total} страниц в ${out}`);
