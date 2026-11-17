import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateSettings } from '../db/db';
import { importAlbums, previewImport } from '../db/albums';
import { buildCsv, buildExport, exportFilename, parseImport } from '../domain/exportFormat';
import type { Album, MusicApp } from '../domain/types';
import { removeSamples } from '../sample/samples';
import { useToast } from '../components/Toast';
import { recommenders } from '../domain/sort';
import { applyTheme, getTheme, setTheme, type Theme } from '../theme';
import { useSettings } from '../components/useSettings';
import { deleteEverything, refreshAllDetails } from '../db/albums';
import { runEnrichment } from '../jobs/enrich';

const APPS: { value: MusicApp; label: string }[] = [
  { value: 'spotify', label: 'Spotify' },
  { value: 'apple', label: 'Apple Music' },
  { value: 'youtube', label: 'YouTube Music' },
  { value: 'tidal', label: 'Tidal' },
  { value: 'deezer', label: 'Deezer' },
  { value: 'bandcamp', label: 'Bandcamp' },
];

export function Settings() {
  const settings = useLiveQuery(() => db.settings.get('settings'), []);
  const albums = useLiveQuery(() => db.albums.toArray(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{
    albums: Album[];
    musicApp: MusicApp | null;
    added: number;
    merged: number;
  } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const toast = useToast();
  const hasSamples = albums?.some((a) => a.sample && !a.deletedAt);

  const doExport = async () => {
    const all = await db.albums.toArray();
    const blob = new Blob([JSON.stringify(buildExport(all, settings?.musicApp ?? null), null, 2)], {
      type: 'application/json',
    });
    const name = exportFilename();
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Earmark export' });
      } catch {
        return;
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    await updateSettings({ addedSinceExport: 0, lastExportAt: new Date().toISOString() });
    toast({ text: `Exported ${name}` });
  };

  const doCsv = async () => {
    const blob = new Blob([buildCsv(await db.albums.toArray())], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: exportFilename().replace(/\.json$/, '.csv'),
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onFile = async (f: File | undefined) => {
    setErrors([]);
    setPending(null);
    if (!f) return;
    const r = parseImport(await f.text(), f.size);
    if (fileRef.current) fileRef.current.value = '';
    if (!r.ok) {
      setErrors([
        ...r.errors.map((e) => e.message),
        ...(r.total > r.errors.length ? [`…and ${r.total - r.errors.length} more`] : []),
      ]);
      return;
    }
    const plan = await previewImport(r.albums);
    setPending({ albums: r.albums, musicApp: r.musicApp, ...plan });
  };

  const confirmImport = async () => {
    if (!pending) return;
    const res = await importAlbums(pending.albums);
    if (res.added + res.merged > 0) await removeSamples();
    if (pending.musicApp && !settings?.musicApp) await updateSettings({ musicApp: pending.musicApp });
    toast({ text: `Imported: ${res.added} added, ${res.merged} merged` });
    setPending(null);
  };

  return (
    <section aria-labelledby="settings-title" className="settings">
      <h1 id="settings-title" className="screen-title">
        Settings
      </h1>

      <Stats albums={(albums ?? []).filter((a) => !a.sample && !a.deletedAt)} />

      <div className="settings-grid">
        <div className="panel">
          <h2 className="section-title">Your music app</h2>
          <p className="muted small">Open takes you straight to the album here.</p>
          <div className="row wrap">
            {APPS.map((a) => (
              <button
                key={a.value}
                type="button"
                className={`chip ${settings?.musicApp === a.value ? 'chip-on' : ''}`}
                onClick={() => updateSettings({ musicApp: a.value })}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2 className="section-title">Back up your list</h2>
          <p className="muted">
            Your list lives only in this browser. Export it now and then.
            {settings?.addedSinceExport ? ` ${settings.addedSinceExport} added since your last export.` : ''}
          </p>
          <div className="row">
            <button className="btn btn-primary" type="button" onClick={doExport}>
              Export
            </button>
            <button className="btn" type="button" onClick={() => fileRef.current?.click()}>
              Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
          <p className="small muted">
            Want a spreadsheet?{' '}
            <button className="linkish" type="button" onClick={doCsv}>
              Download as CSV
            </button>{' '}
            (can't be imported back).
          </p>
          {errors.length > 0 && (
            <div className="error-box" role="alert">
              <strong>Nothing was imported.</strong>
              <ul>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {pending && (
            <div className="confirm-box">
              <p>
                {pending.added} new, {pending.merged} already on your list (they'll be merged).
              </p>
              <div className="row">
                <button className="btn" type="button" onClick={() => setPending(null)}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="button" onClick={confirmImport}>
                  Import
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {hasSamples && (
        <>
          <h2 className="section-title">Sample albums</h2>
          <button className="btn" type="button" onClick={() => removeSamples()}>
            Remove sample albums
          </button>
        </>
      )}

      <div className="settings-grid">
        <div className="panel">
          <h2 className="section-title">Appearance</h2>
          <p className="muted small">Theme for this device.</p>
          <ThemePicker />
          <Preferences />
        </div>
        <div className="panel">
          <h2 className="section-title">Pick for me</h2>
          <PickPrefs />
        </div>
      </div>

      <OnlineFeatures />

      <DataTools />

      <h2 className="section-title">Keyboard shortcuts</h2>
      <dl className="shortcuts">
        <dt>
          <kbd>/</kbd>
        </dt>
        <dd>Search</dd>
        <dt>
          <kbd>P</kbd>
        </dt>
        <dd>Pick for me</dd>
        <dt>
          <kbd>L</kbd>
        </dt>
        <dd>Move between For you, To listen and Listened</dd>
        <dt>
          <kbd>S</kbd>
        </dt>
        <dd>Suggest an album</dd>
        <dt>
          <kbd>V</kbd>
        </dt>
        <dd>Switch between covers and list</dd>
        <dt>
          <kbd>Esc</kbd>
        </dt>
        <dd>Close a panel</dd>
      </dl>

      <h2 className="section-title">About</h2>
      <p className="muted">
        Earmark is free and open source. Album data from MusicBrainz, covers from the Cover Art Archive.
        Nothing leaves your device except searches and the optional features above.
      </p>
      <p className="muted small">Version 0.1.0</p>
    </section>
  );
}

function Stats({ albums }: { albums: Album[] }) {
  if (albums.length === 0) return null;
  const heard = albums.filter((a) => a.status === 'listened');
  const loved = heard.filter((a) => a.rating === 'loved').length;
  const people = recommenders(albums);
  const top = people[0];
  const topLoved = top
    ? heard.filter(
        (a) => a.rating === 'loved' && a.recommendedBy?.trim().toLowerCase() === top.name.toLowerCase(),
      ).length
    : 0;
  return (
    <div className="stats">
      <div className="stat">
        <span className="stat-num">{albums.length}</span>
        <span className="muted">{albums.length === 1 ? 'album' : 'albums'} saved</span>
      </div>
      <div className="stat">
        <span className="stat-num">{heard.length}</span>
        <span className="muted">heard{loved ? `, ${loved} loved` : ''}</span>
      </div>
      <div className="stat">
        <span className="stat-num">{people.length}</span>
        <span className="muted">{people.length === 1 ? 'person' : 'people'} recommending</span>
      </div>
      {top && (
        <div className="stat stat-wide">
          <span className="person stat-person">{top.name}</span>
          <span className="muted">
            told you about {top.count} album{top.count === 1 ? '' : 's'}
            {topLoved ? `, and you loved ${topLoved}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}

function ThemePicker() {
  const [theme, set] = useState<Theme>(getTheme());
  const choose = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
    set(t);
  };
  return (
    <div className="row wrap" role="radiogroup" aria-label="Theme">
      {(['system', 'light', 'dark'] as Theme[]).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          className={`chip ${theme === t ? 'chip-on' : ''}`}
          onClick={() => choose(t)}
        >
          {t === 'system' ? 'Match my device' : t === 'light' ? 'Light' : 'Dark'}
        </button>
      ))}
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="pref">
      <span className="pref-label">{label}</span>
      <div className="row wrap" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={`chip ${value === o.value ? 'chip-on' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle">
      <span>
        <span className="pref-label">{label}</span>
        {hint && <span className="muted small toggle-hint">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}

function Preferences() {
  const s = useSettings();
  if (!s) return null;
  return (
    <>
      <Choice
        label="Show albums as"
        value={s.defaultView}
        options={[
          { value: 'grid', label: 'Covers' },
          { value: 'list', label: 'List' },
        ]}
        onChange={(v) => updateSettings({ defaultView: v })}
      />
      <Choice
        label="Sort by default"
        value={s.defaultSort}
        options={[
          { value: 'newest', label: 'Newest' },
          { value: 'oldest', label: 'Oldest' },
          { value: 'shortest', label: 'Shortest' },
          { value: 'person', label: 'By person' },
        ]}
        onChange={(v) => updateSettings({ defaultSort: v })}
      />
      <Toggle
        label="Daily pick on the home page"
        hint="One suggestion a day, the same all day."
        on={s.showDailyPick}
        onChange={(v) => updateSettings({ showDailyPick: v })}
      />
      <Toggle
        label="Shelves on the home page"
        hint="Up next, short listens, from people you trust."
        on={s.showShelves}
        onChange={(v) => updateSettings({ showShelves: v })}
      />
    </>
  );
}

function PickPrefs() {
  const s = useSettings();
  if (!s) return null;
  return (
    <>
      <Choice
        label="How it chooses"
        value={s.pickWeighting}
        options={[
          { value: 'even', label: 'Every album equally' },
          { value: 'older', label: 'Favour ones waiting longer' },
        ]}
        onChange={(v) => updateSettings({ pickWeighting: v })}
      />
      <Toggle
        label="Pick from Up next first"
        hint="When you've starred albums, choose among those."
        on={s.pickPreferStarred}
        onChange={(v) => updateSettings({ pickPreferStarred: v })}
      />
    </>
  );
}

function DataTools() {
  const toast = useToast();
  const [usage, setUsage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void navigator.storage?.estimate?.().then((e) => {
      if (e.usage != null)
        setUsage(
          e.usage < 1e6 ? `${Math.max(1, Math.round(e.usage / 1e3))} KB` : `${(e.usage / 1e6).toFixed(1)} MB`,
        );
    });
  }, []);

  return (
    <div className="panel data-panel">
      <h2 className="section-title">Your data</h2>
      <p className="muted">
        Everything lives in this browser{usage ? `, using about ${usage} (covers included)` : ''}. Nothing is
        sent anywhere except album searches.
      </p>
      <div className="row wrap">
        <button
          className="btn"
          type="button"
          onClick={async () => {
            const n = await refreshAllDetails();
            void runEnrichment();
            toast({
              text: n ? `Refreshing details for ${n} albums in the background` : 'No albums to refresh',
            });
          }}
        >
          Refresh album details
        </button>
        <button className="btn btn-danger-outline" type="button" onClick={() => setDeleting(true)}>
          Delete everything…
        </button>
      </div>
      {deleting && (
        <div className="error-box danger-zone">
          <strong>This removes every album, note and verdict from this browser.</strong>
          <p>Export first if you might want them back. Type DELETE to confirm.</p>
          <div className="row wrap">
            <input
              className="danger-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-label="Type DELETE to confirm"
              autoFocus
            />
            <button className="btn" type="button" onClick={() => (setDeleting(false), setConfirm(''))}>
              Cancel
            </button>
            <button
              className="btn btn-destructive"
              type="button"
              disabled={confirm !== 'DELETE'}
              onClick={async () => {
                await deleteEverything();
                setDeleting(false);
                setConfirm('');
                toast({ text: 'Everything was deleted' });
              }}
            >
              Delete everything
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OnlineFeatures() {
  const s = useSettings();
  if (!s) return null;
  return (
    <div className="panel data-panel">
      <h2 className="section-title">Suggestions and descriptions</h2>
      <p className="muted">
        These optional features ask open music services for extra information. They send artist or album IDs,
        never your list, notes or names.
      </p>
      <Toggle
        label="Suggestions on the For you page"
        hint="Albums by artists similar to yours, from ListenBrainz. The Suggest button works either way."
        on={s.suggestionsOnHome}
        onChange={(v) => updateSettings({ suggestionsOnHome: v })}
      />
      <Choice
        label="Suggest from"
        value={s.suggestFrom}
        options={[
          { value: 'all', label: 'Everything on my list' },
          { value: 'loved', label: 'Only albums I loved or liked' },
        ]}
        onChange={(v) => updateSettings({ suggestFrom: v })}
      />
      <Toggle
        label="Album descriptions from Wikipedia"
        hint="A short “About this album” on album pages, when Wikipedia has one."
        on={s.wikiDescriptions}
        onChange={(v) => updateSettings({ wikiDescriptions: v })}
      />
    </div>
  );
}
