import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { createPostSchema } from './content/schema';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: ({ image }) => createPostSchema(image()),
});

export const collections = { posts };
