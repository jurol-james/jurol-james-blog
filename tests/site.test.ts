import { describe, expect, it } from 'vitest';
import { postUrl, productionPosts, rssItems, tagSlug } from '../src/lib/posts';
import type { Post } from '../src/lib/posts';
import { z } from 'astro/zod';
import { createPostSchema } from '../src/content/schema';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { themeBootstrap } from '../src/lib/theme-bootstrap';
import { numberHeadings } from '../src/lib/toc';
import { absoluteSiteUrl } from '../src/lib/seo';
import { articleShareUrls } from '../src/lib/sharing';
import {
  headingPermalinks,
  type HastNode,
} from '../src/lib/rehype-heading-permalinks';
import { copyArticleLink } from '../public/scripts/article-sharing.js';
import {
  nextTheme,
  persistTheme,
  resolveTheme,
} from '../public/scripts/theme.js';

describe('theme behavior', () => {
  it('uses the system preference when no valid explicit preference exists', () => {
    expect(resolveTheme(null, 'dark')).toBe('dark');
    expect(resolveTheme('invalid', 'light')).toBe('light');
  });

  it('lets a stored preference override the system preference', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });

  it('changes theme and persists the explicit selection', () => {
    const values = new Map<string, string>();
    const storage = {
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const selected = nextTheme('light');
    persistTheme(storage, selected);
    expect(selected).toBe('dark');
    expect(values.get('theme')).toBe('dark');
    expect(resolveTheme(values.get('theme') ?? null, 'light')).toBe('dark');
    expect(nextTheme(selected)).toBe('light');
  });

  it('allows the head bootstrap under the exact CSP hash', async () => {
    const config = JSON.parse(
      await readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
    ) as { headers: { headers: { key: string; value: string }[] }[] };
    const csp = config.headers[0].headers.find(
      ({ key }) => key === 'Content-Security-Policy',
    )?.value;
    const hash = createHash('sha256').update(themeBootstrap).digest('base64');
    expect(csp).toContain(`'sha256-${hash}'`);
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain('unsafe-eval');
  });
});

describe('table of contents', () => {
  it('numbers mixed heading levels in one sequence while retaining depth', () => {
    const numbered = numberHeadings([
      { depth: 2, slug: 'first', text: 'First' },
      { depth: 3, slug: 'detail', text: 'Detail' },
      { depth: 2, slug: 'second', text: 'Second' },
    ]);
    expect(numbered.map(({ number, depth }) => [number, depth])).toEqual([
      [1, 2],
      [2, 3],
      [3, 2],
    ]);
  });

  it('uses one fixed number column and keeps long link text in the title column', async () => {
    const styles = await readFile(
      new URL('../src/styles/global.css', import.meta.url),
      'utf8',
    );
    expect(styles).toMatch(
      /\.toc li\s*\{[^}]*grid-template-columns:\s*2\.25em minmax\(0, 1fr\)/s,
    );
    expect(styles).toMatch(/\.toc a\s*\{[^}]*overflow-wrap:\s*anywhere/s);
    expect(styles).not.toContain('.toc-depth-3');
  });
});

