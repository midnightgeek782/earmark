import { useEffect, useState } from 'react';

const cache = new Map<string, string | null>();

/**
 * Average colour of a cover image, as "r g b", for tinting the album page.
 * Cover Art Archive serves CORS on every redirect, so the canvas isn't tainted.
 * Returns null while loading, for sleeves without art, or if anything fails.
 */
export function useCoverTint(url: string | null): string | null {
  const [tint, setTint] = useState<string | null>(url ? (cache.get(url) ?? null) : null);
  useEffect(() => {
    if (!url) return setTint(null);
    if (cache.has(url)) return setTint(cache.get(url)!);
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 16;
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, 16, 16);
        const d = ctx.getImageData(0, 0, 16, 16).data;
        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let i = 0; i < d.length; i += 4) {
          // Skip near-white and near-black pixels so the tint has some colour.
          const sum = d[i]! + d[i + 1]! + d[i + 2]!;
          if (sum < 60 || sum > 700) continue;
          r += d[i]!;
          g += d[i + 1]!;
          b += d[i + 2]!;
          n++;
        }
        const value = n ? `${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)}` : null;
        cache.set(url, value);
        if (alive) setTint(value);
      } catch {
        cache.set(url, null);
      }
    };
    img.onerror = () => cache.set(url, null);
    img.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  return tint;
}
