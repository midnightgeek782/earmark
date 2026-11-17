// Theme choice is a per-device convenience, so it lives in localStorage
// (wrapped: storage can be blocked) rather than in the exported list.
export type Theme = 'system' | 'light' | 'dark';
const KEY = 'earmark.theme';

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

export function setTheme(t: Theme) {
  try {
    if (t === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
}

export function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
  root.style.colorScheme = t === 'system' ? 'light dark' : t;
}
