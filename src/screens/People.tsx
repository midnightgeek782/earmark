import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { albumsFrom, peopleStats, waitedFor, type PersonStats } from '../domain/insights';
import { sortAlbums } from '../domain/sort';
import { Cover } from '../components/Cover';
import { personHref } from '../router';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

function MatchMeter({ match }: { match: number | null }) {
  if (match == null)
    return <span className="match muted small">Rate 2 of their picks to see your match</span>;
  return (
    <span className="match" title="How often their picks land with you">
      <span className="match-bar">
        <span style={{ width: `${match}%` }} />
      </span>
      <span className="small">
        <strong>{match}%</strong> taste match
      </span>
    </span>
  );
}

export function People() {
  const albums = useLiveQuery(() => db.albums.toArray(), []);
  if (!albums) return null;
  const people = peopleStats(albums);
  const real = albums.filter((a) => !a.sample && !a.deletedAt);
  const unattributed = real.filter((a) => !a.recommendedBy).length;

  return (
    <section aria-labelledby="people-title">
      <div className="page-head">
        <h1 id="people-title" className="screen-title">
          People
        </h1>
        <p className="summary muted">
          {people.length
            ? `${people.length} ${people.length === 1 ? 'person has' : 'people have'} told you about ${real.length - unattributed} albums`
            : 'The people whose taste you trust.'}
        </p>
      </div>

      {people.length === 0 ? (
        <div className="empty">
          <div className="empty-people" aria-hidden="true">
            <span>P</span>
            <span>D</span>
            <span>S</span>
          </div>
          <h2>No one here yet</h2>
          <p className="muted">
            When you add an album, note who told you about it. Their picks collect here, and Earmark shows
            whose taste matches yours.
          </p>
          <a className="btn btn-primary" href="#/">
            Add an album
          </a>
        </div>
      ) : (
        <ul className="people-grid">
          {people.map((p) => (
            <PersonCard key={p.name} p={p} covers={albumsFrom(albums, p.name).slice(0, 3)} />
          ))}
        </ul>
      )}

      {unattributed > 0 && people.length > 0 && (
        <p className="muted small people-foot">
          {unattributed} album{unattributed === 1 ? ' has' : 's have'} no recommender yet. Open one and add
          who told you.
        </p>
      )}
    </section>
  );
}

function PersonCard({ p, covers }: { p: PersonStats; covers: ReturnType<typeof albumsFrom> }) {
  return (
    <li>
      <a className="person-card" href={personHref(p.name)}>
        <div className="person-top">
          <span className="avatar" aria-hidden="true">
            {initials(p.name)}
          </span>
          <div>
            <span className="person person-name">{p.name}</span>
            <span className="muted small">
              {p.total} album{p.total === 1 ? '' : 's'} · {p.heard} heard
              {p.loved ? ` · ${p.loved} loved` : ''}
            </span>
          </div>
        </div>
        <div className="person-covers" aria-hidden="true">
          {covers.map((a) => (
            <Cover key={a.id} album={a} />
          ))}
        </div>
        <MatchMeter match={p.match} />
      </a>
    </li>
  );
}

export function Person({ person }: { person: string }) {
  const albums = useLiveQuery(() => db.albums.toArray(), []);
  if (!albums) return null;
  const stats = peopleStats(albums).find((p) => p.name.toLowerCase() === person.trim().toLowerCase());
  const list = albumsFrom(albums, person);
  if (!stats)
    return (
      <section>
        <a className="muted back" href="#/people">
          ← People
        </a>
        <p className="muted">No albums from {person} on your list.</p>
      </section>
    );
  const queued = sortAlbums(
    list.filter((a) => a.status === 'queued'),
    'oldest',
    'toListen',
  );
  const heard = sortAlbums(
    list.filter((a) => a.status === 'listened'),
    'newest',
    'listened',
  );
  const quotes = list.filter((a) => a.recommenderNote).slice(0, 3);

  return (
    <section aria-labelledby="person-title">
      <a className="muted back" href="#/people">
        ← People
      </a>
      <div className="person-hero">
        <span className="avatar avatar-lg" aria-hidden="true">
          {initials(stats.name)}
        </span>
        <div>
          <h1 id="person-title" className="person person-title">
            {stats.name}
          </h1>
          <p className="muted">
            Told you about {stats.total} album{stats.total === 1 ? '' : 's'}, most recently{' '}
            {waitedFor(stats.lastAt) === 'today' ? 'today' : `${waitedFor(stats.lastAt)} ago`}
          </p>
          <MatchMeter match={stats.match} />
        </div>
      </div>

      <div className="stats person-stats">
        <div className="stat">
          <span className="stat-num">{stats.queued}</span>
          <span className="muted">waiting</span>
        </div>
        <div className="stat">
          <span className="stat-num">{stats.loved}</span>
          <span className="muted">loved</span>
        </div>
        <div className="stat">
          <span className="stat-num">{stats.liked}</span>
          <span className="muted">liked</span>
        </div>
        <div className="stat">
          <span className="stat-num">{stats.notForMe}</span>
          <span className="muted">not for you</span>
        </div>
      </div>

      {quotes.length > 0 && (
        <div className="quotes">
          {quotes.map((a) => (
            <a key={a.id} className="quote quote-link" href={`#/album/${a.id}`}>
              <p>“{a.recommenderNote}”</p>
              <footer className="muted small">on {a.title}</footer>
            </a>
          ))}
        </div>
      )}

      <AlbumRow
        title="Still waiting"
        albums={queued}
        empty={`You've heard everything ${stats.name} suggested.`}
      />
      <AlbumRow title="Heard" albums={heard} empty="Nothing heard yet." />
    </section>
  );
}

function AlbumRow({
  title,
  albums,
  empty,
}: {
  title: string;
  albums: ReturnType<typeof albumsFrom>;
  empty: string;
}) {
  return (
    <>
      <h2 className="section-title">
        {title} <span className="count">{albums.length}</span>
      </h2>
      {albums.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <ul className="grid">
          {albums.map((a) => (
            <li key={a.id} className="card">
              <a href={`#/album/${a.id}`} className="card-link">
                <Cover album={a} />
                <span className="card-title">{a.title}</span>
                <span className="card-artist muted">{a.artist}</span>
                {a.rating && (
                  <span className={`verdict verdict-${a.rating}`}>
                    {{ loved: 'Loved it', liked: 'Liked it', 'not-for-me': 'Not for me' }[a.rating]}
                  </span>
                )}
                {a.status === 'queued' && <span className="muted small">waiting {waitedFor(a.addedAt)}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
