import { samePerson } from './sort';
import type { Album } from './types';

export interface PersonStats {
  name: string;
  total: number;
  queued: number;
  heard: number;
  loved: number;
  liked: number;
  notForMe: number;
  /** 0-100: how often their picks land with you. null until 2 rated listens. */
  match: number | null;
  lastAt: string;
}

const live = (albums: Album[]) => albums.filter((a) => !a.sample && !a.deletedAt);

/** Per-recommender stats. Match = (loved*1 + liked*0.6) / rated, as a percentage. */
export function peopleStats(albums: Album[]): PersonStats[] {
  const groups = new Map<string, Album[]>();
  const names = new Map<string, string>();
  for (const a of live(albums)) {
    const n = a.recommendedBy?.trim();
    if (!n) continue;
    const k = n.toLocaleLowerCase();
    if (!names.has(k)) names.set(k, n);
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  return [...groups.entries()]
    .map(([k, list]) => {
      const heard = list.filter((a) => a.status === 'listened');
      const loved = heard.filter((a) => a.rating === 'loved').length;
      const liked = heard.filter((a) => a.rating === 'liked').length;
      const notForMe = heard.filter((a) => a.rating === 'not-for-me').length;
      const rated = loved + liked + notForMe;
      return {
        name: names.get(k)!,
        total: list.length,
        queued: list.length - heard.length,
        heard: heard.length,
        loved,
        liked,
        notForMe,
        match: rated >= 2 ? Math.round(((loved + liked * 0.6) / rated) * 100) : null,
        lastAt: list
          .map((a) => a.addedAt)
          .sort()
          .at(-1)!,
      };
    })
    .sort((a, b) => b.total - a.total || b.lastAt.localeCompare(a.lastAt));
}

export function albumsFrom(albums: Album[], person: string): Album[] {
  return live(albums).filter((a) => samePerson(a.recommendedBy, person));
}

export interface Overview {
  saved: number;
  heard: number;
  loved: number;
  queuedMinutes: number;
  heardMinutes: number;
  /** Last 12 months, oldest first: { label: 'Jan', added, heard } */
  months: { key: string; label: string; added: number; heard: number }[];
  longestWaiting: Album | null;
  /** Median days between adding and listening, or null. */
  medianDaysToListen: number | null;
  topArtists: { artist: string; count: number }[];
}

export function overview(albums: Album[], now = new Date()): Overview {
  const list = live(albums);
  const heard = list.filter((a) => a.status === 'listened');
  const queued = list.filter((a) => a.status === 'queued');
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const months: Overview['months'] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: d.toLocaleString('en', { month: 'short' }), added: 0, heard: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const a of list) {
    const m = byKey.get(monthKey(new Date(a.addedAt)));
    if (m) m.added++;
    if (a.listenedAt) {
      const h = byKey.get(monthKey(new Date(a.listenedAt)));
      if (h) h.heard++;
    }
  }
  const waits = heard
    .filter((a) => a.listenedAt)
    .map((a) => (Date.parse(a.listenedAt!) - Date.parse(a.addedAt)) / 86_400_000)
    .sort((x, y) => x - y);
  const median = waits.length
    ? Math.round(
        waits.length % 2
          ? waits[(waits.length - 1) / 2]!
          : (waits[waits.length / 2 - 1]! + waits[waits.length / 2]!) / 2,
      )
    : null;
  const artists = new Map<string, number>();
  for (const a of list) artists.set(a.artist, (artists.get(a.artist) ?? 0) + 1);

  return {
    saved: list.length,
    heard: heard.length,
    loved: heard.filter((a) => a.rating === 'loved').length,
    queuedMinutes: queued.reduce((s, a) => s + (a.lengthMinutes ?? 0), 0),
    heardMinutes: heard.reduce((s, a) => s + (a.lengthMinutes ?? 0), 0),
    months,
    longestWaiting: [...queued].sort((a, b) => a.addedAt.localeCompare(b.addedAt))[0] ?? null,
    medianDaysToListen: median,
    topArtists: [...artists.entries()]
      .filter(([, c]) => c > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist, count]) => ({ artist, count })),
  };
}

/** "3 weeks", "2 months" — how long something has waited. */
export function waitedFor(iso: string, now = Date.now()): string {
  const days = Math.max(0, Math.floor((now - Date.parse(iso)) / 86_400_000));
  if (days < 1) return 'today';
  if (days < 14) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  if (days < 730) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} years`;
}

/** Share text for recommending an album onwards. */
export function shareText(a: Album, link: string | null): string {
  const lines = [`${a.title} by ${a.artist}`];
  if (a.rating === 'loved') lines.push('I loved this one.');
  if (a.listeningNote) lines.push(`“${a.listeningNote}”`);
  if (link) lines.push(link);
  return lines.join('\n');
}
