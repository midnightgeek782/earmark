import type { CSSProperties } from 'react';
import { editAlbum } from '../db/albums';
import { waitedFor } from '../domain/insights';
import type { Album } from '../domain/types';
import { Cover } from './Cover';

export const RATING_LABEL = { loved: 'Loved it', liked: 'Liked it', 'not-for-me': 'Not for me' } as const;

export function StarButton({ album, size = 'sm' }: { album: Album; size?: 'sm' | 'lg' }) {
  const on = !!album.starred;
  return (
    <button
      type="button"
      className={`star star-${size} ${on ? 'star-on' : ''}`}
      aria-pressed={on}
      aria-label={on ? `Take ${album.title} out of Listen soon` : `Add ${album.title} to Listen soon`}
      title={on ? 'On your Listen soon shelf' : 'Save for soon: puts it on your Listen soon shelf'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void editAlbum(album.id, { starred: !on });
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z"
          fill={on ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      {size === 'lg' && <span>{on ? 'Listening soon' : 'Listen soon'}</span>}
    </button>
  );
}

interface CardProps {
  album: Album;
  onRemove?: (a: Album) => void;
  style?: CSSProperties;
}

/** Grid card: cover, title, artist, recommender, verdict, tags. */
export function AlbumCard({ album: a, onRemove, style }: CardProps) {
  return (
    <li className="card" style={style}>
      <a href={`#/album/${a.id}`} className="card-link">
        <Cover album={a} />
        <span className="card-title">{a.title}</span>
        <span className="card-artist muted">
          {a.artist}
          {a.lengthMinutes ? ` · ${a.lengthMinutes} min` : ''}
        </span>
        {a.recommendedBy && <span className="person card-person">from {a.recommendedBy}</span>}
        {a.status === 'listened' && a.rating && (
          <span className={`verdict verdict-${a.rating}`}>{RATING_LABEL[a.rating]}</span>
        )}
        {(a.tags?.length ?? 0) > 0 && (
          <span className="card-tags">
            {a.tags!.slice(0, 2).map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </span>
        )}
        {a.sample && <span className="badge">Sample</span>}
      </a>
      {a.status === 'queued' && <StarButton album={a} />}
      {onRemove && (
        <button
          className="card-remove"
          type="button"
          aria-label={`Remove ${a.title}`}
          onClick={() => onRemove(a)}
        >
          ×
        </button>
      )}
    </li>
  );
}

/** Compact list row for the list view. */
export function AlbumRow({ album: a, onRemove }: CardProps) {
  return (
    <li className="row-item">
      <a href={`#/album/${a.id}`} className="row-link">
        <span className="row-cover">
          <Cover album={a} />
        </span>
        <span className="row-main">
          <span className="row-title">{a.title}</span>
          <span className="muted small">
            {a.artist}
            {a.year ? ` · ${a.year}` : ''}
          </span>
        </span>
        <span className="row-from">
          {a.recommendedBy ? (
            <span className="person">{a.recommendedBy}</span>
          ) : (
            <span className="muted">—</span>
          )}
        </span>
        <span className="row-tags">
          {(a.tags ?? []).slice(0, 3).map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </span>
        <span className="row-meta muted small">
          {a.status === 'listened' && a.rating
            ? RATING_LABEL[a.rating]
            : a.lengthMinutes
              ? `${a.lengthMinutes} min`
              : ''}
        </span>
        <span className="row-meta muted small">{a.status === 'listened' ? '' : waitedFor(a.addedAt)}</span>
      </a>
      {a.status === 'queued' && <StarButton album={a} />}
      {onRemove && (
        <button
          className="row-remove"
          type="button"
          aria-label={`Remove ${a.title}`}
          onClick={() => onRemove(a)}
        >
          ×
        </button>
      )}
    </li>
  );
}
