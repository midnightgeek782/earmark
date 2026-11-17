import { useEffect, useState } from 'react';
import { useRoute } from './router';
import { Queue } from './screens/Queue';
import { Album } from './screens/Album';
import { Settings } from './screens/Settings';
import { People, Person } from './screens/People';
import { Insights } from './screens/Insights';
import { ToastProvider } from './components/Toast';
import { storageWorks, getSettings, updateSettings } from './db/db';
import { seedSamplesOnce } from './sample/samples';
import { startEnrichment } from './jobs/enrich';

export function App() {
  const route = useRoute();
  const [storage, setStorage] = useState<'checking' | 'ok' | 'blocked'>('checking');

  useEffect(() => {
    void (async () => {
      if (!(await storageWorks())) return setStorage('blocked');
      setStorage('ok');
      await seedSamplesOnce();
      const s = await getSettings();
      if (!s.persistRequested && navigator.storage?.persist) {
        await navigator.storage.persist().catch(() => false);
        await updateSettings({ persistRequested: true });
      }
      startEnrichment();
    })();
  }, []);

  if (storage === 'blocked')
    return (
      <div className="app">
        <h1 className="screen-title">Earmark can't save here</h1>
        <p className="muted">
          This browser is blocking storage (often a private window). Open Earmark in a normal window to keep a
          list.
        </p>
      </div>
    );

  return (
    <ToastProvider>
      <div className="app">
        <header className="topbar">
          <a className="brand" href="#/">
            Earmark
          </a>
          <nav className="mainnav" aria-label="Main">
            <a href="#/" aria-current={route.name === 'queue' || route.name === 'album' ? 'page' : undefined}>
              Albums
            </a>
            <a
              href="#/people"
              aria-current={route.name === 'people' || route.name === 'person' ? 'page' : undefined}
            >
              People
            </a>
            <a href="#/insights" aria-current={route.name === 'insights' ? 'page' : undefined}>
              Insights
            </a>
            <a href="#/settings" aria-current={route.name === 'settings' ? 'page' : undefined}>
              Settings
            </a>
          </nav>
        </header>
        <main>
          {storage === 'ok' && route.name === 'queue' && (
            <Queue
              tab={route.tab}
              initialQuery={route.q}
              sort={route.sort}
              from={route.from}
              tag={route.tag}
            />
          )}
          {storage === 'ok' && route.name === 'album' && <Album id={route.id} />}
          {storage === 'ok' && route.name === 'settings' && <Settings />}
          {storage === 'ok' && route.name === 'people' && <People />}
          {storage === 'ok' && route.name === 'person' && <Person person={route.person} />}
          {storage === 'ok' && route.name === 'insights' && <Insights />}
        </main>
        <footer className="footer muted small">
          <span>Earmark keeps your list on this device. No account, no tracking.</span>
          <span>
            Album data from{' '}
            <a href="https://musicbrainz.org" target="_blank" rel="noopener noreferrer">
              MusicBrainz
            </a>
          </span>
        </footer>
      </div>
    </ToastProvider>
  );
}
