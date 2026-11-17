import { describe, expect, it } from 'vitest';
import { enrichFromReleases, type MbRelease } from './release';

const tracks = (...ms: (number | null)[]) => [{ tracks: ms.map((length) => ({ length })) }];

describe('enrichFromReleases', () => {
  it('uses the earliest official release with full lengths', () => {
    const releases: MbRelease[] = [
      { id: 'deluxe', status: 'Official', date: '2008-01-01', media: tracks(600000, 600000, 600000) },
      { id: 'vinyl', status: 'Official', date: '2007', media: tracks(300000, null) },
      { id: 'cd', status: 'Official', date: '2007-12-31', media: tracks(1260000, 1260000) },
      { id: 'bootleg', status: 'Bootleg', date: '2006', media: tracks(60000) },
    ];
    expect(enrichFromReleases(releases)).toMatchObject({ lengthMinutes: 42, trackCount: 2 });
  });

  it('leaves length unknown when no release is complete', () => {
    const r = enrichFromReleases([
      { id: 'a', status: 'Official', date: '2001', media: tracks(1000, null, null) },
    ]);
    expect(r).toMatchObject({ lengthMinutes: null, trackCount: 3 });
  });

  it('rounds to the nearest minute and finds links on any release', () => {
    const r = enrichFromReleases([
      { id: 'a', status: 'Official', date: '2007', media: tracks(44.6 * 60000) },
      {
        id: 'b',
        status: 'Official',
        date: '2008',
        relations: [
          { url: { resource: 'https://open.spotify.com/album/abc' } },
          { url: { resource: 'https://evil.example/x' } },
        ],
      },
    ]);
    expect(r.lengthMinutes).toBe(45);
    expect(r.spotifyUrl).toBe('https://open.spotify.com/album/abc');
    expect(r.appleMusicUrl).toBeNull();
  });
});
