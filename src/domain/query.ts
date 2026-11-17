// MusicBrainz release-group search query (docs/plan.md, Add by name).

const SPECIAL = /([+\-!(){}[\]^"~*?:\\/]|&&|\|\|)/g;

/** Escape Lucene specials and neutralise bare AND/OR/NOT words. */
export function escapeLucene(text: string): string {
  return text
    .trim()
    .replace(SPECIAL, '\\$1')
    .replace(/\b(AND|OR|NOT)\b/g, (w) => w.toLowerCase());
}

export function buildSearchQuery(text: string): string | null {
  const t = escapeLucene(text);
  if (!t) return null;
  return `(releasegroup:(${t}) OR artist:(${t})) AND (primarytype:album OR primarytype:ep) AND NOT secondarytype:(live OR compilation OR demo)`;
}

/** Search URL for the chosen music app (search fallback when no exact link). */
export function serviceSearchUrl(app: string, artist: string, title: string): string {
  const q = encodeURIComponent(`${artist} ${title}`);
  switch (app) {
    case 'spotify':
      return `https://open.spotify.com/search/${q}`;
    case 'apple':
      return `https://music.apple.com/search?term=${q}`;
    case 'youtube':
      return `https://music.youtube.com/search?q=${q}`;
    case 'tidal':
      return `https://listen.tidal.com/search?q=${q}`;
    case 'deezer':
      return `https://www.deezer.com/search/${q}`;
    default:
      return `https://bandcamp.com/search?q=${q}&item_type=a`;
  }
}

/**
 * Re-rank search results locally: MusicBrainz scores title and artist matches
 * separately, so "radiohead in rainbows" can rank an album *named* Radiohead
 * first. Prefer results whose title + artist together cover the typed words,
 * then title matches, then MusicBrainz's own score.
 */
export function rerank<T extends { title: string; artist: string; score: number }>(
  text: string,
  results: T[],
): T[] {
  const words = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
  const typed = words(text);
  if (typed.length === 0) return results;
  const rank = (r: T) => {
    const title = new Set(words(r.title));
    const artist = new Set(words(r.artist));
    const covered = typed.filter((w) => title.has(w) || artist.has(w)).length / typed.length;
    const inTitle = typed.filter((w) => title.has(w)).length;
    const titleExtra = [...title].filter((w) => !typed.includes(w)).length;
    return covered * 100 + inTitle * 5 - titleExtra * 2 + r.score / 100;
  };
  return results
    .map((r, i) => ({ r, i, s: rank(r) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.r);
}

const nameKey = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/^the /, '');

/**
 * If the typed text is exactly an artist's name (ignoring case, accents,
 * punctuation and a leading "The"), return that artist. When several artists
 * share the name, pick the one with the most matching results.
 */
export function exactArtist<T extends { artistId: string | null; artistName: string }>(
  text: string,
  results: T[],
): { id: string; name: string } | null {
  const typed = nameKey(text);
  if (!typed) return null;
  const counts = new Map<string, { name: string; n: number }>();
  for (const r of results) {
    if (!r.artistId || nameKey(r.artistName) !== typed) continue;
    const c = counts.get(r.artistId) ?? { name: r.artistName, n: 0 };
    c.n++;
    counts.set(r.artistId, c);
  }
  const best = [...counts.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  return best ? { id: best[0], name: best[1].name } : null;
}

/** Drop results that don't cover every typed word, when at least one result does. */
export function onlyRelevant<T extends { title: string; artist: string }>(text: string, results: T[]): T[] {
  const typed = nameKey(text).split(' ').filter(Boolean);
  if (typed.length === 0) return results;
  const covers = (r: T) => {
    const have = new Set(nameKey(`${r.title} ${r.artist}`).split(' '));
    // The last word may still be being typed, so accept a prefix for it.
    return typed.every((w, i) =>
      i === typed.length - 1 ? [...have].some((h) => h.startsWith(w)) : have.has(w),
    );
  };
  const full = results.filter(covers);
  return full.length ? full : results;
}

export interface BrowsedGroup {
  id: string;
  title: string;
  'first-release-date'?: string;
  'primary-type'?: string | null;
  'secondary-types'?: string[];
}

/** Studio albums and EPs only (no live, compilation, remix, demo, interview…), newest first. */
export function studioReleases(groups: BrowsedGroup[]): BrowsedGroup[] {
  return groups
    .filter((g) => (g['secondary-types'] ?? []).length === 0)
    .filter((g) => !g['primary-type'] || g['primary-type'] === 'Album' || g['primary-type'] === 'EP')
    .sort(
      (a, b) =>
        (b['first-release-date'] ?? '').localeCompare(a['first-release-date'] ?? '') ||
        a.title.localeCompare(b.title),
    );
}
