import { identityKey, isSameAlbum, normKey } from '../domain/identity';
import { mergeAlbum } from '../domain/exportFormat';
import type { Enriched } from '../domain/release';
import type { Album, Rating } from '../domain/types';
import { db as defaultDb, getSettings, updateSettings, type EarmarkDb } from './db';

const nowIso = () => new Date().toISOString();
const PURGE_AFTER_MS = 90_000;

export interface NewAlbum {
  title: string;
  artist: string;
  year?: number | null;
  lengthMinutes?: number | null;
  musicBrainzId?: string | null;
  coverUrl?: string | null;
}

export type SaveResult = { kind: 'saved'; album: Album } | { kind: 'exists'; album: Album };

/** Find a live album that is the same as the candidate (MBID decides when both have one). */
export async function findSame(candidate: NewAlbum, d: EarmarkDb = defaultDb): Promise<Album | undefined> {
  const src = {
    musicBrainzId: candidate.musicBrainzId ?? null,
    artist: candidate.artist,
    title: candidate.title,
  };
  const byKey = await d.albums.where('identityKey').equals(identityKey(src)).toArray();
  const byNorm = await d.albums.where('normKey').equals(normKey(src.artist, src.title)).toArray();
  return [...byKey, ...byNorm].find((a) => !a.deletedAt && isSameAlbum(a, src));
}

export async function saveAlbum(input: NewAlbum, d: EarmarkDb = defaultDb): Promise<SaveResult> {
  return d.transaction('rw', d.albums, d.settings, async () => {
    // A save of a matching identity first commits any pending delete.
    const pendingDeletes = await d.albums.filter((a) => !!a.deletedAt).toArray();
    for (const p of pendingDeletes) {
      if (
        isSameAlbum(p, {
          musicBrainzId: input.musicBrainzId ?? null,
          artist: input.artist,
          title: input.title,
        })
      )
        await d.albums.delete(p.id);
    }

    const existing = await findSame(input, d);
    if (existing) {
      if (existing.sample) {
        const real = { ...existing, sample: false, updatedAt: nowIso() };
        await d.albums.put(real);
        return { kind: 'saved', album: real } as const;
      }
      return { kind: 'exists', album: existing } as const;
    }

    const now = nowIso();
    const mbid = input.musicBrainzId ?? null;
    const album: Album = {
      id: crypto.randomUUID(),
      identityKey: identityKey({ musicBrainzId: mbid, artist: input.artist, title: input.title }),
      normKey: normKey(input.artist, input.title),
      title: input.title.trim(),
      artist: input.artist.trim(),
      year: input.year ?? null,
      trackCount: null,
      lengthMinutes: input.lengthMinutes ?? null,
      coverUrl: input.coverUrl ?? null,
      musicBrainzId: mbid,
      spotifyUrl: null,
      appleMusicUrl: null,
      recommendedBy: null,
      recommenderNote: null,
      listeningNote: null,
      status: 'queued',
      rating: null,
      addedAt: now,
      updatedAt: now,
      listenedAt: null,
      enrichment: mbid ? 'pending' : 'done',
      enrichedAt: null,
      enrichAttempts: 0,
      lastAttemptAt: null,
      sample: false,
      deletedAt: null,
    };
    await d.albums.add(album);
    const s = await getSettings(d);
    await updateSettings({ addedSinceExport: s.addedSinceExport + 1 }, d);
    return { kind: 'saved', album } as const;
  });
}

type UserPatch = Partial<
  Pick<
    Album,
    'recommendedBy' | 'recommenderNote' | 'listeningNote' | 'rating' | 'lengthMinutes' | 'starred' | 'tags'
  >
>;

/** User edits always bump updatedAt. */
export async function editAlbum(id: string, patch: UserPatch, d: EarmarkDb = defaultDb): Promise<void> {
  await d.albums.update(id, { ...patch, updatedAt: nowIso() });
}

export async function markListened(id: string, rating: Rating | null = null, d: EarmarkDb = defaultDb) {
  const now = nowIso();
  await d.albums.update(id, { status: 'listened', listenedAt: now, rating, starred: false, updatedAt: now });
}

export async function moveBackToQueue(id: string, d: EarmarkDb = defaultDb) {
  await d.albums.update(id, { status: 'queued', listenedAt: null, updatedAt: nowIso() });
}

