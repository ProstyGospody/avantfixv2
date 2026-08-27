import type { City } from '@/data/cities';
import { localPrice, type Appliance } from '@/data/appliances';
import { price, priceFrom } from '@/lib/format';

export function localPriceOf(base: number, city: City): number {
  return localPrice(base, city.priceFactor);
}

export function localPriceText(base: number, city: City): string {
  return price(localPriceOf(base, city));
}

export function localPriceFromText(base: number, city: City): string {
  return priceFrom(localPriceOf(base, city));
}

export function minWorkPrice(appliance: Appliance, city: City): number {
  const paid = appliance.priceList.map((r) => r.priceFrom).filter((p) => p > 0);
  return localPriceOf(Math.min(...paid, appliance.priceFrom), city);
}

export function priceRange(appliance: Appliance, city: City): { min: number; max: number } {
  const paid = appliance.priceList.map((r) => r.priceFrom).filter((p) => p > 0);
  return {
    min: localPriceOf(Math.min(...paid), city),
    max: localPriceOf(Math.max(...paid), city),
  };
}
