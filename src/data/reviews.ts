import type { CitySlug } from '@/data/cities';

export interface Review {
  author: string;

  date: string;
  rating: 1 | 2 | 3 | 4 | 5;

  appliance: string;
  text: string;

  source?: string;

  reply?: string;
}

export const REVIEWS: Record<CitySlug, Review[]> = {
  belgorod: [],
  oskol: [],
  gubkin: [],
};

export function reviewsFor(city: CitySlug, appliance?: string): Review[] {
  const all = REVIEWS[city] ?? [];
  return appliance ? all.filter((r) => r.appliance === appliance) : all;
}

export function ratingFor(city: CitySlug): { value: number; count: number } | null {
  const all = REVIEWS[city] ?? [];
  if (all.length === 0) return null;
  const sum = all.reduce((acc, r) => acc + r.rating, 0);
  return { value: Math.round((sum / all.length) * 10) / 10, count: all.length };
}
