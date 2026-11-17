// Pasted-link parsing (final gate uc1). Only known hosts are parsed; the raw
// link is never rendered. Apple Music and Bandcamp carry the album name in the
// address; Spotify needs its oEmbed title (fetched by src/mb/oembed.ts).

export type ParsedLink =
  | { kind: 'query'; query: string; source: 'apple' | 'bandcamp' }
  | { kind: 'spotify'; url: string }
  | { kind: 'unknown' }
  | { kind: 'not-a-link' };

const unslug = (s: string) => decodeURIComponent(s).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

export function parseLink(input: string): ParsedLink {
  const text = input.trim();
  if (!/^https?:\/\//i.test(text)) return { kind: 'not-a-link' };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { kind: 'unknown' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { kind: 'unknown' };
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);

  if (host === 'music.apple.com' || host === 'geo.music.apple.com') {
    const i = parts.indexOf('album');
    const slug = i >= 0 ? parts[i + 1] : undefined;
    if (slug && !/^\d+$/.test(slug)) return { kind: 'query', query: unslug(slug), source: 'apple' };
    return { kind: 'unknown' };
  }

  if (host.endsWith('.bandcamp.com') && parts[0] === 'album' && parts[1]) {
    const artist = host.slice(0, -'.bandcamp.com'.length);
    return { kind: 'query', query: `${unslug(artist)} ${unslug(parts[1])}`, source: 'bandcamp' };
  }

  if (host === 'open.spotify.com') {
    const i = parts.indexOf('album');
    const id = i >= 0 ? parts[i + 1] : undefined;
    if (id && /^[A-Za-z0-9]{10,40}$/.test(id))
      return { kind: 'spotify', url: `https://open.spotify.com/album/${id}` };
  }

  return { kind: 'unknown' };
}

/** Allowlisted hosts for stored links (import and enrichment). */
export function isAllowedLink(url: string | null, kind: 'spotify' | 'apple' | 'cover'): boolean {
  if (url == null) return true;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  if (kind === 'spotify') return h === 'open.spotify.com';
  if (kind === 'apple') return ['music.apple.com', 'geo.music.apple.com', 'itunes.apple.com'].includes(h);
  return h === 'coverartarchive.org' || h === 'archive.org' || h.endsWith('.archive.org');
}
