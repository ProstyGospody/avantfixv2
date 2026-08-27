import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { CITIES, activeCitySlug, cityOrigin } from './src/data/cities';
import { DOMAIN } from './src/config/site';

const city = CITIES[activeCitySlug()];

export default defineConfig({
  site: cityOrigin(city, DOMAIN),
  outDir: `./dist/${city.slug}`,
  trailingSlash: 'always',
  build: {
    format: 'directory',

    inlineStylesheets: 'auto',
    assets: '_a',
  },
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  compressHTML: true,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  integrations: [
    sitemap({
      changefreq: 'weekly',
      lastmod: new Date(),

      filter: (page) => !page.includes('/spasibo/'),
      serialize(item) {
        const path = new URL(item.url).pathname;
        const depth = path.split('/').filter(Boolean).length;
        item.priority = depth === 0 ? 1.0 : depth === 1 ? 0.9 : 0.7;
        return item;
      },
    }),
  ],
});
