import fs from 'node:fs';
import path from 'node:path';

const CITIES = ['belgorod', 'oskol', 'gubkin'];

const SAMPLES = [
  '/',
  '/remont-stiralnyh-mashin/',
  '/remont-stiralnyh-mashin/ceny/',
  '/remont-stiralnyh-mashin/ne-slivaet-vodu/',
  '/remont-stiralnyh-mashin/bosch/',
  '/kontakty/',
  '/o-kompanii/',
  '/garantiya/',
  '/otzyvy/',
  '/spasibo/',

  '/404.html',
  '/politika-konfidencialnosti/',
  '/soglasie/',
];

function toneOf(classes) {
  if (/\bcta\b/.test(classes)) return 'тёмная';

  if (/\bbar\b/.test(classes)) return 'притенённая';
  if (/\bph\b/.test(classes)) return 'шапка';
  if (/section--sunken/.test(classes)) return 'притенённая';
  if (/\bsection\b/.test(classes)) return 'белая';
  return null;
}

function topLevelSections(html) {
  const main = html.match(/<main[^>]*>([\s\S]*)<\/main>/);
  if (!main) return [];

  const body = main[1];
  const out = [];
  const tag = /<(section|div)\b([^>]*)>|<\/(section|div)>/g;
  let depth = 0;
  let m;

  while ((m = tag.exec(body))) {
    if (m[3]) {
      depth--;
      continue;
    }
    if (depth === 0 && m[1] === 'section') {
      const cls = (m[2].match(/class="([^"]*)"/) || [, ''])[1];
      const tone = toneOf(cls);
      if (tone) out.push({ tone, cls: cls.split(/\s+/).slice(0, 3).join(' ') });
    }
    depth++;
  }
  return out;
}

let problems = 0;

for (const city of CITIES) {
  for (const url of SAMPLES) {
    const file = url.endsWith('.html')
      ? path.join('dist', city, url.slice(1))
      : path.join('dist', city, url.slice(1), 'index.html');
    if (!fs.existsSync(file)) continue;

    const sections = topLevelSections(fs.readFileSync(file, 'utf8'));

    const last = sections.at(-1);
    if (last && last.tone === 'притенённая') {
      problems++;
      console.log(
        `${city}${url} — последняя секция «${last.cls}» притенённая и сливается с подвалом`,
      );
    }

    for (let i = 1; i < sections.length; i++) {
      const a = sections[i - 1];
      const b = sections[i];

      if (a.tone === b.tone && (a.tone === 'белая' || a.tone === 'притенённая')) {
        problems++;
        console.log(
          `${city}${url} — подряд две ${a.tone === 'белая' ? 'белые' : 'притенённые'} секции: ` +
            `«${a.cls}» и «${b.cls}» (позиции ${i}, ${i + 1})`,
        );
      }
    }
  }
}

console.log(problems ? `\nСбоев ритма: ${problems}` : '\nЧередование тона в порядке.');
process.exitCode = problems ? 1 : 0;
