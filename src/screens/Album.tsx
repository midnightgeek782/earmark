import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { editAlbum, markListened, moveBackToQueue, softDelete, undoDelete, commitDelete } from '../db/albums';
import { Cover } from '../components/Cover';
import { StarButton } from '../components/AlbumCard';
import { TagEditor } from '../components/TagEditor';
import { useCoverTint } from '../components/useCoverTint';
import { shareText, waitedFor } from '../domain/insights';
import { personHref } from '../router';
import { fetchAbout } from '../net/wiki';
import { saveAbout } from '../db/albums';
import { useToast } from '../components/Toast';
import { serviceSearchUrl } from '../domain/query';
import { LIMITS, type Album as AlbumT, type Rating } from '../domain/types';

const RATINGS: { value: Rating; label: string }[] = [
  { value: 'loved', label: 'Loved it' },
  { value: 'liked', label: 'Liked it' },
  { value: 'not-for-me', label: 'Not for me' },
];

function openUrl(a: AlbumT, app: string | null | undefined): string {
  if (app === 'spotify' && a.spotifyUrl) return a.spotifyUrl;
  if (app === 'apple' && a.appleMusicUrl) return a.appleMusicUrl;
  return serviceSearchUrl(app ?? 'spotify', a.artist, a.title);
}