describe('article sharing', () => {
  const canonicalUrl =
    'https://blog.jurolc.com/posts/post-quantum-cryptography-engineers/';
  const article = {
    canonicalUrl,
    title: 'Post-Quantum Cryptography',
    description: 'A practical engineering introduction.',
    mediaUrl: 'https://blog.jurolc.com/_astro/pqc-cover.abc.webp',
  };

  it('builds clean LinkedIn and Facebook share URLs from the canonical URL', () => {
    const urls = articleShareUrls(article);
    expect(new URL(urls.linkedin).searchParams.get('url')).toBe(canonicalUrl);
    expect(new URL(urls.facebook).searchParams.get('u')).toBe(canonicalUrl);
    expect(urls.linkedin).toContain(encodeURIComponent(canonicalUrl));
    expect(urls.facebook).toContain(encodeURIComponent(canonicalUrl));
    expect(urls.linkedin + urls.facebook).not.toMatch(
      /vercel\.app|localhost|utm_|fbclid=/i,
    );
    expect(urls.copy).toBe(canonicalUrl);
  });

  it('uses canonical Pinterest URL, article description, and optional cover media', () => {
    const withCover = new URL(articleShareUrls(article).pinterest);
    expect(withCover.searchParams.get('url')).toBe(canonicalUrl);
    expect(withCover.searchParams.get('media')).toBe(article.mediaUrl);
    expect(withCover.searchParams.get('description')).toBe(
      `${article.title} — ${article.description}`,
    );

    const withoutCover = new URL(
      articleShareUrls({ ...article, mediaUrl: undefined }).pinterest,
    );
    expect(withoutCover.searchParams.get('url')).toBe(canonicalUrl);
    expect(withoutCover.searchParams.has('media')).toBe(false);
  });

  it('copies the canonical article URL and reports clipboard failures', async () => {
    const writes: string[] = [];
    const clipboard = {
      writeText: async (value: string) => {
        writes.push(value);
      },
    } as unknown as Clipboard;
    expect(await copyArticleLink(canonicalUrl, clipboard)).toBe(true);
    expect(writes).toEqual([canonicalUrl]);
    expect(
      await copyArticleLink(canonicalUrl, {
        writeText: async () => {
          throw new Error('permission denied');
        },
      } as unknown as Clipboard),
    ).toBe(false);
  });

  it('adds accessible permalinks without changing existing heading IDs', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'h2',
          properties: { id: 'why-use-a-hybrid-design' },
          children: [{ type: 'text', value: 'Why use a hybrid design?' }],
        },
        {
          type: 'element',
          tagName: 'h3',
          properties: { id: 'key-encapsulation' },
          children: [{ type: 'text', value: 'Key encapsulation' }],
        },
      ],
    };
    const headings = tree.children!;
    const plugin = headingPermalinks();
    const textContent = (node: HastNode): string =>
      node.type === 'text'
        ? (node.value ?? '')
        : (node.children ?? []).map(textContent).join('');
    const ctx = {
      appendChild: (node: HastNode, child: HastNode) => {
        (node.children ??= []).push(child);
      },
      textContent,
    };
    plugin.element.visit(headings[0], ctx);
    plugin.element.visit(headings[1], ctx);
    expect(headings[0].properties?.id).toBe('why-use-a-hybrid-design');
    expect(headings[1].properties?.id).toBe('key-encapsulation');
    expect(headings[0].children?.[1].properties).toMatchObject({
      href: '#why-use-a-hybrid-design',
      ariaLabel: 'Link to section: Why use a hybrid design?',
    });
    expect(headings[1].children?.[1].properties?.href).toBe(
      '#key-encapsulation',
    );
  });
});

describe('compact article sharing presentation', () => {
  it('wraps compact controls and preserves touch size, focus, and theme tokens', async () => {
    const styles = await readFile(
      new URL('../src/styles/global.css', import.meta.url),
      'utf8',
    );
    expect(styles).toMatch(
      /\.article-share--compact\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap/s,
    );
    expect(styles).toMatch(
      /\.article-share--compact \.share-actions a,[\s\S]*?\.article-share--compact \.share-actions button\s*\{[^}]*width:\s*42px;[^}]*min-height:\s*42px/s,
    );
    expect(styles).toMatch(
      /\.share-actions a:focus-visible,[\s\S]*?\.share-actions button:focus-visible\s*\{[^}]*outline:/s,
    );
    expect(styles).toMatch(
      /\.share-actions a,[\s\S]*?color:\s*var\(--color-text-muted\)/s,
    );
  });
});

