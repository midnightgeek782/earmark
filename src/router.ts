import { useEffect, useState } from 'react';

// Hash routes are stable public URLs (see docs/plan.md):
// #/ (For you)  #/list (To listen)  #/listened  #/album/<id>  #/people  #/people/<name>  #/insights  #/settings
// params: q (search prefill), sort, from
export type Sort = 'newest' | 'oldest' | 'shortest' | 'person';
const SORTS: Sort[] = ['newest', 'oldest', 'shortest', 'person'];

export type Tab = 'home' | 'toListen' | 'listened';

export type Route =
  | { name: 'queue'; tab: Tab; q?: string; sort?: Sort; from?: string; tag?: string }
  | { name: 'album'; id: string }
  | { name: 'people' }
  | { name: 'person'; person: string }
  | { name: 'insights' }
  | { name: 'settings' };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path = '/', query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const q = params.get('q') ?? undefined;
  const sortParam = params.get('sort') as Sort | null;
  const sort: Sort | undefined = sortParam && SORTS.includes(sortParam) ? sortParam : undefined;
  const tag = params.get('tag') ?? undefined;
  const from = params.get('from') ?? undefined;
  const parts = path.split('/').filter(Boolean);
  const dec = (s: string) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };

  if (parts[0] === 'album' && parts[1]) return { name: 'album', id: dec(parts[1]) };
  if (parts[0] === 'people' && parts[1]) return { name: 'person', person: dec(parts[1]) };
  if (parts[0] === 'people') return { name: 'people' };
  if (parts[0] === 'insights') return { name: 'insights' };
  if (parts[0] === 'settings') return { name: 'settings' };
  const tab: Tab = parts[0] === 'listened' ? 'listened' : parts[0] === 'list' ? 'toListen' : 'home';
  return { name: 'queue', tab, q, sort, from, tag };
}

export function queueHref(tab: Tab, opts: { sort?: Sort; from?: string; tag?: string } = {}) {
  const p = new URLSearchParams();
  if (opts.sort) p.set('sort', opts.sort);
  if (opts.from) p.set('from', opts.from);
  if (opts.tag) p.set('tag', opts.tag);
  const qs = p.toString();
  const path = tab === 'listened' ? 'listened' : tab === 'toListen' ? 'list' : '';
  return `#/${path}${qs ? `?${qs}` : ''}`;
}

export const personHref = (name: string) => `#/people/${encodeURIComponent(name)}`;

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
