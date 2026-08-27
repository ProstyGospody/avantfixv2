import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = 'public/brands';
const FIX = process.argv.includes('--fix');

const PAD = 0.3;
const W = 1400;
const ALPHA = 12;

function rootSized(svg, viewBox, w, h) {
  return svg.replace(/<svg\b[^>]*>/, (tag) =>
    tag
      .replace(/\s(width|height)="[^"]*"/g, '')
      .replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`)
      .replace(/<svg\b/, `<svg width="${w}" height="${h}"`),
  );
}

async function inkBox(svg, viewBox, w, h) {
  const { data, info } = await sharp(Buffer.from(rootSized(svg, viewBox, w, h)), {
    limitInputPixels: false,
  })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = info.channels;
  let x0 = info.width;
  let y0 = info.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * ch + ch - 1] > ALPHA) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: info.width, h: info.height };
}

const clipped = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.svg')).sort()) {
  const full = path.join(DIR, file);
  const svg = fs.readFileSync(full, 'utf8');
  const vb = svg.match(/viewBox="([-\d.\s]+)"/);
  if (!vb) continue;

  const [bx, by, bw, bh] = vb[1].trim().split(/\s+/).map(Number);
  if (!(bw > 0 && bh > 0)) continue;

  const ex = bx - bw * PAD;
  const ey = by - bh * PAD;
  const ew = bw * (1 + PAD * 2);
  const eh = bh * (1 + PAD * 2);
  const ph = Math.max(1, Math.round((W * eh) / ew));

  const ink = await inkBox(svg, `${ex} ${ey} ${ew} ${eh}`, W, ph);
  if (!ink) continue;

  const ux0 = ex + (ink.x0 / ink.w) * ew;
  const ux1 = ex + ((ink.x1 + 1) / ink.w) * ew;
  const uy0 = ey + (ink.y0 / ink.h) * eh;
  const uy1 = ey + ((ink.y1 + 1) / ink.h) * eh;

  const out = {
    left: ((bx - ux0) / bw) * 100,
    right: ((ux1 - (bx + bw)) / bw) * 100,
    top: ((by - uy0) / bh) * 100,
    bottom: ((uy1 - (by + bh)) / bh) * 100,
  };
  const worst = Math.max(out.left, out.right, out.top, out.bottom);

  if (worst < 0.5) continue;

  const r = (n) => Math.round(n * 1000) / 1000;
  clipped.push({ file, out, worst, box: `${r(ux0)} ${r(uy0)} ${r(ux1 - ux0)} ${r(uy1 - uy0)}` });

  if (FIX) {
    const fixed = svg.replace(/<svg\b[^>]*>/, (tag) =>
      tag.replace(/viewBox="[^"]*"/, `viewBox="${r(ux0)} ${r(uy0)} ${r(ux1 - ux0)} ${r(uy1 - uy0)}"`),
    );
    fs.writeFileSync(full, fixed, 'utf8');
  }
}

if (!clipped.length) {
  console.log('Рисунок нигде не выходит за свой viewBox.');
} else {
  console.log(`${FIX ? 'Починено' : 'Обрезаны'} (${clipped.length}):`);
  for (const c of clipped) {
    const side = (k, n) => (n > 0.5 ? ` ${k} ${Math.round(n * 10) / 10}%` : '');
    console.log(
      `  ${c.file.padEnd(22)} вылет:${side('слева', c.out.left)}${side('справа', c.out.right)}` +
        `${side('сверху', c.out.top)}${side('снизу', c.out.bottom)}` +
        (FIX ? `\n  ${''.padEnd(22)} новый viewBox="${c.box}"` : ''),
    );
  }
  if (!FIX) console.log('\nПочинить: node scripts/brand-logo-uncrop.mjs --fix');
}
