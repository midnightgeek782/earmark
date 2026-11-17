// Short album descriptions: Wikidata item → English Wikipedia title → page summary.
// Both APIs allow browser requests (origin=* / CORS headers).

const QID = /^Q\d{1,12}$/;

export async function fetchAbout(wikidataId: string): Promise<{ text: string; url: string } | null> {
  if (!QID.test(wikidataId)) return null;
  const wd = await fetch(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikidataId}&props=sitelinks&sitefilter=enwiki&format=json&origin=*`,
  );
  if (!wd.ok) return null;
  const data = (await wd.json()) as {
    entities?: Record<string, { sitelinks?: { enwiki?: { title?: string } } }>;
  };
  const title = data.entities?.[wikidataId]?.sitelinks?.enwiki?.title;
  if (!title) return null;
  const wp = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
  );
  if (!wp.ok) return null;
  const s = (await wp.json()) as {
    extract?: string;
    type?: string;
    content_urls?: { desktop?: { page?: string } };
  };
  const url = s.content_urls?.desktop?.page;
  if (!s.extract || s.type === 'disambiguation' || !url?.startsWith('https://en.wikipedia.org/')) return null;
  return { text: s.extract.slice(0, 1200), url };
}

/** Wikidata ID from a MusicBrainz URL relation like https://www.wikidata.org/wiki/Q202996 */
export function wikidataIdFrom(url: string | undefined): string | null {
  const m = url?.match(/^https?:\/\/(?:www\.)?wikidata\.org\/wiki\/(Q\d{1,12})$/);
  return m ? m[1]! : null;
}
