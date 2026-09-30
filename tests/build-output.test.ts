import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const articlePath = 'dist/posts/post-quantum-cryptography-engineers/index.html';
const gatesArticlePath =
  'dist/posts/classical-vs-quantum-logic-gates/index.html';

describe('built article image output', () => {
  it('serves the Jurol favicon, touch icon, and decorative header mark', async () => {
    const html = await readFile(articlePath, 'utf8');
    for (const link of [
      'rel="icon" href="/favicon.svg"',
      'rel="icon" href="/favicon.ico"',
      'rel="icon" href="/favicon-32x32.png"',
      'rel="apple-touch-icon" href="/apple-touch-icon.png"',
    ]) {
      expect(html).toContain(link);
    }
    expect(html).toContain('src="/favicon.svg"');
    expect(html).toContain('alt="" aria-hidden="true"');
    for (const asset of [
      'dist/favicon.ico',
      'dist/favicon-32x32.png',
      'dist/apple-touch-icon.png',
    ]) {
      expect((await readFile(asset)).byteLength).toBeGreaterThan(0);
    }
    const svg = await readFile('dist/favicon.svg', 'utf8');
    expect(svg).toContain('<path');
    expect(svg).not.toContain('<image');
    expect(svg).not.toContain('data:image');
    expect(svg).not.toContain('<rect');
    const icon = await readFile('dist/favicon.ico');
    expect(icon.readUInt16LE(2)).toBe(1);
    expect(icon.readUInt16LE(4)).toBe(3);
    expect([0, 1, 2].map((index) => icon[index * 16 + 6])).toEqual([
      16, 32, 48,
    ]);
  });

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

  it('renders compact and full share variants with identical canonical destinations', async () => {
    const html = await readFile(articlePath, 'utf8');
    const toc = html.match(/<nav class="toc"[\s\S]*?<\/nav>/)?.[0];
    const canonicalUrl =
      'https://blog.jurolc.com/posts/post-quantum-cryptography-engineers/';
    const sections = [
      ...html.matchAll(
        /<section class="article-share article-share--(compact|full)" aria-label="Share this article">([\s\S]*?)<\/section>/g,
      ),
    ];
    expect(sections).toHaveLength(2);
    const compact = sections.find(([, variant]) => variant === 'compact');
    const full = sections.find(([, variant]) => variant === 'full');
    expect(compact).toBeDefined();
    expect(full).toBeDefined();
    const compactSection = compact?.[0] ?? '';
    const fullSection = full?.[0] ?? '';
    expect(compactSection).toContain('class="share-compact-label">Share</p>');
    expect(compactSection).not.toContain('<h2>Share this article</h2>');
    expect(fullSection).toContain('<h2>Share this article</h2>');
    expect(fullSection).toContain('LinkedIn</span>');
    expect(compactSection).toContain('role="status" aria-live="polite"');
    expect(fullSection).toContain('role="status" aria-live="polite"');
    expect(html).toContain(
      '<script type="module" src="/scripts/article-sharing.js"></script>',
    );

    const socialUrls = (section: string) => {
      const links = [
        ...section.matchAll(
          /<a href="(https:\/\/www\.(?:linkedin|facebook|pinterest)\.com[^\"]+)" target="_blank" rel="noopener noreferrer" aria-label="Share on (LinkedIn|Facebook|Pinterest)"/g,
        ),
      ];
      expect(links).toHaveLength(3);
      for (const [, href, label] of links) {
        expect(section).toContain(`aria-label="Share on ${label}"`);
        const url = new URL(href.replaceAll('&amp;', '&'));
        const target = url.searchParams.get('url') ?? url.searchParams.get('u');
        expect(target).toBe(canonicalUrl);
        expect(href).not.toMatch(/vercel\.app|localhost|utm_|fbclid=/i);
      }
      const pinterest = new URL(
        links
          .find(([, href]) => href.includes('pinterest.com'))![1]
          .replaceAll('&amp;', '&'),
      );
      expect(pinterest.searchParams.get('media')).toMatch(
        /^https:\/\/blog\.jurolc\.com\/_astro\//,
      );
      return links.map(([, href]) => href);
    };
    expect(socialUrls(compactSection)).toEqual(socialUrls(fullSection));

    for (const section of [compactSection, fullSection]) {
      expect(section.match(/data-copy-url="([^"]+)"/)?.[1]).toBe(canonicalUrl);
      expect(section).toContain('aria-label="Copy article link"');
      expect(section).toContain('aria-hidden="true"');
      expect(section).not.toMatch(/\sid="/);
    }
    expect(html.match(/data-share-status/g)).toHaveLength(2);
    const copyButtons = [...html.matchAll(/data-copy-url="([^"]+)"/g)].map(
      ([, url]) => url,
    );
    expect(copyButtons).toEqual([canonicalUrl, canonicalUrl]);

    const metadataStart = html.indexOf('class="article-meta"');
    const topicsStart = html.indexOf('class="topic-list compact"');
    const tocStart = html.indexOf('<nav class="toc"');
    const bodyStart = html.indexOf('<div class="prose">');
    expect(compact?.index).toBeGreaterThan(metadataStart);
    expect(compact?.index).toBeGreaterThan(topicsStart);
    expect(compact?.index).toBeLessThan(tocStart);
    expect(full?.index).toBeGreaterThan(bodyStart);
    expect(html.indexOf('class="post-pagination"')).toBeGreaterThan(
      full?.index ?? 0,
    );
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id);
    expect(new Set(ids).size).toBe(ids.length);

    const headingPermalinks = [
      ...html.matchAll(
        /<h([23]) id="([^"]+)">[\s\S]*?<a href="#([^"]+)" class="heading-permalink" aria-label="Link to section: ([^"]+)"/g,
      ),
    ];
    expect(headingPermalinks.some(([, level]) => level === '2')).toBe(true);
    expect(headingPermalinks.some(([, level]) => level === '3')).toBe(true);
    for (const [, , id, hrefId] of headingPermalinks) {
      expect(hrefId).toBe(id);
      expect(toc).toContain(`href="#${id}"`);
    }
    expect(html).toContain(
      'aria-label="Link to section: Why use a hybrid design?"',
    );
    expect(html).not.toMatch(
      /<script[^>]+src="https:\/\/(?:www\.)?(?:linkedin|facebook|pinterest)\.com/i,
    );
  });
});