export function Album({ id }: { id: string }) {
  const album = useLiveQuery(() => db.albums.get(id).then((a) => (a && !a.deletedAt ? a : null)), [id]);
  const settings = useLiveQuery(() => db.settings.get('settings'), []);
  const toast = useToast();
  const tint = useCoverTint(album?.coverUrl ?? null);
  useAbout(album ?? null, settings?.wikiDescriptions ?? true);

  if (album === undefined) return null;
  if (album === null)
    return (
      <section>
        <p className="muted">This album isn't on your list.</p>
        <a href="#/">Back to the queue</a>
      </section>
    );

  const share = async () => {
    const link = album.spotifyUrl ?? album.appleMusicUrl ?? openUrl(album, settings?.musicApp);
    const text = shareText(album, link);
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast({ text: 'Copied. Paste it to a friend.' });
      }
    } catch {
      /* cancelled */
    }
  };

  const remove = async () => {
    await softDelete(album.id);
    location.hash = '#/';
    toast({
      text: `Removed ${album.title}`,
      action: { label: 'Undo', run: () => void undoDelete(album.id) },
      onExpire: () => void commitDelete(album.id),
    });
  };

  return (
    <section
      aria-labelledby="album-title"
      className={`album ${tint ? 'album-tinted' : ''}`}
      style={tint ? ({ '--tint': tint } as React.CSSProperties) : undefined}
    >
      <a className="muted back" href={album.status === 'listened' ? '#/listened' : '#/list'}>
        ← Back
      </a>
      <div className="album-head">
        <Cover album={album} size="hero" />
        <div>
          <h1 id="album-title" className="album-title">
            {album.title}
          </h1>
          <p className="album-artist">{album.artist}</p>
          {album.genres && album.genres.length > 0 && (
            <p className="genres" aria-label="Genres">
              {album.genres.map((g) => (
                <span key={g} className="genre">
                  {g}
                </span>
              ))}
            </p>
          )}
          {album.status === 'queued' && (
            <p className="eyebrow">
              Waiting {waitedFor(album.addedAt)}
              {album.recommendedBy ? (
                <>
                  {' · from '}
                  <a className="person" href={personHref(album.recommendedBy)}>
                    {album.recommendedBy}
                  </a>
                </>
              ) : null}
            </p>
          )}
          <p className="muted">
            {[
              album.year,
              album.lengthMinutes && `${album.lengthMinutes} min`,
              album.trackCount && `${album.trackCount} tracks`,
            ]
              .filter(Boolean)
              .join(' · ') || (album.enrichment === 'pending' ? 'Looking up details…' : '')}
          </p>
          <div className="row">
            <a
              className="btn btn-primary"
              href={openUrl(album, settings?.musicApp)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in {appName(settings?.musicApp)}
            </a>
            {album.status === 'queued' ? (
              <ListenedButton id={album.id} />
            ) : (
              <button className="btn" type="button" onClick={() => moveBackToQueue(album.id)}>
                Move back to To listen
              </button>
            )}
            {album.status === 'queued' && <StarButton album={album} size="lg" />}
            <button
              className="btn btn-icon"
              type="button"
              onClick={share}
              aria-label="Recommend to a friend"
              title="Recommend to a friend"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                <path d="M12 3v12" />
                <path d="m7 8 5-5 5 5" />
              </svg>
            </button>
          </div>
          {!settings?.musicApp && (
            <p className="muted small">
              Choose your music app in <a href="#/settings">Settings</a>.
            </p>
          )}
        </div>
      </div>

      <div className="album-panels">
        <div className="panel">
          <h2 className="panel-title">The recommendation</h2>
          {album.recommendedBy && album.recommenderNote && (
            <blockquote className="quote">
              <p>“{album.recommenderNote}”</p>
              <footer className="person">
                — <a href={personHref(album.recommendedBy)}>{album.recommendedBy}</a>
              </footer>
            </blockquote>
          )}
          <Field
            label="Recommended by"
            value={album.recommendedBy}
            max={LIMITS.recommender}
            person
            placeholder="Who told you about it?"
            onSave={(v) => editAlbum(album.id, { recommendedBy: v })}
          />
          <Field
            label="What they said"
            value={album.recommenderNote}
            max={LIMITS.note}
            multiline
            placeholder="“Track 3 is the one”"
            onSave={(v) => editAlbum(album.id, { recommenderNote: v })}
          />
        </div>

        <div className="panel">
          <h2 className="panel-title">{album.status === 'listened' ? 'Your listen' : 'Details'}</h2>
          <TagEditor album={album} />
          <dl className="facts">
            <dt>Added</dt>
            <dd>{relativeDate(album.addedAt)}</dd>
            {album.listenedAt && (
              <>
                <dt>Listened</dt>
                <dd>{relativeDate(album.listenedAt)}</dd>
              </>
            )}
            <dt>Year</dt>
            <dd>{album.year ?? '—'}</dd>
            <dt>Length</dt>
            <dd>
              {album.lengthMinutes
                ? `${album.lengthMinutes} min`
                : album.enrichment === 'pending'
                  ? 'Looking up…'
                  : 'Unknown'}
            </dd>
            {album.trackCount && (
              <>
                <dt>Tracks</dt>
                <dd>{album.trackCount}</dd>
              </>
            )}
          </dl>
          {album.status === 'listened' && (
            <>
              <div className="field">
                Your verdict
                <div className="row wrap">
                  {RATINGS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      className={`chip ${album.rating === r.value ? 'chip-on' : ''}`}
                      onClick={() =>
                        editAlbum(album.id, { rating: album.rating === r.value ? null : r.value })
                      }
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <Field
                label="Your notes"
                value={album.listeningNote}
                max={LIMITS.note}
                multiline
                placeholder="What did you think?"
                onSave={(v) => editAlbum(album.id, { listeningNote: v })}
              />
            </>
          )}
          {album.lengthMinutes == null && album.enrichment !== 'pending' && (
            <Field
              label="Know the length? (minutes)"
              value={null}
              max={3}
              placeholder="e.g. 42"
              onSave={(v) => {
                const n = v ? Number(v) : NaN;
                if (Number.isInteger(n) && n >= 1 && n <= LIMITS.maxLength)
                  return editAlbum(album.id, { lengthMinutes: n });
              }}
            />
          )}
          {album.musicBrainzId && (
            <p className="small muted">
              <a
                href={`https://musicbrainz.org/release-group/${album.musicBrainzId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on MusicBrainz
              </a>
            </p>
          )}
        </div>
      </div>

      {album.about && (
        <section className="panel about-panel" aria-label="About this album">
          <h2 className="panel-title">About this album</h2>
          <p className="about-text">{album.about.text}</p>
          <a className="muted small" href={album.about.url} target="_blank" rel="noopener noreferrer">
            Read more on Wikipedia →
          </a>
        </section>
      )}

      {album.tracks && album.tracks.length > 0 && <TrackList tracks={album.tracks} />}

      <button className="btn btn-danger" type="button" onClick={remove}>
        Remove from Earmark
      </button>
    </section>
  );
}

function fmt(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function TrackList({ tracks }: { tracks: NonNullable<AlbumT['tracks']> }) {
  return (
    <div className="panel tracks-panel">
      <h2 className="panel-title">
        Tracks <span className="count">{tracks.length}</span>
      </h2>
      <ol className="tracks">
        {tracks.map((t, i) => (
          <li key={i}>
            <span className="track-n">{i + 1}</span>
            <span className="track-title">{t.title || 'Untitled'}</span>
            <span className="track-len">{t.lengthMs ? fmt(t.lengthMs) : ''}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function ListenedButton({ id }: { id: string }) {
  return (
    <button className="btn" type="button" onClick={() => markListened(id)}>
      Mark as listened
    </button>
  );
}

function appName(app: string | null | undefined) {
  return (
    (
      {
        spotify: 'Spotify',
        apple: 'Apple Music',
        youtube: 'YouTube Music',
        tidal: 'Tidal',
        deezer: 'Deezer',
        bandcamp: 'Bandcamp',
      } as Record<string, string>
    )[app ?? ''] ?? 'Spotify'
  );
}

function Field(props: {
  label: string;
  value: string | null;
  max: number;
  placeholder?: string;
  multiline?: boolean;
  person?: boolean;
  onSave: (v: string | null) => unknown;
}) {
  const [v, setV] = useState(props.value ?? '');
  useEffect(() => setV(props.value ?? ''), [props.value]);
  const commit = () => {
    const next = v.trim() || null;
    if (next !== props.value) void props.onSave(next);
  };
  const common = {
    value: v,
    maxLength: props.max,
    placeholder: props.placeholder,
    className: props.person ? 'person-input' : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV(e.target.value),
    onBlur: commit,
  };
  return (
    <label className="field">
      {props.label}
      {props.multiline ? (
        <textarea rows={3} {...common} />
      ) : (
        <input {...common} onKeyDown={(e) => e.key === 'Enter' && commit()} />
      )}
    </label>
  );
}

const aboutInFlight = new Set<string>();

/** Fetch and cache a Wikipedia description once per album, when allowed. */
function useAbout(album: AlbumT | null, allowed: boolean) {
  const id = album?.id;
  const qid = album?.wikidataId;
  const missing = album?.about === undefined;
  useEffect(() => {
    if (!allowed || !id || !qid || !missing || aboutInFlight.has(id)) return;
    aboutInFlight.add(id);
    fetchAbout(qid)
      .then((about) => saveAbout(id, about))
      .catch(() => {
        /* offline or blocked: try again another time */
      })
      .finally(() => aboutInFlight.delete(id));
  }, [allowed, id, qid, missing]);
}
