import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateSettings } from '../db/db';
import { removeSamples } from '../sample/samples';
import { saveAlbum, softDelete, undoDelete, commitDelete } from '../db/albums';
import { coverUrl, messageFor, search, spotifyTitle, type SearchResult } from '../mb/client';
import { parseLink } from '../domain/links';
import { parseLimit, pick, type PickResult } from '../domain/pick';
import { formatDuration, recommenders, samePerson, sortAlbums } from '../domain/sort';
import { allTags } from '../domain/tags';
import { Cover } from '../components/Cover';
import { AlbumCard, AlbumRow } from '../components/AlbumCard';
import { Greeting, Shelves, TonightsPick } from '../components/Shelves';
import { InstallCard } from '../components/InstallCard';
import { SuggestedPanel, SuggestSheet } from '../components/Suggestions';
import { WhoSheet } from '../components/WhoSheet';
import { useEscape } from '../components/useEscape';
import { useSettings } from '../components/useSettings';
import { normalize } from '../domain/identity';
import { useToast } from '../components/Toast';
import { runEnrichment } from '../jobs/enrich';
import { queueHref, type Sort, type Tab } from '../router';
import type { Album, Settings } from '../domain/types';

interface QueueProps {
  tab: Tab;
  initialQuery?: string;
  sort?: Sort;
  from?: string;
  tag?: string;
}

const SORT_LABELS: Record<Sort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  shortest: 'Shortest',
  person: 'By person',
};

