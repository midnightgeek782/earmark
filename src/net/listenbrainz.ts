// ListenBrainz (MetaBrainz's open listening-data service): similar artists and
// each artist's most-played albums. Both endpoints send CORS headers, so no server.
// Only artist IDs are sent, never your list.

import type { SimilarArtist, TopAlbum } from '../domain/suggest';

const LABS = 'https://labs.api.listenbrainz.org/similar-artists/json';
const API = 'https://api.listenbrainz.org/1';
const ALGORITHM =
  'session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30';
const TIMEOUT = 10_000;

async function getJson<T>(url: string): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`ListenBrainz ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

const UUID = /^[0-9a-f-]{36}$/i;

export async function similarArtists(artistMbid: string): Promise<SimilarArtist[]> {
  if (!UUID.test(artistMbid)) return [];
  const data = await getJson<{ artist_mbid: string; name: string; score: number }[]>(
    `${LABS}?artist_mbids=${artistMbid}&algorithm=${ALGORITHM}`,
  );
  return (Array.isArray(data) ? data : [])
    .filter((d) => d && UUID.test(d.artist_mbid) && typeof d.name === 'string')
    .slice(0, 40)
    .map((d) => ({
      artistMbid: d.artist_mbid,
      name: d.name.slice(0, 300),
      score: Number(d.score) || 0,
      seed: artistMbid,
    }));
}

interface PopularityRow {
  release_group_mbid?: string;
  total_listen_count?: number;
  release_group?: { name?: string; type?: string | null; date?: string | null };
  artist?: { artists?: { artist_mbid?: string; name?: string; join_phrase?: string }[]; name?: string };
}

export async function topAlbums(artistMbid: string): Promise<TopAlbum[]> {
  if (!UUID.test(artistMbid)) return [];
  const rows = await getJson<PopularityRow[]>(
    `${API}/popularity/top-release-groups-for-artist/${artistMbid}`,
  );
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => r.release_group_mbid && UUID.test(r.release_group_mbid) && r.release_group?.name)
    .slice(0, 50)
    .map((r) => {
      const artists = r.artist?.artists ?? [];
      const artist =
        artists.map((a) => (a.name ?? '') + (a.join_phrase ?? '')).join('') || r.artist?.name || '';
      return {
        releaseGroupMbid: r.release_group_mbid!,
        title: r.release_group!.name!.slice(0, 300),
        artist: artist.slice(0, 300),
        artistMbid,
        year: r.release_group?.date ? Number(r.release_group.date.slice(0, 4)) || null : null,
        type: r.release_group?.type ?? null,
        listens: r.total_listen_count ?? 0,
      };
    });
}
