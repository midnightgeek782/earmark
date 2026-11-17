import { useCallback, useEffect, useState } from 'react';
import { updateSettings } from '../db/db';
import { editAlbum, saveAlbum } from '../db/albums';
import { coverUrl } from '../mb/client';
import { serviceSearchUrl } from '../domain/query';
import type { Suggestion } from '../domain/suggest';
import type { Album, Settings } from '../domain/types';
import { getSuggestions } from '../jobs/suggest';
import { runEnrichment } from '../jobs/enrich';
import { removeSamples } from '../sample/samples';
import { useToast } from './Toast';
import { useEscape } from './useEscape';

type State =
  { kind: 'loading' } | { kind: 'ok'; items: Suggestion[] } | { kind: 'no-seeds' } | { kind: 'error' };

function useSuggestions(albums: Album[], settings: Settings, enabled: boolean) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [added, setAdded] = useState<Set<string>>(new Set());
  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    const r = await getSuggestions(albums, settings.suggestFrom);
    setState(r.kind === 'ok' ? { kind: 'ok', items: r.suggestions } : r);
    // albums intentionally omitted: a new batch only when asked, not on every list change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.suggestFrom]);
  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  const toast = useToast();
  const add = async (s: Suggestion) => {
    const r = await saveAlbum({
      title: s.title,
      artist: s.artist,
      year: s.year,
      musicBrainzId: s.releaseGroupMbid,
      coverUrl: coverUrl(s.releaseGroupMbid),
    });
    setAdded((prev) => new Set(prev).add(s.releaseGroupMbid));
    if (r.kind === 'exists') return toast({ text: `${s.title} is already on your list` });
    await editAlbum(r.album.id, { recommenderNote: `${s.reason}.`, tags: ['suggested'] });
    void removeSamples();
    void runEnrichment();
    toast({ text: `Added ${s.title}` });
  };
  return { state, load, add, added };
}

function SuggestionCard({
  s,
  added,
  app,
  onAdd,
}: {
  s: Suggestion;
  added: boolean;
  app: string | null;
  onAdd: () => void;
}) {
  return (
    <li className="suggestion">
      <img
        className="suggestion-cover"
        src={coverUrl(s.releaseGroupMbid)}
        alt=""
        loading="lazy"
        onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
      />
      <div className="suggestion-text">
        <strong>{s.title}</strong>
        <span className="muted">
          {s.artist}
          {s.year ? ` · ${s.year}` : ''}
        </span>
        <span className="suggestion-reason">{s.reason}</span>
      </div>
      <div className="suggestion-actions">
        <a
          className="btn btn-ghost"
          href={serviceSearchUrl(app ?? 'spotify', s.artist, s.title)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Preview
        </a>
        <button className="btn btn-primary" type="button" onClick={onAdd} disabled={added}>
          {added ? 'Added' : 'Add'}
        </button>
      </div>
    </li>
  );
}

function Body({
  state,
  app,
  added,
  onAdd,
}: {
  state: State;
  app: string | null;
  added: Set<string>;
  onAdd: (s: Suggestion) => void;
}) {
  if (state.kind === 'loading')
    return (
      <ul className="suggestions" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className="suggestion skeleton">
            <span className="suggestion-cover" />
            <span className="skeleton-lines">
              <span />
              <span />
            </span>
          </li>
        ))}
      </ul>
    );
  if (state.kind === 'no-seeds')
    return (
      <p className="muted">
        Add an album from search (not by hand) so Earmark knows the artist, then it can suggest more like it.
      </p>
    );
  if (state.kind === 'error')
    return <p className="muted">Couldn't reach ListenBrainz just now. Try again in a moment.</p>;
  if (state.items.length === 0)
    return <p className="muted">No new suggestions right now. Try again later.</p>;
  return (
    <ul className="suggestions">
      {state.items.map((s) => (
        <SuggestionCard
          key={s.releaseGroupMbid}
          s={s}
          app={app}
          added={added.has(s.releaseGroupMbid)}
          onAdd={() => onAdd(s)}
        />
      ))}
    </ul>
  );
}

/** "Suggest an album" sheet: new albums like the ones you have. */
export function SuggestSheet({
  albums,
  settings,
  onClose,
}: {
  albums: Album[];
  settings: Settings;
  onClose: () => void;
}) {
  useEscape(onClose);
  const { state, load, add, added } = useSuggestions(albums, settings, true);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet sheet-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Suggested albums"
      >
        <div className="sheet-head">
          <div>
            <h2 className="sheet-title">Albums you might like</h2>
            <p className="muted small">
              Based on artists on your list, using listening data from ListenBrainz. Only artist IDs are sent.
            </p>
          </div>
        </div>
        <Body state={state} app={settings.musicApp} added={added} onAdd={add} />
        <div className="row">
          <button className="btn" type="button" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={load}
            disabled={state.kind === 'loading'}
          >
            Suggest more
          </button>
        </div>
      </div>
    </div>
  );
}

/** Home panel: opt-in, because it sends artist IDs to ListenBrainz. */
export function SuggestedPanel({ albums, settings }: { albums: Album[]; settings: Settings }) {
  const on = settings.suggestionsOnHome;
  const { state, load, add, added } = useSuggestions(albums, settings, on);
  return (
    <section className="panel suggest-panel" aria-label="Suggested for you">
      <div className="shelf-head">
        <div>
          <h2 className="shelf-title">Suggested for you</h2>
          <p className="shelf-sub muted">New albums similar to artists on your list.</p>
        </div>
        {on && (
          <button className="btn btn-ghost" type="button" onClick={load} disabled={state.kind === 'loading'}>
            Refresh
          </button>
        )}
      </div>
      {on ? (
        <Body state={state} app={settings.musicApp} added={added} onAdd={add} />
      ) : (
        <div className="suggest-optin">
          <p className="muted">
            Earmark can suggest albums by artists similar to the ones you save. It asks ListenBrainz, an open
            music database, using artist IDs only. Your list stays on this device.
          </p>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => updateSettings({ suggestionsOnHome: true })}
          >
            Turn on suggestions
          </button>
        </div>
      )}
    </section>
  );
}
