import { describe, expect, it } from 'vitest';
import { parseHash, queueHref } from './router';

describe('parseHash', () => {
  it('defaults to the To listen tab, newest first', () => {
    expect(parseHash('')).toMatchObject({ name: 'queue', tab: 'home', sort: undefined });
    expect(parseHash('#/')).toMatchObject({ name: 'queue', tab: 'home' });
    expect(parseHash('#/list')).toMatchObject({ name: 'queue', tab: 'toListen' });
  });

  it('reads the Listened tab, album and settings routes', () => {
    expect(parseHash('#/listened')).toMatchObject({ name: 'queue', tab: 'listened' });
    expect(parseHash('#/album/abc-123')).toEqual({ name: 'album', id: 'abc-123' });
    expect(parseHash('#/settings')).toEqual({ name: 'settings' });
  });

  it('reads q, sort and from, ignoring unknown sorts', () => {
    expect(parseHash('#/?q=in%20rainbows')).toMatchObject({ q: 'in rainbows' });
    expect(parseHash('#/?sort=shortest&from=Priya')).toMatchObject({ sort: 'shortest', from: 'Priya' });
    expect(parseHash('#/?sort=bogus')).toMatchObject({ sort: undefined });
    expect(parseHash('#/?tag=road%20trip')).toMatchObject({ tag: 'road trip' });
  });

  it('falls back to the queue for unknown paths', () => {
    expect(parseHash('#/nope')).toMatchObject({ name: 'queue', tab: 'home' });
  });

  it('builds queue links that round-trip', () => {
    const href = queueHref('listened', { sort: 'person', from: 'Sam Lee' });
    expect(parseHash(href)).toMatchObject({ tab: 'listened', sort: 'person', from: 'Sam Lee' });
    expect(queueHref('toListen')).toBe('#/list');
    expect(queueHref('home')).toBe('#/');
  });
});
