import { CITIES, CITY_LIST, activeCitySlug, cityOrigin } from '@/data/cities';
import { DOMAIN } from '@/config/site';

export const CITY = CITIES[activeCitySlug()];

export const OTHER_CITIES = CITY_LIST.filter((c) => c.slug !== CITY.slug);

export const ORIGIN = cityOrigin(CITY, DOMAIN);

export function crossCityUrl(citySlug: string, path = '/'): string {
  const city = CITIES[citySlug as keyof typeof CITIES];
  return `${cityOrigin(city, DOMAIN)}${path}`;
}