describe('classical and quantum logic gates article output', () => {
  it('renders the new series, cover, deck, metadata, and corrected Bell-state figure', async () => {
    const html = await readFile(gatesArticlePath, 'utf8');
    const series = html.indexOf('Quantum Computing Fundamentals · Part 1');
    const title = html.indexOf(
      '<h1>Classical Logic Gates vs. Quantum Logic Gates: A Software Engineer’s Guide</h1>',
    );
    const cover = html.indexOf('<figure class="post-cover">');
    const deck = html.indexOf('<p class="post-deck">');
    const metadata = html.indexOf('<div class="article-meta">');
    const body = html.indexOf('<div class="prose">');
    expect(series).toBeGreaterThanOrEqual(0);
    expect(title).toBeGreaterThan(series);
    expect(cover).toBeGreaterThan(title);
    expect(deck).toBeGreaterThan(cover);
    expect(metadata).toBeGreaterThan(deck);
    expect(body).toBeGreaterThan(metadata);
    expect(html).toContain('alt="Side-by-side comparison of classical bits');
    expect(html).toContain('Classical circuits process definite bit values;');
    expect(html).toContain('width="975" height="781"');
    expect(html).toContain('<figure class="article-figure">');
    expect(html).toContain('alt="Two-qubit circuit with Hadamard');
    expect(html).toContain('The centered dots in step 3 represent each qubit');
    expect(html).toContain('width="972" height="779"');
    expect(html).toContain('bell-state-circuit.');
    const coverFigure = html.match(
      /<figure class="post-cover">([\s\S]*?)<\/figure>/,
    )?.[1];
    const bellFigure = html.match(
      /<figure class="article-figure">([\s\S]*?)<\/figure>/,
    )?.[1];
    for (const figure of [coverFigure, bellFigure]) {
      expect(figure).toContain('src="/_astro/');
      expect(figure).toContain('srcset="/_astro/');
      expect(figure).toContain('320w');
      expect(figure).toContain('390w');
    }
    for (const image of html.match(/<img\b[^>]*>/g) ?? []) {
      expect(image).toMatch(/\bsrc="\//);
    }
    expect(html).not.toMatch(/(?:C:\\Users|\/mnt\/c\/Users)/);
  });

  it('uses canonical metadata, navigation, sharing, and discovery feeds', async () => {
    const [html, rss, sitemap] = await Promise.all([
      readFile(gatesArticlePath, 'utf8'),
      readFile('dist/rss.xml', 'utf8'),
      readFile('dist/sitemap-0.xml', 'utf8'),
    ]);
    const canonical =
      'https://blog.jurolc.com/posts/classical-vs-quantum-logic-gates/';
    expect(html).toContain(`<link rel="canonical" href="${canonical}">`);
    expect(html).toContain(`<meta property="og:url" content="${canonical}">`);
    expect(html).toMatch(
      /<meta property="og:image" content="https:\/\/blog\.jurolc\.com\/_astro\/classical-vs-quantum-computation\.[^"]+\.jpeg">/,
    );
    expect(html).toContain('<meta property="og:image:width" content="975">');
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image">',
    );
    expect(html).toContain('"@type":"BlogPosting"');
    expect(html).toContain('"mainEntityOfPage":"' + canonical + '"');
    expect(html).toContain(
      'href="/posts/post-quantum-cryptography-engineers/"',
    );
    expect(html).toContain('href="#from-superposition-to-entanglement"');
    expect(html).toContain(
      'aria-label="Link to section: From superposition to entanglement"',
    );
    expect(html).toContain('href="#phase-and-interference"');
    expect(html).toContain(
      'aria-label="Link to section: Phase and interference"',
    );
    expect(
      html.match(/class="article-share article-share--(?:compact|full)"/g),
    ).toHaveLength(2);
    expect(
      html.match(
        /data-copy-url="https:\/\/blog\.jurolc\.com\/posts\/classical-vs-quantum-logic-gates\/"/g,
      ),
    ).toHaveLength(2);
    expect(html).not.toMatch(/vercel\.app|localhost|utm_/i);
    expect(rss).toContain(canonical);
    expect(sitemap).toContain(canonical);
  });
});
