// Album identity rules (docs/plan.md, Storage rules + eng review).
// Pure functions: no React, no database, no network.

const FEAT = /\s*[([]?\s*(?:feat\.?|ft\.?|featuring)\s+[^)\]]*[)\]]?/giu;

/**
 * Normalize an artist or title for duplicate detection.
 * Unicode-aware so non-Latin titles stay distinct: NFKD, drop combining marks,
 * NFC, lowercase, "&" -> "and", drop "feat." credits and a leading "the",
 * keep only letters, numbers and spaces, collapse spaces.
 * If nothing survives (an emoji-only title), fall back to the trimmed lowercase text.
 */
export function normalize(input: string): string {
  const raw = input.trim().toLowerCase();
  const cleaned = raw
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .normalize('NFC')
    .replace(FEAT, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^the /, '');
  return cleaned || raw.replace(/\s+/g, ' ');
}

/** Key used for the artist + title duplicate check (non-unique index). */
export function normKey(artist: string, title: string): string {
  return `${normalize(artist)}|${normalize(title)}`;
}

export interface IdentitySource {
  musicBrainzId?: string | null;
  artist: string;
  title: string;
}

/** Stable identity: the MusicBrainz release-group ID when known, else artist + title. */
export function identityKey(album: IdentitySource): string {
  return album.musicBrainzId ? `mb:${album.musicBrainzId}` : `hand:${normKey(album.artist, album.title)}`;
}

/**
 * Same album? When both records have an MBID, the MBID decides (so two different
 * albums both titled "Weezer" stay separate). Otherwise compare artist + title.
 */
export function isSameAlbum(a: IdentitySource, b: IdentitySource): boolean {
  if (a.musicBrainzId && b.musicBrainzId) return a.musicBrainzId === b.musicBrainzId;
  return normKey(a.artist, a.title) === normKey(b.artist, b.title);
}
