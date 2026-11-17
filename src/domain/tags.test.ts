import { describe, expect, it } from 'vitest';
import { addTag, allTags, normalizeTag, removeTag, sanitizeTags } from './tags';
import { makeAlbum } from './testing';

describe('tags', () => {
  it('normalises', () => {
    expect(normalizeTag('  Road   Trip ')).toBe('road trip');
    expect(normalizeTag('#Jazz')).toBe('jazz');
    expect(normalizeTag('x'.repeat(40))).toHaveLength(24);
  });
  it('adds once, caps at 8, removes', () => {
    expect(addTag(['jazz'], 'Jazz')).toEqual(['jazz']);
    const eight = Array.from({ length: 8 }, (_, i) => `t${i}`);
    expect(addTag(eight, 'more')).toHaveLength(8);
    expect(removeTag(['a', 'b'], 'a')).toEqual(['b']);
  });
  it('sanitises untrusted input and counts usage', () => {
    expect(sanitizeTags(['Focus', 3, null, 'focus', ' '])).toEqual(['focus']);
    expect(sanitizeTags('nope')).toEqual([]);
    const albums = [makeAlbum({ id: '1', tags: ['jazz', 'focus'] }), makeAlbum({ id: '2', tags: ['jazz'] })];
    expect(allTags(albums)).toEqual([
      { tag: 'jazz', count: 2 },
      { tag: 'focus', count: 1 },
    ]);
  });
});
