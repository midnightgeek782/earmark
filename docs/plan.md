<!-- Reviewed 2026-11-17: interactive CEO review + /autoplan (strategy, design, contributor experience, engineering).
     Bullet lists after the Decision trace are accepted requirements from each review phase; later phases supersede earlier ones where they conflict.
     Final gate: all recommendations approved, including link pasting (uc1) and #/?q= prefill + iPhone Shortcut + Android share target (d1). -->

# Earmark project plan

Source: Claude Doc https://claude.ai/artifact/SreAZ2eYgBwvKSRvZ3mqRP (rev 15), with the accepted CEO review changes (review file: 2026-11-17-backlog.md) folded in. Greenfield: no code exists yet.

Backlog is a free, open-source web app that keeps one to-listen list for albums. It works with any streaming service, needs no account, and stores everything in the user's own browser. Version 1 is six weekly milestones at six to eight hours a week.

## Why it exists

People hear about albums all day (a friend's text, a review, a video) and lose most of them in screenshots and notes apps. Saving in Spotify or Apple Music mixes "want to try" with "already love" and only works in that one app. Similar apps exist: Side B (iPhone app, no account), Listen Later and Record Station (iPhone), Record Club and Musicboard (social, accounts), albumz (open source, self-hosted with Docker and PostgreSQL). Backlog's edge: open source, nothing to install, no account, runs on any device (the list lives on the device you use and moves with a file), your list is a file you own, built on open music data, and it remembers who recommended what. The README opens with the recommendation story, then a short comparison.

Success definition: before Show HN, a dogfooding gate (the owner keeps a real list of 30 or more albums in Backlog for 2 weeks); after launch, the owner uses it daily for 4 weeks, and the repo draws outside interest (stars, issues or a pull request) within 30 days. The audience is deliberately open-source-minded listeners first.

V1 premise: one list per device; moving between devices is by export and import.

Users: album listeners who work through a queue; friends who get recommendations and want to remember who suggested what; people who use several services or buy on Bandcamp.

## What v1 does

| Feature | Behaviour |
|---|---|
| Add by name | Search box at the top of the Queue. Type an album or artist; the query is exactly `(releasegroup:(<text>) OR artist:(<text>)) AND (primarytype:album OR primarytype:ep) AND NOT secondarytype:(live OR compilation OR demo)` with Lucene special characters in `<text>` escaped (the type filters are defaults until the Week 2 search-quality check and the singles question settle them); the top five by MusicBrainz score appear with covers; tap one to save. An "Add it by hand" link is always shown under the results, and on zero matches, timeout, busy failure or offline; the form takes title (required), artist (required), year (optional, 1900 to next year) and length in minutes (optional, 1 to 600), with the same character limits as import |
| Add by link | Paste an album link into the search box. Apple Music (`music.apple.com/<country>/album/<name>/<id>`) and Bandcamp (`<artist>.bandcamp.com/album/<name>`) links: the album name in the address fills the search, with no network call. Spotify album links: Spotify's link preview (oEmbed, readable from browsers) supplies the title, which fills the search. Any other link: "Paste the album name instead". Only these hosts are parsed; the raw link is never rendered as HTML. The user still taps the right match |
| Open with a search | Opening `#/?q=<text>` fills the search box and runs the search. The README gives an iPhone Shortcut recipe that opens this link with shared text; on Android the installed app registers a share target (GET, text and url mapped to `#/?q=`) |
| Album details | Cover (Cover Art Archive, 250 px), artist, year (the release group's first-release year), track count, total length |
| Recommended by | Optional name and short note |
| Queue | Grid of covers with tabs To listen and Listened; sort by date added, length, year; filter by who recommended it |
| Pick for me | Random album from To listen, optional time limit chosen from 30, 45, 60, 90 minutes or a typed whole number of 1 or more; the limit is inclusive (at most that many minutes) |
| Open in my app | Opens the album in the music app chosen in Settings (Spotify, Apple Music, YouTube Music, Tidal, Deezer, Bandcamp; URL templates below): the exact album when a Spotify or Apple link is known for that service, otherwise that service's search page for artist + album. If no app is chosen yet, the first Open asks and remembers |
| Mark as listened | Optional rating loved, liked or not for me (three words; the default unless the owner changes it before Week 4), plus an optional listening note (`review`). Move back to queue keeps rating and listening note and clears listenedOn |
| Edit and delete | The Album screen edits recommender, recommender note, rating and listening note; length can be typed on any album whose length is unknown. A typo in a hand entry is fixed by deleting and re-entering. Delete marks the record deleted (hidden everywhere, excluded from export and from duplicate checks), returns to the tab the user came from and shows an Undo toast for 8 seconds (paused while focused or hovered, capped at 60 seconds, announced through an aria-live region; Ctrl/Cmd+Z also undoes). Undo restores the record unchanged (same id, updatedAt and enrichment state; enrichment resumes). A second delete commits the first and shows its own Undo. When the window ends, or at the next startup for any leftover, the record is removed for good and its cover leaves the saved-covers cache |
| Export and import | JSON file with a version number; load it back on another device |
| Samples | 12 bundled sample records (eligible for Pick for me) (MusicBrainz ID, title, artist, year, track count, length, Spotify/Apple links; no images in the repo) seeded once into an empty database on first run (a flag records it; they never return). Their covers load from Cover Art Archive at runtime (title tiles when offline on first run). Saving an album that matches a sample turns it into a real record. Clear samples asks for confirmation, then deletes only records still marked sample, including rated ones |
| Install and offline | Installs to the home screen and opens without a connection |

Not in v1: CSV export (deferred), a manual light/dark switch (deferred; the app follows the device setting), accounts, sync, sharing, in-app playback, telemetry.

## How someone uses it

1. Hear about an album.
2. Open Backlog and type the name in the search box; tap the right match. It is saved at once, and the results panel becomes a confirmation row with a "Who recommended it?" field that stays until the next action (new search, navigation, Escape); the name is also editable later on the Album screen.
3. When there is time to listen, browse the queue or press Pick for me with a time limit.
4. Press Open; the album opens in the user's music app.
5. Come back, mark it listened, rate it, write a line.

## Screens

| Screen | Contents | Main action |
|---|---|---|
| Queue | Search box, To listen / Listened tabs, cover grid with artist, year, length; sort and filter | Pick for me |
| Album | Large cover, details, recommender and recommender note, rating, listening note; Edit and Delete | Open; Mark as listened |
| Settings | Music app for Open, export, import, clear samples, app version | Export my list |

Visual direction: covers supply the colour; near-white or near-black background following the device; one accent colour on the main action of each screen; Inter in three sizes; four covers across on a laptop, two on a phone; one small reveal animation for Pick for me, off for reduced motion. Inter is self-hosted and precached so it works offline. Every control works by keyboard (`/` focuses search, `R` picks, Escape closes results and dialogs; single-key shortcuts are ignored while typing in a field); 44 px touch targets; WCAG AA contrast; cover alt text; empty states never blank.

## How it is built

A static website on GitHub Pages with no server. Three parts in the browser: Lookup (talks to MusicBrainz and Cover Art Archive), Screens, Storage (IndexedDB through Dexie). A service worker (vite-plugin-pwa) caches the app and covers.

Adding an album: type in the search box -> Lookup searches MusicBrainz -> up to five matches with covers -> tap -> album saved to Storage at once from the search data -> in the background Lookup fetches releases, length and streaming links and writes them only if the record still exists (a deleted album is never revived). Enrichment sets `enrichment` (pending, done, failed) and `enrichedAt`, never `updatedAt`. Albums that arrive by import without length or links get `enrichment: pending`.

### Lookup rules

- Browsers cannot set a User-Agent, so requests use `fmt=json` and identify the app through its Origin; the README names the app and a contact for MusicBrainz.
- One module owns every MusicBrainz request. Each request takes a Web Lock only for its own duration (never for a tab's lifetime), and a shared last-request time keeps the 1-second spacing across tabs; the 10-second timeout starts before the lock is requested, so a busy lock ends in the timeout message, never a hang. Searches wait for a 400 ms pause in typing. All requests (searches and release lookups) share one queue with at least 1 second between them; searches go ahead of enrichment, and a new search drops queued searches that are now stale (MusicBrainz allows about one request per second per address). Answers are cached in memory by query.
- A new search cancels the previous one, and replies for older queries are ignored, so results always match the current text.
- 10-second timeout shows "No reply from MusicBrainz after 10 s. Try again or add it by hand". HTTP 503 (busy) waits 1.5 seconds (or `Retry-After`, up to 5 seconds) and retries once, showing "MusicBrainz is busy, retrying"; if the retry fails, "MusicBrainz is busy. Try again in a minute, or add it by hand". Any other failure (other HTTP status, network error while online, invalid JSON) shows "Search failed (<code>). Try again or add it by hand". Every message keeps the hand-entry link. Offline shows "Search needs a connection. Add it by hand" with the hand-entry link.
- Background enrichment: browse the album's releases with streaming links and track lists (`release?release-group=<id>&inc=url-rels+recordings`, 25 per page, at most 4 pages through the shared queue; links found on any page are kept, so very large albums may get partial links). Order releases: official first, then earliest date (year-only dates count as 1 January, releases without a date go last, ties go to the release returned first). Length and track count come from the first release in that order whose every track has a length (the owner's D7.1 rule: earliest official edition with full track lengths); the summed milliseconds are rounded to the nearest minute. If no release has complete lengths, length is unknown and track count comes from the first release in the order. When several releases carry a Spotify (or Apple) link, keep the one on the chosen release, else the first found. If enrichment fails, the album keeps its search data, length unknown and no links, with `enrichment: failed`; failed and pending albums are retried at startup and when the device comes back online: at most 50 albums per session, oldest first, at least 1 hour between attempts for the same album, at most 3 attempts per album.
- Missing cover shows a plain tile with the title.

### Storage rules

- One record per album: identity is the MusicBrainz release-group ID, or normalized artist + title for hand-entered albums. Normalization: lowercase, strip accents, replace "&" with "and", drop "feat." credits, drop a leading "the ", remove punctuation, collapse spaces. Recommender names use the same normalization for filtering. Every save (search or hand entry) and every imported album is also compared by normalized artist + title against all records, in both directions, so the same album is never stored twice. A match shows "Already in your list" with a link to the existing album, whichever tab it is on; a double tap cannot save twice. The filter shows the first-entered spelling of each recommender name.
- On the first save, ask the browser to keep data permanently (`navigator.storage.persist()`). On iPhone Safari when not installed, show a one-time card: "Add Backlog to your Home Screen so your list stays saved" (Safari deletes data from sites unused for 7 days unless installed). After every 10 albums added, a dismissible card on the Queue suggests exporting and shows "Last saved to a file: <date or never>"; Settings shows the same date; the counter resets on export or dismissal.
- At startup, check that storage works; if not (some private modes), show a banner that the list will not be saved in this browser. A write that fails because the device is full keeps what the user typed and says why.
- Database schema versions only add fields or indexes. Dates are stored as ISO 8601 strings.

### Pick for me rules

- With a time limit, albums with unknown length are left out (they count once a length is typed). If nothing fits, say so and offer the shortest album; if no album has a known length, say "No albums have a known length" and offer a pick without a limit. Never repeat the previous pick when two or more albums qualify; the previous pick is remembered across sessions. The random function is passed in so tests can seed it.

### Export and import rules

- Export writes `backlog-YYYY-MM-DD.json` with a format version that is separate from the database schema version; the README documents the format and links its schema. In the installed iPhone app (detected by `navigator.standalone` or `display-mode: standalone` on iOS), where downloads are unreliable, export uses the share sheet when `navigator.canShare({files})` is true. Otherwise it offers the download plus "Copy as text", records "Last export started <date>" (not "saved"), and resets the reminder counter only after the user confirms "I saved it".
- Import accepts only the Backlog format and known versions; files up to 20 MB (enough for 10,000 albums at the field limits); at most 10,000 albums; title and artist up to 300 characters, recommender up to 100, recommender note and listening note up to 500; `coverUrl`, `spotifyUrl`, `appleMusicUrl` must be https, and `coverUrl` must be on coverartarchive.org or archive.org. An invalid file is rejected whole; the message names up to 5 problems with album number, title, field, value and fix (for example "Album 412 (In Rainbows): year 1850 is outside 1900-2027. Fix the file or remove that album.") plus a count, and a stable code (`IMPORT_NOT_JSON`, `IMPORT_NOT_BACKLOG`, `IMPORT_BAD_VERSION`, `IMPORT_TOO_LARGE`, `IMPORT_BAD_FIELD`) linked to the README's import-errors section. A file from a newer format version says "Made by a newer Backlog. Reload to update, then import." The merge runs in one database transaction, so a failure imports nothing ("Nothing was imported: <reason>"); cover caching and enrichment start only after it commits. Valid files merge by identity (including the artist + title comparison), keeping the user fields with the newer `updatedAt` (local copy wins a tie) and taking enrichment fields from the copy whose `enrichment` is done, else the newer `enrichedAt`. Every field is checked: `musicBrainzId` a UUID or null, `status` and `rating` from their allowed values, `year` 1900 to next year, `lengthMinutes` 1 to 600, `trackCount` 1 to 500, dates ISO 8601; an imported `sample` flag is ignored. Albums deleted locally come back if they are in the imported file (no tombstones). An imported music-app setting applies only if none is set locally.
- Samples are excluded from export, from the reminder count and from import matching unless the imported album is real (then it replaces the sample).

### Offline and updates

- When an album is saved, its cover is fetched with CORS (Cover Art Archive and archive.org send `access-control-allow-origin: *` on every redirect, verified) and written to a saved-covers cache through the Cache API; the service worker serves covers from that cache first. Imported albums' covers are cached the same way, newest first, behind searches. The cache keeps the 2,000 most recently added albums' covers (about 40 MB); older ones are evicted and fall back to the network. Search thumbnails are not cached by the service worker (browser HTTP cache only). New versions show "New version ready, reload"; the version number appears in Settings. Hash-based routing so album pages survive a refresh on GitHub Pages.

## What it stores

| Field | Example | Source |
|---|---|---|
| id | a7f3c2 | app |
| identityKey | MBID or `radiohead|in rainbows` | app |
| title | In Rainbows | MusicBrainz or user |
| artist | Radiohead | MusicBrainz or user |
| year | 2007 | MusicBrainz or user |
| trackCount | 10 | MusicBrainz |
| lengthMinutes | 42 or null | MusicBrainz |
| coverUrl | 250 px image link | Cover Art Archive |
| musicBrainzId | 6e335887-... or null | MusicBrainz |
| spotifyUrl, appleMusicUrl | link or null | MusicBrainz |
| recommendedBy, note | Priya, "start with track 3" | user |
| addedOn, updatedAt, listenedOn | dates (updatedAt starts equal to addedOn and changes on every user action: rating, notes, Mark as listened, Move back) | app |
| status | queued or listened | app |
| rating | loved, liked, not-for-me | user |
| review | one line | user |
| sample | true for samples | app |

Additional album fields: `enrichment` (pending, done, failed), `enrichedAt`, `enrichAttempts`. `note` is the recommender note; `review` is the listening note.

Settings record (not exported unless noted): chosen music app (exported), samples seeded flag, install card dismissed, persist() already requested, albums added since last export (reminder counter), previous pick id.

Sort order: date added newest first; length shortest first; year newest first; unknown length or year last. The Listened tab sorts by listenedOn, newest first. The recommender filter includes "No recommender".

Open search URL templates (`q` = URL-encoded "artist album"): Spotify `https://open.spotify.com/search/{q}`; Apple Music `https://music.apple.com/search?term={q}`; YouTube Music `https://music.youtube.com/search?q={q}`; Tidal `https://listen.tidal.com/search?q={q}`; Deezer `https://www.deezer.com/search/{q}`; Bandcamp `https://bandcamp.com/search?q={q}&item_type=a`.

## Tools

TypeScript; React with Vite; plain CSS variables; Dexie; MusicBrainz; Cover Art Archive; vite-plugin-pwa; Vitest and Playwright; ESLint and Prettier; GitHub Actions; GitHub Pages; MIT licence. No server, no secrets.

## Build plan

### Week 1: Foundation
- Origin choice as part of the web address decision: a custom domain or a dedicated GitHub Pages root, so no other project shares the storage origin; set Vite `base` and the service-worker scope to match
- `.nvmrc` and `engines`; setup is three commands (clone, `npm ci`, `npm run dev`) with Playwright browsers installed by `npm run test:e2e`; `npm run dev:offline` serves recorded MusicBrainz replies; `npm run fixtures:record` re-records them at 1 request per second from a checked-in query list
- Create TODOS.md from the After v1 list
- Decide the name and final web address before the first deploy
- Create the repository with licence and first README
- Set up Vite, React, TypeScript, ESLint, Prettier, one passing test
- GitHub Actions: tests on every change, publish to GitHub Pages
- Colour, spacing and type tokens for both themes; three-screen shell with hash routing

### Week 2: Add and store
- Answer: do singles count? (sets the search filter)
- MusicBrainz module (queue, debounce, cancel, stale-drop, timeout, retry, cache)
- Cover fetch with fallback tile; album card; search results under the box
- Database, album record, identity rule; hand-entry form
- Recorded MusicBrainz replies for tests (release browse with `inc=url-rels` already verified live to return links)
- Spike: confirm a 2,000-entry Cache API store survives on iPhone Safari, installed and in the browser; if not, lower the cap
- Search-quality check: 30 real queries (popular, obscure, typo, artist-only) against live MusicBrainz; record how often the target is in the top five and settle the type filters
- Open check: try all six search URL templates on an iPhone and an Android phone with each app installed; services whose search link opens a browser instead of the app get the label "Opens search in your browser"

### Week 3: Queue and pick
- Queue grid for phone and laptop; sort and filter
- Pick for me with time limit and its rules; reveal animation
- Album screen; Open with exact link or search fallback; keyboard shortcuts
- Paste-a-link parsing (Apple Music, Bandcamp, Spotify title via oEmbed) and the `#/?q=` route

### Week 4: Listen and log
- Mark as listened, rating, note; Listened tab; move back to queue; edit and delete with Undo
- 12 bundled sample albums and their lifecycle
- Settings: music app
- Full click-through test of the five-step loop; empty states
- Scope checkpoint on the last day of Week 3: if behind, cut in this order (hours saved, estimated): enrichment retry scheduler reduced to retry-on-startup (2 h), Web Locks reduced to a documented single-tab assumption (1 h), field-level import merge reduced to newer-updatedAt-wins-the-record with enrichment taken from either copy (2 h), reveal animation (1 h), preset chips (1 h), animated demo replaced by screenshots (1 h); if still behind, add a buffer Week 7 rather than cutting decisions the owner made
- v0.9 shippable line at the end of Week 4: add, queue, pick, open, mark listened, plain JSON export and import, offline app shell

### Week 5: Storage and offline
- Export and import with validation and merge; share-sheet export on iPhone
- Persistent storage request, iPhone install card, storage checks, export reminder
- Install and offline, cover caches; Android share target in the manifest
- Every error state (storage, quota, import, export, lookup)
- Test on an iPhone (installed and in Safari) and an Android phone

### Week 6: Polish and launch
- Update prompt and version in Settings
- Lighthouse audit (95 accessibility, 90 speed) and fixes; keyboard-only and screen reader passes
- Final README with positioning, export format and MusicBrainz pacing note; animated demo
- CONTRIBUTING, issue templates, five good first issues; README iPhone Shortcut recipe
- Tag v1.0.0; launch checklist

## Testing

Logic tests (Vitest) and full click-throughs (Playwright) run on every change against recorded MusicBrainz replies, never the live service. Required tests: search ordering (old reply resolves last), 503 then 200, timeout with fake timers, storage open failure and quota failure, install card condition, identity and duplicate cases, release selection with full and partial lengths, pick rules including 1,000 seeded runs, import validation (javascript: link, wrong version, oversize, overlap merge), export/import round trip, update prompt, offline run with covers, five-step loop, Open with and without a stored Spotify link (exact link vs search fallback), samples (seeded once, excluded from export and reminder, Clear removes only sample records, adding a sample album converts it), edit and delete with Undo, save-then-enrich (album appears before enrichment finishes; paged release-group recorded reply), shortcuts ignored while typing, inclusive limit boundary (an album of exactly 45 minutes qualifies for 45), invalid typed limits, all-unknown-length pick, export reminder at 10 albums, ask-on-first-Open, confirmation row persists until the next action, persist() requested once, unknown values sort last, recommender normalization and No recommender filter, Move back clears listenedOn, saved cover written to cache on save, double tap saves once, cross-identity duplicate (hand entry then search), enrichment retry and no revival after delete, enrichment does not change updatedAt, imported setting does not overwrite a local one, merge status conflict (listened beats older queued; tie keeps local), reverse duplicate (MusicBrainz first, then hand entry), imported albums get pending enrichment and cached covers, import field rules (bad UUID, bad rating, out-of-range year), Lucene escaping ("AC/DC", "Sunn O)))"), searches ahead of enrichment and stale searches dropped, 2,000-cover eviction, retry caps (3 attempts, 50 per session, 1 hour spacing), a second tab's search completes while an idle tab is open, Undo toast pauses on focus and lasts 8 seconds, delete then Undo restores unchanged, Clear samples confirmation, export filename and format version, hand-entry link on zero results, timeout, busy and offline, offline message wording, Listened sort, length rounding at the boundary, export reminder card reset, link parsing (Apple, Bandcamp, Spotify, unknown host, hostile host), `#/?q=` prefill runs a search, share target opens with the shared text. Before release: Lighthouse, iPhone Safari, installed iPhone, Android Chrome, keyboard only, screen reader, offline, and a stopwatch check that three people add a first album in under 10 seconds.

Version 1.0 bar: all features work on phone and laptop; first album added in under 10 seconds; app opens with the queue and covers (2,000 most recently added albums) offline; hand entry works offline; an exported file loads back with nothing lost (samples excluded by design); a failed lookup shows a message and the hand-entry option; no console errors during the full click-through.

## Launch

README (pitch, demo GIF, live link, three-command setup, privacy note, roadmap), LICENSE, CONTRIBUTING, CHANGELOG, issue templates, five good first issues, repository topics and preview image. After this review pipeline the spec is frozen: new edge cases go to TODOS.md unless they cause data loss. Release v1.0.0 only after the dogfooding gate, pin on profile, write-up; post on the MusicBrainz forum first (README states pacing and caching) and get an informal OK, then Show HN and r/opensource; answer every first-week issue.

## Risks and open questions

- Reading pasted links is deferred because Odesli closed its keyless API, Spotify's preview lacks the artist, and MusicBrainz URL lookup does not resolve Spotify or Apple album links.
- Open will often fall back to search: for In Rainbows only 2 of 20 releases carry a Spotify link.
- Name: "Backlog" clashes with an existing product; decide in Week 1.
- Ratings: three words is the default and is built; the owner can switch to stars before Week 4.
- Time budget: Weeks 4 and 5 are the heaviest; the Week 3 checkpoint decides between cuts and a buffer Week 7.
- Do singles count? Default: albums and EPs only (`primarytype:album OR primarytype:ep`); the owner can change it before Week 2.
- Approved at the final gate (d1): `#/?q=<text>` prefill (Week 3), iPhone Shortcut recipe (Week 6), Android share target (Week 5).
- Is six to eight hours a week realistic?
- MusicBrainz client identity: browsers cannot send a User-Agent. If MusicBrainz objects, the fallback is a tiny proxy that adds one, which would end the "no server" claim.
- Sync without accounts (After v1 options, not v1): a backup file saved through the share sheet to iCloud Drive or Dropbox; automatic saving with the File System Access API on desktop Chromium; remoteStorage. Trigger: the owner or users report keeping two lists.
- Approved at the final gate (uc1): link pasting in a cheap form, reversing the earlier deferral. Apple Music and Bandcamp links contain the album name in the address, so it can be turned into a search with no network call; Spotify's link preview (oEmbed) answers browsers (verified: `access-control-allow-origin: *`) with the album title.

## After v1

CSV export, a browser button to save from any page, stats, Last.fm auto-mark, translations. Also deferred: the manual light/dark switch. Small deferred ideas from review: copy queue as text, recommender autocomplete, `L` shortcut to mark listened, age shown on cards, pick from one recommender, a "copy my verdict" message to send back to whoever recommended the album.

## Decision trace (from the interactive CEO review)

| ID | Where in this plan | Test |
|---|---|---|
| CUT-LINK, CUT-CSV, CUT-THEME (deferred) | What v1 does, Not in v1; After v1 | n/a |
| CUT-LOG | Screens (Listened tab) | five-step loop |
| MERGE-ADD | Screens (search box on Queue) | five-step loop, stopwatch |
| FIX-STORAGE | Storage rules | install card condition, iPhone check |
| STORAGE-ERRORS | Storage rules | storage open and quota failure |
| OPEN-TARGET | Open in my app, Lookup rules | Open with and without Spotify link |
| OFFLINE-COVERS | Offline and updates | offline run with covers |
| SEARCH-CLIENT | Lookup rules | ordering, 503 then 200, timeout |
| ONE-PER-ALBUM (+ updatedAt, hand-entry identity) | Storage rules, What it stores | identity and duplicate cases |
| PICK-EDGES | Pick for me rules | pick rules, 1,000 seeded runs |
| IMPORT-VALIDATE | Export and import rules | import validation cases |
| SW-UPDATE | Offline and updates | update prompt |
| POSITIONING | Why it exists; Week 6 README | README check |
| LENGTH-RULE | Lookup rules | release selection full/partial, paged reply |
| NAME-FIRST | Week 1 | live URL matches chosen address |
| IOS-EXPORT | Export and import rules | installed iPhone test, Week 5 |
| SAMPLES | Samples row; Week 4 | samples tests |
| CORR-HASH-ROUTING (correction from the outside voice, not one of the 19) | Offline and updates | refresh on album page |

<!-- autoplan-accepted:ceo -->
- All 19 decisions from the interactive CEO review stand as written in the Implementation plan (Decision trace table), each with the tests listed under Testing; CORR-HASH-ROUTING is a separate correction.
- No new capability accepted in the autoplan CEO phase; E1-E5 deferred (After v1); E6 pending the final gate with its conditional spec.
- Completeness fixes to approved behavior (traced): save then enrich in the background with state, bounded retry and no revival after delete; imported albums get pending enrichment and cached covers (LENGTH-RULE, PICK-EDGES, OFFLINE-COVERS); paged release browse, earliest-official rules, length rounding, link choice, release-group year (LENGTH-RULE); exact query string with escaping, search priority, one-tab request lock (SEARCH-CLIENT); hand-entry link always available with offline wording, field bounds, typed length on unknown-length albums (PICK-EDGES, 1.0 bar); service list, URL templates, ask-on-first-Open (OPEN-TARGET); Settings state fields (FIX-STORAGE, PICK-EDGES, SAMPLES); sample lifecycle and runtime covers (SAMPLES); rating optional, Move back keeps rating and listening note (CUT-LOG); inclusive whole-number limit, all-unknown case, previous pick persisted (PICK-EDGES); normalization, two-way artist+title duplicate check, "Already in your list" (ONE-PER-ALBUM); updatedAt starts at addedOn and changes on every user action, local wins ties, enrichment fields merged by state, full per-field import rules, sample flag ignored, deletes may return on import, imported setting never overwrites a local one (IMPORT-VALIDATE, ONE-PER-ALBUM); explicit saved-cover cache via Cache API with CORS and 2,000 eviction (OFFLINE-COVERS); share-sheet detection (IOS-EXPORT); self-hosted Inter (OFFLINE-COVERS). Each has a test under Testing.
- Hygiene, no decision needed: shortcuts ignored while typing, ISO dates, export filename and format version, sort directions, Listened sort, No recommender filter, timer pause and Undo announcement, Clear samples confirmation, export reminder card, TODOS.md in Week 1, week moves, Week 2 cache spike, Week 3 checkpoint with cut order.
- Delete: completeness (a wrong save must be removable); soft-delete for 5 seconds then removal. Editing of recommender fields, rating and notes: completeness (already promised). Hand-entry title/artist/year editing dropped; the replace-hand-entry merge flow dropped.
- TASTE (auto-approved, surfaced at gate): Undo toast instead of a confirmation dialog; time-limit preset chips; buffer Week 7 instead of cutting approved behavior if the Week 3 checkpoint shows slippage.
- Native CEO voice findings accepted: honest "runs on any device" wording and a one-list-per-device premise (F3); success definition with a dogfooding gate of 30+ albums for 2 weeks before Show HN (F9, F13); README leads with the recommendation story (F2, copy only); last-export date on the reminder card and in Settings (F4); Week 2 search-quality check of 30 queries and default exclusion of live, compilation and demo secondary types (F5); Week 2 Open check of all six URL templates on two phones with honest labels (F6); cut list re-ranked by hours plus a v0.9 shippable line at the end of Week 4 (F7); spec freeze after this pipeline (F8); MusicBrainz forum before Show HN and a named proxy fallback (F14); sync-without-accounts analysis in Risks (F12).
- Queued for the final gate, not applied: user challenge UC1, link pasting in cheap form (F11); E6 URL prefill plus iOS Shortcut, with Android share target once link pasting exists (F1); copy-my-verdict and pick-from-one-recommender (F2) deferred.
<!-- /autoplan-accepted:ceo -->

<!-- autoplan-accepted:design -->
- Screen specs. Queue (phone): search box, then the results panel (inline, pushes the grid down; Escape or clearing closes it), then To listen / Listened tabs with sort and filter, one banner slot, the cover grid (`repeat(auto-fill, minmax(160px, 1fr))`, max 1200 px), and a sticky bottom bar holding "Pick for me" in the accent colour. Laptop: same order, Pick for me sits at the right of the tabs row. Search autofocuses on laptop only; `/` focuses it everywhere.
- Card anatomy: cover; title (one line, truncated); artist; meta "2007 · 42 min" (no length shown when unknown); "from <name>" in muted text when set; a "Sample" badge on sample records. Listened tab replaces the meta line with the rating word. Fallback tile: background from a hash of identityKey over 8 muted tones that pass AA in both themes, with title and artist.
- Search results: after the debounce, 5 skeleton rows with "Searching MusicBrainz…"; title-initial placeholders until thumbnails load; results already in the list are marked "In your list (To listen|Listened)" and open that album instead of saving; "Add it by hand" stays visible in every state and opens the hand-entry form inline in the same panel with the title prefilled from the query.
- After saving: the results panel collapses to a confirmation row (cover, "Saved to To listen", "Who recommended it?" field) that stays until the next action (new search, navigation, Escape); Enter saves the name, then the search box clears and refocuses. Saving from the Listened tab switches to To listen. (Replaces the 10-second timer, its test and its cut-list entry.)
- Pick for me: a bottom sheet on phone / popover on laptop with chips Any, 30, 45, 60, 90, Custom and a Go button; `R` opens it with Any selected and Enter picks. The sheet turns into a result card: large cover, title, artist, length, "from <name>", with Open (accent), Pick again (respects no-repeat) and View album. Nothing-fits and no-known-length outcomes appear in the same card with their fallback as the button ("Pick the shortest (52 min)", "Pick without a limit"). Empty queue: the button stays enabled and the sheet says "Add an album first".
- Album screen: 500 px cover from the network (falls back to the cached 250 px offline); title, artist, year · length; "from <name>" and recommender note; for To listen albums Open is the accent button and Mark as listened secondary; for Listened albums Open stays accent and Move back to queue is a text button. Mark as listened marks at once and reveals an inline rating row (loved, liked, not for me; tap again to deselect) and an optional listening note. Fields autosave on blur (no Edit mode); Delete is a text button at the bottom and returns to the tab the user came from. Pending enrichment shows "— min"; unknown length shows "Length unknown · Add length" as an inline number field.
- Open always uses `target="_blank"` with `rel="noopener"`. The first Open with no app chosen shows a dialog of six radio rows (services flagged by the Week 2 Open check carry "Opens search in your browser"); the same choice lives in Settings.
- Layering rule: banners (persistent, top of the Queue, at most one, by priority: storage failure, update ready, install card, export reminder, sample-clear prompt); toasts (bottom, at most one; a new toast replaces the old except an Undo toast always replaces a save confirmation and is never replaced; announced through an aria-live region). Undo toast lasts 8 seconds and Ctrl/Cmd+Z also undoes.
- States and copy: empty To listen "Nothing queued. Search above to add an album."; empty Listened "Albums you mark as listened land here."; empty filter "No albums from <name>" with Clear filter; offline search "Search needs a connection. Add it by hand"; import pre-confirmation "This file has N albums: X new, Y already here, Z you deleted. Import?" then a toast "Imported X albums"; cancelling the share sheet changes nothing and does not reset the reminder.
- Samples: after the first real album is saved, a one-time banner "Your first album is saved. Clear the 12 samples?" with Clear and Keep (same confirmation as Settings).
- Recommender filter: a select with All, No recommender, then names A to Z; a search field appears once there are 10 or more names.
- Navigation: tab, sort and filter live in the hash; Back from an album restores scroll to that album; sort and filter persist in the Settings record.
- Tokens: Inter 14/16/24 px; spacing 4/8/16/24/32; length format "42 min" and "1 h 12 min"; accent hue chosen in Week 1 with AA contrast verified on both backgrounds (TASTE); selection colour, caret and focus ring themed from the palette.
- Tests: one Playwright assertion each for banner/toast priority, confirmation row persistence and Enter-to-save, pick result card actions and fallbacks, "In your list" marking, import pre-confirmation counts, back-navigation restore, Undo 8 seconds and keyboard undo, first-Open dialog.
- Supersedes earlier plan text: the Undo toast lasts 8 seconds (not 5; the soft-delete window matches); the "Who recommended it?" field has no 10-second timer (How someone uses it, step 2); the cut-list entry "inline recommender timer" and the tests "inline recommender field timer" and "Undo timer pause" are replaced by "confirmation row persists until the next action" and "Undo toast pauses on focus and lasts 8 seconds".
<!-- /autoplan-accepted:design -->

<!-- autoplan-accepted:dx -->
- Plan text corrected inline (recorded baseline edits): Undo 8 seconds with second-delete, 60-second pause cap, startup purge and duplicate checks ignoring deleted records; recommender confirmation row with no timer; stale timer tests and cut-list entry removed; success definition separates the 2-week pre-launch dogfooding gate from 4 weeks of post-launch use; Delete returns to the originating tab.
- Request lock: per-request Web Lock plus shared last-request time; the 10-second timeout covers the lock wait. Test: two tabs, idle tab A, search in tab B completes.
- Search failure copy: timeout "No reply from MusicBrainz after 10 s. Try again or add it by hand"; 503 honours Retry-After up to 5 s, retry bound 1, final "MusicBrainz is busy. Try again in a minute, or add it by hand"; every other failure "Search failed (<code>). Try again or add it by hand". Tests for each.
- Storage blocked banner: "This browser is blocking storage (private mode?). Open Backlog in a normal window, or export before closing." The session keeps working in memory and the banner's action is Export.
- Quota: on QuotaExceededError evict the oldest 25% of saved covers and retry the write once; only then "Device storage is full. Free space or export your list" with Export. Cover-cache write failures evict and continue, never block a save. Test with an injected quota error.
- Import: limit 20 MB; errors list up to 5 problems with album number, title, field, value and fix plus a count; stable codes IMPORT_NOT_JSON, IMPORT_NOT_BACKLOG, IMPORT_BAD_VERSION, IMPORT_TOO_LARGE, IMPORT_BAD_FIELD with a README anchor; newer-format files ask to reload; the merge is one transaction (nothing imported on failure); covers and enrichment start after commit. Minimal importable record is title + artist; `id` and identity key are always recomputed; unknown fields are ignored. Tests: max-size own export imports; failure on record N imports nothing; each code.
- iOS export without share: offers download and "Copy as text", records "Last export started <date>", resets the reminder only after "I saved it". Test that the counter is not reset silently.
- Enrichment diagnostics: `enrichError {code, httpStatus, at}` stored locally, not exported. Partial release browse writes the links found and sets `failed` for retry. Settings "Copy diagnostics" copies app version, schema and format versions, browser, storage estimate, persisted status, enrichment counts by state and the last 20 error codes with times, never titles, names or notes; the bug template asks for it.
- Export format v1 (frozen before launch): `{"format":"backlog","formatVersion":1,"albums":[...],"settings":{...}}`; fields renamed for the public format: `recommenderNote`, `listeningNote`, `addedAt`, `listenedAt`, `updatedAt`, `enrichedAt`; identity keys prefixed `mb:` or `hand:`; `schema/backlog-v1.json` and an example file ship in the repo.
- Hash routes are stable public URLs: `#/`, `#/listened`, `#/album/<id>`, parameters `sort`, `from`, `q` (q reserved for E6).
- Error catalogue in the README and code: one table with code, trigger, user copy, action, retry bound, side effects, announcement (role=alert for blocking errors, polite for toasts) and test.
- Field validation copy inline with aria-describedby, e.g. "Year must be 1900-2027", "Length must be 1-600 minutes", "Enter a whole number of minutes".
- A failed dynamic import after a deploy shows the "New version ready, reload" banner instead of a blank screen.
- Escape hatches accepted: `VITE_MB_BASE_URL` (default musicbrainz.org; enables the proxy fallback and mirrors); Settings "Erase all data" with confirmation. Shortcut list in Settings.
- Contributor setup: `.nvmrc` and `engines`; three-command README setup; `npm run dev:offline` with recorded replies; `npm run fixtures:record` paced at 1 request per second from a checked-in query list; CONTRIBUTING covers the module map (Lookup, Screens, Storage; only the MusicBrainz module calls the network), test tiers, fixtures, MusicBrainz courtesy rules and how to add a music service. Five good first issues: `L` shortcut, age on cards, copy queue as text, shortcut help overlay, custom service URL template.
- TASTE (surfaced at gate): origin choice, a custom domain or a dedicated GitHub Pages root instead of `<user>.github.io/<repo>`, which shares storage with the owner's other project pages.
<!-- /autoplan-accepted:dx -->

<!-- autoplan-accepted:eng -->
- Plan text restored to the owner's D7.1 rule (recorded baseline edit): browse releases with inc=url-rels+recordings (25 per page, at most 4 pages); length and track count come from the first release, official first then earliest date, whose every track has a length; otherwise length is unknown.
- Architecture: modules screens/, domain/ (pure rules), db/, mb/, jobs/ (enrichment scheduler, cover cache, purge); lock and clock injected for tests; Dexie liveQuery so other tabs see writes.
- One schema (zod or valibot) validates every DB write, enrichment write and import; schema/backlog-v1.json is generated from it. Out-of-range MusicBrainz values are stored as null. Test: enrich year 1899, 700 minutes and 600 tracks from fixtures, export, import.
- Import size limit measured in UTF-8 bytes: 64 MB; control characters are stripped at input. Test with CJK and newline-heavy maximum data.
- Normalization: NFKD, remove marks, NFC, keep letters, numbers and spaces (Unicode classes); an empty result falls back to the lowercased raw text. Tests: Cyrillic, Japanese, Korean, emoji-only.
- Identity: when both records have an MBID, the MBID decides; the artist + title comparison applies only when at least one side is a hand entry, through a non-unique normKey index. Test: two MBIDs with the same artist and title both save.
- Delete and identity: a new save or import of a matching identity first commits any pending delete; the startup purge removes only records whose deletedAt is older than 90 seconds. Tests for both orders and for a purge racing another tab.
- Import pre-confirmation shows "X new, Y already here" (no "you deleted" count, since there are no tombstones); counts are recomputed inside the import transaction. All parsing and validation happen before the single read-write transaction.
- iOS export: the export blob is prebuilt when Settings opens and rebuilt on database change, so navigator.share runs synchronously in the tap handler; Copy uses ClipboardItem with a Promise. Manual test on an installed iPhone with 2,000 albums.
- Enrichment writes only its own fields with update() inside a read-write transaction that checks the record exists and is not deleted. Test: edit during in-flight enrichment, and both survive.
- Request pacing: the lock is held only to claim a slot (nextSlotAt plus 1 s); the fetch runs outside it; a 503 pushes nextSlotAt for all tabs; without Web Locks (older Safari) an in-tab queue is used.
- One enrichment scheduler across tabs (Web Lock with ifAvailable); lastAttemptAt is recorded before each attempt; samples are seeded inside one transaction over settings and albums.
- Schema upgrades: on versionchange, close the database and show "New version ready, reload"; VersionError is handled the same way. Test with two tabs.
- Dates are normalized to UTC ISO on import and compared as parsed times; the README notes that merges depend on device clocks.
- Link hosts allowlisted for import and enrichment: Spotify open.spotify.com; Apple music.apple.com, geo.music.apple.com, itunes.apple.com; covers coverartarchive.org or archive.org exactly or as a .archive.org suffix. Links use rel="noopener noreferrer". A CSP meta tag limits connect-src and img-src to MusicBrainz (or VITE_MB_BASE_URL), Cover Art Archive and archive.org. Merges copy known fields only.
- Cover cache: mode cors, never cache opaque responses; cache a Cover Art Archive 404 as "no cover"; eviction order tracked in IndexedDB.
- Duplicates inside one import file merge by the same field rules before the local merge.
- Lucene: bare AND/OR/NOT words are lowercased; whitespace-only queries are not sent. Test "Love AND Theft".
- Shortcuts: Ctrl/Cmd+Z falls through to native undo inside inputs; when the hash carries sort or filter, it wins over the Settings record.
- ids via crypto.randomUUID(); the search cache is an LRU of 100; an abort removes queued requests too; the export filename uses the local date; persist() is requested after the confirmation row, not during the first save.
- Pick test assertions: no limit exceeded, no immediate repeat, every qualifying album appears, rough uniformity over 1,000 seeded runs.
- Offline and service-worker E2E run against vite preview; a weekly non-blocking CI smoke runs one live search and one release lookup.
- The README notes that large imports enrich gradually (50 albums per session).
<!-- /autoplan-accepted:eng -->
