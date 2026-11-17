import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EarmarkDb, getSettings } from './db';
import {
  applyEnrichment,
  editAlbum,
  importAlbums,
  markListened,
  purgeDeleted,
  saveAlbum,
  softDelete,
  undoDelete,
} from './albums';
import { makeAlbum } from '../domain/testing';

let d: EarmarkDb;
beforeEach(() => {
  d = new EarmarkDb(`test-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await d.delete();
});

describe('albums store', () => {
  it('saves once and reports duplicates, including hand entry then search', async () => {
    const first = await saveAlbum({ title: 'in rainbows', artist: 'radiohead' }, d);
    expect(first.kind).toBe('saved');
    const again = await saveAlbum({ title: 'In Rainbows', artist: 'Radiohead', musicBrainzId: 'x' }, d);
    expect(again.kind).toBe('exists');
    expect(await d.albums.count()).toBe(1);
    expect((await getSettings(d)).addedSinceExport).toBe(1);
  });

  it('lets two different MBIDs with the same title coexist', async () => {
    await saveAlbum({ title: 'Weezer', artist: 'Weezer', musicBrainzId: 'blue' }, d);
    const r = await saveAlbum({ title: 'Weezer', artist: 'Weezer', musicBrainzId: 'green' }, d);
    expect(r.kind).toBe('saved');
  });

  it('re-adding during the Undo window commits the pending delete first', async () => {
    const r = await saveAlbum({ title: 'A', artist: 'B' }, d);
    await softDelete(r.album.id, d);
    const again = await saveAlbum({ title: 'A', artist: 'B' }, d);
    expect(again.kind).toBe('saved');
    expect(await d.albums.count()).toBe(1);
  });

  it('undo restores the record unchanged; purge only removes old deletions', async () => {
    const r = await saveAlbum({ title: 'A', artist: 'B' }, d);
    await softDelete(r.album.id, d);
    expect(await purgeDeleted(d)).toBe(0);
    await undoDelete(r.album.id, d);
    expect((await d.albums.get(r.album.id))?.deletedAt).toBeNull();
    await softDelete(r.album.id, d);
    expect(await purgeDeleted(d, Date.now() + 120_000)).toBe(1);
  });

  it('enrichment never overwrites user edits and never revives deleted albums', async () => {
    const r = await saveAlbum({ title: 'A', artist: 'B', musicBrainzId: 'm' }, d);
    await editAlbum(r.album.id, { recommendedBy: 'Priya' }, d);
    const before = await d.albums.get(r.album.id);
    await applyEnrichment(
      r.album.id,
      { lengthMinutes: 40, trackCount: 9, spotifyUrl: null, appleMusicUrl: null, tracks: [] },
      d,
    );
    const after = await d.albums.get(r.album.id);
    expect(after).toMatchObject({ recommendedBy: 'Priya', lengthMinutes: 40, enrichment: 'done' });
    expect(after?.updatedAt).toBe(before?.updatedAt);

    await softDelete(r.album.id, d);
    await d.albums.delete(r.album.id);
    await applyEnrichment(
      r.album.id,
      { lengthMinutes: 1, trackCount: 1, spotifyUrl: null, appleMusicUrl: null, tracks: [] },
      d,
    );
    expect(await d.albums.get(r.album.id)).toBeUndefined();
  });

  it('imports by merging, keeping the newer status', async () => {
    const r = await saveAlbum({ title: 'In Rainbows', artist: 'Radiohead' }, d);
    await markListened(r.album.id, 'loved', d);
    const older = makeAlbum({ id: 'x', status: 'queued', updatedAt: '2020-01-01T00:00:00.000Z' });
    const plan = await importAlbums([older, makeAlbum({ id: 'y', title: 'Kid A' })], d);
    expect(plan).toEqual({ added: 1, merged: 1 });
    expect((await d.albums.get(r.album.id))?.status).toBe('listened');
  });
});

import { deleteEverything, refreshAllDetails } from './albums';

describe('data tools', () => {
  it('star and tags are user edits; delete everything clears the list', async () => {
    const r = await saveAlbum({ title: 'A', artist: 'B', musicBrainzId: 'm' }, d);
    await editAlbum(r.album.id, { starred: true, tags: ['jazz'] }, d);
    expect(await d.albums.get(r.album.id)).toMatchObject({ starred: true, tags: ['jazz'] });
    await d.albums.update(r.album.id, { enrichment: 'done' });
    expect(await refreshAllDetails(d)).toBe(1);
    expect((await d.albums.get(r.album.id))?.enrichment).toBe('pending');
    await deleteEverything(d);
    expect(await d.albums.count()).toBe(0);
    expect((await getSettings(d)).samplesSeeded).toBe(true);
  });
});
