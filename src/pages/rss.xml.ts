import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { rssItems } from '../lib/posts';

export const GET: APIRoute = async () => {
  const items = rssItems(await getCollection('posts'));
  return rss({
    title: 'Engineering Notes — Jurol James',
    description:
      'Writing about post-quantum cryptography, Java, software architecture, and building real systems.',
    site: 'https://blog.jurolc.com',
    items,
    customData: '<language>en-us</language>',
  });
};
