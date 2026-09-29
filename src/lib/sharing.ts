export type ArticleShareInput = {
  canonicalUrl: string;
  title: string;
  description: string;
  mediaUrl?: string;
};

export function articleShareUrls({
  canonicalUrl,
  title,
  description,
  mediaUrl,
}: ArticleShareInput) {
  const linkedin = new URLSearchParams({ url: canonicalUrl });
  const facebook = new URLSearchParams({ u: canonicalUrl });
  const pinterest = new URLSearchParams({
    url: canonicalUrl,
    description: `${title} — ${description}`,
    ...(mediaUrl ? { media: mediaUrl } : {}),
  });

  return {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?${linkedin}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?${facebook}`,
    pinterest: `https://www.pinterest.com/pin/create/button/?${pinterest}`,
    copy: canonicalUrl,
  };
}
