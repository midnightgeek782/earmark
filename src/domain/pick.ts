import type { Album } from './types';

export type PickResult =
  | { kind: 'picked'; album: Album }
  | { kind: 'empty' }
  | { kind: 'none-fit'; shortest: Album }
  | { kind: 'no-lengths' };

/**
 * Pick a random album from the queue. With a limit (inclusive, minutes),
 * unknown-length albums are left out. Never repeats the previous pick when
 * two or more albums qualify. `random` is injected so tests can seed it.
 */
export function pick(
  queue: Album[],
  opts: {
    limit?: number | null;
    previousId?: string | null;
    random?: () => number;
    /** 'older' favours albums that have waited longer (weight grows by 1 per 30 days). */
    weighting?: 'even' | 'older';
    /** Pick from starred albums when any qualify. */
    preferStarred?: boolean;
    now?: number;
  } = {},
): PickResult {
  const random = opts.random ?? Math.random;
  const live = queue.filter((a) => a.status === 'queued' && !a.deletedAt);
  if (live.length === 0) return { kind: 'empty' };

  let pool = live;
  if (opts.limit != null) {
    const known = live.filter((a) => a.lengthMinutes != null);
    if (known.length === 0) return { kind: 'no-lengths' };
    pool = known.filter((a) => (a.lengthMinutes ?? Infinity) <= opts.limit!);
    if (pool.length === 0) {
      const shortest = known.reduce((s, a) => ((a.lengthMinutes ?? 0) < (s.lengthMinutes ?? 0) ? a : s));
      return { kind: 'none-fit', shortest };
    }
  }

  if (opts.preferStarred && pool.some((a) => a.starred)) pool = pool.filter((a) => a.starred);
  if (pool.length > 1 && opts.previousId) pool = pool.filter((a) => a.id !== opts.previousId);
  if (opts.weighting === 'older') {
    const now = opts.now ?? Date.now();
    const weights = pool.map((a) => 1 + Math.max(0, now - Date.parse(a.addedAt)) / (30 * 86_400_000));
    let r = random() * weights.reduce((s, w) => s + w, 0);
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i]!;
      if (r <= 0) return { kind: 'picked', album: pool[i]! };
    }
    return { kind: 'picked', album: pool[pool.length - 1]! };
  }
  const album = pool[Math.floor(random() * pool.length)] ?? pool[0]!;
  return { kind: 'picked', album };
}

/** Parse a typed limit: whole number of 1 or more, else null. */
export function parseLimit(input: string): number | null {
  if (!/^\d+$/.test(input.trim())) return null;
  const n = Number(input);
  return n >= 1 ? n : null;
}

/** Small seeded PRNG (mulberry32) so a day's pick is stable. */
export function seeded(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Today's suggestion: the same album all day, a new one tomorrow. */
export function dailyPick(
  queue: Album[],
  date = new Date(),
  weighting: 'even' | 'older' = 'even',
): Album | null {
  const key = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const ordered = [...queue].sort((a, b) => a.id.localeCompare(b.id));
  const r = pick(ordered, { random: seeded(key), weighting, now: date.getTime() });
  return r.kind === 'picked' ? r.album : null;
}
