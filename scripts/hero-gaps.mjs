import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join('dist', 'belgorod');

function pages(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...pages(full));
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const seen = new Map();

for (const file of pages(ROOT)) {
  const html = fs.readFileSync(file, 'utf8');
  const from = html.indexOf('<main');
  const to = html.indexOf('</main>');
  if (from < 0 || to < 0) continue;
  const main = html.slice(from, to);

  const first = main.match(/<section class="([^"]*)"/);
  if (!first) continue;

  const cls = first[1];
  const kind = /(^|\s)hero(\s|$)/.test(cls)
    ? 'Hero'
    : /(^|\s)ph(\s|$)/.test(cls)
      ? 'PageHero'
      : 'иное';

  const crumbs = main.includes('class="crumbs"') ? 'есть' : 'нет';
  const plain = cls.includes('ph--plain') ? ', без свечения' : '';

  const rest = main.slice(main.indexOf(first[0]) + first[0].length);
  const next = rest.match(/<section class="([^"]*)"/);
  const tone = next
    ? next[1].includes('section--sunken')
      ? 'притенённая'
      : 'обычная'
    : 'секции нет';

  const key = `${kind}${plain} | крошки: ${crumbs} | вторая секция: ${tone}`;
  const url = file.slice(ROOT.length).replace(/\\/g, '/').replace(/index\.html$/, '') || '/';

  if (!seen.has(key)) seen.set(key, []);
  seen.get(key).push(url);
}

console.log(`Разных сочетаний: ${seen.size}\n`);
for (const [key, list] of [...seen].sort()) {
  console.log(`${key}`);
  console.log(`  страниц ${list.length}, например ${list[0]}`);
}
