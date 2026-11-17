import { describe, expect, it } from 'vitest';
import { isAllowedLink, parseLink } from './links';

describe('parseLink', () => {
  it('reads the album name from Apple Music links', () => {
    expect(parseLink('https://music.apple.com/us/album/in-rainbows/1109714933')).toEqual({
      kind: 'query',
      query: 'in rainbows',
      source: 'apple',
    });
  });

  it('reads artist and album from Bandcamp links', () => {
    expect(parseLink('https://radiohead.bandcamp.com/album/in-rainbows')).toEqual({
      kind: 'query',
      query: 'radiohead in rainbows',
      source: 'bandcamp',
    });
  });

  it('recognises Spotify album links', () => {
    expect(parseLink('https://open.spotify.com/album/5vkqYmiPBYLaalcmjujWxK?si=x')).toEqual({
      kind: 'spotify',
      url: 'https://open.spotify.com/album/5vkqYmiPBYLaalcmjujWxK',
    });
  });

  it('treats other links as unknown and plain text as not a link', () => {
    expect(parseLink('https://evil.example/album/x').kind).toBe('unknown');
    expect(parseLink('javascript:alert(1)').kind).toBe('not-a-link');
    expect(parseLink('in rainbows').kind).toBe('not-a-link');
  });
});

describe('isAllowedLink', () => {
  it('allows only known https hosts', () => {
    expect(isAllowedLink('https://open.spotify.com/album/x', 'spotify')).toBe(true);
    expect(isAllowedLink('https://open.spotify.com.evil.com/x', 'spotify')).toBe(false);
    expect(isAllowedLink('http://open.spotify.com/x', 'spotify')).toBe(false);
    expect(isAllowedLink('https://ia800.us.archive.org/x.jpg', 'cover')).toBe(true);
    expect(isAllowedLink('https://notarchive.org/x.jpg', 'cover')).toBe(false);
    expect(isAllowedLink('javascript:alert(1)', 'apple')).toBe(false);
    expect(isAllowedLink(null, 'apple')).toBe(true);
  });
});
