import { useState } from 'react';
import type { Album } from '../domain/types';

// Muted, record-sleeve palette for albums without artwork. Picked by a stable
// hash of the title so the same album always gets the same sleeve.
const SLEEVES = [
  ['#2B3A42', '#E9E1D3'],
  ['#5B3A29', '#F1E3CF'],
  ['#1F3B2D', '#E3EBDD'],
  ['#3A2E4A', '#ECE4F0'],
  ['#7A2E2E', '#F6E5DF'],
  ['#2E4A6B', '#E2EAF3'],
  ['#4A4A3A', '#EDEBDF'],
  ['#1E1E1E', '#E9E6DF'],
] as const;

function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return h >>> 0;
}

/** Album cover with a typographic sleeve fallback and the brass earmark fold. */
export function Cover({ album, size = 'card' }: { album: Album; size?: 'card' | 'hero' }) {
  const [failed, setFailed] = useState(false);
  const fold = size === 'hero' ? 36 : 22;
  const [bg, fg] = SLEEVES[hash(`${album.artist}|${album.title}`) % SLEEVES.length]!;
  const variant = hash(album.title) % 3;
  return (
    <div className={`cover cover-${size}`}>
      {album.coverUrl && !failed ? (
        <img src={album.coverUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div
          className={`cover-fallback sleeve-${variant}`}
          style={{ background: bg, color: fg }}
          aria-hidden="true"
        >
          <span className="sleeve-mark" style={{ borderColor: fg }} />
          <span className="sleeve-title">{album.title}</span>
          <span className="sleeve-artist">{album.artist}</span>
        </div>
      )}
      {album.recommendedBy && (
        <span className="fold" style={{ width: fold, height: fold }} aria-hidden="true" />
      )}
    </div>
  );
}
