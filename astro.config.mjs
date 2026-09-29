import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://blog.jurolc.com',
  integrations: [sitemap()],
  image: {
    layout: 'constrained',
    responsiveStyles: true,
    breakpoints: [320, 390, 640, 720, 768, 1024, 1440, 1680],
  },
  markdown: { syntaxHighlight: 'prism' },
  security: { checkOrigin: false },
});
