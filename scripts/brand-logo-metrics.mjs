import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = 'public/brands';
const OUT = path.join('src', 'data', 'brandLogoMetrics.ts');

const W = 600;

const ALPHA = 12;

function sized(svg, w, h) {
  return svg.replace(/<svg\b[^>]*>/, (tag) =>
    tag.replace(/\s(width|height)="[^"]*"/g, '').replace(/<svg\b/, `<svg width="${w}" height="${h}"`),
  );
}

const metrics = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.svg')).sort()) {
  const slug = file.replace(/\.svg$/, '');
  const svg = fs.readFileSync(path.join(DIR, file), 'utf8');

  const vb = svg.match(/viewBox="([-\d.\s]+)"/);
  if (!vb) {
    console.log(`${slug}: нет viewBox — пропущен`);
    continue;
  }
  const [, , bw, bh] = vb[1].trim().split(/\s+/).map(Number);
  if (!(bw > 0 && bh > 0)) {
    console.log(`${slug}: странный viewBox — пропущен`);
    continue;
  }

  const h = Math.max(1, Math.round((W * bh) / bw));
  const { data, info } = await sharp(Buffer.from(sized(svg, W, h)), { limitInputPixels: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = info.channels;
  let x0 = info.width;
  let y0 = info.height;
  let x1 = -1;
  let y1 = -1;
  let painted = 0;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * ch + ch - 1] > ALPHA) {
        painted++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }

  if (x1 < 0) {
    console.log(`${slug}: краски не найдено — пропущен`);
    continue;
  }

  const iw = x1 - x0 + 1;
  const ih = y1 - y0 + 1;
  const r3 = (n) => Math.round(n * 1000) / 1000;

  metrics.push({
    slug,
    box: r3(bw / bh),
    w: r3(iw / info.width),
    h: r3(ih / info.height),

    cx: r3((x0 + x1 + 1) / 2 / info.width),
    cy: r3((y0 + y1 + 1) / 2 / info.height),
    fill: r3(painted / (iw * ih)),
  });
}

const fills = metrics.map((m) => m.fill).sort((a, b) => a - b);
const median = fills[Math.floor(fills.length / 2)];

const body = metrics
  .map(
    (m) =>
      `  '${m.slug}': { box: ${m.box}, w: ${m.w}, h: ${m.h}, cx: ${m.cx}, cy: ${m.cy}, fill: ${m.fill} },`,
  )
  .join('\n');

const file = `export interface LogoMetrics {
  box: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  fill: number;
}
export const MEDIAN_FILL = ${median};

export const LOGO_METRICS: Record<string, LogoMetrics> = {
${body}
};
`;

fs.writeFileSync(OUT, file, 'utf8');
console.log(`\n${OUT} — знаков ${metrics.length}, медианная плотность ${median}`);
