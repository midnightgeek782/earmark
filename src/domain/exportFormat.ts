import { identityKey, isSameAlbum, normKey } from './identity';
import { isAllowedLink } from './links';
import { sanitizeTags } from './tags';
import { LIMITS, type Album, type MusicApp, type Rating, type Status } from './types';

export const FORMAT_VERSION = 1;

export interface ExportFile {
  format: 'backlog' | 'earmark';
  formatVersion: number;
  exportedAt: string;
  albums: Partial<Album>[];
  settings?: { musicApp?: MusicApp | null };
}

export type ImportError = { code: string; message: string };
export type ImportResult =
  | { ok: true; albums: Album[]; musicApp: MusicApp | null }
  | { ok: false; errors: ImportError[]; total: number; code: string };

const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES: Status[] = ['queued', 'listened'];
const RATINGS: Rating[] = ['loved', 'liked', 'not-for-me'];
const APPS: MusicApp[] = ['spotify', 'apple', 'youtube', 'tidal', 'deezer', 'bandcamp'];

export function buildExport(albums: Album[], musicApp: MusicApp | null, now = new Date()): ExportFile {
  return {
    format: 'earmark',
    formatVersion: FORMAT_VERSION,
    exportedAt: now.toISOString(),
    albums: albums
      .filter((a) => !a.sample && !a.deletedAt)
      .map(({ deletedAt: _d, sample: _s, enrichAttempts: _e, lastAttemptAt: _l, ...rest }) => rest),
    settings: { musicApp },
  };
}

