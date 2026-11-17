// Edition selection (owner decision D7.1): length and track count come from the
// first release, official first then earliest date, whose every track has a length.

export interface MbTrack {
  length?: number | null;
  title?: string;
}
export interface MbRelease {
  id: string;
  status?: string | null;
  date?: string | null;
  media?: { tracks?: MbTrack[] }[];
  relations?: { url?: { resource?: string } }[];
}

export interface Enriched {
  lengthMinutes: number | null;
  trackCount: number | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  tracks: { title: string; lengthMs: number | null }[];
  genres?: string[];
  artistMbid?: string | null;
  wikidataId?: string | null;
}

const dateKey = (d?: string | null) => {
  if (!d) return Number.POSITIVE_INFINITY;
  const [y, m = '01', day = '01'] = d.split('-');
  const t = Date.parse(`${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
};

export function orderReleases(releases: MbRelease[]): MbRelease[] {
  return releases
    .map((r, i) => ({ r, i }))
    .sort(
      (a, b) =>
        Number(b.r.status === 'Official') - Number(a.r.status === 'Official') ||
        dateKey(a.r.date) - dateKey(b.r.date) ||
        a.i - b.i,
    )
    .map((x) => x.r);
}

const tracksOf = (r: MbRelease) => (r.media ?? []).flatMap((m) => m.tracks ?? []);

function linkOf(r: MbRelease, test: (host: string) => boolean): string | null {
  for (const rel of r.relations ?? []) {
    const res = rel.url?.resource;
    if (!res) continue;
    try {
      const u = new URL(res);
      if (u.protocol === 'https:' && test(u.hostname)) return res;
    } catch {
      /* ignore malformed */
    }
  }
  return null;
}

export function enrichFromReleases(releases: MbRelease[]): Enriched {
  const ordered = orderReleases(releases);
  const complete = ordered.find((r) => {
    const t = tracksOf(r);
    return t.length > 0 && t.every((x) => typeof x.length === 'number' && x.length > 0);
  });
  const chosen = complete ?? ordered[0];
  const tracks = chosen ? tracksOf(chosen) : [];
  const lengthMinutes = complete
    ? Math.round(tracks.reduce((s, t) => s + (t.length ?? 0), 0) / 60000) || null
    : null;

  const isSpotify = (h: string) => h === 'open.spotify.com';
  const isApple = (h: string) => ['music.apple.com', 'geo.music.apple.com', 'itunes.apple.com'].includes(h);
  const pickLink = (test: (h: string) => boolean) =>
    (chosen && linkOf(chosen, test)) ?? ordered.map((r) => linkOf(r, test)).find(Boolean) ?? null;

  return {
    lengthMinutes,
    trackCount: tracks.length || null,
    spotifyUrl: pickLink(isSpotify),
    appleMusicUrl: pickLink(isApple),
    tracks: tracks.slice(0, 200).map((t) => ({
      title: (t.title ?? '').slice(0, 300),
      lengthMs: typeof t.length === 'number' ? t.length : null,
    })),
  };
}
