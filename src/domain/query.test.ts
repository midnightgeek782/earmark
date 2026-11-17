import { describe, expect, it } from 'vitest';
import { buildSearchQuery, escapeLucene, serviceSearchUrl } from './query';

describe('query', () => {
  it('escapes Lucene specials', () => {
    expect(escapeLucene('AC/DC')).toBe('AC\\/DC');
    expect(escapeLucene('Sunn O)))')).toBe('Sunn O\\)\\)\\)');
  });

  it('treats AND/OR/NOT as words', () => {
    expect(escapeLucene('Love AND Theft')).toBe('Love and Theft');
  });

  it('skips empty queries and builds the filtered query', () => {
    expect(buildSearchQuery('   ')).toBeNull();
    expect(buildSearchQuery('in rainbows')).toContain('releasegroup:(in rainbows)');
  });

  it('builds service search URLs', () => {
    expect(serviceSearchUrl('spotify', 'Radiohead', 'In Rainbows')).toBe(
      'https://open.spotify.com/search/Radiohead%20In%20Rainbows',
    );
  });
});

import { rerank } from './query';

describe('rerank', () => {
  const r = (title: string, artist: string, score = 100) => ({ title, artist, score });
  it('prefers the result whose title and artist cover what was typed', () => {
    const results = [
      r('Radiohead', 'In Rainbows'),
      r('Radiohead', 'Radiohead'),
      r('In Rainbows', 'Radiohead', 90),
    ];
    const top = rerank('in rainbows radiohead', results)[0]!;
    expect(top).toMatchObject({ title: 'In Rainbows', artist: 'Radiohead' });
  });
  it('prefers exact titles over longer ones', () => {
    const top = rerank('in rainbows', [
      r('In Rainbows Disk 2', 'Radiohead'),
      r('In Rainbows', 'Radiohead', 80),
    ])[0]!;
    expect(top.title).toBe('In Rainbows');
  });
});

import { exactArtist, onlyRelevant, studioReleases } from './query';

describe('artist search helpers', () => {
  const r = (title: string, artistName: string, artistId: string | null) => ({
    title,
    artist: artistName,
    artistName,
    artistId,
  });

  it('recognises an exact artist name, ignoring case, accents and "The"', () => {
    const results = [
      r('Radiohead', 'In Rainbows', 'x'),
      r('Kid A', 'Radiohead', 'rh'),
      r('OK Computer', 'Radiohead', 'rh'),
    ];
    expect(exactArtist('radiohead', results)).toEqual({ id: 'rh', name: 'Radiohead' });
    expect(exactArtist('Bjork', [r('Homogenic', 'Björk', 'b')])).toEqual({ id: 'b', name: 'Björk' });
    expect(exactArtist('beatles', [r('Abbey Road', 'The Beatles', 'tb')])?.id).toBe('tb');
    expect(exactArtist('radioh', results)).toBeNull();
  });

  it('picks the artist with most results when names collide', () => {
    const results = [r('A', 'Nirvana', 'uk'), r('B', 'Nirvana', 'us'), r('C', 'Nirvana', 'us')];
    expect(exactArtist('nirvana', results)?.id).toBe('us');
  });

  it('drops results that miss typed words, accepting a prefix for the last word', () => {
    const results = [
      r('In Rainbows', 'Radiohead', 'rh'),
      r('Rainbows Avenue', 'Licking Rainbows', 'l'),
      r('Radiohead', 'Radiohead', 'rh'),
    ];
    expect(onlyRelevant('radiohead in rainb', results).map((x) => x.title)).toEqual(['In Rainbows']);
    expect(onlyRelevant('zzz', results)).toHaveLength(3);
  });

  it('keeps studio albums and EPs only, newest first', () => {
    const groups = [
      {
        id: '1',
        title: 'Pablo Honey',
        'first-release-date': '1993-02-22',
        'primary-type': 'Album',
        'secondary-types': [],
      },
      {
        id: '2',
        title: 'I Might Be Wrong',
        'first-release-date': '2001-11-07',
        'primary-type': 'Album',
        'secondary-types': ['Live'],
      },
      {
        id: '3',
        title: 'Kid A',
        'first-release-date': '2000-08-03',
        'primary-type': 'Album',
        'secondary-types': [],
      },
      {
        id: '4',
        title: 'Creep',
        'first-release-date': '1992',
        'primary-type': 'Single',
        'secondary-types': [],
      },
    ];
    expect(studioReleases(groups).map((g) => g.title)).toEqual(['Kid A', 'Pablo Honey']);
  });
});
