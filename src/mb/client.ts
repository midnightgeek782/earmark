// The only module that calls MusicBrainz. One request starts per second
// (shared across tabs via a slot-claim lock), searches go ahead of enrichment,
// stale searches are dropped, 10 s timeout, one retry on HTTP 503.

import {
  buildSearchQuery,
  exactArtist,
  onlyRelevant,
  rerank,
  studioReleases,
  type BrowsedGroup,
} from '../domain/query';
import type { MbRelease } from '../domain/release';

const BASE = (import.meta.env.VITE_MB_BASE_URL as string | undefined) ?? 'https://musicbrainz.org/ws/2';
const SLOT_KEY = 'earmark.mb.nextSlotAt';
const SPACING_MS = 1000;
const TIMEOUT_MS = 10_000;

export class MbError extends Error {
  constructor(
    public code: 'offline' | 'timeout' | 'busy' | 'http' | 'parse' | 'aborted',
    public status?: number,
  ) {
    super(code);
  }
}

export interface SearchResult {
  musicBrainzId: string;
  title: string;
  artist: string;
  year: number | null;
  score: number;
}

export interface Clock {
  now(): number;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
}

const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms, signal) =>
    new Promise((resolve, reject) => {
      const t = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => {
        clearTimeout(t);
        reject(new MbError('aborted'));
      });
    }),
};

/** Claim the next request slot; the lock is held only while claiming. */
async function claimSlot(clock: Clock): Promise<number> {
  const claim = () => {
    const now = clock.now();
    let next = now;
    try {
      next = Math.max(now, Number(localStorage.getItem(SLOT_KEY)) || 0);
      localStorage.setItem(SLOT_KEY, String(next + SPACING_MS));
    } catch {
      /* storage blocked: fall back to in-tab spacing */
    }
    return next - now;
  };
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  return locks ? locks.request('earmark-mb-slot', claim) : claim();
}

let inTabNext = 0;
let activeClock: Clock = realClock;

/** Tests only: swap in a fake clock and reset spacing state. */
export function _setClockForTests(c: Clock | null) {
  activeClock = c ?? realClock;
  inTabNext = 0;
  cache.clear();
}
let pendingSearch: AbortController | null = null;

