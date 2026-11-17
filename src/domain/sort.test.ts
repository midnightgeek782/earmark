import { describe, expect, it } from 'vitest';
import { formatDuration, recommenders, samePerson, sortAlbums } from './sort';
import { makeAlbum } from './testing';

const a = makeAlbum({ id: 'a', addedAt: '2026-01-01T00:00:00Z', lengthMinutes: 50, recommendedBy: 'priya' });
const b = makeAlbum({ id: 'b', addedAt: '2026-02-01T00:00:00Z', lengthMinutes: null, recommendedBy: null });
const c = makeAlbum({ id: 'c', addedAt: '2026-03-01T00:00:00Z', lengthMinutes: 30, recommendedBy: 'Dad' });

describe('sortAlbums', () => {
  it('sorts newest, oldest and shortest (unknown lengths last)', () => {
    expect(sortAlbums([a, b, c], 'newest', 'toListen').map((x) => x.id)).toEqual(['c', 'b', 'a']);
    expect(sortAlbums([a, b, c], 'oldest', 'toListen').map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(sortAlbums([a, b, c], 'shortest', 'toListen').map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });

  it('groups by person, people without a recommender last', () => {
    expect(sortAlbums([a, b, c], 'person', 'toListen').map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('recommenders', () => {
  it('counts case-insensitively, most first', () => {
    const extra = makeAlbum({ id: 'd', recommendedBy: 'Priya ' });
    expect(recommenders([a, b, c, extra])).toEqual([
      { name: 'priya', count: 2 },
      { name: 'Dad', count: 1 },
    ]);
    expect(samePerson('Priya', 'priya')).toBe(true);
    expect(samePerson(null, 'priya')).toBe(false);
  });
});

describe('formatDuration', () => {
  it('reads naturally', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('about 1 hour');
    expect(formatDuration(545)).toBe('about 9 hours');
    expect(formatDuration(100)).toBe('about 1.5 hours');
  });
});
