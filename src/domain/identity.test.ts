import { describe, expect, it } from 'vitest';
import { identityKey, isSameAlbum, normKey, normalize } from './identity';

describe('normalize', () => {
  it('lowercases, strips accents and punctuation, collapses spaces', () => {
    expect(normalize('  Björk  ')).toBe('bjork');
    expect(normalize('OK  Computer!')).toBe('ok computer');
    expect(normalize('AC/DC')).toBe('ac dc');
  });

  it('turns & into and and drops a leading "the"', () => {
    expect(normalize('Simon & Garfunkel')).toBe('simon and garfunkel');
    expect(normalize('The Beatles')).toBe('beatles');
  });

  it('drops featured-artist credits', () => {
    expect(normalize('Song (feat. Someone)')).toBe('song');
    expect(normalize('Track ft. Guest')).toBe('track');
  });

  it('keeps non-Latin titles distinct', () => {
    expect(normalize('Кино')).toBe('кино');
    expect(normalize('ポップ')).not.toBe('');
    expect(normalize('ポップ')).not.toBe(normalize('ロック'));
    expect(normalize('방탄소년단')).toBe('방탄소년단');
  });

  it('falls back to the raw text when nothing survives', () => {
    expect(normalize('🎸🎸')).toBe('🎸🎸');
    expect(normalize('🎸')).not.toBe(normalize('🎹'));
  });
});

describe('identity', () => {
  it('uses the MusicBrainz ID when present', () => {
    expect(identityKey({ musicBrainzId: 'abc', artist: 'X', title: 'Y' })).toBe('mb:abc');
  });

  it('uses normalized artist and title for hand entries', () => {
    expect(identityKey({ artist: 'The Beatles', title: 'Abbey Road' })).toBe('hand:beatles|abbey road');
    expect(normKey('Radiohead', 'In Rainbows')).toBe('radiohead|in rainbows');
  });

  it('lets two albums with the same name but different MBIDs coexist', () => {
    const blue = { musicBrainzId: 'weezer-1994', artist: 'Weezer', title: 'Weezer' };
    const green = { musicBrainzId: 'weezer-2001', artist: 'Weezer', title: 'Weezer' };
    expect(isSameAlbum(blue, green)).toBe(false);
  });

  it('matches a hand entry to the MusicBrainz version in either direction', () => {
    const hand = { artist: 'radiohead', title: 'in rainbows!' };
    const mb = { musicBrainzId: '6e335887', artist: 'Radiohead', title: 'In Rainbows' };
    expect(isSameAlbum(hand, mb)).toBe(true);
    expect(isSameAlbum(mb, hand)).toBe(true);
  });
});
