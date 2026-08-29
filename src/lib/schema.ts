import type { City } from '@/data/cities';
import type { Appliance } from '@/data/appliances';
import { BRAND, DOMAIN, LISTINGS, SOCIAL, WARRANTY } from '@/config/site';
import { cityOrigin } from '@/data/cities';
import { isoDuration } from '@/lib/format';
import { localPriceOf } from '@/lib/pricing';

type Json = Record<string, unknown>;

const REGION = 'Белгородская область';

export function orgId(city: City): string {
  return `${cityOrigin(city, DOMAIN)}/#organization`;
}

function socialLinks(city: City): string[] {
  return [SOCIAL.vk, SOCIAL.telegram, ...(LISTINGS[city.slug] ?? [])].filter(Boolean);
}

export function localBusiness(city: City, opts?: { rating?: { value: number; count: number } }): Json {
  const origin = cityOrigin(city, DOMAIN);
  const phones = [city.phoneCity, city.phoneMobile].filter(Boolean);
  const links = socialLinks(city);

  const node: Json = {
    '@type': 'HomeAndConstructionBusiness',
    '@id': orgId(city),
    name: `${BRAND.name} — ${BRAND.slogan} ${city.inPrep}`,
    alternateName: BRAND.name,
    url: `${origin}/`,
    logo: `${origin}/icon-512.png`,
    image: `${origin}/og-default.jpg`,
    telephone: phones,
    email: BRAND.email,
    priceRange: '₽₽',
    currenciesAccepted: 'RUB',
    paymentAccepted: 'Наличные, банковская карта, перевод по СБП',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'RU',
      addressRegion: REGION,
      addressLocality: city.name,
      ...(city.address
        ? { streetAddress: city.address.street, postalCode: city.address.postalCode }
        : {}),
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: city.geo.lat,
      longitude: city.geo.lon,
    },
    areaServed: [city.name, ...city.nearby].map((name) => ({
      '@type': 'City',
      name,
    })),
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: city.workHours.open,
        closes: city.workHours.close,
      },
    ],
  };

  if (BRAND.legalName) node.legalName = BRAND.legalName;
  if (BRAND.inn) node.taxID = BRAND.inn;
  if (BRAND.ogrn) node.identifier = BRAND.ogrn;
  if (links.length) node.sameAs = links;
  if (opts?.rating && opts.rating.count > 0) {
    node.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: opts.rating.value,
      reviewCount: opts.rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return node;
}

export function service(appliance: Appliance, city: City): Json {
  const url = `${cityOrigin(city, DOMAIN)}/${appliance.slug}/`;

  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name: `Ремонт ${appliance.genitivePlural} ${city.inPrep}`,
    serviceType: `Ремонт ${appliance.genitivePlural}`,
    description:
      `Выездной ремонт ${appliance.genitivePlural} на дому ${city.inPrep}. ` +
      `Диагностика бесплатно при согласии на ремонт. ${WARRANTY.text}.`,
    url,
    provider: { '@id': orgId(city) },
    areaServed: { '@type': 'City', name: city.name },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `Прайс: ремонт ${appliance.genitivePlural} ${city.inPrep}`,
      itemListElement: appliance.priceList.map((row) => ({
        '@type': 'Offer',
        name: row.work,
        priceCurrency: 'RUB',
        price: localPriceOf(row.priceFrom, city),
        priceSpecification: {
          '@type': 'PriceSpecification',
          priceCurrency: 'RUB',
          minPrice: localPriceOf(row.priceFrom, city),
          valueAddedTaxIncluded: true,
        },
        availability: 'https://schema.org/InStock',
        areaServed: { '@type': 'City', name: city.name },
      })),
    },
  };
}

export interface Crumb {
  name: string;

  url?: string;
}

export function breadcrumbs(items: Crumb[]): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

export interface QA {
  q: string;
  a: string;
}

export function faq(items: QA[]): Json {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export function howToRepair(
  appliance: Appliance,
  faultTitle: string,
  city: City,
  steps: { name: string; text: string }[],
  minutes: number,
  cost: number,
): Json {
  return {
    '@type': 'HowTo',
    name: `${faultTitle} — что делает мастер ${city.inPrep}`,
    totalTime: isoDuration(minutes),
    estimatedCost: {
      '@type': 'MonetaryAmount',
      currency: 'RUB',
      value: cost,
    },
    tool: [{ '@type': 'HowToTool', name: `Инструмент и диагностическое оборудование для ${appliance.genitivePlural}` }],
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export function webSite(city: City): Json {
  const origin = cityOrigin(city, DOMAIN);
  return {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    url: `${origin}/`,
    name: `${BRAND.name} ${city.inPrep}`,
    inLanguage: 'ru-RU',
    publisher: { '@id': orgId(city) },
  };
}

export function graph(nodes: Json[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes });
}
