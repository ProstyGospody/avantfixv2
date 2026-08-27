import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = 'public/brands';
const WAS = process.argv[2] ?? null;
const W = 600;

function sized(svg, w, h) {
  return svg.replace(/<svg\b[^>]*>/, (tag) => {
    const clean = tag.replace(/\s(width|height)="[^"]*"/g, '');
    return clean.replace(/<svg\b/, `<svg width="${w}" height="${h}"`);
  });
}

function viewBox(svg) {
  const vb = svg.match(/viewBox="([-\d.\s]+)"/);
  if (!vb) return null;
  const [x, y, w, h] = vb[1].trim().split(/\s+/).map(Number);
  return [x, y, w, h].every(Number.isFinite) && w > 0 && h > 0 ? { x, y, w, h } : null;
}

async function ink(svg) {
  const box = viewBox(svg);
  if (!box) return null;
  const h = Math.max(1, Math.round((W * box.h) / box.w));

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
      if (data[(y * info.width + x) * ch + ch - 1] > 12) {
        painted++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { empty: true };

  const GX = 24;
  const GY = 8;
  const iw = x1 - x0 + 1;
  const ih = y1 - y0 + 1;
  const grid = new Array(GX * GY).fill(0);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (data[(y * info.width + x) * ch + ch - 1] > 12) {
        const gx = Math.min(GX - 1, Math.floor(((x - x0) / iw) * GX));
        const gy = Math.min(GY - 1, Math.floor(((y - y0) / ih) * GY));
        grid[gy * GX + gx]++;
      }
    }
  }
  const cell = (iw / GX) * (ih / GY);
  const print = grid.map((n) => Math.round((n / cell) * 9));

  return {
    empty: false,
    pct: {
      left: Math.round((x0 / info.width) * 1000) / 10,
      right: Math.round(((info.width - 1 - x1) / info.width) * 1000) / 10,
      top: Math.round((y0 / info.height) * 1000) / 10,
      bottom: Math.round(((info.height - 1 - y1) / info.height) * 1000) / 10,
    },
    ratio: Math.round((iw / ih) * 100) / 100,
    fill: Math.round((painted / (iw * ih)) * 1000) / 10,
    print,
  };
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.svg')).sort();
const loose = [];
const broken = [];

for (const file of files) {
  const now = await ink(fs.readFileSync(path.join(DIR, file), 'utf8'));

  if (!now) {
    broken.push(`${file}: нет viewBox`);
    continue;
  }
  if (now.empty) {
    broken.push(`${file}: пусто — рисунка нет`);
    continue;
  }

  if (WAS && fs.existsSync(path.join(WAS, file))) {
    const was = await ink(fs.readFileSync(path.join(WAS, file), 'utf8'));
    if (was && !was.empty) {
      let diff = 0;
      for (let i = 0; i < now.print.length; i++) diff += Math.abs(now.print[i] - was.print[i]);
      const off = diff / (now.print.length * 9);
      const dr = Math.abs(now.ratio - was.ratio) / was.ratio;
      if (off > 0.1 || dr > 0.08) {
        broken.push(
          `${file}: рисунок разошёлся на ${Math.round(off * 100)}%, ` +
            `пропорции ${was.ratio} → ${now.ratio}`,
        );
      }
    }
  }

  const worst = Math.max(now.pct.left, now.pct.right, now.pct.top, now.pct.bottom);
  if (worst > 2) {
    loose.push(
      `${file.padEnd(22)} поля Л${String(now.pct.left).padStart(5)} П${String(now.pct.right).padStart(5)}` +
        ` В${String(now.pct.top).padStart(5)} Н${String(now.pct.bottom).padStart(5)}`,
    );
  }
}

console.log(`Знаков: ${files.length}\n`);
console.log(broken.length ? `Сломано (${broken.length}):\n  ` + broken.join('\n  ') : 'Сломанных нет.');
console.log('');
if (loose.length) {
  console.log(
    `С полями внутри холста (${loose.length}) — на размер это не влияет:\n` +
      'вёрстка считает по обмеру краски, а не по рамке файла.\n  ' +
      loose.join('\n  '),
  );
} else {
  console.log('Поля внутри холста ни у кого не больше пары процентов.');
}
