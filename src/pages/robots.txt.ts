import type { APIRoute } from 'astro';
import { ORIGIN } from '@/lib/city';

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /*?

User-agent: Yandex
Allow: /
Disallow: /api/
Clean-param: utm_source&utm_medium&utm_campaign&utm_term&utm_content&yclid&_openstat&from&gclid

Sitemap: ${ORIGIN}/sitemap-index.xml
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
