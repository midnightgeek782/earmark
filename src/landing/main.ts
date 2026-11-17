import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import '@fontsource/instrument-serif/400.css';
import '../styles/tokens.css';
import './landing.css';
import { applyTheme, getTheme } from '../theme';

// Same theme the visitor chose inside the app.
applyTheme(getTheme());

// Earlier versions registered the app's offline worker for the whole site, which
// would keep serving the old app here. Remove any worker not scoped to /app/.
void navigator.serviceWorker?.getRegistrations?.().then((regs) => {
  for (const r of regs) if (!new URL(r.scope).pathname.includes('/app/')) void r.unregister();
});
