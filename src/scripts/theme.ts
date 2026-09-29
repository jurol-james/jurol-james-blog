const root = document.documentElement;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

try {
  const storedTheme = localStorage.getItem('theme');
  root.dataset.theme = storedTheme || (systemDark ? 'dark' : 'light');
} catch {
  root.dataset.theme = systemDark ? 'dark' : 'light';
}

document.querySelector('.theme-toggle')?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('theme', next);
  } catch {
    // Theme still works for this visit when storage is unavailable.
  }
});
