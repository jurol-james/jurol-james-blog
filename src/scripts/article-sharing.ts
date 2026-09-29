const COPY_FEEDBACK_MS = 2200;

export async function copyArticleLink(
  url: string,
  clipboard: Pick<Clipboard, 'writeText'> = navigator.clipboard,
) {
  try {
    await clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export function attachArticleShareHandlers(root: ParentNode = document) {
  const buttons = root.querySelectorAll<HTMLButtonElement>(
    '.copy-article-link[data-copy-url]',
  );

  for (const button of buttons) {
    if (button.dataset.copyReady === 'true') continue;
    button.dataset.copyReady = 'true';

    button.addEventListener('click', async () => {
      const url = button.dataset.copyUrl;
      const status = button
        .closest('.article-share')
        ?.querySelector<HTMLElement>('[data-share-status]');
      const label = button.querySelector<HTMLElement>('[data-copy-label]');
      if (!url || !status || !label) return;

      const copied = await copyArticleLink(url);
      if (copied) {
        label.textContent = 'Copied!';
        status.textContent = 'Link copied.';
        window.setTimeout(() => {
          label.textContent = 'Copy link';
          status.textContent = '';
        }, COPY_FEEDBACK_MS);
      } else {
        status.textContent =
          'Could not copy the link. Please try again or copy it from a social share link.';
      }
    });
  }
}

if (typeof document !== 'undefined') attachArticleShareHandlers();