describe('theme color contrast', () => {
  it('keeps text, metadata, links, focus, and code comments at WCAG AA contrast', async () => {
    const styles = await readFile(
      new URL('../src/styles/global.css', import.meta.url),
      'utf8',
    );
    const tokensFor = (dark: boolean) => {
      const block = styles.match(
        dark
          ? /:root\[data-theme='dark'\]\s*\{([^}]+)\}/
          : /:root\s*\{([^}]+)\}/,
      );
      expect(block).not.toBeNull();
      return Object.fromEntries(
        [...(block?.[1].matchAll(/(--[\w-]+):\s*(#[\da-f]+)/gi) ?? [])].map(
          ([, name, value]) => [name, value],
        ),
      ) as Record<string, string>;
    };
    const contrast = (foreground: string, background: string) => {
      const luminance = (hex: string) => {
        const [r, g, b] = hex
          .slice(1)
          .match(/../g)!
          .map((channel) => parseInt(channel, 16) / 255)
          .map((channel) =>
            channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4,
          );
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const a = luminance(foreground);
      const b = luminance(background);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };

    for (const dark of [false, true]) {
      const tokens = tokensFor(dark);
      for (const token of [
        '--color-text',
        '--color-text-muted',
        '--color-accent',
        '--color-focus',
      ]) {
        expect(
          contrast(tokens[token], tokens['--color-background']),
        ).toBeGreaterThanOrEqual(4.5);
      }
      expect(
        contrast(
          tokens['--color-code-comment'],
          tokens['--color-code-background'],
        ),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

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

const postSchema = createPostSchema(z.string().min(1));

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

  it('allows posts without covers and requires descriptive alt text when one exists', () => {
    const base = {
      title: 'A note',
      description: 'A short description',
      publishedAt: '2026-09-29',
    };
    expect(postSchema.safeParse(base).success).toBe(true);
    expect(
      postSchema.safeParse({
        ...base,
        coverImage: './cover.webp',
      }).success,
    ).toBe(false);
    expect(
      postSchema.safeParse({
        ...base,
        coverImage: './cover.webp',
        coverImageAlt: 'A technical diagram of a migration path.',
      }).success,
    ).toBe(true);
    expect(
      postSchema.safeParse({
        ...base,
        coverImageCaption: 'A caption without an image.',
      }).success,
    ).toBe(false);
  });

  it('uses the cover and a relevant inline diagram in the PQC article', async () => {
    const article = await readFile(
      new URL(
        '../src/content/posts/post-quantum-cryptography-engineers.md',
        import.meta.url,
      ),
      'utf8',
    );
    expect(article).toContain('coverImage: ./images/pqc-transition-cover.webp');
    expect(article).toContain('coverImageAlt:');
    expect(article).toContain(
      '![Diagram showing ML-KEM key encapsulation combined with AES-256-GCM',
    );
    expect(article).not.toMatch(/(?:C:\\Users|\/mnt\/c\/Users)/i);
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

  it('builds absolute production URLs for social images', () => {
    expect(absoluteSiteUrl('/_astro/cover.abc123.webp')).toBe(
      'https://blog.jurolc.com/_astro/cover.abc123.webp',
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
    expect(values['Content-Security-Policy']).not.toContain("'unsafe-inline'");
    expect(values['Content-Security-Policy']).toMatch(
      /(?:^|;\s*)img-src 'self'(?:\s|;)/,
    );
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
    expect(header).toContain('src="/favicon.svg"');
    expect(header).toContain('alt=""');
    expect(header).toContain('aria-hidden="true"');
    expect(header).toContain('Engineering Notes');
  });

  it('links the experimental Zerp project references', async () => {
    const article = await readFile(
      new URL(
        '../src/content/posts/post-quantum-cryptography-engineers.md',
        import.meta.url,
      ),
      'utf8',
    );
    expect(article).toContain(
      'https://github.com/jurol-james/zerp-quantum-crypto',
    );
    expect(article).toContain(
      'https://central.sonatype.com/artifact/io.github.jurol-james/zerp-quantum-crypto',
    );
    const about = await readFile(
      new URL('../src/pages/about.astro', import.meta.url),
      'utf8',
    );
    expect(about).toContain('https://www.linkedin.com/in/jurol/');
  });
});
