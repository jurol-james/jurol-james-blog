export function resolveTheme(storedTheme, systemTheme) {
  return storedTheme === 'light' || storedTheme === 'dark'
    ? storedTheme
    : systemTheme;
}

export function nextTheme(currentTheme) {
  return currentTheme === 'dark' ? 'light' : 'dark';
}

export function persistTheme(storage, theme) {
  storage.setItem('theme', theme);
}

function initializeTheme() {
  const root = document.documentElement;
  const button = document.querySelector('.theme-toggle');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

  let storedTheme = null;
  try {
    storedTheme = localStorage.getItem('theme');
  } catch {
    // The system preference remains available when storage is blocked.
  }

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    if (button) {
      const next = nextTheme(theme);
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.setAttribute('aria-label', `Switch to ${next} mode`);
      button.setAttribute('title', `Switch to ${next} mode`);
    }
  };

  applyTheme(resolveTheme(storedTheme, systemTheme));

  button?.addEventListener('click', () => {
    const theme = nextTheme(root.dataset.theme);
    applyTheme(theme);
    try {
      persistTheme(localStorage, theme);
    } catch {
      // The selected theme still applies for this visit.
    }
  });
}

if (typeof document !== 'undefined') {
  initializeTheme();
}
