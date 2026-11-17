// Background enrichment: looks up track lengths and links for saved albums.
// Runs one album at a time behind searches (the MB client spaces requests).
// Failed lookups retry after 1 min, 10 min, 1 h, then stop.

import { db } from '../db/db';
import { applyEnrichment, purgeDeleted } from '../db/albums';
import { enrichFromReleases } from '../domain/release';
import { fetchReleaseGroup, fetchReleases } from '../mb/client';
import { wikidataIdFrom } from '../net/wiki';

const RETRY_MS = [60_000, 600_000, 3_600_000];
let running = false;

export function isDue(
  a: { enrichment: string; enrichAttempts: number; lastAttemptAt: string | null },
  now: number,
) {
  if (a.enrichment === 'pending') return true;
  if (a.enrichment !== 'failed') return false;
  const wait = RETRY_MS[a.enrichAttempts - 1];
  if (wait == null) return false;
  return now - Date.parse(a.lastAttemptAt ?? '') >= wait;
}

export async function runEnrichment(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await purgeDeleted();
    for (;;) {
      if (!navigator.onLine) return;
      const now = Date.now();
      const next =
        (await db.albums.where('enrichment').anyOf('pending', 'failed').toArray()).find(
          (a) => !a.deletedAt && a.musicBrainzId && isDue(a, now),
        ) ??
        // Albums enriched before track lists existed: fetch once more.
        (await db.albums.where('enrichment').equals('done').toArray()).find(
          (a) => !a.deletedAt && a.musicBrainzId && (a.tracks === undefined || a.genres === undefined),
        );
      if (!next) return;
      try {
        const releases = await fetchReleases(next.musicBrainzId!);
        const result = enrichFromReleases(releases);
        try {
          const g = await fetchReleaseGroup(next.musicBrainzId!);
          Object.assign(result, {
            genres: g.genres,
            artistMbid: g.artistMbid,
            wikidataId: wikidataIdFrom(g.wikidataUrl),
          });
        } catch {
          // Genres are a bonus. Record "none" so this album isn't re-fetched in a loop.
          Object.assign(result, { genres: [] });
        }
        await applyEnrichment(next.id, result);
      } catch {
        await applyEnrichment(next.id, null);
      }
    }
  } finally {
    running = false;
  }
}

export function startEnrichment() {
  void runEnrichment();
  setInterval(() => void runEnrichment(), 30_000);
  window.addEventListener('online', () => void runEnrichment());
}
