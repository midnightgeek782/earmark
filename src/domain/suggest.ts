// Album suggestions: pure ranking rules. Network calls live in src/net/listenbrainz.ts.
//
//   your albums ──► seed artists (loved > liked > on your list; "not for me" excluded)
//        │
//        ▼
//   similar artists per seed (ListenBrainz) ──► skip artists you already have
//        │
//        ▼
//   each artist's most-played album you don't have ──► up to N suggestions,
//   each with a reason ("Because you loved Kid A")

import type { Album } from './types';

export interface Seed {
  artistMbid: string;
  artist: string;
  /** The album that made this artist a seed, for the "because" line. */
  because: Album;
  weight: number;
}

export interface SimilarArtist {
  artistMbid: string;
  name: string;
  score: number;
  seed: string;
}

export interface TopAlbum {
  releaseGroupMbid: string;
  title: string;
  artist: string;
  artistMbid: string;
  year: number | null;
  type: string | null;
  listens: number;
}

export interface Suggestion extends TopAlbum {
  reason: string;
}

const WEIGHTS = { loved: 4, liked: 2.5, none: 1.5, queued: 1 } as const;

/** Seed artists from your list. `from: 'loved'` uses only albums you loved or liked. */
export function pickSeeds(albums: Album[], from: 'loved' | 'all' = 'all'): Seed[] {
  const best = new Map<string, Seed>();
  for (const a of albums) {
    if (a.deletedAt || !a.artistMbid || a.rating === 'not-for-me') continue;
    const w =
      a.rating === 'loved'
        ? WEIGHTS.loved
        : a.rating === 'liked'
          ? WEIGHTS.liked
          : a.status === 'listened'
            ? WEIGHTS.none
            : WEIGHTS.queued;
    if (from === 'loved' && a.rating !== 'loved' && a.rating !== 'liked') continue;
    const cur = best.get(a.artistMbid);
    if (!cur || w > cur.weight)
      best.set(a.artistMbid, { artistMbid: a.artistMbid, artist: a.artist, because: a, weight: w });
    else cur.weight += 0.5; // several albums by one artist count a little extra
  }
  return [...best.values()].sort((a, b) => b.weight - a.weight || a.artist.localeCompare(b.artist));
}

/** Choose up to n seeds, favouring heavier ones but mixing it up between batches. */
export function chooseSeeds(seeds: Seed[], n: number, random: () => number = Math.random): Seed[] {
  const pool = [...seeds];
  const out: Seed[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, x) => s + x.weight, 0);
    let r = random() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= pool[i]!.weight;
      if (r <= 0) break;
    }
    out.push(pool.splice(i, 1)[0]!);
  }
  return out;
}

/** Similar artists you don't already have, best first, one entry per artist. */
export function candidateArtists(
  similar: SimilarArtist[],
  albums: Album[],
  exclude: Set<string> = new Set(),
): SimilarArtist[] {
  const have = new Set(albums.filter((a) => !a.deletedAt && a.artistMbid).map((a) => a.artistMbid!));
  const seen = new Set<string>();
  return [...similar]
    .sort((a, b) => b.score - a.score)
    .filter((s) => {
      if (have.has(s.artistMbid) || exclude.has(s.artistMbid) || seen.has(s.artistMbid)) return false;
      seen.add(s.artistMbid);
      return true;
    });
}

// ListenBrainz doesn't flag live albums or compilations, so catch the obvious ones by title.
const NOT_STUDIO =
  /\b(live|greatest hits|best of|the very best|collection|anthology|essential|remix(es)?|unplugged|in concert|sessions)\b/i;

/** The most-played studio album that isn't already on your list. */
export function bestAlbum(top: TopAlbum[], albums: Album[]): TopAlbum | null {
  const have = new Set(albums.filter((a) => !a.deletedAt && a.musicBrainzId).map((a) => a.musicBrainzId!));
  return (
    [...top]
      .filter(
        (t) => (t.type ?? 'Album') === 'Album' && !have.has(t.releaseGroupMbid) && !NOT_STUDIO.test(t.title),
      )
      .sort((a, b) => b.listens - a.listens)[0] ?? null
  );
}

export function reasonFor(seed: Seed): string {
  const a = seed.because;
  if (a.rating === 'loved') return `Because you loved ${a.title}`;
  if (a.rating === 'liked') return `Because you liked ${a.title}`;
  return `Because ${a.title} is on your list`;
}
