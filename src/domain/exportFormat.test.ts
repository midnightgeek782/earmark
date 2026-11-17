import { describe, expect, it } from 'vitest';
import { buildExport, exportFilename, mergeAlbum, parseImport } from './exportFormat';
import { makeAlbum } from './testing';

const enc = (o: unknown) => {
  const t = JSON.stringify(o);
  return [t, new TextEncoder().encode(t).length] as const;
};

describe('export / import', () => {
  it('round-trips with nothing lost (samples and deleted excluded)', () => {
    const albums = [
      makeAlbum({
        id: '1',
        recommendedBy: 'Priya',
        recommenderNote: 'track 3',
        rating: 'loved',
        status: 'listened',
      }),
      makeAlbum({ id: '2', title: 'Кино', artist: 'Кино', lengthMinutes: null }),
      makeAlbum({ id: '3', sample: true, title: 'Kind of Blue' }),
      makeAlbum({ id: '4', deletedAt: '2026-11-17T00:00:00.000Z', title: 'Gone' }),
    ];
    const [t, n] = enc(buildExport(albums, 'spotify'));
    const r = parseImport(t, n);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.albums.map((a) => a.title)).toEqual(['In Rainbows', 'Кино']);
    expect(r.albums[0]).toMatchObject({
      recommendedBy: 'Priya',
      recommenderNote: 'track 3',
      rating: 'loved',
    });
    expect(r.musicApp).toBe('spotify');
  });

  it('rejects bad files with a code and a specific reason', () => {
    expect(parseImport('nope', 4)).toMatchObject({ ok: false, code: 'IMPORT_NOT_JSON' });
    expect(parseImport('{}', 2)).toMatchObject({ ok: false, code: 'IMPORT_NOT_BACKLOG' });
    const [t1, n1] = enc({ format: 'earmark', formatVersion: 99, albums: [] });
    expect(parseImport(t1, n1)).toMatchObject({ ok: false, code: 'IMPORT_BAD_VERSION' });
    const [t2, n2] = enc({
      format: 'earmark',
      formatVersion: 1,
      albums: [{ title: 'In Rainbows', artist: 'Radiohead', year: 1850 }],
    });
    const r = parseImport(t2, n2);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]!.message).toContain('Album 1 (In Rainbows): year 1850 is outside 1900');
  });

  it('rejects hostile links, bad UUIDs and bad ratings', () => {
    for (const bad of [
      { spotifyUrl: 'javascript:alert(1)' },
      { coverUrl: 'https://evil.example/x.jpg' },
      { musicBrainzId: 'not-a-uuid' },
      { rating: 'great' },
    ]) {
      const [t, n] = enc({
        format: 'earmark',
        formatVersion: 1,
        albums: [{ title: 'A', artist: 'B', ...bad }],
      });
      expect(parseImport(t, n).ok).toBe(false);
    }
  });

  it('ignores an imported sample flag and merges duplicates within a file', () => {
    const [t, n] = enc({
      format: 'earmark',
      formatVersion: 1,
      albums: [
        { title: 'In Rainbows', artist: 'Radiohead', sample: true, updatedAt: '2026-01-01T00:00:00Z' },
        {
          title: 'in rainbows!',
          artist: 'radiohead',
          rating: 'liked',
          updatedAt: '2026-02-01T00:00:00+02:00',
        },
      ],
    });
    const r = parseImport(t, n);
    expect(r.ok && r.albums.length).toBe(1);
    expect(r.ok && r.albums[0]!.sample).toBe(false);
    expect(r.ok && r.albums[0]!.rating).toBe('liked');
  });

  it('uses the local date in the filename', () => {
    expect(exportFilename(new Date(2026, 10, 17, 23, 30))).toBe('earmark-2026-11-17.json');
  });
});

describe('mergeAlbum', () => {
  it('takes user fields from the newer copy and keeps local on a tie', () => {
    const local = makeAlbum({ status: 'queued', updatedAt: '2026-01-01T00:00:00.000Z' });
    const newer = makeAlbum({ status: 'listened', rating: 'loved', updatedAt: '2026-02-01T00:00:00.000Z' });
    expect(mergeAlbum(local, newer)).toMatchObject({ status: 'listened', rating: 'loved' });
    const tie = makeAlbum({ status: 'listened', updatedAt: local.updatedAt });
    expect(mergeAlbum(local, tie).status).toBe('queued');
  });

  it('takes enrichment from the done copy', () => {
    const local = makeAlbum({ enrichment: 'failed', lengthMinutes: null });
    const incoming = makeAlbum({ enrichment: 'done', lengthMinutes: 42 });
    expect(mergeAlbum(local, incoming).lengthMinutes).toBe(42);
  });
});

import { buildCsv } from './exportFormat';

describe('buildCsv', () => {
  it('quotes commas, quotes and newlines, neutralises formulas, skips samples', () => {
    const csv = buildCsv([
      makeAlbum({ title: 'Hello, "World"', recommenderNote: 'line1\nline2', recommendedBy: '=HYPERLINK(1)' }),
      makeAlbum({ id: 's', sample: true }),
    ]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toMatch(/^title,artist,year/);
    expect(csv).toContain('"Hello, ""World"""');
    expect(csv).toContain('"line1\nline2"');
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(lines.filter(Boolean).length).toBe(2);
  });
});

describe('stars and tags in export', () => {
  it('round-trips starred and tags, sanitising hostile tags', () => {
    const [t, n] = enc(buildExport([makeAlbum({ starred: true, tags: ['jazz', 'focus'] })], null));
    const r = parseImport(t, n);
    expect(r.ok && r.albums[0]).toMatchObject({ starred: true, tags: ['jazz', 'focus'] });
    const [t2, n2] = enc({
      format: 'earmark',
      formatVersion: 1,
      albums: [{ title: 'A', artist: 'B', tags: [{}, '#Road Trip'], starred: 'yes' }],
    });
    const r2 = parseImport(t2, n2);
    expect(r2.ok && r2.albums[0]).toMatchObject({ starred: false, tags: ['road trip'] });
  });
});
