import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const TITLE_MAX = 70;
const DESC_MIN = 70;
const DESC_MAX = 180;
const PAGE_GZIP_MAX = 60 * 1024;

const HOSTS = {
  belgorod: 'https://avantfix.ru',
  oskol: 'https://staryj-oskol.avantfix.ru',
  gubkin: 'https://gubkin.avantfix.ru',
};

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function pick(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

function decode(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

let problems = 0;
const report = [];

for (const [city, origin] of Object.entries(HOSTS)) {
  const root = path.join('dist', city);
  if (!fs.existsSync(root)) {
    console.error(`нет сборки: ${root} — запустите npm run build`);
    process.exit(1);
  }

  const files = walk(root);
  const titles = new Map();
  const descs = new Map();
  let maxGzip = 0;
  let heaviest = '';
  let placeholderPhones = 0;

  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    const rel = '/' + path.relative(root, file).replace(/\\/g, '/').replace(/index\.html$/, '');
    const fail = (msg) => {
      problems++;
      report.push(`${city}${rel} — ${msg}`);
    };

    const noindex = /name="robots" content="noindex/.test(html);

    const title = pick(html, /<title>([\s\S]*?)<\/title>/);
    if (!title) fail('нет title');
    else {
      const t = decode(title);
      if (t.length > TITLE_MAX) fail(`title ${t.length} симв. (>${TITLE_MAX}): ${t}`);
      if (!noindex) {
        if (titles.has(t)) fail(`title дублирует ${titles.get(t)}`);
        else titles.set(t, rel);
      }
    }

    const desc = pick(html, /<meta name="description" content="([\s\S]*?)"/);
    if (!desc) fail('нет description');
    else if (!noindex) {
      const d = decode(desc);
      if (d.length > DESC_MAX) fail(`description ${d.length} симв. (>${DESC_MAX})`);
      if (d.length < DESC_MIN) fail(`description ${d.length} симв. (<${DESC_MIN})`);
      if (descs.has(d)) fail(`description дублирует ${descs.get(d)}`);
      else descs.set(d, rel);
    }

    const h1count = (html.match(/<h1[\s>]/g) ?? []).length;
    if (h1count !== 1) fail(`h1 на странице: ${h1count} (нужен ровно один)`);

    const canonical = pick(html, /<link rel="canonical" href="([^"]+)"/);
    if (!canonical) fail('нет canonical');
    else if (!noindex) {
      if (!canonical.startsWith(origin + '/')) fail(`canonical на чужой хост: ${canonical}`);
      if (!canonical.endsWith('/')) fail(`canonical без слеша: ${canonical}`);
      if (canonical !== `${origin}${rel}`) fail(`canonical ${canonical} не совпадает с путём ${rel}`);
    }

    for (const m of html.matchAll(/type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        JSON.parse(m[1]);
      } catch (err) {
        fail(`битый JSON-LD: ${err.message}`);
      }
    }

    const gz = zlib.gzipSync(Buffer.from(html)).length;
    if (gz > maxGzip) {
      maxGzip = gz;
      heaviest = rel;
    }
    if (gz > PAGE_GZIP_MAX) fail(`страница ${(gz / 1024).toFixed(0)} КБ в gzip`);

    if (/00-00-00/.test(html)) placeholderPhones++;
  }

  report.push(
    `\n${city}: ${files.length} страниц, из них ${titles.size} индексируемых — title у всех разные; ` +
      `самая тяжёлая ${heaviest} (${(maxGzip / 1024).toFixed(1)} КБ gzip)`,
  );
  if (placeholderPhones) {
    report.push(`  ⚠ телефон-заглушка 00-00-00 на ${placeholderPhones} страницах`);
  }
}

const SIMILARITY_MAX = 0.5;

function visibleText(html) {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  return (main ? main[1] : html)
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .toLowerCase()
    .replace(/[^а-яёa-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function similarity(aWords, bWords) {
  const shingles = (words) => {
    const set = new Set();
    for (let i = 0; i + 3 <= words.length; i++) set.add(words.slice(i, i + 3).join(' '));
    return set;
  };
  const a = shingles(aWords);
  const b = shingles(bWords);
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  for (const s of a) if (b.has(s)) common++;
  return common / (a.size + b.size - common);
}

const cities = Object.keys(HOSTS);
const pairs = [];
for (let i = 0; i < cities.length; i++) {
  for (let j = i + 1; j < cities.length; j++) pairs.push([cities[i], cities[j]]);
}

const base = cities[0];
const allPages = walk(path.join('dist', base)).map(
  (f) => '/' + path.relative(path.join('dist', base), f).replace(/\\/g, '/').replace(/index\.html$/, ''),
);

const hubs = new Set(
  fs
    .readdirSync(path.join('dist', base), { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('remont-'))
    .map((e) => `/${e.name}/`),
);

function classify(page, html) {
  if (page === '/') return 'главная';

  if (page === '/otzyvy/') return 'отзывы';
  if (hubs.has(page)) return 'хабы услуг';

  const parts = page.split('/').filter(Boolean);
  if (parts.length !== 2) return 'служебные';
  if (parts[1] === 'ceny') return 'прайсы';

  return /"@type":"HowTo"/.test(html) ? 'неисправности' : 'марки';
}

const CRITICAL = new Set(['главная', 'хабы услуг', 'прайсы', 'неисправности', 'марки', 'отзывы']);

const byType = new Map();
const overLimit = [];

for (const page of allPages) {
  const baseFile = path.join('dist', base, page, 'index.html');
  if (!fs.existsSync(baseFile)) continue;
  const type = classify(page, fs.readFileSync(baseFile, 'utf8'));
  if (type === 'служебные') continue;

  for (const [a, b] of pairs) {
    const fileA = path.join('dist', a, page, 'index.html');
    const fileB = path.join('dist', b, page, 'index.html');
    if (!fs.existsSync(fileA) || !fs.existsSync(fileB)) continue;

    const sim = similarity(
      visibleText(fs.readFileSync(fileA, 'utf8')),
      visibleText(fs.readFileSync(fileB, 'utf8')),
    );

    const cur = byType.get(type) ?? { max: 0, where: '', sum: 0, n: 0 };
    cur.sum += sim;
    cur.n++;
    if (sim > cur.max) {
      cur.max = sim;
      cur.where = `${page} (${a} ↔ ${b})`;
    }
    byType.set(type, cur);

    if (sim > SIMILARITY_MAX && CRITICAL.has(type)) {
      overLimit.push(`${page} ${a} ↔ ${b}: ${(sim * 100).toFixed(0)}%`);
      problems++;
    }
  }
}

report.push(`\nСхожесть контента между городами (порог для критичных типов ${SIMILARITY_MAX * 100}%):`);
for (const [type, s] of byType) {
  const mark = CRITICAL.has(type) ? (s.max > SIMILARITY_MAX ? '✗' : '✓') : ' ';
  report.push(
    `  ${mark} ${type.padEnd(16)} среднее ${((s.sum / s.n) * 100).toFixed(0)}%, ` +
      `максимум ${(s.max * 100).toFixed(0)}% — ${s.where}`,
  );
}
for (const line of overLimit) report.push(`  ✗ ${line}`);

console.log(report.join('\n'));
console.log(problems === 0 ? '\nПроблем не найдено.' : `\nПроблем: ${problems}`);
process.exit(problems === 0 ? 0 : 1);
