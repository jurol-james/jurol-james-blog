# Engineering Notes

A static technical blog by Jurol James Cabaluna, separate from [jurolc.com](https://jurolc.com). The site uses Astro, TypeScript, Markdown, and Astro Content Collections; Git is intentionally the CMS. Content is compiled into static pages and deployed with Vercel.

## Local development

Requires Node.js 22 LTS and npm.

```sh
npm ci
npm run dev
```

Useful commands: `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

## Write an article

Create `src/content/posts/my-article.md`. Required frontmatter:

```yaml
title: 'An article title'
description: 'A concise summary, no more than 220 characters.'
publishedAt: 2026-09-29
tags:
  - Java
featured: false
draft: true
```

Optional fields are `updatedAt`, `series`, and positive integer `seriesOrder`. Markdown is the article body. The `title`, `description`, and `publishedAt` fields are required and validated at build time. Astro renders Markdown headings with stable anchors and syntax highlights fenced code with Prism and local CSS.

### Article images

Keep article assets beside the Markdown collection in `src/content/posts/images/`. Image paths in frontmatter and Markdown are relative to the article file. Astro's content collection image schema validates cover files, and its image pipeline creates optimized responsive output.

Add a cover by setting `coverImage`; `coverImageAlt` is required whenever a cover is present. `coverImageCaption` is optional. The existing `description` remains the article deck.

```yaml
coverImage: ./images/my-article-cover.webp
coverImageAlt: 'Diagram showing the system components and how data moves between them.'
coverImageCaption: 'The diagram highlights the boundary between the client and service.'
```

Add supporting images with ordinary Markdown. Follow a diagram with a short explanatory paragraph when readers need help interpreting it; the image's alt text should describe the visual itself. Cover captions use the optional `coverImageCaption` field and render as a semantic `<figcaption>`.

```md
![Diagram showing how the client establishes a key before encrypting a payload.](./images/key-establishment.webp)

The key-establishment step produces key material; the separate payload-encryption step uses that material to protect the data.
```

As an editorial guideline, technical articles should generally use no more than three meaningful images: one cover and up to two supporting images. This is guidance, not a schema or build limit.

### Draft workflow

Set `draft: true` while writing. Draft content is excluded at static route generation and from the archive, homepage, tag pages, RSS, and sitemap. Set it to `false` when reviewed. The schema rejects malformed metadata during collection loading/build.

## Review and publish

```sh
git switch -c content/my-article
git add src/content/posts/my-article.md
git commit -m "content: add my article"
git push -u origin content/my-article
```

Open a pull request. Vercel creates a Preview for review; merge only after approval. Merges to `main` are eligible for production deployment. The custom domain is intentionally not configured in the initial setup.

## Architecture

- `src/content.config.ts`: validated `posts` collection using Astro's `glob()` content loader.
- `src/content/posts/`: Markdown entries; filenames become stable URL slugs.
- `src/pages/`: static home, archive, article, tag, about, RSS, robots, and sitemap output.
- `src/layouts/` and `src/components/`: shared semantic layout and navigation.
- `src/lib/posts.ts`: public filtering, ordering, URL, reading-time, and tag helpers.
- `vercel.json`: response security headers derived for this static, self-hosted-resource site.

The canonical site is configured as `https://blog.jurolc.com` before DNS is attached. Preview hostnames do not appear in canonical links.
