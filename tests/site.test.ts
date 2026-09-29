import { describe, expect, it } from 'vitest';
import { postUrl, productionPosts, rssItems, tagSlug } from '../src/lib/posts';
import type { Post } from '../src/lib/posts';
import { postSchema } from '../src/content/schema';
import { readFile } from 'node:fs/promises';

const fixture = (id: string, publishedAt: string, draft = false) =>
  ({
    id,
    body: 'words here',
    collection: 'posts',
    data: {
      title: id,
      description: 'A test post',
      publishedAt: new Date(publishedAt),
      tags: [],
      featured: false,
      draft,
    },
  }) as Post;

describe('post helpers', () => {
  it('validates post frontmatter and supplies safe defaults', () => {
    const valid = postSchema.safeParse({
      title: 'A note',
      description: 'A short description',
      publishedAt: '2026-09-29',
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.tags).toEqual([]);
      expect(valid.data.draft).toBe(false);
      expect(valid.data.featured).toBe(false);
    }
    expect(
      postSchema.safeParse({
        title: '',
        description: '',
        publishedAt: 'not a date',
      }).success,
    ).toBe(false);
  });

  it('filters drafts and sorts published entries newest first', () => {
    const posts = productionPosts([
      fixture('older', '2025-01-01'),
      fixture('draft', '2027-01-01', true),
      fixture('newer', '2026-01-01'),
    ]);
    expect(posts.map(({ id }) => id)).toEqual(['newer', 'older']);
  });

  it('creates deterministic URL-safe tag slugs', () => {
    expect(tagSlug('Post-Quantum Cryptography')).toBe(
      'post-quantum-cryptography',
    );
    expect(tagSlug('  ML-KEM / Java  ')).toBe('ml-kem-java');
  });

  it('uses the production origin for canonical article URLs', () => {
    expect(postUrl('example-note')).toBe(
      'https://blog.jurolc.com/posts/example-note',
    );
  });

  it('excludes drafts from RSS and uses canonical item IDs', () => {
    const items = rssItems([
      fixture('published', '2026-01-01'),
      fixture('private-draft', '2026-02-01', true),
    ]);
    expect(items.map((item) => item.id)).toEqual([
      'https://blog.jurolc.com/posts/published',
    ]);
  });
});

describe('deployment policy and primary navigation', () => {
  it('sets expected security headers without unsafe-eval or a wildcard source', async () => {
    const config = JSON.parse(
      await readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
    ) as {
      headers: { headers: { key: string; value: string }[] }[];
    };
    const headers = config.headers[0].headers;
    const values = Object.fromEntries(
      headers.map(({ key, value }) => [key, value]),
    );
    for (const key of [
      'Content-Security-Policy',
      'Permissions-Policy',
      'Referrer-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
    ]) {
      expect(values[key]).toBeTruthy();
    }
    expect(values['Content-Security-Policy']).not.toContain('unsafe-eval');
    expect(values['Content-Security-Policy']).not.toMatch(
      /(?:^|\s|;|:)\*(?:\s|;|$)/,
    );
  });

  it('pins Vercel to the static Astro output directory', async () => {
    const config = JSON.parse(
      await readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
    ) as { framework: string; outputDirectory: string };
    expect(config.framework).toBe('astro');
    expect(config.outputDirectory).toBe('dist');
  });

  it('includes the requested primary destinations in the header', async () => {
    const header = await readFile(
      new URL('../src/components/Header.astro', import.meta.url),
      'utf8',
    );
    for (const destination of [
      '/posts/',
      '/about/',
      'https://jurolc.com',
      'https://github.com/jurol-james',
    ]) {
      expect(header).toContain(destination);
    }
  });
});