async function request<T>(path: string, opts: { signal?: AbortSignal; clock?: Clock } = {}): Promise<T> {
  const clock = opts.clock ?? activeClock;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new MbError('offline');
  const deadline = clock.now() + TIMEOUT_MS;

  for (let attempt = 0; attempt < 2; attempt++) {
    const wait = Math.max(await claimSlot(clock), inTabNext - clock.now());
    inTabNext = clock.now() + wait + SPACING_MS;
    if (clock.now() + wait > deadline) throw new MbError('timeout');
    if (wait > 0) await clock.sleep(wait, opts.signal);

    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    opts.signal?.addEventListener('abort', onAbort);
    const timer = setTimeout(() => ctrl.abort(), Math.max(0, deadline - clock.now()));
    let res: Response;
    try {
      res = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}fmt=json`, { signal: ctrl.signal });
    } catch {
      if (opts.signal?.aborted) throw new MbError('aborted');
      if (clock.now() >= deadline) throw new MbError('timeout');
      throw new MbError(navigator.onLine === false ? 'offline' : 'http');
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onAbort);
    }

    if (res.status === 503 && attempt === 0) {
      const ra = Number(res.headers.get('Retry-After'));
      const backoff = Math.min(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 1500, 5000);
      try {
        localStorage.setItem(SLOT_KEY, String(clock.now() + backoff));
      } catch {
        /* ignore */
      }
      await clock.sleep(backoff, opts.signal);
      continue;
    }
    if (res.status === 503) throw new MbError('busy', 503);
    if (!res.ok) throw new MbError('http', res.status);
    try {
      return (await res.json()) as T;
    } catch {
      throw new MbError('parse');
    }
  }
  throw new MbError('busy', 503);
}

export type SearchResponse =
  | { kind: 'artist'; artist: string; results: SearchResult[]; eps: SearchResult[] }
  | { kind: 'albums'; results: SearchResult[] };

const cache = new Map<string, SearchResponse>();

/**
 * Search. If the text is exactly an artist's name, return that artist's studio
 * albums and EPs (one extra request); otherwise album matches that cover every
 * typed word. A new search aborts the previous one.
 */
export async function search(text: string): Promise<SearchResponse> {
  const q = buildSearchQuery(text);
  if (!q) return { kind: 'albums', results: [] };
  const hit = cache.get(text.trim().toLowerCase());
  if (hit) return hit;

  pendingSearch?.abort();
  const ctrl = new AbortController();
  pendingSearch = ctrl;

  type Rg = {
    id: string;
    title: string;
    score?: number;
    'first-release-date'?: string;
    'artist-credit'?: { name: string; joinphrase?: string; artist?: { id: string; name: string } }[];
  };
  const data = await request<{ 'release-groups'?: Rg[] }>(
    `/release-group?query=${encodeURIComponent(q)}&limit=25`,
    { signal: ctrl.signal },
  );
  const yearOf = (d?: string) => (d ? Number(d.slice(0, 4)) || null : null);
  const mapped = (data['release-groups'] ?? []).map((rg) => {
    const credits = rg['artist-credit'] ?? [];
    return {
      musicBrainzId: rg.id,
      title: rg.title,
      artist: credits.map((c) => c.name + (c.joinphrase ?? '')).join(''),
      year: yearOf(rg['first-release-date']),
      score: rg.score ?? 0,
      // Only single-artist credits count as "by" that artist.
      artistId: credits.length === 1 ? (credits[0]!.artist?.id ?? null) : null,
      artistName: credits.length === 1 ? (credits[0]!.artist?.name ?? credits[0]!.name) : '',
    };
  });

  let response: SearchResponse;
  const artist = exactArtist(text, mapped);
  if (artist) {
    const browsed = await request<{ 'release-groups'?: BrowsedGroup[] }>(
      `/release-group?artist=${encodeURIComponent(artist.id)}&type=album|ep&release-group-status=website-default&limit=100`,
      { signal: ctrl.signal },
    );
    const toResult = (g: BrowsedGroup): SearchResult => ({
      musicBrainzId: g.id,
      title: g.title,
      artist: artist.name,
      year: yearOf(g['first-release-date']),
      score: 100,
    });
    const studio = studioReleases(browsed['release-groups'] ?? []);
    const results = studio.filter((g) => g['primary-type'] !== 'EP').map(toResult);
    const eps = studio.filter((g) => g['primary-type'] === 'EP').map(toResult);
    response =
      results.length || eps.length
        ? { kind: 'artist', artist: artist.name, results, eps }
        : { kind: 'albums', results: strip(rerank(text, mapped).slice(0, 5)) };
  } else {
    response = { kind: 'albums', results: strip(onlyRelevant(text, rerank(text, mapped)).slice(0, 6)) };
  }
  if (pendingSearch === ctrl) pendingSearch = null;
  cache.set(text.trim().toLowerCase(), response);
  if (cache.size > 100) cache.delete(cache.keys().next().value!);
  return response;
}

const strip = (rs: (SearchResult & { artistId?: unknown; artistName?: unknown })[]): SearchResult[] =>
  rs.map(({ musicBrainzId, title, artist, year, score }) => ({ musicBrainzId, title, artist, year, score }));

/** Browse an album's releases with links and track lists (at most 4 pages of 25). */
export async function fetchReleases(releaseGroupId: string): Promise<MbRelease[]> {
  const out: MbRelease[] = [];
  for (let page = 0; page < 4; page++) {
    const data = await request<{ releases?: MbRelease[]; 'release-count'?: number }>(
      `/release?release-group=${encodeURIComponent(releaseGroupId)}&inc=url-rels+recordings&limit=25&offset=${page * 25}`,
    );
    out.push(...(data.releases ?? []));
    if (out.length >= (data['release-count'] ?? 0) || !data.releases?.length) break;
  }
  return out;
}

export interface GroupDetails {
  genres: string[];
  artistMbid: string | null;
  wikidataUrl: string | undefined;
}

/** One release-group lookup for genres, main artist and the Wikidata link. */
export async function fetchReleaseGroup(id: string): Promise<GroupDetails> {
  type G = {
    genres?: { name: string; count?: number }[];
    'artist-credit'?: { artist?: { id: string } }[];
    relations?: { type?: string; url?: { resource?: string } }[];
  };
  const g = await request<G>(`/release-group/${encodeURIComponent(id)}?inc=genres+url-rels+artist-credits`);
  return {
    genres: (g.genres ?? [])
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, 5)
      .map((x) => x.name.slice(0, 40)),
    artistMbid: g['artist-credit']?.[0]?.artist?.id ?? null,
    wikidataUrl: g.relations?.find((r) => r.type === 'wikidata')?.url?.resource,
  };
}

export function coverUrl(releaseGroupId: string, size: 250 | 500 = 250): string {
  return `https://coverartarchive.org/release-group/${releaseGroupId}/front-${size}`;
}

/** Spotify album title via oEmbed (readable from browsers). */
export async function spotifyTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return data.title?.trim() || null;
  } catch {
    return null;
  }
}

export function messageFor(err: unknown): string {
  const code = err instanceof MbError ? err.code : 'http';
  switch (code) {
    case 'offline':
      return 'Search needs a connection. Add it by hand';
    case 'timeout':
      return 'No reply from MusicBrainz after 10 s. Try again or add it by hand';
    case 'busy':
      return 'MusicBrainz is busy. Try again in a minute, or add it by hand';
    default:
      return `Search failed (${err instanceof MbError && err.status ? err.status : code}). Try again or add it by hand`;
  }
}
