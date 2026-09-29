import { defineConfig } from 'astro/config';
import { satteri, satteriHeadingIdsPlugin } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { headingPermalinks } from './src/lib/rehype-heading-permalinks';

export default defineConfig({
  site: 'https://blog.jurolc.com',
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  integrations: [sitemap()],
  image: {
    layout: 'constrained',
    responsiveStyles: true,
    breakpoints: [320, 390, 640, 720, 768, 1024, 1440, 1680],
  },
  markdown: {
    syntaxHighlight: 'prism',
    processor: satteri({
      hastPlugins: [satteriHeadingIdsPlugin(), headingPermalinks()],
    }),
  },
  security: { checkOrigin: false },
});
