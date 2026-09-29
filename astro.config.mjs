import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://blog.jurolc.com',
  integrations: [sitemap()],
  markdown: { syntaxHighlight: 'prism' },
  security: { checkOrigin: false },
});
