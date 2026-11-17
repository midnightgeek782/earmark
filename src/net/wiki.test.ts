import { describe, expect, it } from 'vitest';
import { wikidataIdFrom } from './wiki';

describe('wikidataIdFrom', () => {
  it('accepts only Wikidata item links', () => {
    expect(wikidataIdFrom('https://www.wikidata.org/wiki/Q202996')).toBe('Q202996');
    expect(wikidataIdFrom('https://evil.example/wiki/Q1')).toBeNull();
    expect(wikidataIdFrom('https://www.wikidata.org/wiki/Q1/../x')).toBeNull();
    expect(wikidataIdFrom(undefined)).toBeNull();
  });
});
