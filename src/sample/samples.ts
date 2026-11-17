import { db, getSettings, updateSettings } from '../db/db';
import { identityKey, normKey } from '../domain/identity';
import type { Album } from '../domain/types';

// Sample albums shown on first open so the screen shows how Earmark works.
// They are never exported, are marked "Sample", and disappear when removed or
// when you save the real album.
const SAMPLES = [
  {
    title: 'Kind of Blue',
    artist: 'Miles Davis',
    year: 1959,
    len: 46,
    by: 'Dad',
    note: 'Start with "So What". Loud.',
    genres: ['modal jazz', 'cool jazz'],
    artistMbid: '561d854a-6a28-4aa7-8c99-323e6ce46c2a',
    tags: ['jazz', 'late night'],
    starred: true,
  },
  {
    title: 'Blue',
    artist: 'Joni Mitchell',
    year: 1971,
    len: 36,
    by: 'Priya',
    note: 'Best on a quiet evening.',
    genres: ['folk', 'singer-songwriter'],
    tags: ['sunday morning'],
  },
  {
    title: 'Discovery',
    artist: 'Daft Punk',
    year: 2001,
    len: 61,
    by: 'Sam',
    note: 'For the drive.',
    genres: ['french house', 'disco'],
    tags: ['road trip', 'party'],
  },
  {
    title: 'Blonde',
    artist: 'Frank Ocean',
    year: 2016,
    len: 60,
    by: 'Priya',
    note: 'Track 3 is the one.',
    genres: ['alternative r&b', 'art pop'],
    tags: ['late night', 'with headphones'],
  },
  {
    title: 'Promises',
    artist: 'Floating Points, Pharoah Sanders',
    year: 2021,
    len: 47,
    by: null,
    note: null,
    genres: ['spiritual jazz', 'ambient'],
    artistMbid: '69d9c5ba-7bba-4cb7-ab32-8ccc48ad4f97',
    tags: ['focus'],
  },
  {
    title: 'Vespertine',
    artist: 'Björk',
    year: 2001,
    len: 56,
    by: 'A review in The Wire',
    note: null,
    genres: ['art pop', 'electronic'],
    artistMbid: '87c5dedd-371d-4a53-9f7f-80522fb7f3cb',
    tags: ['with headphones'],
  },
];

let seeding: Promise<void> | null = null;

/** Idempotent: safe to call twice at once (React StrictMode) or from two tabs. */
export function seedSamplesOnce() {
  seeding ??= seed().finally(() => (seeding = null));
  return seeding;
}

async function seed() {
  const s = await getSettings();
  if (s.samplesSeeded) {
    // Top up older sample sets, but only while the user still has samples.
    const existing = await db.albums.filter((a) => a.sample).toArray();
    // Refresh older sample sets (fewer albums, or from before tags existed).
    if (
      existing.length === 0 ||
      (existing.length === SAMPLES.length && existing.every((a) => a.tags && a.genres))
    )
      return;
    await db.albums.bulkDelete(existing.map((a) => a.id));
  }
  const base = Date.now();
  const albums: Album[] = SAMPLES.map((x, i) => {
    const at = new Date(base - i * 86_400_000).toISOString();
    return {
      id: crypto.randomUUID(),
      identityKey: identityKey({ artist: x.artist, title: x.title }),
      normKey: normKey(x.artist, x.title),
      title: x.title,
      artist: x.artist,
      year: x.year,
      trackCount: null,
      lengthMinutes: x.len,
      coverUrl: null,
      musicBrainzId: null,
      spotifyUrl: null,
      appleMusicUrl: null,
      recommendedBy: x.by,
      recommenderNote: x.note,
      listeningNote: null,
      status: 'queued',
      rating: null,
      addedAt: at,
      updatedAt: at,
      listenedAt: null,
      enrichment: 'done',
      enrichedAt: null,
      enrichAttempts: 0,
      lastAttemptAt: null,
      sample: true,
      deletedAt: null,
      tags: x.tags,
      genres: x.genres,
      artistMbid: 'artistMbid' in x ? x.artistMbid : null,
      starred: 'starred' in x ? x.starred : false,
    };
  });
  await db.transaction('rw', db.albums, db.settings, async () => {
    // Re-check inside the transaction so a second tab can't seed twice.
    const current = await db.albums.filter((a) => a.sample).count();
    if (
      current === SAMPLES.length &&
      (await db.albums.filter((a) => a.sample && !!a.genres).count()) === SAMPLES.length
    )
      return;
    await db.albums.bulkDelete(await db.albums.filter((a) => a.sample).primaryKeys());
    await db.albums.bulkAdd(albums);
    await updateSettings({ samplesSeeded: true });
  });
}

export async function removeSamples() {
  const ids = await db.albums.filter((a) => a.sample).primaryKeys();
  await db.albums.bulkDelete(ids);
}
