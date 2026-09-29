import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export const productionPosts = (posts: Post[]) =>
  posts
    .filter(({ data }) => !data.draft)
    .sort(
      (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
    );

export const tagSlug = (tag: string) =>
  tag
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const postUrl = (slug: string) =>
  `https://blog.jurolc.com/posts/${slug}`;
export const readingTime = (text: string) =>
  Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 220));
export const rssItems = (posts: Post[]) =>
  productionPosts(posts).map((post) => ({
    title: post.data.title,
    description: post.data.description,
    pubDate: post.data.publishedAt,
    link: `/posts/${post.id}/`,
    id: postUrl(post.id),
  }));
