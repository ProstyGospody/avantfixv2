import fs from 'node:fs';
import path from 'node:path';

const SRC = 'public/brands';
const SETS = [
  { dir: 'tinted', ink: '#666f7d', paper: '#ffffff' },
  { dir: 'inverse', ink: '#ffffff', paper: '#1f242c' },
];

const LIGHT = 0.82;

const luminance = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

function parse(color) {
  const s = color.trim().toLowerCase();
  if (s === 'black') return [0, 0, 0];
  if (s === 'white') return [255, 255, 255];

  const hex = s.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }

  const rgb = s.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number);
    if (parts.length === 3 && parts.every(Number.isFinite)) return parts;
  }
  return null;
}

const mapper = (ink, paper) => (color) => {
  const rgb = parse(color);
  if (!rgb) return null;
  return luminance(...rgb) >= LIGHT ? paper : ink;
};

function recolor(svg, map, ink) {
  let out = svg;

  out = out.replace(/(url\(\s*)?#[0-9a-fA-F]{3,8}\b/g, (m, url) => {
    if (url) return m;
    return map(m) ?? m;
  });

  out = out.replace(/\b(fill|stroke)\s*=\s*"(black|white)"/gi, (m, prop, name) => `${prop}="${map(name)}"`);
  out = out.replace(/\b(fill|stroke)\s*:\s*(black|white)\b/gi, (m, prop, name) => `${prop}:${map(name)}`);

  out = out.replace(/rgba?\([^)]+\)/gi, (m) => map(m) ?? m);

  out = out.replace(/<svg\b[^>]*>/, (tag) =>
    /\sfill\s*=/.test(tag) ? tag : tag.replace(/<svg\b/, `<svg fill="${ink}"`),
  );

  return out;
}

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.svg')).sort();
let bytes = 0;

for (const set of SETS) {
  const out = path.join(SRC, set.dir);
  fs.mkdirSync(out, { recursive: true });
  const map = mapper(set.ink, set.paper);

  for (const file of files) {
    const src = fs.readFileSync(path.join(SRC, file), 'utf8');
    const svg = recolor(src, map, set.ink);
    fs.writeFileSync(path.join(out, file), svg, 'utf8');
    bytes += Buffer.byteLength(svg);
  }

  console.log(`${out} — знаков ${files.length}`);
}

console.log(`всего ${(bytes / 1024).toFixed(1)} КБ`);
