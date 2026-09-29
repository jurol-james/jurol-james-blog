import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { postSchema } from './content/schema';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: postSchema,
});

export const collections = { posts };
