import type { APIRoute } from 'astro';
import { CITY, ORIGIN } from '@/lib/city';

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Disallow: /spasibo/
Disallow: /api/
Disallow: /*?

User-agent: Yandex
Allow: /
Disallow: /spasibo/
Disallow: /api/
Clean-param: utm_source&utm_medium&utm_campaign&utm_term&utm_content&yclid&_openstat&from&gclid

Sitemap: ${ORIGIN}/sitemap-index.xml

# Город сборки: ${CITY.name}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
