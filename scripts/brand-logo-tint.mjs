import fs from 'node:fs';
import path from 'node:path';

const SRC = 'public/brands';
const OUT = path.join(SRC, 'tinted');
const OUT_PATTERN = path.join(SRC, 'pattern');

const TINT = '#666f7d';
const PAPER = '#ffffff';

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

const map = (color) => {
  const rgb = parse(color);
  if (!rgb) return null;
  return luminance(...rgb) >= LIGHT ? PAPER : TINT;
};

function recolor(svg) {
  let out = svg;

  out = out.replace(/(url\(\s*)?#[0-9a-fA-F]{3,8}\b/g, (m, url) => {
    if (url) return m;
    return map(m) ?? m;
  });

  out = out.replace(/\b(fill|stroke)\s*=\s*"(black|white)"/gi, (m, prop, name) => `${prop}="${map(name)}"`);
  out = out.replace(/\b(fill|stroke)\s*:\s*(black|white)\b/gi, (m, prop, name) => `${prop}:${map(name)}`);

  out = out.replace(/rgba?\([^)]+\)/gi, (m) => map(m) ?? m);

  out = out.replace(/<svg\b[^>]*>/, (tag) =>
    /\sfill\s*=/.test(tag) ? tag : tag.replace(/<svg\b/, `<svg fill="${TINT}"`),
  );

  return out;
}

const CELL = { w: 330, h: 210 };
const MARK_W = 118;

function tile(svg, slug) {
  const vb = svg.match(/viewBox="([-\d.\s]+)"/);
  if (!vb) return null;
  const [vx, vy, vw, vh] = vb[1].trim().split(/\s+/).map(Number);
  if (!(vw > 0 && vh > 0)) return null;

  const markH = (MARK_W * vh) / vw;

  const inner = svg
    .replace(/^[\s\S]*?<svg\b[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim();

  const rootFill = (svg.match(/<svg\b[^>]*\sfill="([^"]+)"/) ?? [])[1];

  const at = (x, y) =>
    `<use href="#m-${slug}" x="${x}" y="${y}" width="${MARK_W}" height="${markH.toFixed(1)}" />`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL.w}" height="${CELL.h}" ` +
    `viewBox="0 0 ${CELL.w} ${CELL.h}"${rootFill ? ` fill="${rootFill}"` : ''}>` +
    `<defs><symbol id="m-${slug}" viewBox="${vx} ${vy} ${vw} ${vh}">${inner}</symbol></defs>` +
    at(28, (CELL.h * 0.16 - markH / 2).toFixed(1)) +
    at(CELL.w / 2 + 14, (CELL.h * 0.66 - markH / 2).toFixed(1)) +
    '</svg>\n'
  );
}

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(OUT_PATTERN, { recursive: true });

let made = 0;
let bytes = 0;
let tiles = 0;

for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith('.svg')).sort()) {
  const src = fs.readFileSync(path.join(SRC, file), 'utf8');
  const out = recolor(src);
  fs.writeFileSync(path.join(OUT, file), out, 'utf8');
  made++;
  bytes += Buffer.byteLength(out);

  const pattern = tile(out, file.replace(/\.svg$/, ''));
  if (pattern) {
    fs.writeFileSync(path.join(OUT_PATTERN, file), pattern, 'utf8');
    tiles++;
    bytes += Buffer.byteLength(pattern);
  }
}

console.log(`${OUT} — знаков ${made}`);
console.log(`${OUT_PATTERN} — плиток ${tiles}`);
console.log(`всего ${(bytes / 1024).toFixed(1)} КБ`);
