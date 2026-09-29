export type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

type VisitorContext = {
  appendChild(node: HastNode, child: HastNode): void;
  textContent(node: HastNode): string;
};

export function headingPermalinks() {
  return {
    name: 'heading-permalinks',
    element: {
      filter: ['h2', 'h3'],
      visit(node: HastNode, ctx: VisitorContext) {
        const id = node.properties?.id;
        if (typeof id !== 'string') return;

        const label = ctx.textContent(node).trim();
        ctx.appendChild(node, {
          type: 'element',
          tagName: 'a',
          properties: {
            href: `#${id}`,
            className: ['heading-permalink'],
            ariaLabel: `Link to section: ${label}`,
          },
          children: [
            {
              type: 'element',
              tagName: 'svg',
              properties: {
                xmlns: 'http://www.w3.org/2000/svg',
                width: '16',
                height: '16',
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: '1.8',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                ariaHidden: 'true',
                focusable: 'false',
              },
              children: [
                {
                  type: 'element',
                  tagName: 'path',
                  properties: {
                    d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
                  },
                  children: [],
                },
                {
                  type: 'element',
                  tagName: 'path',
                  properties: {
                    d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
                  },
                  children: [],
                },
              ],
            },
          ],
        });
      },
    },
  };
}
