import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _setClockForTests, fetchReleases, MbError, messageFor, search, type Clock } from './client';
import { enrichFromReleases } from '../domain/release';
import searchFixture from './fixtures/search-in-rainbows.json';
import releasesFixture from './fixtures/releases-in-rainbows.json';

// Fake clock: sleeping advances time instantly, and records each wait.
function fakeClock() {
  let t = 1_000_000;
  const waits: number[] = [];
  const clock: Clock = {
    now: () => t,
    sleep: async (ms) => {
      waits.push(ms);
      t += ms;
    },
  };
  return { clock, waits };
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

let fetchMock: ReturnType<typeof vi.fn>;
let waits: number[];

beforeEach(() => {
  const f = fakeClock();
  waits = f.waits;
  _setClockForTests(f.clock);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  _setClockForTests(null);
  vi.unstubAllGlobals();
});

describe('MusicBrainz client', () => {
  it('maps search results and asks for JSON', async () => {
    fetchMock.mockResolvedValue(json(searchFixture));
    const r = (await search('in rainbows')).results;
    expect(r[0]).toEqual({
      musicBrainzId: '6e335887-60ba-38f0-95af-fae7774336bf',
      title: 'In Rainbows',
      artist: 'Radiohead',
      year: 2007,
      score: 100,
    });
    expect(String(fetchMock.mock.calls[0]![0])).toContain('fmt=json');
  });

  it('serves repeat searches from cache and skips empty queries', async () => {
    fetchMock.mockResolvedValue(json(searchFixture));
    await search('in rainbows');
    await search('in rainbows');
    expect((await search('   ')).results).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('spaces requests at least one second apart', async () => {
    fetchMock.mockImplementation(async () => json(searchFixture));
    await search('a1');
    await search('a2');
    await search('a3');
    expect(waits.filter((w) => w >= 1000).length).toBeGreaterThanOrEqual(2);
  });

  it('retries once after 503 honouring Retry-After, then reports busy', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 503, { 'Retry-After': '2' }))
      .mockResolvedValueOnce(json(searchFixture));
    expect((await search('retry me')).results.length).toBeGreaterThan(0);
    expect(waits).toContain(2000);

    fetchMock.mockResolvedValue(json({}, 503));
    await expect(search('still busy')).rejects.toMatchObject({ code: 'busy' });
  });

  it('turns HTTP errors and bad JSON into coded errors with plain messages', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 500));
    const err = await search('boom').catch((e) => e);
    expect(err).toBeInstanceOf(MbError);
    expect(messageFor(err)).toBe('Search failed (500). Try again or add it by hand');

    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200 }));
    await expect(search('garbage')).rejects.toMatchObject({ code: 'parse' });
    expect(messageFor(new MbError('busy'))).toContain('busy');
  });

  it("shows only an artist's studio albums when the exact artist name is typed", async () => {
    const credit = (name: string, id: string) => [{ name, artist: { id, name } }];
    fetchMock
      .mockResolvedValueOnce(
        json({
          'release-groups': [
            { id: 'x', title: 'Radiohead', score: 100, 'artist-credit': credit('In Rainbows', 'ir') },
            { id: 'k', title: 'Kid A', score: 90, 'artist-credit': credit('Radiohead', 'rh') },
          ],
        }),
      )
      .mockResolvedValueOnce(
        json({
          'release-groups': [
            {
              id: 'e',
              title: 'Drill',
              'first-release-date': '1992',
              'primary-type': 'EP',
              'secondary-types': [],
            },
            {
              id: 'p',
              title: 'Pablo Honey',
              'first-release-date': '1993-02-22',
              'primary-type': 'Album',
              'secondary-types': [],
            },
            {
              id: 'l',
              title: 'I Might Be Wrong',
              'first-release-date': '2001',
              'primary-type': 'Album',
              'secondary-types': ['Live'],
            },
            {
              id: 'k',
              title: 'Kid A',
              'first-release-date': '2000-08-03',
              'primary-type': 'Album',
              'secondary-types': [],
            },
          ],
        }),
      );
    const r = await search('Radiohead');
    expect(r.kind).toBe('artist');
    expect(r.results.map((x) => x.title)).toEqual(['Kid A', 'Pablo Honey']);
    expect(r.results.every((x) => x.artist === 'Radiohead')).toBe(true);
    expect(r.kind === 'artist' && r.eps.map((x) => x.title)).toEqual(['Drill']);
    expect(String(fetchMock.mock.calls[1]![0])).toContain('artist=rh');
  });

  it('browses releases and feeds the edition rule', async () => {
    fetchMock.mockResolvedValue(json(releasesFixture));
    const releases = await fetchReleases('6e335887-60ba-38f0-95af-fae7774336bf');
    expect(String(fetchMock.mock.calls[0]![0])).toContain('inc=url-rels+recordings');
    expect(enrichFromReleases(releases)).toEqual({
      lengthMinutes: 42,
      trackCount: 2,
      spotifyUrl: 'https://open.spotify.com/album/5vkqYmiPBYLaalcmjujWxK',
      appleMusicUrl: 'https://music.apple.com/us/album/in-rainbows/1109714933',
      tracks: [
        { title: '15 Step', lengthMs: 1260000 },
        { title: 'Bodysnatchers', lengthMs: 1260000 },
      ],
    });
  });

  it('stops browsing after four pages', async () => {
    const page = { 'release-count': 500, releases: Array.from({ length: 25 }, (_, i) => ({ id: `r${i}` })) };
    fetchMock.mockImplementation(async () => json(page));
    expect((await fetchReleases('x')).length).toBe(100);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
