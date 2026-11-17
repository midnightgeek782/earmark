import type { Album } from './types';

export type SortKey = 'newest' | 'oldest' | 'shortest' | 'person';

/** Sort a tab's albums. Listened uses listenedAt for newest/oldest. Stable, deterministic. */
export function sortAlbums(albums: Album[], key: SortKey, tab: 'toListen' | 'listened'): Album[] {
  const when = (a: Album) => (tab === 'listened' ? (a.listenedAt ?? a.addedAt) : a.addedAt);
  const byNewest = (a: Album, b: Album) => when(b).localeCompare(when(a)) || a.id.localeCompare(b.id);
  const copy = [...albums];
  switch (key) {
    case 'oldest':
      return copy.sort((a, b) => -byNewest(a, b));
    case 'shortest':
      return copy.sort(
        (a, b) => (a.lengthMinutes ?? Infinity) - (b.lengthMinutes ?? Infinity) || byNewest(a, b),
      );
    case 'person':
      return copy.sort((a, b) => {
        if (!a.recommendedBy !== !b.recommendedBy) return a.recommendedBy ? -1 : 1;
        return (
          (a.recommendedBy ?? '').localeCompare(b.recommendedBy ?? '', undefined, { sensitivity: 'base' }) ||
          byNewest(a, b)
        );
      });
    default:
      return copy.sort(byNewest);
  }
}

/** People who recommended albums, most recommendations first. Case-insensitive grouping. */
export function recommenders(albums: Album[]): { name: string; count: number }[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const a of albums) {
    const name = a.recommendedBy?.trim();
    if (!name) continue;
    const k = name.toLocaleLowerCase();
    const cur = map.get(k);
    if (cur) cur.count++;
    else map.set(k, { name, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function samePerson(a: string | null, b: string | undefined): boolean {
  return !!a && !!b && a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

/** "about 9 hours", "45 min" — for the queue summary. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.round(minutes / 30) / 2;
  return `about ${h % 1 === 0 ? h : h.toFixed(1)} hour${h === 1 ? '' : 's'}`;
}
