import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const articlePath = 'dist/posts/post-quantum-cryptography-engineers/index.html';
const gatesArticlePath =
  'dist/posts/classical-vs-quantum-logic-gates/index.html';
const qubitArticlePath =
  'dist/posts/qubits-superposition-phase-bloch-sphere/index.html';
const mlKemArticlePath = 'dist/posts/inside-ml-kem/index.html';
const cryptoAgilityArticlePath =
  'dist/posts/crypto-agility-java-post-quantum-migration/index.html';
const mldsaArticlePath =
  'dist/posts/mldsa-post-quantum-digital-signatures/index.html';

describe('Vercel Web Analytics output', () => {
  it('allows the adapter bootstrap with its exact CSP hash on built pages', async () => {
    const [home, article, configText] = await Promise.all([
      readFile('dist/index.html', 'utf8'),
      readFile(articlePath, 'utf8'),
      readFile('vercel.json', 'utf8'),
    ]);
    const config = JSON.parse(configText) as {
      headers: { headers: { key: string; value: string }[] }[];
    };
    const csp = config.headers[0].headers.find(
      ({ key }) => key === 'Content-Security-Policy',
    )?.value;
    const analyticsBootstrap = [
      ...home.matchAll(/<script>([\s\S]*?)<\/script>/g),
    ]
      .map((match) => match[1])
      .find(
        (script) =>
          script.includes('window.va') &&
          script.includes('/_vercel/insights/script.js'),
      );

    expect(analyticsBootstrap).toBeDefined();
    expect(article).toContain('/_vercel/insights/script.js');
    expect(home).toContain('/_vercel/insights/script.js');
    const hash = createHash('sha256')
      .update(analyticsBootstrap ?? '')
      .digest('base64');
    expect(csp).toContain(`'sha256-${hash}'`);
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toMatch(/(?:^|\s|;|:)\*(?:\s|;|$)/);
  });
});

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
    expect(html).toContain('Jurol James, Engineering Notes home');
    expect(html).toContain('Engineering Notes');
    for (const asset of [
      'dist/jurol-logo.svg',
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
    expect(svg).not.toMatch(/<(?:script|foreignObject|image)\b/i);
    expect(svg).not.toMatch(/\son[a-z]+\s*=/i);
    expect(svg).not.toMatch(/(?:href|xlink:href)=["'](?:https?:|\/\/)/i);
    expect(svg).not.toMatch(
      /(?:@import|javascript:|url\(\s*(?:https?:|\/\/))/i,
    );
    const logo = await readFile('dist/jurol-logo.svg', 'utf8');
    expect(logo).toContain('viewBox="0 0 337 337"');
    expect(logo).toContain('Greener Than Your Mind');
    expect(logo).not.toMatch(/<(?:script|foreignObject|image)\b/i);
    expect(logo).not.toMatch(/\son[a-z]+\s*=/i);
    expect(logo).not.toMatch(/(?:href|xlink:href)=["'](?:https?:|\/\/)/i);
    expect(logo).not.toMatch(
      /(?:@import|javascript:|url\(\s*(?:https?:|\/\/))/i,
    );
    expect(logo).not.toMatch(/<(?:style|text)\b/i);
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

describe('built ML-DSA article output', () => {
  it('renders Part 4 with canonical metadata, series links, and reusable features', async () => {
    const html = await readFile(mldsaArticlePath, 'utf8');
    const canonical =
      'https://blog.jurolc.com/posts/mldsa-post-quantum-digital-signatures/';

    expect(html).toContain(
      '<h1>ML-DSA and Post-Quantum Digital Signatures: A Software Engineer&#39;s Guide</h1>',
    );
    expect(html).toContain('Post-Quantum Cryptography · Part 4');
    expect(html).toContain(`<link rel="canonical" href="${canonical}">`);
    expect(html).toContain(`<meta property="og:url" content="${canonical}">`);
    expect(html).toContain('"@type":"BlogPosting"');
    expect(html).toContain('FIPS 204');
    expect(html).toContain('ML-DSA-44');
    expect(html).toContain('ML-DSA-65');
    expect(html).toContain('ML-DSA-87');
    expect(html).toContain('Java 21');
    expect(html).toContain('Bouncy Castle Java 1.86');
    expect(html).toContain(
      'href="/posts/post-quantum-cryptography-engineers/"',
    );
    expect(html).toContain('href="/posts/inside-ml-kem/"');
    expect(html).toContain(
      'href="/posts/crypto-agility-java-post-quantum-migration/"',
    );
    expect(html).toContain('class="toc"');
    expect(html).toContain('href="#encryption-is-not-authentication"');
    expect(html).toContain('href="#signing-and-verifying-in-java"');
    expect(html).toContain(
      'aria-label="Link to section: Signing and verifying in Java"',
    );

    const shareSections =
      html.match(/class="article-share article-share--(?:compact|full)"/g) ??
      [];
    expect(shareSections).toHaveLength(2);
    expect(html).toContain(`data-copy-url="${canonical}"`);
    expect(html).not.toContain('Quantum Computing Fundamentals · Part 4');
    expect(html).not.toMatch(/(?:C:\\Users|\/mnt\/c\/Users|vercel\.app)/i);
  });

  it('includes both self-hosted diagrams in responsive output and distribution feeds', async () => {
    const [html, rss, sitemap] = await Promise.all([
      readFile(mldsaArticlePath, 'utf8'),
      readFile('dist/rss.xml', 'utf8'),
      readFile('dist/sitemap-0.xml', 'utf8'),
    ]);
    const canonical =
      'https://blog.jurolc.com/posts/mldsa-post-quantum-digital-signatures';
    expect(rss).toContain(canonical);
    expect(sitemap).toContain(`${canonical}/`);
    expect(html).toContain('class="article-figure"');

    const figures =
      html
        .match(
          /<figure class="(?:post-cover|article-figure)">[\s\S]*?<\/figure>/g,
        )
        ?.join('\n') ?? '';
    const images = figures.match(/<img\b[^>]*>/g) ?? [];
    expect(images).toHaveLength(2);
    for (const image of images) {
      expect(image).toMatch(/\bsrc="\/_astro\//);
      expect(image).toMatch(/\bsrcset="[^"]*320w/);
      expect(image).toMatch(/\bsrcset="[^"]*390w/);
      expect(image).toMatch(/\balt="[^"]+"/);
      expect(image).toMatch(/width="\d+" height="\d+"/);
    }
    expect(images[0]).toContain('alt="Side-by-side comparison showing ML-KEM');
    expect(images[1]).toContain('alt="Signer using a protected private key');
    expect(figures).toContain('ML-KEM establishes shared keying material');
    expect(figures).toContain('Signing produces a signature over bytes');
    expect(html).not.toMatch(/(?:C:\\Users|\/mnt\/c\/Users)/i);
    for (const file of [
      'src/content/posts/images/mldsa-vs-ml-kem.svg',
      'src/content/posts/images/mldsa-vs-ml-kem.webp',
      'src/content/posts/images/mldsa-sign-verify.svg',
      'src/content/posts/images/mldsa-sign-verify.webp',
    ]) {
      expect((await readFile(file)).byteLength).toBeGreaterThan(0);
    }
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

describe('quantum computing fundamentals part 2 output', () => {
  it('renders the series article, diagrams, canonical metadata, TOC, and sharing', async () => {
    const html = await readFile(qubitArticlePath, 'utf8');
    const canonical =
      'https://blog.jurolc.com/posts/qubits-superposition-phase-bloch-sphere/';
    expect(html).toContain('Quantum Computing Fundamentals · Part 2');
    expect(html).toContain(
      '<h1>Qubits, Superposition, Phase, and the Bloch Sphere: A Software Engineer’s Guide</h1>',
    );
    expect(html).toContain(`<link rel="canonical" href="${canonical}">`);
    expect(html).toContain('og:url" content="' + canonical);
    expect(html).toContain('class="toc"');
    expect(html).toContain('href="#amplitudes-are-not-probabilities"');
    expect(html).toContain('href="/posts/classical-vs-quantum-logic-gates/"');
    expect(html).toContain('alt="A classical bit with a definite 0 or 1');
    expect(html).toContain('class="post-cover"');
    expect(html).toContain('Bloch sphere with |0⟩ and |1⟩');
    expect(html).toContain('class="article-figure"');
    expect(html).toContain('θ sets the latitude');
    expect(html).toContain('aria-label="Share this article"');
    expect(
      html.match(/class="article-share article-share--(?:compact|full)"/g),
    ).toHaveLength(2);
    expect(html).toContain('https://www.linkedin.com/sharing/share-offsite/');
    expect(html).toContain('https://www.facebook.com/sharer/sharer.php');
    expect(html).toContain('https://www.pinterest.com/pin/create/button/');
    expect(html).toContain(encodeURIComponent(canonical));
    expect(html).not.toMatch(/(?:C:\\Users|\/mnt\/c\/Users)/i);
    expect(html).not.toContain('vercel.app');
    expect(html).not.toContain('utm_');
    expect(html).toContain(
      'data-copy-url="https://blog.jurolc.com/posts/qubits-superposition-phase-bloch-sphere/"',
    );

    const imageSources = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(
      ([, source]) => source,
    );
    expect(
      imageSources.filter((source) => source.includes('bloch-sphere')),
    ).toHaveLength(1);
    expect(
      imageSources.filter((source) => source.includes('inside-a-qubit')),
    ).toHaveLength(1);
    expect(imageSources.every((source) => source.startsWith('/'))).toBe(true);
  });

  it('includes the article in RSS and sitemap and builds its image assets', async () => {
    const [rss, sitemap] = await Promise.all([
      readFile('dist/rss.xml', 'utf8'),
      readFile('dist/sitemap-0.xml', 'utf8'),
    ]);
    const url =
      'https://blog.jurolc.com/posts/qubits-superposition-phase-bloch-sphere';
    expect(rss).toContain(url);
    expect(sitemap).toContain(`${url}/`);
    for (const file of [
      'src/content/posts/images/inside-a-qubit.webp',
      'src/content/posts/images/bloch-sphere.webp',
    ]) {
      expect((await readFile(file)).byteLength).toBeGreaterThan(0);
    }
  });
});

describe('post-quantum cryptography part 2 output', () => {
  it('renders ML-KEM as part 2 with standard sizes and reusable article features', async () => {
    const html = await readFile(mlKemArticlePath, 'utf8');
    const canonical = 'https://blog.jurolc.com/posts/inside-ml-kem/';
    const title = html.indexOf(
      '<h1>Inside ML-KEM: How Post-Quantum Key Establishment Works</h1>',
    );
    const cover = html.indexOf('<figure class="post-cover">');
    const deck = html.indexOf('<p class="post-deck">');
    const metadata = html.indexOf('<div class="article-meta">');
    const compactShare = html.indexOf('article-share--compact');
    const toc = html.indexOf('<nav class="toc"');
    const body = html.indexOf('<div class="prose">');
    expect(title).toBeGreaterThanOrEqual(0);
    expect(cover).toBeGreaterThan(title);
    expect(deck).toBeGreaterThan(cover);
    expect(metadata).toBeGreaterThan(deck);
    expect(compactShare).toBeGreaterThan(metadata);
    expect(compactShare).toBeLessThan(toc);
    expect(toc).toBeLessThan(body);
    expect(html).toContain('Post-Quantum Cryptography · Part 2');
    expect(html).toContain(
      '<h1>Inside ML-KEM: How Post-Quantum Key Establishment Works</h1>',
    );
    expect(html).toContain(`<link rel="canonical" href="${canonical}">`);
    expect(html).toContain(`<meta property="og:url" content="${canonical}">`);
    expect(html).toContain('"@type":"BlogPosting"');
    expect(html).toContain(
      'href="/posts/post-quantum-cryptography-engineers/"',
    );
    expect(html).toContain('href="#what-if-the-ciphertext-was-changed"');
    expect(html).toContain(
      'aria-label="Link to section: What if the ciphertext was changed?"',
    );
    expect(html).toContain('ML-KEM-512');
    expect(html).toContain('ML-KEM-768');
    expect(html).toContain('ML-KEM-1024');
    expect(html).toContain('1,184 bytes');
    expect(html).toContain('1,088 bytes');
    expect(html).toContain('security categories 1, 3, and 5');
    expect(html).toContain('implicit rejection');
    expect(html).toContain('FIPS 203');
    expect(html).toContain('RFC 10024');
    expect(html).toContain('ML-DSA');
    expect(html).toContain('alt="ML-KEM key establishment: a sender uses');
    expect(html).toContain('class="post-cover"');
    expect(html).toContain('alt="Hybrid key establishment flow showing');
    expect(html).toContain('class="article-figure"');
    expect(html).toContain(
      'the KEM ciphertext is not the encrypted file, API message, or database record.',
    );

    expect(
      html.match(/class="article-share article-share--(?:compact|full)"/g),
    ).toHaveLength(2);
    expect(html).toContain('https://www.linkedin.com/sharing/share-offsite/');
    expect(html).toContain('https://www.facebook.com/sharer/sharer.php');
    expect(html).toContain('https://www.pinterest.com/pin/create/button/');
    expect(html).toContain(encodeURIComponent(canonical));
    expect(html).toContain(`data-copy-url="${canonical}"`);
    expect(html).not.toMatch(
      /vercel\.app|localhost|utm_|(?:C:\\Users|\/mnt\/c\/Users)/i,
    );

    const articleImages =
      html
        .match(
          /<figure class="(?:post-cover|article-figure)">[\s\S]*?<\/figure>/g,
        )
        ?.join('\n') ?? '';
    for (const image of articleImages.match(/<img\b[^>]*>/g) ?? []) {
      expect(image).toMatch(/\bsrc="\/_astro\//);
      expect(image).toMatch(/\bsrcset="[^"]*320w/);
      expect(image).toMatch(/\bsrcset="[^"]*390w/);
      expect(image).toMatch(/\balt="[^"]+"/);
    }
  });

  it('includes Part 2 in RSS and sitemap and leaves the other series separate', async () => {
    const [html, rss, sitemap] = await Promise.all([
      readFile(mlKemArticlePath, 'utf8'),
      readFile('dist/rss.xml', 'utf8'),
      readFile('dist/sitemap-0.xml', 'utf8'),
    ]);
    const url = 'https://blog.jurolc.com/posts/inside-ml-kem';
    expect(rss).toContain(url);
    expect(sitemap).toContain(`${url}/`);
    expect(html).toContain('Post-Quantum Cryptography · Part 2');
    expect(html).not.toContain('Quantum Computing Fundamentals · Part 2');
    const quantumSeries = await readFile(
      'dist/posts/qubits-superposition-phase-bloch-sphere/index.html',
      'utf8',
    );
    expect(quantumSeries).toContain('Quantum Computing Fundamentals · Part 2');
    expect(quantumSeries).not.toContain('Post-Quantum Cryptography · Part 2');
  });
});

describe('post-quantum cryptography part 3 output', () => {
  it('renders the Java crypto-agility article with reusable article features', async () => {
    const html = await readFile(cryptoAgilityArticlePath, 'utf8');
    const canonical =
      'https://blog.jurolc.com/posts/crypto-agility-java-post-quantum-migration/';
    const title = html.indexOf(
      '<h1>Crypto Agility: Preparing Java Applications for Post-Quantum Migration</h1>',
    );
    const cover = html.indexOf('<figure class="post-cover">');
    const deck = html.indexOf('<p class="post-deck">');
    const metadata = html.indexOf('<div class="article-meta">', deck);
    const compactShare = html.indexOf('article-share--compact');
    const toc = html.indexOf('<nav class="toc"');
    const body = html.indexOf('<div class="prose">');

    expect(title).toBeGreaterThanOrEqual(0);
    expect(cover).toBeGreaterThan(title);
    expect(deck).toBeGreaterThan(cover);
    expect(metadata).toBeGreaterThan(deck);
    expect(compactShare).toBeGreaterThan(metadata);
    expect(compactShare).toBeLessThan(toc);
    expect(toc).toBeLessThan(body);
    expect(html).toContain('Post-Quantum Cryptography · Part 3');
    expect(html).toContain(`<link rel="canonical" href="${canonical}">`);
    expect(html).toContain(`<meta property="og:url" content="${canonical}">`);
    expect(html).toContain('"@type":"BlogPosting"');
    expect(html).toContain(
      'og:image" content="https://blog.jurolc.com/_astro/',
    );
    expect(html).toContain(
      'twitter:image" content="https://blog.jurolc.com/_astro/',
    );
    expect(html).toContain('class="toc"');
    expect(html).toContain('href="#what-crypto-agility-actually-means"');
    expect(html).toContain(
      'aria-label="Link to section: What crypto agility actually means"',
    );
    expect(html).toContain(
      'href="#javas-cryptography-architecture-and-kem-support"',
    );
    expect(html).toContain(
      'href="/posts/post-quantum-cryptography-engineers/"',
    );
    expect(html).toContain('href="/posts/inside-ml-kem/"');
    expect(html).toContain('NIST CSWP 39upd1');
    expect(html).toContain('Java SE 26');
    expect(html).toContain('RFC 10024');
    expect(html).toContain('javax.crypto.KEM');
    expect(html).toContain('data-copy-url="' + canonical + '"');

    expect(
      html.match(/class="article-share article-share--(?:compact|full)"/g),
    ).toHaveLength(2);
    expect(html).toContain('https://www.linkedin.com/sharing/share-offsite/');
    expect(html).toContain('https://www.facebook.com/sharer/sharer.php');
    expect(html).toContain('https://www.pinterest.com/pin/create/button/');
    expect(html).toContain(encodeURIComponent(canonical));
    expect(html).not.toMatch(
      /vercel\.app|localhost|utm_|(?:C:\\Users|\/mnt\/c\/Users)/i,
    );

    const figures =
      html
        .match(
          /<figure class="(?:post-cover|article-figure)">[\s\S]*?<\/figure>/g,
        )
        ?.join('\n') ?? '';
    const images = figures.match(/<img\b[^>]*>/g) ?? [];
    expect(images).toHaveLength(2);
    for (const image of images) {
      expect(image).toMatch(/\bsrc="\/_astro\//);
      expect(image).toMatch(/\bsrcset="[^"]*320w/);
      expect(image).toMatch(/\bsrcset="[^"]*390w/);
      expect(image).toMatch(/\balt="[^"]+"/);
      expect(image).toMatch(/width="\d+" height="\d+"/);
    }
    expect(figures).toContain('Crypto agility moves cryptographic choices');
    expect(figures).toContain('Nine-step post-quantum migration planning flow');
    expect(figures).toContain(
      'A practical sequence from discovery to retirement.',
    );
  });

  it('includes Part 3 in RSS and sitemap without mixing the other series', async () => {
    const [html, rss, sitemap, part1, part2, quantumPart2] = await Promise.all([
      readFile(cryptoAgilityArticlePath, 'utf8'),
      readFile('dist/rss.xml', 'utf8'),
      readFile('dist/sitemap-0.xml', 'utf8'),
      readFile(
        'dist/posts/post-quantum-cryptography-engineers/index.html',
        'utf8',
      ),
      readFile('dist/posts/inside-ml-kem/index.html', 'utf8'),
      readFile(
        'dist/posts/qubits-superposition-phase-bloch-sphere/index.html',
        'utf8',
      ),
    ]);
    const url =
      'https://blog.jurolc.com/posts/crypto-agility-java-post-quantum-migration';
    expect(rss).toContain(url);
    expect(sitemap).toContain(`${url}/`);
    expect(html).toContain('Post-Quantum Cryptography · Part 3');
    expect(part1).toContain('Post-Quantum Cryptography · Part 1');
    expect(part2).toContain('Post-Quantum Cryptography · Part 2');
    expect(quantumPart2).toContain('Quantum Computing Fundamentals · Part 2');
    expect(html).not.toContain('Quantum Computing Fundamentals · Part 3');
    expect(html).not.toMatch(/(?:C:\\Users|\/mnt\/c\/Users)/i);
    for (const file of [
      'src/content/posts/images/pqc-crypto-agility-architecture.svg',
      'src/content/posts/images/pqc-crypto-agility-architecture.webp',
      'src/content/posts/images/pqc-migration-playbook.svg',
      'src/content/posts/images/pqc-migration-playbook.webp',
    ]) {
      expect((await readFile(file)).byteLength).toBeGreaterThan(0);
    }
    const imageTags = html.match(/<img\b[^>]*>/g) ?? [];
    expect(imageTags.filter((image) => /\bsrc="https?:/i.test(image))).toEqual(
      [],
    );
  });
});