export function Queue({ tab, initialQuery, sort: sortParam, from, tag }: QueueProps) {
  const albums = useLiveQuery(() => db.albums.toArray(), []);
  const settings = useSettings();
  const [picking, setPicking] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const toast = useToast();

  const listTab: 'toListen' | 'listened' = tab === 'listened' ? 'listened' : 'toListen';
  const sort: Sort = sortParam ?? settings?.defaultSort ?? 'newest';
  const view = settings?.defaultView ?? 'grid';
  const live = (albums ?? []).filter((a) => !a.deletedAt);
  const queued = live.filter((a) => a.status === 'queued');
  const listened = live.filter((a) => a.status === 'listened');
  const inTab = listTab === 'toListen' ? queued : listened;
  const people = recommenders(inTab);
  const tags = allTags(inTab);
  const filtered = inTab
    .filter((a) => !from || samePerson(a.recommendedBy, from))
    .filter((a) => !tag || (a.tags ?? []).includes(tag));
  const shown = sortAlbums(filtered, sort, listTab);
  const hasSamples = live.some((a) => a.sample);

  const knownMinutes = queued.reduce((s, a) => s + (a.lengthMinutes ?? 0), 0);
  const allPeople = recommenders(live);
  const summary =
    tab === 'listened'
      ? [
          `${listened.length} heard`,
          listened.filter((a) => a.rating === 'loved').length > 0 &&
            `${listened.filter((a) => a.rating === 'loved').length} loved`,
        ]
      : [
          `${queued.length} album${queued.length === 1 ? '' : 's'} to hear`,
          knownMinutes > 0 && formatDuration(knownMinutes),
          allPeople.length > 0 && `from ${allPeople.length} ${allPeople.length === 1 ? 'person' : 'people'}`,
        ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey)
        return;
      if (e.key === '/') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.search')?.focus();
      } else if (e.key === 'p' && queued.length > 0) {
        setPicking(true);
      } else if (e.key === 's') {
        setSuggesting(true);
      } else if (e.key === 'l') {
        const next = tab === 'home' ? 'toListen' : tab === 'toListen' ? 'listened' : 'home';
        location.hash = queueHref(next, { sort: sortParam });
      } else if (e.key === 'v') {
        void updateSettings({ defaultView: view === 'grid' ? 'list' : 'grid' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab, sortParam, queued.length, view]);

  const remove = async (a: Album) => {
    await softDelete(a.id);
    toast({
      text: `Removed ${a.title}`,
      action: { label: 'Undo', run: () => void undoDelete(a.id) },
      onExpire: () => void commitDelete(a.id),
    });
  };

  const href = (o: { sort?: Sort; from?: string; tag?: string }) =>
    queueHref(listTab, { sort: sortParam, from, tag, ...o });
  const title = tab === 'home' ? 'For you' : tab === 'toListen' ? 'To listen' : 'Listened';

  return (
    <section aria-labelledby="queue-title">
      <div className="queue-head">
        <div>
          <Greeting />
          <h1 id="queue-title" className="screen-title">
            {title}
          </h1>
          {albums && <p className="summary muted">{summary.filter(Boolean).join(' · ')}</p>}
        </div>
        <div className="head-actions">
          <button
            className="btn btn-ghost-strong"
            type="button"
            onClick={() => setSuggesting(true)}
            title="New albums similar to artists on your list"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
            </svg>
            Suggest an album
          </button>
          <div className="pickbar">
            <button
              className="btn btn-primary btn-pick"
              type="button"
              disabled={queued.length === 0}
              onClick={() => setPicking(true)}
              title="Can't decide? Earmark chooses one album from your list"
            >
              <svg className="pick-glyph" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="2.5" fill="var(--accent)" />
              </svg>
              Pick for me
            </button>
          </div>
        </div>
      </div>

      <AddBox initialQuery={initialQuery} />

      {!hasSamples && (settings?.addedSinceExport ?? 0) >= 10 && (
        <p className="sample-note backup-note">
          <strong>{settings!.addedSinceExport} albums added since your last backup.</strong> Your list lives
          only in this browser. <a href="#/settings">Export a copy</a>
        </p>
      )}

      {hasSamples && tab !== 'listened' && (
        <p className="sample-note">
          <strong>These are samples</strong> to show how Earmark works. Search above to add your first album,
          and they'll step aside. <a href="#/settings">Remove samples</a>
        </p>
      )}

      <nav className="segments" aria-label="Sections">
        <a href={queueHref('home')} aria-current={tab === 'home' ? 'page' : undefined}>
          For you
        </a>
        <a
          href={queueHref('toListen', { sort: sortParam })}
          aria-current={tab === 'toListen' ? 'page' : undefined}
        >
          To listen <span className="count">{queued.length}</span>
        </a>
        <a
          href={queueHref('listened', { sort: sortParam })}
          aria-current={tab === 'listened' ? 'page' : undefined}
        >
          Listened <span className="count">{listened.length}</span>
        </a>
      </nav>

      {tab === 'home' && albums && settings && (
        <Home queued={queued} live={live} settings={settings} onPick={() => setPicking(true)} />
      )}

      {tab !== 'home' && (
        <>
          <div className="toolbar">
            <p className="muted small toolbar-note">
              {shown.length === inTab.length
                ? `${shown.length} album${shown.length === 1 ? '' : 's'}`
                : `${shown.length} of ${inTab.length} albums`}
            </p>
            <div className="toolbar-right">
              {inTab.length > 1 && (
                <label className="sort">
                  <span className="visually-hidden">Sort</span>
                  <select
                    value={sort}
                    onChange={(e) => (location.hash = href({ sort: e.target.value as Sort }))}
                  >
                    {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
                      <option key={s} value={s}>
                        {SORT_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <ViewToggle view={view} />
            </div>
          </div>

          {(people.length > 0 || tags.length > 0) && (
            <div className="filters">
              {people.length > 0 && (
                <div className="people" role="group" aria-label="Filter by who recommended it">
                  <a className={`chip ${!from ? 'chip-on' : ''}`} href={href({ from: undefined })}>
                    Everyone
                  </a>
                  {people.map((p) => (
                    <a
                      key={p.name}
                      className={`chip chip-person ${samePerson(p.name, from) ? 'chip-on' : ''}`}
                      href={href({ from: samePerson(p.name, from) ? undefined : p.name })}
                    >
                      <span className="person">{p.name}</span>
                      <span className="count">{p.count}</span>
                    </a>
                  ))}
                </div>
              )}
              {tags.length > 0 && (
                <div className="people tag-filters" role="group" aria-label="Filter by tag">
                  {tags.map((t) => (
                    <a
                      key={t.tag}
                      className={`chip chip-tag ${tag === t.tag ? 'chip-on' : ''}`}
                      href={href({ tag: tag === t.tag ? undefined : t.tag })}
                    >
                      <span aria-hidden="true">#</span>
                      {t.tag} <span className="count">{t.count}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {albums && shown.length === 0 && <EmptyState tab={listTab} filtered={!!from || !!tag} />}

          {view === 'grid' ? (
            <ul className="grid">
              {shown.map((a, i) => (
                <AlbumCard
                  key={a.id}
                  album={a}
                  onRemove={remove}
                  style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                />
              ))}
            </ul>
          ) : (
            shown.length > 0 && (
              <ul className="rows">
                <li className="rows-head muted small" aria-hidden="true">
                  <span />
                  <span>Album</span>
                  <span>From</span>
                  <span>Tags</span>
                  <span>{listTab === 'listened' ? 'Verdict' : 'Length'}</span>
                  <span>{listTab === 'listened' ? '' : 'Waiting'}</span>
                </li>
                {shown.map((a) => (
                  <AlbumRow key={a.id} album={a} onRemove={remove} />
                ))}
              </ul>
            )
          )}
        </>
      )}

      {tab !== 'listened' && <InstallCard />}

      {picking && settings && (
        <PickSheet albums={live} settings={settings} onClose={() => setPicking(false)} />
      )}
      {suggesting && settings && (
        <SuggestSheet albums={live} settings={settings} onClose={() => setSuggesting(false)} />
      )}
    </section>
  );
}

/** The For you tab: daily pick, shelves, suggestions and recent additions. */
function Home({
  queued,
  live,
  settings,
  onPick,
}: {
  queued: Album[];
  live: Album[];
  settings: Settings;
  onPick: () => void;
}) {
  if (live.length === 0) return <EmptyState tab="toListen" filtered={false} />;
  const recent = [...live].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 6);
  return (
    <div className="home">
      {settings.showDailyPick && queued.length >= 1 && (
        <TonightsPick queued={queued} settings={settings} onAnother={onPick} />
      )}
      {settings.showShelves && queued.length >= 2 && <Shelves queued={queued} all={live} />}
      <SuggestedPanel albums={live} settings={settings} />
      <section className="shelf" aria-label="Recently added">
        <div className="shelf-head">
          <div>
            <h2 className="shelf-title">Recently added</h2>
            <p className="shelf-sub muted">The latest albums you saved.</p>
          </div>
          <a className="muted small" href={queueHref('toListen')}>
            See all {queued.length} →
          </a>
        </div>
        <ul className="grid grid-compact">
          {recent.map((a) => (
            <AlbumCard key={a.id} album={a} />
          ))}
        </ul>
      </section>
      {queued.length > 0 && queued.length < 4 && !live.some((a) => a.sample) && (
        <aside className="nudge">
          <div className="nudge-art" aria-hidden="true">
            <span />
            <span />
          </div>
          <div>
            <strong>Who else told you about an album lately?</strong>
            <p className="muted">
              A friend's text, a podcast, that song in a café. Search it above, or paste the link they sent.
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}

function ViewToggle({ view }: { view: 'grid' | 'list' }) {
  return (
    <div className="view-toggle" role="radiogroup" aria-label="View">
      {(['grid', 'list'] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={view === v}
          aria-label={v === 'grid' ? 'Grid view' : 'List view'}
          title={v === 'grid' ? 'Grid view' : 'List view'}
          className={view === v ? 'on' : ''}
          onClick={() => updateSettings({ defaultView: v })}
        >
          {v === 'grid' ? (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" fill="currentColor" />
              <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" fill="currentColor" />
              <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" fill="currentColor" />
              <rect x="9" y="9" width="5.5" height="5.5" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <rect x="1.5" y="2" width="13" height="2.5" rx="1" fill="currentColor" />
              <rect x="1.5" y="6.75" width="13" height="2.5" rx="1" fill="currentColor" />
              <rect x="1.5" y="11.5" width="13" height="2.5" rx="1" fill="currentColor" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ tab, filtered }: { tab: 'toListen' | 'listened'; filtered: boolean }) {
  if (filtered)
    return (
      <div className="empty">
        <p>Nothing matches these filters here.</p>
        <a href={queueHref(tab)}>Clear filters</a>
      </div>
    );
  if (tab === 'listened')
    return (
      <div className="empty">
        <div className="empty-stack" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <h2>Nothing heard yet</h2>
        <p className="muted">
          When you finish an album, mark it as listened. It lands here with your verdict.
        </p>
      </div>
    );
  return (
    <div className="empty">
      <div className="empty-stack" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h2>Your list is clear</h2>
      <p className="muted">
        Someone tells you about an album. You search for it above, note who said it, and it waits here.
      </p>
      <ol className="steps">
        <li>
          <strong>Search</strong> an album or paste a Spotify, Apple Music or Bandcamp link
        </li>
        <li>
          <strong>Note who told you</strong>, and what they said
        </li>
        <li>
          <strong>Pick for me</strong> when you have time to listen
        </li>
      </ol>
    </div>
  );
}

function AddBox({ initialQuery }: { initialQuery?: string }) {
  const [text, setText] = useState(initialQuery ?? '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [artistMode, setArtistMode] = useState<string | null>(null);
  const [eps, setEps] = useState<SearchResult[]>([]);
  const [showEps, setShowEps] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [handOpen, setHandOpen] = useState(false);
  const [justAdded, setJustAdded] = useState<Album | null>(null);
  const seq = useRef(0);
  const mine = useLiveQuery(() => db.albums.filter((a) => !a.deletedAt && !a.sample).toArray(), []);
  const q = normalize(text);
  const onList =
    text.trim().length >= 2 && !/^https?:/i.test(text.trim())
      ? (mine ?? []).filter((a) => normalize(`${a.title} ${a.artist}`).includes(q)).slice(0, 3)
      : [];
  const toast = useToast();

  useEffect(() => {
    const t = text.trim();
    if (t.length < 2) {
      setResults([]);
      setArtistMode(null);
      setStatus(null);
      return;
    }
    const mine = ++seq.current;
    const timer = window.setTimeout(async () => {
      let query = t;
      const link = parseLink(t);
      if (link.kind === 'query') query = link.query;
      if (link.kind === 'spotify') {
        const title = await spotifyTitle(link.url);
        if (!title) {
          if (mine === seq.current) setStatus("Couldn't read that Spotify link. Type the album name instead");
          return;
        }
        query = title;
      }
      if (link.kind === 'unknown') {
        setStatus("Earmark can't read that link. Type the album name instead");
        return;
      }
      setStatus('Searching…');
      setResults([]);
      setArtistMode(null);
      setEps([]);
      try {
        const r = await search(query);
        if (mine !== seq.current) return;
        setResults(r.results);
        setArtistMode(r.kind === 'artist' ? r.artist : null);
        setEps(r.kind === 'artist' ? r.eps : []);
        setShowEps(r.kind === 'artist' && r.results.length === 0);
        setStatus(
          r.results.length || (r.kind === 'artist' && r.eps.length) ? null : 'No matches. Add it by hand',
        );
      } catch (e) {
        if (mine !== seq.current) return;
        if ((e as { code?: string }).code === 'aborted') return;
        setStatus(messageFor(e));
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [text]);

  const add = async (r: SearchResult) => {
    const res = await saveAlbum({
      title: r.title,
      artist: r.artist,
      year: r.year,
      musicBrainzId: r.musicBrainzId,
      coverUrl: coverUrl(r.musicBrainzId),
    });
    if (res.kind === 'exists') {
      toast({ text: `${res.album.title} is already on your list` });
    } else {
      setJustAdded(res.album);
      void runEnrichment();
      void removeSamples();
    }
    setText('');
    setResults([]);
  };

  const renderResult = (r: SearchResult) => (
    <li key={r.musicBrainzId}>
      <button type="button" className="result" onClick={() => add(r)}>
        <img
          className="result-cover"
          src={coverUrl(r.musicBrainzId)}
          alt=""
          loading="lazy"
          onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
        />
        <span className="result-text">
          <span className="result-title">{r.title}</span>
          <span className="muted">
            {r.artist}
            {r.year ? ` · ${r.year}` : ''}
          </span>
        </span>
        <span className="result-add" aria-hidden="true">
          Add
        </span>
      </button>
    </li>
  );

  return (
    <div className="addbox">
      <input
        className="search"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search an album, or paste a link"
        aria-label="Search albums"
        maxLength={300}
      />
      {status && (
        <p className="search-status muted" role="status">
          {status}{' '}
          {status !== 'Searching…' && (
            <button className="linkish" type="button" onClick={() => setHandOpen(true)}>
              Add by hand
            </button>
          )}
        </p>
      )}
      {onList.length > 0 && (
        <div className="results on-list">
          <p className="results-label">On your list</p>
          {onList.map((a) => (
            <a key={a.id} className="result" href={`#/album/${a.id}`}>
              <span className="result-cover-wrap">
                <Cover album={a} />
              </span>
              <span className="result-text">
                <span className="result-title">{a.title}</span>
                <span className="muted">
                  {a.artist} · {a.status === 'listened' ? 'Listened' : 'To listen'}
                  {a.recommendedBy ? ` · from ${a.recommendedBy}` : ''}
                </span>
              </span>
            </a>
          ))}
        </div>
      )}
      {(results.length > 0 || eps.length > 0) && (
        <ul className={`results ${artistMode ? 'results-artist' : ''}`}>
          <li className="results-label">
            {artistMode ? (
              <>
                Albums by {artistMode} <span className="count">{results.length}</span>
              </>
            ) : (
              'Albums'
            )}
          </li>
          {results.map(renderResult)}
          {eps.length > 0 && (
            <li className="results-label results-sub">
              <button className="linkish" type="button" onClick={() => setShowEps((v) => !v)}>
                {showEps ? 'Hide' : 'Show'} EPs <span className="count">{eps.length}</span>
              </button>
            </li>
          )}
          {showEps && eps.map(renderResult)}
        </ul>
      )}
      {handOpen && (
        <HandEntry
          initial={text}
          onClose={() => setHandOpen(false)}
          onAdded={(a) => {
            setText('');
            setJustAdded(a);
          }}
        />
      )}
      {justAdded && <WhoSheet album={justAdded} onClose={() => setJustAdded(null)} />}
    </div>
  );
}

function HandEntry({
  initial,
  onClose,
  onAdded,
}: {
  initial: string;
  onClose: () => void;
  onAdded: (a: Album) => void;
}) {
  useEscape(onClose);
  const [title, setTitle] = useState(initial);
  const [artist, setArtist] = useState('');
  const toast = useToast();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) return;
    const r = await saveAlbum({ title, artist });
    onClose();
    if (r.kind === 'saved') {
      void removeSamples();
      onAdded(r.album);
    } else toast({ text: `${r.album.title} is already on your list` });
  };
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="sheet-title">Add by hand</h2>
        <label className="field">
          Album
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            required
            autoFocus
          />
        </label>
        <label className="field">
          Artist
          <input value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={300} required />
        </label>
        <div className="row">
          <button className="btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function PickSheet({
  albums,
  settings,
  onClose,
}: {
  albums: Album[];
  settings: Settings;
  onClose: () => void;
}) {
  const previousId = settings.previousPickId;
  useEscape(onClose);
  const [limitText, setLimitText] = useState('');
  const [result, setResult] = useState<PickResult | null>(null);
  const roll = async () => {
    const limit = limitText.trim() ? parseLimit(limitText) : null;
    const r = pick(albums, {
      limit,
      previousId: result?.kind === 'picked' ? result.album.id : previousId,
      weighting: settings.pickWeighting,
      preferStarred: settings.pickPreferStarred,
    });
    setResult(r);
    if (r.kind === 'picked') await updateSettings({ previousPickId: r.album.id });
  };
  const badLimit = limitText.trim() !== '' && parseLimit(limitText) === null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Pick for me">
        <h2 className="sheet-title">Pick for me</h2>
        <label className="field">
          I have this many minutes (optional)
          <input
            inputMode="numeric"
            value={limitText}
            onChange={(e) => setLimitText(e.target.value)}
            placeholder="Any length"
          />
        </label>
        <div className="row wrap" role="group" aria-label="Quick time limits">
          {['', '30', '45', '60', '90'].map((m) => (
            <button
              key={m || 'any'}
              type="button"
              className={`chip ${limitText.trim() === m ? 'chip-on' : ''}`}
              onClick={() => setLimitText(m)}
            >
              {m ? `${m} min` : 'Any'}
            </button>
          ))}
        </div>
        {badLimit && <p className="error-text">Enter whole minutes, like 45.</p>}
        {result?.kind === 'picked' && (
          <div className="pick-reveal" key={result.album.id}>
            <Cover album={result.album} size="hero" />
            <strong className="pick-title">{result.album.title}</strong>
            <span className="muted">
              {result.album.artist}
              {result.album.lengthMinutes ? ` · ${result.album.lengthMinutes} min` : ''}
            </span>
            {result.album.recommendedBy && (
              <p className="pick-quote">
                {result.album.recommenderNote && <>“{result.album.recommenderNote}” </>}
                <span className="person">— {result.album.recommendedBy}</span>
              </p>
            )}
            <a className="linkish" href={`#/album/${result.album.id}`} onClick={onClose}>
              Open album
            </a>
          </div>
        )}
        {result?.kind === 'none-fit' && (
          <p className="muted">
            Nothing fits. The shortest is{' '}
            <a href={`#/album/${result.shortest.id}`}>{result.shortest.title}</a> at{' '}
            {result.shortest.lengthMinutes} min.
          </p>
        )}
        {result?.kind === 'no-lengths' && (
          <p className="muted">No album lengths are known yet. Try without a limit.</p>
        )}
        {result?.kind === 'empty' && <p className="muted">Your queue is empty.</p>}
        <div className="row">
          <button className="btn" type="button" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" type="button" onClick={roll} disabled={badLimit}>
            {result?.kind === 'picked' ? 'Pick another' : 'Pick'}
          </button>
        </div>
      </div>
    </div>
  );
}