export async function softDelete(id: string, d: EarmarkDb = defaultDb) {
  await d.albums.update(id, { deletedAt: nowIso() });
}

export async function undoDelete(id: string, d: EarmarkDb = defaultDb) {
  await d.albums.update(id, { deletedAt: null });
}

export async function commitDelete(id: string, d: EarmarkDb = defaultDb) {
  await d.albums.delete(id);
}

/** Remove soft-deleted records older than the Undo window plus a margin. */
export async function purgeDeleted(d: EarmarkDb = defaultDb, now = Date.now()) {
  const old = await d.albums
    .filter((a) => !!a.deletedAt && now - Date.parse(a.deletedAt) > PURGE_AFTER_MS)
    .primaryKeys();
  await d.albums.bulkDelete(old);
  return old.length;
}

/** Enrichment writes only its own fields, and only to a live record. */
export async function applyEnrichment(
  id: string,
  result: Enriched | null,
  d: EarmarkDb = defaultDb,
): Promise<void> {
  await d.transaction('rw', d.albums, async () => {
    const a = await d.albums.get(id);
    if (!a || a.deletedAt) return;
    const now = nowIso();
    if (!result) {
      await d.albums.update(id, {
        enrichment: 'failed',
        enrichAttempts: a.enrichAttempts + 1,
        lastAttemptAt: now,
      });
      return;
    }
    await d.albums.update(id, {
      lengthMinutes: a.lengthMinutes ?? result.lengthMinutes,
      trackCount: result.trackCount,
      spotifyUrl: result.spotifyUrl,
      appleMusicUrl: result.appleMusicUrl,
      tracks: result.tracks.length ? result.tracks : null,
      ...(result.genres ? { genres: result.genres } : {}),
      ...(result.artistMbid !== undefined ? { artistMbid: result.artistMbid } : {}),
      ...(result.wikidataId !== undefined ? { wikidataId: result.wikidataId } : {}),
      enrichment: 'done',
      enrichedAt: now,
      enrichAttempts: a.enrichAttempts + 1,
      lastAttemptAt: now,
    });
  });
}

export interface ImportPlan {
  added: number;
  merged: number;
}

/** Merge imported albums in one transaction: all or nothing. */
export async function importAlbums(incoming: Album[], d: EarmarkDb = defaultDb): Promise<ImportPlan> {
  return d.transaction('rw', d.albums, async () => {
    const live = (await d.albums.toArray()).filter((a) => !a.deletedAt);
    let added = 0;
    let merged = 0;
    for (const inc of incoming) {
      const local = live.find((a) => isSameAlbum(a, inc));
      if (local && !local.sample) {
        await d.albums.put(mergeAlbum(local, inc));
        merged++;
      } else {
        if (local?.sample) await d.albums.delete(local.id);
        await d.albums.add(inc);
        live.push(inc);
        added++;
      }
    }
    return { added, merged };
  });
}

export async function previewImport(incoming: Album[], d: EarmarkDb = defaultDb): Promise<ImportPlan> {
  const live = (await d.albums.toArray()).filter((a) => !a.deletedAt && !a.sample);
  const merged = incoming.filter((inc) => live.some((a) => isSameAlbum(a, inc))).length;
  return { added: incoming.length - merged, merged };
}

/** Delete every album and reset settings (keeps nothing). */
export async function deleteEverything(d: EarmarkDb = defaultDb) {
  await d.transaction('rw', d.albums, d.settings, async () => {
    await d.albums.clear();
    await d.settings.put({
      ...(await getSettings(d)),
      addedSinceExport: 0,
      previousPickId: null,
      samplesSeeded: true,
    });
  });
}

/** Ask the background job to look up every album's details again. */
export async function refreshAllDetails(d: EarmarkDb = defaultDb): Promise<number> {
  const ids = await d.albums.filter((a) => !!a.musicBrainzId && !a.deletedAt).primaryKeys();
  await d.transaction('rw', d.albums, async () => {
    for (const id of ids) await d.albums.update(id, { enrichment: 'pending', enrichAttempts: 0 });
  });
  return ids.length;
}

/** Cache the Wikipedia description (or null when there is none). */
export async function saveAbout(
  id: string,
  about: { text: string; url: string } | null,
  d: EarmarkDb = defaultDb,
) {
  await d.albums.update(id, { about });
}
