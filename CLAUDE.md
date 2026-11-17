# Earmark

A free, open-source, install-free web app (PWA) that keeps one to-listen list for albums and remembers who recommended each one. Data lives only in the user's browser. No server, no accounts, no secrets.

## Where the decisions live

- `docs/plan.md`: the reviewed, frozen v1 spec. Bullet lists after its Decision trace are accepted requirements from each review phase; later phases supersede earlier ones where they conflict.
- `DESIGN.md`: the design system (tokens, fonts, components, do's and don'ts).
- `docs/test-plan.md`: required tests and edge cases.
- `docs/ceo-review.md`: the owner's original 19 decisions (D2 to D7.4) and their reasoning.
- `TODOS.md`: deferred work. The spec is frozen: new edge cases go to TODOS.md unless they cause data loss.

## Architecture (from the eng review)

- `src/screens/`: React screens only (Queue, Album, Settings).
- `src/domain/`: pure rules (normalize, identity, schema, merge, pick, sort). No React, Dexie or fetch.
- `src/db/`: Dexie (IndexedDB) tables and transactions; liveQuery for cross-tab updates. (Week 2)
- `src/mb/`: the only module that calls MusicBrainz: slot-claim lock, priority queue, 10 s timeout. (Week 2)
- `src/jobs/`: enrichment scheduler, cover cache, purge. (Weeks 2-5)
- Lock and clock are injected so timing and multi-tab behaviour is testable.

## Commands

- `npm run dev`: local dev server
- `npm test`: unit tests (Vitest)
- `npm run lint`, `npm run format`
- `npm run build`: type check and production build
- `npm run test:e2e`: Playwright end-to-end tests (desktop + phone) against the production build, network stubbed

## Build status

- v1 features built (2026-11-18): search (MusicBrainz, links from Apple Music/Bandcamp/Spotify), add by hand, duplicate detection, recommender + notes, Pick for me with time limit, Listened with verdict and notes, soft delete + Undo, export/import with merge, sample albums, background enrichment with retries, offline PWA, CSP.
- Also built: `sort`/`from` URL params with people filter chips, local re-ranking of search results, MB client tests on recorded fixtures (`src/mb/fixtures`), install card, sleeve-style fallback covers, list stats in Settings, samples that step aside on the first real add.
- Also built: "Who told you?" sheet right after adding (one-tap past recommenders), "On your list" matches in search, keyboard shortcuts (/, P, L, Esc), theme setting (System/Light/Dark), backup reminder after 10 adds, CSV export (formula-safe).
- Also built: People (#/people, #/people/<name>) with taste match, Insights (#/insights) with 12-month chart, Waiting-longest spotlight, album page cover tint + share, track lists from enrichment, main nav + footer, 16 Playwright tests run in CI.
- Search: typing an exact artist name lists only that artist's studio albums (MB browse, secondary types excluded), EPs behind "Show EPs"; other queries keep only results covering every typed word.
- Home: greeting, daily pick (seeded by date), shelves (Up next = starred, Short listens, From best-match person, Waiting longest), grid/list view (V), tag filter (`tag` param). Albums have optional `starred` and `tags` (exported, merged as user fields). Settings: default view/sort, daily pick & shelves toggles, Pick weighting (even/older) and prefer-starred, storage use, refresh details, delete everything (type DELETE). `useSettings()` fills defaults for older saved settings.
- Tabs: #/ For you (daily pick, shelves, Suggested panel, Recently added), #/list To listen, #/listened. "Up next" renamed "Listen soon" (starred). Suggestions: src/domain/suggest.ts (pure) + src/net/listenbrainz.ts + src/jobs/suggest.ts; home panel is opt-in (`suggestionsOnHome`), Suggest button always works. Enrichment also fetches genres, artist MBID and Wikidata ID (`/release-group/<id>?inc=genres+url-rels+artist-credits`); album page lazily caches a Wikipedia summary (`about`, toggle `wikiDescriptions`). CSP connect-src includes ListenBrainz, Wikidata, Wikipedia.
- Not yet: cover cache budget beyond Workbox maxEntries, final web address (`VITE_BASE`), GitHub repo.

## Design System

Read DESIGN.md before visual or UI work: it defines the fonts, colors, spacing, and
aesthetic direction. Ask the user before departing from it. When reviewing or QA-ing
UI, flag code that doesn't match DESIGN.md.
