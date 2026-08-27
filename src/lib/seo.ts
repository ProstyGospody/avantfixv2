import type { City } from '@/data/cities';
import { BRAND, DOMAIN } from '@/config/site';
import { cityOrigin } from '@/data/cities';

export const TITLE_MAX = 70;
export const DESC_MAX = 180;

export function absoluteUrl(path: string, city: City): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const withSlash = clean.endsWith('/') || clean.includes('.') ? clean : `${clean}/`;
  return `${cityOrigin(city, DOMAIN)}${withSlash}`;
}

export function buildTitle(core: string, offer?: string): string {
  const withOffer = offer ? `${core} — ${offer}` : core;
  const full = `${withOffer} | ${BRAND.name}`;
  if (full.length <= TITLE_MAX) return full;
  if (withOffer.length <= TITLE_MAX) return withOffer;
  return core.slice(0, TITLE_MAX);
}

export function auditMeta(title: string, description: string, path: string): void {
  if (!import.meta.env.DEV) return;
  if (title.length > TITLE_MAX) {
    console.warn(`[seo] title ${title.length} симв. (>${TITLE_MAX}) на ${path}: ${title}`);
  }
  if (description.length > DESC_MAX) {
    console.warn(`[seo] description ${description.length} симв. (>${DESC_MAX}) на ${path}`);
  }
  if (description.length < 70) {
    console.warn(`[seo] description слишком короткий (${description.length}) на ${path}`);
  }
}
