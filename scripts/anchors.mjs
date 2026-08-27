import fs from 'node:fs';
import path from 'node:path';

const CITIES = ['belgorod', 'oskol', 'gubkin'];

function pages(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...pages(full));
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

let problems = 0;
let checked = 0;

for (const city of CITIES) {
  const root = path.join('dist', city);
  if (!fs.existsSync(root)) continue;

  for (const file of pages(root)) {
    const html = fs.readFileSync(file, 'utf8');
    checked++;

    const ids = new Set();
    for (const m of html.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1]);

    const missing = new Set();
    for (const m of html.matchAll(/href="#([^"]+)"/g)) {
      if (!ids.has(m[1])) missing.add(m[1]);
    }

    if (missing.size) {
      problems += missing.size;
      const url = file.replace(path.join('dist', ''), '').replace(/\\/g, '/');
      console.log(`${url} — якорь без цели: ${[...missing].map((a) => '#' + a).join(', ')}`);
    }
  }
}

console.log(
  problems
    ? `\nЯкорей без цели: ${problems}`
    : `\nВсе внутренние якоря ведут к своим блокам (страниц проверено: ${checked}).`,
);
process.exitCode = problems ? 1 : 0;
