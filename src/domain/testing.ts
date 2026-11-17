import { identityKey, normKey } from './identity';
import type { Album } from './types';

/** Test helper: a complete Album with overrides. */
export function makeAlbum(over: Partial<Album> = {}): Album {
  const title = over.title ?? 'In Rainbows';
  const artist = over.artist ?? 'Radiohead';
  const musicBrainzId = over.musicBrainzId ?? null;
  return {
    id: 'id-1',
    identityKey: identityKey({ musicBrainzId, artist, title }),
    normKey: normKey(artist, title),
    title,
    artist,
    year: 2007,
    trackCount: 10,
    lengthMinutes: 42,
    coverUrl: null,
    musicBrainzId,
    spotifyUrl: null,
    appleMusicUrl: null,
    recommendedBy: null,
    recommenderNote: null,
    listeningNote: null,
    status: 'queued',
    rating: null,
    addedAt: '2026-11-17T00:00:00.000Z',
    updatedAt: '2026-11-17T00:00:00.000Z',
    listenedAt: null,
    enrichment: 'done',
    enrichedAt: null,
    enrichAttempts: 0,
    lastAttemptAt: null,
    sample: false,
    deletedAt: null,
    ...over,
  };
}
