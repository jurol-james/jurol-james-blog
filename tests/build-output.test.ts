import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const articlePath = 'dist/posts/post-quantum-cryptography-engineers/index.html';

describe('built article image output', () => {
  it('renders the article title, cover, deck, metadata, and body in order', async () => {
    const html = await readFile(articlePath, 'utf8');
    const title = html.indexOf(
      '<h1>Post-Quantum Cryptography: What Software Engineers Need to Know</h1>',
    );
    const cover = html.indexOf('<figure class="post-cover">');
    const deck = html.indexOf('<p class="post-deck">');
    const metadata = html.indexOf('<div class="article-meta">', deck);
    const body = html.indexOf('<div class="prose">', metadata);

    expect(title).toBeGreaterThanOrEqual(0);
    expect(cover).toBeGreaterThan(title);
    expect(deck).toBeGreaterThan(cover);
    expect(metadata).toBeGreaterThan(deck);
    expect(body).toBeGreaterThan(metadata);
  });

  it('renders accessible, dimensioned responsive cover and inline images', async () => {
    const html = await readFile(articlePath, 'utf8');
    const cover = html.match(
      /<figure class="post-cover">([\s\S]*?)<\/figure>/,
    )?.[1];
    const inline = html.match(
      /<p><img[^>]*pqc-hybrid-encryption-overview[\s\S]*?<\/p>/,
    )?.[0];

    expect(cover).toContain(
      'alt="Diagram showing RSA and elliptic-curve cryptography',
    );
    expect(cover).toContain('<figcaption>A transition view:');
    expect(cover).toContain('width="1672" height="941"');
    expect(cover).toContain('320w');
    expect(cover).toContain(
      'sizes="(min-width: 768px) 720px, calc(100vw - 30px)"',
    );
    expect(inline).toContain('alt="Diagram showing ML-KEM key encapsulation');
    expect(inline).toContain('width="1536" height="1024"');
    expect(inline).toContain('320w');
  });

  it('uses production canonical and social image URLs', async () => {
    const html = await readFile(articlePath, 'utf8');
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const socialImage = html.match(
      /<meta property="og:image" content="([^"]+)"/,
    )?.[1];
    const twitterImage = html.match(
      /<meta name="twitter:image" content="([^"]+)"/,
    )?.[1];

    expect(canonical).toBe(
      'https://blog.jurolc.com/posts/post-quantum-cryptography-engineers/',
    );
    expect(socialImage).toMatch(
      /^https:\/\/blog\.jurolc\.com\/_astro\/.*\.jpeg$/,
    );
    expect(twitterImage).toBe(socialImage);
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image">',
    );
  });

  it('keeps RSS and sitemap article links on the canonical production domain', async () => {
    const [rss, sitemap] = await Promise.all([
      readFile('dist/rss.xml', 'utf8'),
      readFile('dist/sitemap-0.xml', 'utf8'),
    ]);
    const articleUrl =
      'https://blog.jurolc.com/posts/post-quantum-cryptography-engineers';

    expect(rss).toContain(articleUrl);
    expect(sitemap).toContain(`${articleUrl}/`);
    expect(rss).not.toContain('vercel.app');
    expect(sitemap).not.toContain('vercel.app');
  });

  it('keeps the aligned TOC and experimental project references in the article', async () => {
    const html = await readFile(articlePath, 'utf8');
    expect(html).toContain('class="toc-number" aria-hidden="true">1.');
    expect(html).toContain('href="#why-software-engineers-should-care"');
    expect(html).toContain(
      'https://github.com/jurol-james/zerp-quantum-crypto',
    );
    expect(html).toContain(
      'https://central.sonatype.com/artifact/io.github.jurol-james/zerp-quantum-crypto',
    );
  });
});
