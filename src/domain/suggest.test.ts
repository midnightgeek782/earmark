import { describe, expect, it } from 'vitest';
import { bestAlbum, candidateArtists, chooseSeeds, pickSeeds, reasonFor, type TopAlbum } from './suggest';
import { makeAlbum } from './testing';

const rh = 'rh-mbid';
const albums = [
  makeAlbum({
    id: '1',
    title: 'Kid A',
    artist: 'Radiohead',
    artistMbid: rh,
    status: 'listened',
    rating: 'loved',
    musicBrainzId: 'kid-a',
  }),
  makeAlbum({
    id: '2',
    title: 'Nevermind',
    artist: 'Nirvana',
    artistMbid: 'nv',
    status: 'listened',
    rating: 'not-for-me',
  }),
  makeAlbum({ id: '3', title: 'Blue', artist: 'Joni Mitchell', artistMbid: 'jm' }),
  makeAlbum({ id: '4', title: 'Hand entry', artist: 'X', artistMbid: null }),
];

describe('pickSeeds', () => {
  it('weights loved above queued and skips not-for-me and unknown artists', () => {
    const seeds = pickSeeds(albums);
    expect(seeds.map((s) => s.artist)).toEqual(['Radiohead', 'Joni Mitchell']);
    expect(reasonFor(seeds[0]!)).toBe('Because you loved Kid A');
    expect(reasonFor(seeds[1]!)).toBe('Because Blue is on your list');
  });
  it('can use only loved and liked albums', () => {
    expect(pickSeeds(albums, 'loved').map((s) => s.artist)).toEqual(['Radiohead']);
  });
  it('chooses distinct seeds', () => {
    const chosen = chooseSeeds(pickSeeds(albums), 5);
    expect(new Set(chosen.map((s) => s.artistMbid)).size).toBe(chosen.length);
    expect(chosen).toHaveLength(2);
  });
});

describe('candidates and best album', () => {
  it('drops artists you already have and duplicates', () => {
    const similar = [
      { artistMbid: 'jm', name: 'Joni Mitchell', score: 9, seed: rh },
      { artistMbid: 'pj', name: 'PJ Harvey', score: 5, seed: rh },
      { artistMbid: 'pj', name: 'PJ Harvey', score: 4, seed: 'jm' },
      { artistMbid: 'bk', name: 'Björk', score: 7, seed: rh },
    ];
    expect(candidateArtists(similar, albums).map((s) => s.name)).toEqual(['Björk', 'PJ Harvey']);
  });
  it('picks the most-played studio album not on your list', () => {
    const top: TopAlbum[] = [
      {
        releaseGroupMbid: 'kid-a',
        title: 'Kid A',
        artist: 'Radiohead',
        artistMbid: rh,
        year: 2000,
        type: 'Album',
        listens: 900,
      },
      {
        releaseGroupMbid: 'live',
        title: 'Live',
        artist: 'Radiohead',
        artistMbid: rh,
        year: 2001,
        type: 'Album',
        listens: 50,
      },
      {
        releaseGroupMbid: 'okc',
        title: 'OK Computer',
        artist: 'Radiohead',
        artistMbid: rh,
        year: 1997,
        type: 'Album',
        listens: 800,
      },
      {
        releaseGroupMbid: 'creep',
        title: 'Creep',
        artist: 'Radiohead',
        artistMbid: rh,
        year: 1992,
        type: 'Single',
        listens: 999,
      },
    ];
    expect(bestAlbum(top, albums)?.title).toBe('OK Computer');
    expect(bestAlbum([], albums)).toBeNull();
    const hits = [{ ...top[2]!, releaseGroupMbid: 'gh', title: 'Greatest Hits', listens: 5000 }];
    expect(bestAlbum(hits, albums)).toBeNull();
  });
});
