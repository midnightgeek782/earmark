import { LIMITS, type Album } from './types';

/** Lowercase, trim, collapse spaces, drop control characters and "#", cap length. */
export function normalizeTag(input: string): string {
  return input
    .replace(/[\u0000-\u001F\u007F#]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, LIMITS.tag)
    .trim();
}

/** Add a tag if new and under the limit; returns a new list. */
export function addTag(tags: string[] | undefined, input: string): string[] {
  const list = tags ?? [];
  const t = normalizeTag(input);
  if (!t || list.includes(t) || list.length >= LIMITS.maxTags) return list;
  return [...list, t];
}

export function removeTag(tags: string[] | undefined, tag: string): string[] {
  return (tags ?? []).filter((t) => t !== tag);
}

/** Clean an untrusted tag list (import): strings only, normalised, unique, capped. */
export function sanitizeTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.reduce<string[]>((acc, x) => (typeof x === 'string' ? addTag(acc, x) : acc), []);
}

/** All tags in use, most used first. */
export function allTags(albums: Album[]): { tag: string; count: number }[] {
  const m = new Map<string, number>();
  for (const a of albums) if (!a.deletedAt) for (const t of a.tags ?? []) m.set(t, (m.get(t) ?? 0) + 1);
  return [...m.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export const SUGGESTED_TAGS = [
  'road trip',
  'focus',
  'rainy day',
  'late night',
  'workout',
  'with headphones',
  'party',
  'sunday morning',
];
