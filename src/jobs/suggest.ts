import {
  bestAlbum,
  candidateArtists,
  chooseSeeds,
  pickSeeds,
  reasonFor,
  type Suggestion,
} from '../domain/suggest';
import type { Album } from '../domain/types';
import { similarArtists, topAlbums } from '../net/listenbrainz';

const shownThisSession = new Set<string>();
const similarCache = new Map<string, Awaited<ReturnType<typeof similarArtists>>>();

export type SuggestResult =
  { kind: 'ok'; suggestions: Suggestion[] } | { kind: 'no-seeds' } | { kind: 'error' };

/**
 * Up to `n` album suggestions from artists similar to ones on your list.
 * Each call favours artists not suggested earlier in this session.
 */
export async function getSuggestions(albums: Album[], from: 'loved' | 'all', n = 6): Promise<SuggestResult> {
  const seeds = pickSeeds(albums, from);
  if (seeds.length === 0) return { kind: 'no-seeds' };
  try {
    const chosen = chooseSeeds(seeds, 3);
    const lists = await Promise.all(
      chosen.map(async (s) => {
        const hit = similarCache.get(s.artistMbid);
        if (hit) return hit;
        const list = await similarArtists(s.artistMbid);
        similarCache.set(s.artistMbid, list);
        return list;
      }),
    );
    // Interleave seeds so one artist doesn't dominate the batch.
    const perSeed = lists.map((l) => candidateArtists(l, albums, shownThisSession).slice(0, 8));
    const order: (typeof perSeed)[number] = [];
    for (let i = 0; i < 8; i++) for (const l of perSeed) if (l[i]) order.push(l[i]!);

    const out: Suggestion[] = [];
    const usedArtists = new Set<string>();
    for (const artist of order) {
      if (out.length >= n) break;
      if (usedArtists.has(artist.artistMbid)) continue;
      usedArtists.add(artist.artistMbid);
      const top = await topAlbums(artist.artistMbid).catch(() => []);
      const album = bestAlbum(top, albums);
      if (!album) continue;
      const seed = chosen.find((s) => s.artistMbid === artist.seed)!;
      out.push({ ...album, artist: album.artist || artist.name, reason: reasonFor(seed) });
      shownThisSession.add(artist.artistMbid);
    }
    if (out.length === 0 && shownThisSession.size > 0) {
      shownThisSession.clear();
      return getSuggestions(albums, from, n);
    }
    return { kind: 'ok', suggestions: out };
  } catch {
    return { kind: 'error' };
  }
}
