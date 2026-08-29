import fs from 'node:fs';
import sharp from 'sharp';

const ACCENT = '#2560f0';
const INK = '#12161b';

const src = fs.readFileSync('src/assets/logo-mark.svg', 'utf8');
const paths = [...src.matchAll(/<path d="([^"]+)"[^>]*>/g)].map((m) => m[1]);

if (paths.length !== 3) {
  console.error(`ожидалось 3 контура, найдено ${paths.length}`);
  process.exit(1);
}

function markSvg({ size, color, box = 312 }) {
  const body = paths.map((d) => `<path d="${d}" />`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}" width="${size}" height="${size}" fill="${color}">${body}</svg>`;
}

fs.writeFileSync('public/favicon.svg', markSvg({ size: 312, color: ACCENT }), 'utf8');
console.log(`public/favicon.svg — ${(fs.statSync('public/favicon.svg').size / 1024).toFixed(1)} КБ`);

const png180 = await sharp(Buffer.from(markSvg({ size: 180, color: ACCENT })), { density: 300 })
  .resize(180, 180)
  .png({ compressionLevel: 9 })
  .toBuffer();
fs.writeFileSync('public/apple-touch-icon.png', png180);
console.log(`public/apple-touch-icon.png — 180×180, ${(png180.length / 1024).toFixed(1)} КБ`);

const ICO_SIZES = [16, 32, 48];

const icoParts = await Promise.all(
  ICO_SIZES.map((size) =>
    sharp(Buffer.from(markSvg({ size, color: ACCENT })), { density: 600 })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toBuffer(),
  ),
);

function ico(parts, sizes) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(parts.length, 4);

  const dir = Buffer.alloc(16 * parts.length);
  let offset = header.length + dir.length;

  parts.forEach((png, i) => {
    const at = i * 16;
    dir.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], at);
    dir.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], at + 1);
    dir.writeUInt8(0, at + 2);
    dir.writeUInt8(0, at + 3);
    dir.writeUInt16LE(1, at + 4);
    dir.writeUInt16LE(32, at + 6);
    dir.writeUInt32LE(png.length, at + 8);
    dir.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });

  return Buffer.concat([header, dir, ...parts]);
}

const icoFile = ico(icoParts, ICO_SIZES);
fs.writeFileSync('public/favicon.ico', icoFile);
console.log(`public/favicon.ico — ${ICO_SIZES.join('/')}, ${(icoFile.length / 1024).toFixed(1)} КБ`);

for (const size of [192, 512]) {
  const inset = Math.round(size * 0.68);
  const mark = await sharp(Buffer.from(markSvg({ size: inset, color: ACCENT })), { density: 600 })
    .resize(inset, inset)
    .png()
    .toBuffer();

  const icon = await sharp({
    create: { width: size, height: size, channels: 4, background: '#ffffff' },
  })
    .composite([{ input: mark, top: Math.round((size - inset) / 2), left: Math.round((size - inset) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(`public/icon-${size}.png`, icon);
  console.log(`public/icon-${size}.png — ${size}×${size}, ${(icon.length / 1024).toFixed(1)} КБ`);
}

const W = 1200;
const H = 630;

const PHOTO = 'src/images/hero-master.png';
const MARK = 92;
const PAD = 40;

const background = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="glow" cx="14%" cy="0%" r="86%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.16" />
      <stop offset="55%" stop-color="${ACCENT}" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#ffffff" />
  <rect width="${W}" height="${H}" fill="url(#glow)" />
  <rect x="0" y="${H - 10}" width="${W}" height="10" fill="${ACCENT}" />
</svg>
`);

const markPng = await sharp(Buffer.from(markSvg({ size: MARK, color: ACCENT })), { density: 300 })
  .resize(MARK, MARK)
  .png()
  .toBuffer();

const photoH = H - PAD * 2 - 10;
const photo = await sharp(PHOTO)
  .resize({ height: photoH, fit: 'inside' })
  .png()
  .toBuffer();
const photoMeta = await sharp(photo).metadata();

const og = await sharp(background)
  .composite([
    { input: photo, left: Math.round((W - photoMeta.width) / 2), top: PAD },
    { input: markPng, left: PAD, top: PAD },
  ])
  .jpeg({ quality: 84, chromaSubsampling: '4:4:4', mozjpeg: true })
  .toBuffer();

fs.writeFileSync('public/og-default.jpg', og);
if (fs.existsSync('public/og-default.png')) fs.unlinkSync('public/og-default.png');
console.log(`public/og-default.jpg — ${W}×${H}, ${(og.length / 1024).toFixed(1)} КБ`);
