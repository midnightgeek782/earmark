import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateSettings } from '../db/db';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

let deferred: BeforeInstallPromptEvent | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as BeforeInstallPromptEvent;
});

const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Shown once there are real albums: suggests adding Earmark to the home screen. */
export function InstallCard() {
  const settings = useLiveQuery(() => db.settings.get('settings'), []);
  const realCount = useLiveQuery(() => db.albums.filter((a) => !a.sample && !a.deletedAt).count(), []);
  const [canPrompt, setCanPrompt] = useState(!!deferred);

  useEffect(() => {
    const on = () => setCanPrompt(true);
    window.addEventListener('beforeinstallprompt', on);
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);

  if (!settings || settings.installCardDismissed || standalone() || (realCount ?? 0) < 3) return null;
  if (!canPrompt && !isIos()) return null;

  const dismiss = () => updateSettings({ installCardDismissed: true });

  return (
    <aside className="install-card">
      <div>
        <strong>Keep Earmark on your home screen</strong>
        <p className="muted">
          {canPrompt
            ? 'It opens like an app and works offline.'
            : 'In Safari, tap Share, then Add to Home Screen. It works offline.'}
        </p>
      </div>
      <div className="row">
        <button className="btn" type="button" onClick={dismiss}>
          Not now
        </button>
        {canPrompt && (
          <button
            className="btn btn-primary"
            type="button"
            onClick={async () => {
              await deferred?.prompt();
              deferred = null;
              void dismiss();
            }}
          >
            Install
          </button>
        )}
      </div>
    </aside>
  );
}
