export const siteOrigin = 'https://blog.jurolc.com';

export function absoluteSiteUrl(path: string) {
  return new URL(path, siteOrigin).href;
}
