import { describe, expect, it } from 'vitest';
import { pick, parseLimit } from './pick';
import { makeAlbum } from './testing';

function seeded(seed = 42) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

describe('pick', () => {
  const a = makeAlbum({ id: 'a', lengthMinutes: 30 });
  const b = makeAlbum({ id: 'b', lengthMinutes: 45 });
  const c = makeAlbum({ id: 'c', lengthMinutes: 70 });
  const u = makeAlbum({ id: 'u', lengthMinutes: null });

  it('handles an empty queue', () => {
    expect(pick([])).toEqual({ kind: 'empty' });
  });

  it('respects an inclusive limit over 1,000 seeded runs, never repeats, picks every qualifier', () => {
    const rnd = seeded();
    let prev: string | null = null;
    const seen = new Map<string, number>();
    for (let i = 0; i < 1000; i++) {
      const r = pick([a, b, c, u], { limit: 45, previousId: prev, random: rnd });
      expect(r.kind).toBe('picked');
      if (r.kind !== 'picked') return;
      expect(r.album.lengthMinutes).not.toBeNull();
      expect(r.album.lengthMinutes!).toBeLessThanOrEqual(45);
      expect(r.album.id).not.toBe(prev);
      seen.set(r.album.id, (seen.get(r.album.id) ?? 0) + 1);
      prev = r.album.id;
    }
    expect([...seen.keys()].sort()).toEqual(['a', 'b']);
    for (const n of seen.values()) expect(n).toBeGreaterThan(400);
  });

  it('offers the shortest when nothing fits, and says when no lengths are known', () => {
    expect(pick([b, c], { limit: 20 })).toEqual({ kind: 'none-fit', shortest: b });
    expect(pick([u], { limit: 20 })).toEqual({ kind: 'no-lengths' });
  });

  it('skips listened and deleted albums', () => {
    const l = makeAlbum({ id: 'l', status: 'listened' });
    const d = makeAlbum({ id: 'd', deletedAt: '2026-01-01T00:00:00.000Z' });
    expect(pick([l, d])).toEqual({ kind: 'empty' });
  });
});

describe('parseLimit', () => {
  it('accepts whole numbers of 1 or more only', () => {
    expect(parseLimit('45')).toBe(45);
    expect(parseLimit('0')).toBeNull();
    expect(parseLimit('-3')).toBeNull();
    expect(parseLimit('4.5')).toBeNull();
    expect(parseLimit('abc')).toBeNull();
  });
});

import { dailyPick } from './pick';

describe('pick options', () => {
  const now = Date.parse('2026-11-18T00:00:00Z');
  const old = makeAlbum({ id: 'old', addedAt: '2025-11-18T00:00:00Z' });
  const fresh = makeAlbum({ id: 'new', addedAt: '2026-11-17T00:00:00Z' });

  it('favours older albums when asked', () => {
    const rnd = seeded(7);
    let oldCount = 0;
    for (let i = 0; i < 1000; i++) {
      const r = pick([old, fresh], { weighting: 'older', random: rnd, now });
      if (r.kind === 'picked' && r.album.id === 'old') oldCount++;
    }
    // weight 1+12.2 vs ~1: old should win the large majority.
    expect(oldCount).toBeGreaterThan(850);
  });

  it('prefers starred albums when any qualify', () => {
    const star = makeAlbum({ id: 's', starred: true });
    for (let i = 0; i < 20; i++) {
      const r = pick([old, fresh, star], { preferStarred: true });
      expect(r.kind === 'picked' && r.album.id).toBe('s');
    }
  });

  it('gives the same daily pick all day and can change the next day', () => {
    const q = Array.from({ length: 12 }, (_, i) => makeAlbum({ id: `a${i}` }));
    const morning = dailyPick(q, new Date(2026, 10, 18, 8));
    const night = dailyPick([...q].reverse(), new Date(2026, 10, 18, 23));
    expect(morning?.id).toBe(night?.id);
    const days = new Set(Array.from({ length: 10 }, (_, d) => dailyPick(q, new Date(2026, 10, 18 + d))?.id));
    expect(days.size).toBeGreaterThan(1);
    expect(dailyPick([])).toBeNull();
  });
});
