import fs from 'node:fs';
import path from 'node:path';

const files = [
  { from: 'src/assets/logo-mark.svg', to: 'public/logo-mark.svg' },
  { from: 'src/assets/logo-wordmark.svg', to: 'public/logo-wordmark.svg' },
];

const round = (svg) =>
  svg

    .replace(/-?\d+\.\d{3,}/g, (m) => String(Math.round(parseFloat(m) * 100) / 100))

    .replace(/>\s+</g, '><')
    .trim();

for (const { from, to } of files) {
  if (!fs.existsSync(from)) {
    console.error(`нет файла: ${from}`);
    continue;
  }
  const src = fs.readFileSync(from, 'utf8');
  const out = round(src);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, out, 'utf8');

  const was = Buffer.byteLength(src);
  const now = Buffer.byteLength(out);
  console.log(
    `${to} — ${(was / 1024).toFixed(1)} КБ → ${(now / 1024).toFixed(1)} КБ ` +
      `(−${Math.round((1 - now / was) * 100)}%)`,
  );
}

const BRANDS = 'public/brands';

const clean = (svg) =>
  svg

    .replace(/<path[^>]*\sd=""[^>]*\/>\s*/g, '')

    .replace(/\stransform="translate\(0,\s*0\)"/g, '')

    .replace(/(?<![\d.])\d+\.\d{3,}|(?<!e)-\d+\.\d{3,}/g, (m, off, str) => {
      let short = String(Math.round(parseFloat(m) * 100) / 100);
      const prev = str[off - 1] ?? '';
      const next = str[off + m.length];
      if (m[0] === '-' && short[0] !== '-' && /[\d.]/.test(prev)) short = ' ' + short;
      if (next === '.' && !short.includes('.')) short += ' ';
      return short;
    })
    .replace(/>\s+</g, '><')
    .trim();

let saved = 0;
for (const f of fs.readdirSync(BRANDS).filter((f) => f.endsWith('.svg')).sort()) {
  const file = path.join(BRANDS, f);
  const src = fs.readFileSync(file, 'utf8');
  const out = clean(src);
  const was = Buffer.byteLength(src);
  const now = Buffer.byteLength(out);
  if (now >= was) continue;

  fs.writeFileSync(file, out + '\n', 'utf8');
  saved += was - now;
  if (was - now > 1024) {
    const pct = Math.round((1 - now / was) * 100);
    console.log(`  ${f.padEnd(22)} ${(was / 1024).toFixed(1)} → ${(now / 1024).toFixed(1)} КБ (−${pct}%)`);
  }
}
console.log(`знаки марок: сэкономлено ${(saved / 1024).toFixed(1)} КБ`);