export function exportFilename(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `earmark-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' ? v.replace(CTRL, '').slice(0, max + 1) : null;

function isoOrNull(v: unknown): string | null | undefined {
  if (v == null) return null;
  if (typeof v !== 'string') return undefined;
  const t = Date.parse(v);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

/** Validate and normalise an import file. Rejects the whole file on any error. */
export function parseImport(text: string, byteLength: number, now = new Date()): ImportResult {
  const fail = (code: string, message: string): ImportResult => ({
    ok: false,
    code,
    total: 1,
    errors: [{ code, message }],
  });
  if (byteLength > LIMITS.maxFileBytes) return fail('IMPORT_TOO_LARGE', 'This file is larger than 64 MB.');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail('IMPORT_NOT_JSON', 'This file is not a valid Earmark export.');
  }
  const f = data as Partial<ExportFile>;
  if (!f || (f.format !== 'earmark' && f.format !== 'backlog') || !Array.isArray(f.albums))
    return fail('IMPORT_NOT_BACKLOG', 'This file is not an Earmark export.');
  if (typeof f.formatVersion !== 'number' || f.formatVersion > FORMAT_VERSION)
    return fail('IMPORT_BAD_VERSION', 'Made by a newer Earmark. Reload to update, then import.');
  if (f.albums.length > LIMITS.maxAlbums)
    return fail('IMPORT_TOO_LARGE', `This file has more than ${LIMITS.maxAlbums} albums.`);

  const errors: ImportError[] = [];
  const out: Album[] = [];
  const thisYear = now.getFullYear() + 1;

  f.albums.forEach((raw, i) => {
    const n = i + 1;
    const r = (raw ?? {}) as Record<string, unknown>;
    const title = str(r.title, LIMITS.title)?.trim();
    const artist = str(r.artist, LIMITS.artist)?.trim();
    const label = `Album ${n}${title ? ` (${title})` : ''}`;
    const bad = (field: string, value: unknown, rule: string) =>
      errors.push({
        code: 'IMPORT_BAD_FIELD',
        message: `${label}: ${field} ${JSON.stringify(value)} ${rule}. Fix the file or remove that album.`,
      });

    if (!title) return bad('title', r.title, 'is missing');
    if (!artist) return bad('artist', r.artist, 'is missing');
    if (title.length > LIMITS.title) return bad('title', title.slice(0, 20) + '…', 'is too long');
    if (artist.length > LIMITS.artist) return bad('artist', artist.slice(0, 20) + '…', 'is too long');

    const mbid = r.musicBrainzId == null ? null : String(r.musicBrainzId);
    if (mbid && !UUID.test(mbid)) return bad('musicBrainzId', mbid, 'is not a MusicBrainz ID');
    const status = (r.status ?? 'queued') as Status;
    if (!STATUSES.includes(status)) return bad('status', r.status, 'is not queued or listened');
    const rating = (r.rating ?? null) as Rating | null;
    if (rating !== null && !RATINGS.includes(rating)) return bad('rating', r.rating, 'is not a valid rating');

    const num = (field: string, v: unknown, min: number, max: number): number | null | false => {
      if (v == null) return null;
      if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
        bad(field, v, `is outside ${min}-${max}`);
        return false;
      }
      return v;
    };
    const year = num('year', r.year, LIMITS.minYear, thisYear);
    const lengthMinutes = num('lengthMinutes', r.lengthMinutes, 1, LIMITS.maxLength);
    const trackCount = num('trackCount', r.trackCount, 1, LIMITS.maxTracks);
    if (year === false || lengthMinutes === false || trackCount === false) return;

    const links = { coverUrl: r.coverUrl, spotifyUrl: r.spotifyUrl, appleMusicUrl: r.appleMusicUrl };
    for (const [k, v] of Object.entries(links)) {
      if (v != null && typeof v !== 'string') return bad(k, v, 'is not a link');
      const kind = k === 'coverUrl' ? 'cover' : k === 'spotifyUrl' ? 'spotify' : 'apple';
      if (!isAllowedLink((v as string | null) ?? null, kind)) return bad(k, v, 'is not an allowed link');
    }

    const dates = ['addedAt', 'updatedAt', 'listenedAt', 'enrichedAt'] as const;
    const parsed: Record<string, string | null> = {};
    for (const d of dates) {
      const v = isoOrNull(
        r[d] ?? (d === 'addedAt' ? r.addedOn : d === 'listenedAt' ? r.listenedOn : undefined),
      );
      if (v === undefined) return bad(d, r[d], 'is not a date');
      parsed[d] = v;
    }
    const addedAt = parsed.addedAt ?? now.toISOString();

    out.push({
      id: crypto.randomUUID(),
      identityKey: identityKey({ musicBrainzId: mbid, artist, title }),
      normKey: normKey(artist, title),
      title,
      artist,
      year,
      trackCount,
      lengthMinutes,
      coverUrl: (links.coverUrl as string) ?? null,
      musicBrainzId: mbid,
      spotifyUrl: (links.spotifyUrl as string) ?? null,
      appleMusicUrl: (links.appleMusicUrl as string) ?? null,
      recommendedBy: str(r.recommendedBy, LIMITS.recommender)?.slice(0, LIMITS.recommender) || null,
      recommenderNote: str(r.recommenderNote ?? r.note, LIMITS.note)?.slice(0, LIMITS.note) || null,
      listeningNote: str(r.listeningNote ?? r.review, LIMITS.note)?.slice(0, LIMITS.note) || null,
      status,
      rating,
      addedAt,
      updatedAt: parsed.updatedAt ?? addedAt,
      listenedAt: parsed.listenedAt ?? null,
      enrichment: lengthMinutes != null || !mbid ? 'done' : 'pending',
      enrichedAt: parsed.enrichedAt ?? null,
      enrichAttempts: 0,
      lastAttemptAt: null,
      sample: false,
      deletedAt: null,
      starred: r.starred === true,
      tags: sanitizeTags(r.tags),
    });
  });

  if (errors.length)
    return { ok: false, code: errors[0]!.code, errors: errors.slice(0, 5), total: errors.length };

  const app = f.settings?.musicApp;
  return { ok: true, albums: dedupeWithin(out), musicApp: app && APPS.includes(app) ? app : null };
}

/** Merge duplicates inside one file by the same field rules. */
function dedupeWithin(albums: Album[]): Album[] {
  const result: Album[] = [];
  for (const a of albums) {
    const i = result.findIndex((r) => isSameAlbum(r, a));
    if (i < 0) result.push(a);
    else result[i] = mergeAlbum(result[i]!, a);
  }
  return result;
}

const USER_FIELDS = [
  'recommendedBy',
  'recommenderNote',
  'listeningNote',
  'status',
  'rating',
  'listenedAt',
  'starred',
  'tags',
] as const;
const ENRICH_FIELDS = [
  'year',
  'trackCount',
  'lengthMinutes',
  'coverUrl',
  'spotifyUrl',
  'appleMusicUrl',
] as const;

/**
 * Merge an incoming copy into a local one. User fields come from the newer
 * updatedAt (local wins a tie); enrichment fields from the copy whose
 * enrichment is done, else the newer enrichedAt. Identity stays local.
 */
export function mergeAlbum(local: Album, incoming: Album): Album {
  const merged: Album = { ...local };
  const incomingNewer = Date.parse(incoming.updatedAt) > Date.parse(local.updatedAt);
  if (incomingNewer) {
    for (const k of USER_FIELDS) (merged as unknown as Record<string, unknown>)[k] = incoming[k];
    merged.updatedAt = incoming.updatedAt;
  }
  const useIncomingEnrich =
    (incoming.enrichment === 'done' && local.enrichment !== 'done') ||
    (incoming.enrichment === local.enrichment &&
      Date.parse(incoming.enrichedAt ?? '') > Date.parse(local.enrichedAt ?? ''));
  if (useIncomingEnrich) {
    for (const k of ENRICH_FIELDS) (merged as unknown as Record<string, unknown>)[k] = incoming[k];
    merged.enrichment = incoming.enrichment;
    merged.enrichedAt = incoming.enrichedAt;
  }
  if (!merged.musicBrainzId && incoming.musicBrainzId) merged.musicBrainzId = incoming.musicBrainzId;
  merged.sample = false;
  return merged;
}

/** Spreadsheet-friendly CSV (RFC 4180). Formula-like cells are prefixed so spreadsheets don't run them. */
export function buildCsv(albums: Album[]): string {
  const cols = [
    'title',
    'artist',
    'year',
    'lengthMinutes',
    'status',
    'rating',
    'recommendedBy',
    'recommenderNote',
    'listeningNote',
    'addedAt',
    'listenedAt',
  ] as const;
  const cell = (v: unknown) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = albums
    .filter((a) => !a.sample && !a.deletedAt)
    .map((a) => cols.map((c) => cell(a[c])).join(','));
  return [cols.join(','), ...rows].join('\r\n') + '\r\n';
}
