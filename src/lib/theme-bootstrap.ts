export const themeBootstrap = `
(() => {
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
  try {
    const storedTheme = localStorage.getItem('theme');
    document.documentElement.dataset.theme =
      storedTheme === 'light' || storedTheme === 'dark'
        ? storedTheme
        : systemTheme;
  } catch {
    document.documentElement.dataset.theme = systemTheme;
  }
})();
`;
