export type TocHeading = {
  depth: number;
  slug: string;
  text: string;
};

export function numberHeadings<T extends TocHeading>(headings: readonly T[]) {
  return headings.map((heading, index) => ({ ...heading, number: index + 1 }));
}
