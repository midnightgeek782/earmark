import { describe, expect, it } from 'vitest';
import { albumsFrom, overview, peopleStats, shareText, waitedFor } from './insights';
import { makeAlbum } from './testing';

const heard = (
  id: string,
  by: string,
  rating: 'loved' | 'liked' | 'not-for-me',
  addedAt: string,
  listenedAt: string,
) => makeAlbum({ id, recommendedBy: by, status: 'listened', rating, addedAt, listenedAt });

describe('peopleStats', () => {
  const albums = [
    heard('1', 'Priya', 'loved', '2026-01-01T00:00:00Z', '2026-01-03T00:00:00Z'),
    heard('2', 'priya', 'liked', '2026-02-01T00:00:00Z', '2026-02-11T00:00:00Z'),
    heard('3', 'Priya', 'not-for-me', '2026-03-01T00:00:00Z', '2026-03-05T00:00:00Z'),
    makeAlbum({ id: '4', recommendedBy: 'Dad', addedAt: '2026-04-01T00:00:00Z' }),
    makeAlbum({ id: '5', recommendedBy: 'Sam', sample: true }),
  ];

  it('groups case-insensitively and computes a taste match', () => {
    const [p, d] = peopleStats(albums);
    expect(p).toMatchObject({
      name: 'Priya',
      total: 3,
      heard: 3,
      loved: 1,
      liked: 1,
      notForMe: 1,
      match: 53,
    });
    expect(d).toMatchObject({ name: 'Dad', total: 1, queued: 1, match: null });
    expect(peopleStats(albums).some((x) => x.name === 'Sam')).toBe(false);
    expect(albumsFrom(albums, 'PRIYA').length).toBe(3);
  });

  it('builds an overview with months, median wait and longest waiting', () => {
    const o = overview(albums, new Date('2026-04-15T00:00:00Z'));
    expect(o).toMatchObject({ saved: 4, heard: 3, loved: 1, medianDaysToListen: 4 });
    expect(o.months).toHaveLength(12);
    expect(o.months.at(-1)).toMatchObject({ added: 1 });
    expect(o.longestWaiting?.id).toBe('4');
  });
});

describe('waitedFor and shareText', () => {
  const now = Date.parse('2026-04-15T00:00:00Z');
  it('reads naturally', () => {
    expect(waitedFor('2026-04-15T00:00:00Z', now)).toBe('today');
    expect(waitedFor('2026-04-10T00:00:00Z', now)).toBe('5 days');
    expect(waitedFor('2026-03-15T00:00:00Z', now)).toBe('4 weeks');
    expect(waitedFor('2025-12-15T00:00:00Z', now)).toBe('4 months');
  });
  it('writes a share message', () => {
    const a = makeAlbum({ rating: 'loved', listeningNote: 'Headphones.' });
    expect(shareText(a, 'https://open.spotify.com/album/x')).toBe(
      'In Rainbows by Radiohead\nI loved this one.\n“Headphones.”\nhttps://open.spotify.com/album/x',
    );
  });
});
