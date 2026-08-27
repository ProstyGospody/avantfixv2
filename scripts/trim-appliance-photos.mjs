import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = 'src/images/appliances';
const BACKUP = '.backup/appliances';

fs.mkdirSync(BACKUP, { recursive: true });

for (const file of fs.readdirSync(DIR).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))) {
  const full = path.join(DIR, file);
  const backup = path.join(BACKUP, file);

  if (!fs.existsSync(backup)) fs.copyFileSync(full, backup);

  const before = await sharp(backup).metadata();
  const out = await sharp(backup)
    .trim({ threshold: 1 })

    .extend({
      top: 24,
      bottom: 24,
      left: 24,
      right: 24,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true });

  fs.writeFileSync(full, out.data);

  const ratio = (out.info.width / out.info.height).toFixed(2);
  console.log(
    `${file.padEnd(36)} ${before.width}×${before.height} → ${out.info.width}×${out.info.height}` +
      `  соотн. ${ratio}  ${(fs.statSync(backup).size / 1048576).toFixed(1)} → ${(out.data.length / 1048576).toFixed(1)} МБ`,
  );
}
