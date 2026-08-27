import { LOGO_METRICS, MEDIAN_FILL } from '@/data/brandLogoMetrics';

const TARGET_AREA = 4 * 34 * 34;

const DAMP = 0.65;

const MIN_H = 20;
const MAX_H = 50;

const MAX_W = 166;

const MIN_RATIO = 1.6;

export interface LogoBox {
  usable: boolean;

  width: number;
  height: number;

  dx: number;
  dy: number;
}

const cache = new Map<string, LogoBox>();

const UNUSABLE: LogoBox = { usable: false, width: 0, height: 0, dx: 0, dy: 0 };

export function logoBox(slug: string, scale = 1): LogoBox {
  const key = `${slug}@${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const m = LOGO_METRICS[slug];
  let box = UNUSABLE;

  if (m) {
    const ratio = (m.box * m.w) / m.h;

    if (ratio >= MIN_RATIO) {
      let inkH = Math.sqrt(TARGET_AREA / ratio) * (MEDIAN_FILL / m.fill) ** (DAMP / 2);
      inkH = Math.min(MAX_H, Math.max(MIN_H, inkH));
      if (inkH * ratio > MAX_W) inkH = Math.max(MIN_H, MAX_W / ratio);

      const height = (inkH / m.h) * scale;
      const width = height * m.box;

      box = {
        usable: true,
        width: Math.round(width),
        height: Math.round(height),
        dx: Math.round((0.5 - m.cx) * width * 10) / 10,
        dy: Math.round((0.5 - m.cy) * height * 10) / 10,
      };
    }
  }

  cache.set(key, box);
  return box;
}
