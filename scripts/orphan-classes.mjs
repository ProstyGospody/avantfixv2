import fs from 'node:fs';
import path from 'node:path';

const GLOBAL_CSS = ['src/styles/global.css', 'src/styles/tokens.css'];
const DIRS = ['src/components', 'src/layouts', 'src/pages'];

const globalClasses = new Set();
for (const file of GLOBAL_CSS) {
  const css = fs.readFileSync(file, 'utf8');
  for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) globalClasses.add(m[1]);
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.name.endsWith('.astro')) out.push(full);
  }
  return out;
}

const CLASS_NAME = /^[a-zA-Z][\w-]*$/;

const files = DIRS.flatMap((d) => (fs.existsSync(d) ? walk(d) : []));
let problems = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');

  const styleMatch = src.match(/<style>([\s\S]*?)<\/style>/);
  const localCss = styleMatch ? styleMatch[1] : '';
  const local = new Set();
  for (const m of localCss.matchAll(/\.([a-zA-Z][\w-]*)/g)) local.add(m[1]);

  const markup = src
    .replace(/^---[\s\S]*?---/, '')
    .replace(/<style>[\s\S]*?<\/style>/g, '');

  const used = new Set();

  for (const m of markup.matchAll(/class(?::list)?="([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/)) {
      if (CLASS_NAME.test(cls)) used.add(cls);
    }
  }

  for (const m of markup.matchAll(/class(?::list)?=\{([^}]*)\}/g)) {
    for (const lit of m[1].matchAll(/['"`]([^'"`]+)['"`]/g)) {
      for (const cls of lit[1].split(/\s+/)) {
        if (CLASS_NAME.test(cls)) used.add(cls);
      }
    }
  }

  const orphans = [...used].filter((c) => !local.has(c) && !globalClasses.has(c));
  if (orphans.length) {
    problems += orphans.length;
    console.log(`${file}\n  ${orphans.join(', ')}`);
  }
}

console.log(problems === 0 ? 'Классов без стилей не найдено.' : `\nВсего: ${problems}`);
