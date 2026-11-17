import { dailyPick } from '../domain/pick';
import { peopleStats, waitedFor } from '../domain/insights';
import { serviceSearchUrl } from '../domain/query';
import type { Album, Settings } from '../domain/types';
import { personHref } from '../router';
import { Cover } from './Cover';
import { StarButton } from './AlbumCard';
import { useCoverTint } from './useCoverTint';
import type { CSSProperties } from 'react';

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function Greeting() {
  const d = new Date();
  return (
    <p className="eyebrow greeting">
      {greeting(d)} · {d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
    </p>
  );
}

function openLink(a: Album, app: string | null) {
  if (app === 'spotify' && a.spotifyUrl) return a.spotifyUrl;
  if (app === 'apple' && a.appleMusicUrl) return a.appleMusicUrl;
  return serviceSearchUrl(app ?? 'spotify', a.artist, a.title);
}

/** Today's suggestion: stable for the whole day. */
export function TonightsPick({
  queued,
  settings,
  onAnother,
}: {
  queued: Album[];
  settings: Settings;
  onAnother: () => void;
}) {
  const a = dailyPick(queued, new Date(), settings.pickWeighting);
  const tint = useCoverTint(a?.coverUrl ?? null);
  if (!a) return null;
  const hour = new Date().getHours();
  const label =
    hour >= 5 && hour < 12
      ? "This morning's pick"
      : hour >= 12 && hour < 18
        ? "This afternoon's pick"
        : "Tonight's pick";
  return (
    <section
      className="tonight"
      aria-label={label}
      style={tint ? ({ '--tint': tint } as CSSProperties) : undefined}
    >
      <a className="tonight-cover" href={`#/album/${a.id}`}>
        <Cover album={a} size="hero" />
      </a>
      <div className="tonight-text">
        <p className="eyebrow">
          {label} <span className="tonight-why">· chosen from your list, new each day</span>
        </p>
        <a className="tonight-title" href={`#/album/${a.id}`}>
          {a.title}
        </a>
        <p className="tonight-artist">{a.artist}</p>
        <p className="muted small">
          {[a.year, a.lengthMinutes && `${a.lengthMinutes} min`, `waiting ${waitedFor(a.addedAt)}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {a.recommendedBy && (
          <blockquote className="tonight-quote">
            {a.recommenderNote && <p>“{a.recommenderNote}”</p>}
            <footer>
              —{' '}
              <a className="person" href={personHref(a.recommendedBy)}>
                {a.recommendedBy}
              </a>
            </footer>
          </blockquote>
        )}
        <div className="row wrap">
          <a
            className="btn btn-primary"
            href={openLink(a, settings.musicApp)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Listen now
          </a>
          <StarButton album={a} size="lg" />
          <button className="btn" type="button" onClick={onAnother}>
            Something else
          </button>
        </div>
      </div>
    </section>
  );
}

function Shelf({
  title,
  sub,
  hint,
  albums,
  href,
}: {
  title: string;
  sub?: string;
  hint?: string;
  albums: Album[];
  href?: string;
}) {
  return (
    <section className="shelf" aria-label={title}>
      <div className="shelf-head">
        <div>
          <h2 className="shelf-title">
            {title} <span className="count">{albums.length}</span>
          </h2>
          {sub && <p className="shelf-sub muted">{sub}</p>}
        </div>
        {href && (
          <a className="muted small" href={href}>
            See all
          </a>
        )}
      </div>
      {hint && albums.length === 0 ? (
        <p className="shelf-hint muted">{hint}</p>
      ) : (
        <ul className="shelf-row">
          {albums.map((a) => (
            <li key={a.id}>
              <a className="shelf-card" href={`#/album/${a.id}`}>
                <Cover album={a} />
                <span className="card-title">{a.title}</span>
                <span className="muted small">
                  {a.artist}
                  {a.lengthMinutes ? ` · ${a.lengthMinutes} min` : ''}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Home shelves built from the queue. Each shelf hides itself when it has nothing to say. */
export function Shelves({ queued, all }: { queued: Album[]; all: Album[] }) {
  const byNewest = [...queued].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  const starred = byNewest.filter((a) => a.starred);
  const short = [...queued]
    .filter((a) => a.lengthMinutes != null && a.lengthMinutes <= 40)
    .sort((a, b) => a.lengthMinutes! - b.lengthMinutes!);
  const people = peopleStats(all).filter((p) => p.queued > 0);
  const trusted = [...people].sort((a, b) => (b.match ?? -1) - (a.match ?? -1) || b.queued - a.queued)[0];
  const fromTrusted = trusted
    ? byNewest.filter((a) => a.recommendedBy?.trim().toLowerCase() === trusted.name.toLowerCase())
    : [];
  const waiting = [...queued].sort((a, b) => a.addedAt.localeCompare(b.addedAt)).slice(0, 10);

  return (
    <div className="shelves">
      <Shelf
        title="Listen soon"
        sub="Albums you starred to get to next."
        albums={starred}
        hint="Tap the ☆ on any album to save it here for soon."
      />
      {short.length >= 2 && (
        <Shelf
          title="Short listens"
          sub="40 minutes or less, for when time is tight."
          albums={short.slice(0, 12)}
        />
      )}
      {trusted && fromTrusted.length >= 2 && (
        <Shelf
          title={
            trusted.match != null ? `From ${trusted.name} · ${trusted.match}% match` : `From ${trusted.name}`
          }
          albums={fromTrusted.slice(0, 12)}
          href={personHref(trusted.name)}
        />
      )}
      {queued.length >= 6 && (
        <Shelf title="Waiting longest" sub="Saved a while ago and still unheard." albums={waiting} />
      )}
    </div>
  );
}
