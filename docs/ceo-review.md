# CEO Review working file: Backlog project plan

Plan under review: Claude Doc "Backlog project plan", https://claude.ai/artifact/SreAZ2eYgBwvKSRvZ3mqRP (rev 14, 2026-11-17).
No code repository exists yet (greenfield). This file holds the review ledger, findings and report. Accepted changes get applied to the doc.

## Step 0

### 0A. Premise challenge

The user's real goals (from the conversation): (1) a first public repo that makes their GitHub look intentional, (2) small enough to finish, (3) actually helps people, around music listening and organizing.

The plan's stated problem: people lose album recommendations, and streaming-app saves mix "want to try" with "already love" and are locked to one service.

Verdict: the plan solves the stated pain directly at the queue, pick and log stages. It is weakest at the capture stage, which is where the pain actually happens. A recommendation arrives on a phone, inside another app (a text, TikTok, Instagram, a review). The plan's capture path is: open a browser tab, go to Backlog, paste or type. Competing native apps put themselves in the phone's share menu and in Shazam. If capture takes more than a few seconds, people keep using screenshots and the Notes app, and the rest of the product never gets used.

Do-nothing cost: low for users (Notes app, screenshots, Spotify saves already "work" badly). For the user's portfolio goal, the cost of doing nothing is no public repo at all.

### Landscape check (Layer 1, 2, 3)

- Layer 1 (tried and true): album trackers keyed on MusicBrainz with Cover Art Archive images; a "want to listen" list plus a diary/log. Every serious tool in the space does this.
- Layer 2 (what exists today):
  - Side B: iOS app, no account, no social feed, Apple Music import, Shazam integration, widgets. Launched on Product Hunt. https://www.producthunt.com/products/side-b
  - Listen Later: iOS, Apple Music-based to-listen list with a rolling "On Rotation" queue. https://apps.apple.com/app/id1510971905
  - Record Station: iPhone to-listen list with reminders and a listening log. https://apps.apple.com/hk/app/record-station/id6477348233?l=en-GB
  - Raygum Listen List: web feature, add from a release page, remove when listened. https://raygum.com/help/listen-list/what-is-the-listen-list
  - Record Club, Musicboard, Rate Your Music, Factory.fm: "Letterboxd for music" social rating sites, accounts required.
  - albumz (lukethacoder/albumz): open-source, self-hosted album tracker, MusicBrainz + Cover Art Archive, add by Spotify/Apple/YouTube URL, multi-user. Needs Docker and PostgreSQL. 1 star, created 2026-03-11, last push 2026-07-09 [measured: GitHub API, 2026-11-17]. https://github.com/lukethacoder/albumz
- Layer 3 (first principles): every existing option is either a native iOS app (closed, one platform), an account-based social site, or a self-hosted server. Nobody ships a zero-install, open-source, works-on-any-device to-listen list where the data is a plain file you own. That is Backlog's real differentiation, and the plan never says it. The plan pitches "a to-listen list for albums", which Side B already is.
- EUREKA: the product is won or lost at capture, not at the queue. The plan spends 9 of 10 features after capture.

### 0B. Existing code leverage

No repo. Reuse is at the service and library level: MusicBrainz search, Cover Art Archive, Spotify oEmbed, iTunes lookup, Dexie, vite-plugin-pwa. albumz is MIT-style open source TypeScript and could be read for MusicBrainz matching logic (licence to be checked before copying any code).

Reality rows:

| Premise | Claim in plan | Receipt | Verdict |
|---|---|---|---|
| MusicBrainz works from a browser with no key | Tools table | live probe 2026-11-17: HTTP 200, `access-control-allow-origin: *` | verified |
| Cover Art Archive serves release-group fronts | Tools table | live probe: HTTP 307 to archive.org, CORS `*` | verified |
| Spotify link preview gives the album name | Risks table | live probe: oEmbed 200, CORS `*`, `title` + `thumbnail_url`, no artist | verified |
| Apple lookup gives album + artist | Risks table | live probe: iTunes lookup 200, CORS `*`, collectionName + artistName | verified |
| Odesli refuses keyless requests | Risks table | live probe: 401 `PUBLIC_API_ACCESS_DEPRECATED` | verified |
| MusicBrainz limit about 1 request/second | Risks table | https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting | verified |
| Album length from summed track lengths | Data table | live probe: release with `inc=recordings` gave 10 tracks, 42 min | verified |
| List survives in the browser long term | "What it stores" | Safari deletes script-writable storage for sites not used in 7 days unless added to the home screen (WebKit ITP, https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/) | contradicted for iPhone Safari users who don't install |
| Six weeks at six to eight hours a week | Build plan | none | unverified |
| New visitor adds first album in under 10 seconds | 1.0 bar | none | unverified |

unverified=2

REALITY: premise-table finding 1 contradicted (Safari 7-day storage), 2 unverified (timeline, 10-second add) doc:"What it stores"
REALITY: already-done pass greenfield, no repository exists to have prior work doc:"Build plan"
REALITY: surface-check pass every named outside service probed live 2026-11-17 doc:"Tools"
REALITY: binding-decisions pass gstack-decision-search returned no decisions; plan has no binding decisions section doc:"Tools"
REALITY: numbers finding "six weeks" and "under ten seconds" are [estimated] with no basis; albumz stats [measured: GitHub API] doc:"Build plan"
REALITY: deferred-asks pass no linked issue doc:"After v1"
REALITY: pr-count pass no ship-policy; solo greenfield, default one PR per milestone doc:"Build plan"

### 0C. Dream state

```
  CURRENT STATE                 THIS PLAN                         12-MONTH IDEAL
  Recommendations lost in  -->  Web app: paste/type, queue,  -->  The default open-source
  screenshots, Notes,           pick, log, export. Local          "save it for later" for albums:
  chats. No public repo.        only. Live on GitHub Pages.       one tap from any share menu,
                                                                  list is a portable file, a few
                                                                  hundred stars, outside
                                                                  contributors, cited by
                                                                  MusicBrainz community.
```

The plan moves toward the ideal on openness and portability. It does not move toward "one tap from any share menu", which is where the ideal is decided.

### 0D. Approach decisions

No required approach choice. Capture improvements are additions, handled in 0G.

## Decision ledger

| ID and owner | Contract and evidence | Current | Proposed | Status | Exact approval and scope |
|---|---|---|---|---|---|
| MODE (user) | 0E mode selection | SCOPE REDUCTION | none | approved | D2 answer "Scope reduction (Recommended)", 2026-11-17; governs review posture only |
| CUT-LINK (user) | Feature "Add by link", Week 5 tasks; risk table row 1 | Deferred: v1 adds by name only | none | deferred | D3.1 answer "Defer to TODOS (Recommended)"; delivery scope only |
| CUT-LOG (user) | Feature "Listening log", screen "Log", Week 4 task | Listened tab on Queue; rating/note edited on Album screen | none | approved | D3.2 answer "Listened tab (Recommended)" |
| CUT-CSV (user) | "What it stores": CSV export | JSON only; CSV deferred | none | deferred | D3.3 answer "Defer CSV (Recommended)"; becomes a good-first-issue |
| CUT-THEME (user) | Settings: light/dark toggle | Follow device only; toggle deferred | none | deferred | D3.4 answer "Follow device (Recommended)" |

| FIX-STORAGE (S1) | Safari 7-day storage deletion; WebKit ITP | Export reminder only | none | approved | D4.1 "Protect + install card (Recommended)": persist() on first save, one-time iPhone install card, keep export reminder, unit test + iPhone check |
| OPEN-TARGET (S1) | CUT-LINK removes stored links | Exact album via MusicBrainz url-rels, search page fallback | none | approved | D4.2 "Exact when known (Recommended)": inc=url-rels on existing release request, store spotifyUrl/appleMusicUrl, recorded-reply unit tests |
| OFFLINE-COVERS (S1) | 1.0 bar "shows the queue with no connection" | Service worker cache-first for cover images, 500 cap | none | approved | D4.3 "Cache covers (Recommended)": Playwright offline test asserts covers render |

| SEARCH-CLIENT (S2) | Section 2 GAPs 503/timeout/stale; Section 4 ordering | Cancel old, ignore stale, 10 s timeout, 1 retry on 503, visible messages | none | approved | D5.1 "Careful search client (Recommended)": ordering, 503-then-200 and timeout tests |
| STORAGE-ERRORS (S2) | Section 2 GAPs quota/unavailable | Startup check + banner; full-device message keeps typed input | none | approved | D5.2 "Detect and explain (Recommended)": failing-open and quota unit tests |
| ONE-PER-ALBUM (S4) | Section 4 double tap, re-add, import overlap | Unique by MusicBrainz ID; re-add message; import merge keeps newer rating/note | none | approved | D5.3 "One per album (Recommended)": double-tap, re-add, overlap tests |
| PICK-EDGES (S4) | Section 4 pick rows; 1.0 bar 40-minute check | Unknown length skipped in timed picks; nothing-fits message + shortest; no back-to-back repeat | none | approved | D5.4 "Define the edges (Recommended)": per-case tests + seeded 1,000-run check |

| IMPORT-VALIDATE (S3) | Section 3 hostile import threat | Backlog format + known versions, https only, field limits, 10,000 cap, specific rejection, no partial load | none | approved | D6.1 "Validate imports (Recommended)": javascript: URL, wrong version, oversize, valid-file tests |
| SW-UPDATE (S9) | Section 9 cached old versions | Prompt-mode updates, version in Settings, additive DB changes only | none | approved | D6.2 "Prompt + version (Recommended)": waiting-worker prompt unit test |
| POSITIONING (S10) | Landscape check: Side B, albumz | README opens with the edge + short comparison | none | approved | D6.3 "Add the pitch (Recommended)" |
| MERGE-ADD (S11) | Section 11 capture taps | Search box on Queue; screens Queue, Album, Settings | none | approved | D6.4 "Merge into Queue (Recommended)" |

| LENGTH-RULE (OV) | Outside #4, #10; live: 20 releases, 2 Spotify, 0 Apple | Earliest official release with full lengths; partial = unknown; links from all releases in one request | none | approved | D7.1 "Clear rule (Recommended)" |
| NAME-FIRST (OV) | Outside #5; IndexedDB per origin | Name + final URL decided in Week 1 before first deploy | none | approved | D7.2 "Decide in Week 1 (Recommended)" |
| IOS-EXPORT (OV) | Outside #9 | navigator.share({files}) fallback; installed-iPhone test in Week 5 | none | approved | D7.3 "Share-sheet fallback (Recommended)" |
| SAMPLES (OV) | Outside #12 | Include: 12 bundled samples, excluded from export and reminder count, Clear samples removes sample-flagged only | none | approved | D7.4 "Include (Recommended)" |
| CORR-UPDATEDAT (OV) | Outside #2 | add updatedAt | none | approved | implements D5.3 ONE-PER-ALBUM (directly required) |
| CORR-MANUAL-ID (OV) | Outside #3 | identity = MBID else normalized artist+title | none | approved | implements D5.3 ONE-PER-ALBUM "each album once" |
| CORR-HASH-ROUTING (OV) | Outside #11 | hash routing | none | approved | required for approved Album screen to be reachable on GitHub Pages |
| CUT-LINK reopen check (OV) | Outside #1; MB url lookup 404 for Spotify and Apple links (live) | stays deferred | none | deferred | D3.1 stands; new evidence confirms the deferral basis |

Mode provenance: actual question answer, D2, logged with question_id plan-ceo-review-mode, auto_decided false.

## 0G. Scope reduction analysis

Minimum scope that meets the goals (helps people, looks intentional, finishable): add by name, album card, queue with sort, Pick for me with time limit, Open in my app, mark listened with rating and note, export/import JSON, sample list, install to home screen and offline. Install is kept on purpose: it is also the fix for Safari's 7-day storage deletion (see 0B), so it protects the user's list, not only convenience.

Estimated planned files: about 35 (5 screens, 4 components, 3 lookup, 2 store, 2 logic, sample, tests, config, workflows, templates, docs) [estimated].

### currentDecision (CUT-LINK)
Commitment comparison:
Commitment | Source | Current | A Defer | B Keep
Read Spotify/Apple album links | Feature table row 2 | in v1 | TODOS | in v1
Name search with covers | Feature table row 1 | in v1 | in v1 | in v1
Pasted link stored for Open button | Data table sourceLink | in v1 | dropped with feature | in v1

Question: D3.1 — CUT-LINK: Defer reading pasted Spotify/Apple links to after v1?
A) Defer to TODOS.md (recommended) — v1 adds albums by typing a name; link reading moves to the first update. Effort S, risk low.
B) Keep in scope — paste a Spotify or Apple Music link and Backlog finds the album. Effort M, risk medium.

### currentDecision (CUT-LOG)
Commitment comparison:
Commitment | Source | Current | A Defer | B Keep
See finished albums with rating and note | Feature table row 9 | Log screen | Listened tab in Queue | Log screen
Edit rating/note later | Screens table | Log screen | Album screen | Log screen

Question: D3.2 — CUT-LOG: Replace the separate Log screen with a Listened tab on the Queue?
A) Defer the separate screen (recommended) — same feature, one fewer screen. Effort S, risk low.
B) Keep the Log screen. Effort S, risk low.

### currentDecision (CUT-CSV)
Question: D3.3 — CUT-CSV: Ship JSON export only and defer the spreadsheet (CSV) copy?
A) Defer CSV (recommended). B) Keep CSV.

### currentDecision (CUT-THEME)
Question: D3.4 — CUT-THEME: Follow the device's light/dark setting only, and defer the manual toggle?
A) Defer the toggle (recommended). B) Keep the toggle.

### 0G dispositions

- Keep: everything not listed below.
- Approved change: Log screen replaced by a Listened tab (CUT-LOG). Four screens: Queue (To listen / Listened tabs), Add, Album, Settings.

## TODOS (deferred)

- Add by pasted link (Spotify oEmbed for title + cover, iTunes lookup for album + artist, then MusicBrainz match; keep pasted link for Open). Deferred in D3.1: riskiest code, Odesli closed, typing a name is about as fast.
- CSV export. Deferred in D3.3: JSON covers backup/restore; label as good first issue.
- Manual light/dark toggle. Deferred in D3.4: device setting covers most people.

## NOT in scope

- Add by link: deferred (D3.1), see TODOS.
- CSV export: deferred (D3.3), see TODOS.
- Theme toggle: deferred (D3.4), see TODOS.
- Accounts, sync, sharing, in-app playback: excluded by the plan itself ("Left out of v1 on purpose").

## Review Sections

### Section 1: Architecture Review

```
  BROWSER (static site on GitHub Pages, installable PWA)
  +--------------------------------------------------------------------+
  |  screens/  Queue[To listen | Listened]  Add  Album  Settings         |
  |      |            |                 |                                |
  |      v            v                 v                                |
  |  logic/pick.ts  logic/sort.ts   lookup/musicbrainz.ts --+            |
  |      |            |             lookup/covers.ts -------+--> network |
  |      +-----+------+                    |                |            |
  |            v                           v                |            |
  |     store/database.ts (Dexie/IndexedDB)  <-- store/exportImport.ts   |
  |            ^                                       ^                 |
  |     service worker (vite-plugin-pwa): app shell cache | file in/out  |
  +--------------------------------------------------------------------+
        |  (search, release detail)          |  (cover images)
        v                                    v
   musicbrainz.org/ws/2  (~1 req/s/IP)   coverartarchive.org -> archive.org
        Open button --> open.spotify.com / music.apple.com (new tab / app)
```

Dependency direction is clean: screens -> logic/lookup/store; nothing below depends on screens. No new coupling concerns. Single points of failure: MusicBrainz (adding is impossible while it is down; queue still works), the browser's storage (the list itself).

Findings:

1. **CRITICAL GAP — the list can silently disappear on iPhone (FIX-STORAGE).** Safari deletes script-writable storage (IndexedDB) for a site the user hasn't interacted with in 7 days, unless it was added to the home screen (WebKit ITP, https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/). A to-listen list is opened occasionally, so a user who saves 3 albums and comes back 8 days later finds an empty app. The plan's mitigation (export reminder every 10 albums) never fires for that user. Nothing tells them; the loss is silent.
2. **WARNING — "Open in my app" loses its target after CUT-LINK (OPEN-TARGET).** With link reading deferred, nothing stores a Spotify/Apple album link, so Open can only open a search page in the service. MusicBrainz often stores streaming links per release (url relationships), retrievable in the same release request with `inc=url-rels`. Implementer must verify coverage on the 12 sample albums.
3. **WARNING — offline queue shows broken covers (OFFLINE-COVERS).** The 1.0 bar says "the app opens and shows the queue with no connection". The service worker caches the app shell, but covers are remote images from archive.org, so offline the grid is blank tiles. Cover Art Archive/archive.org answer with CORS `*` (probed), so a runtime image cache works.
4. OK — scaling: all load is per-user; MusicBrainz limit is per IP, so 100x users does not hit the shared limit. GitHub Pages bandwidth soft limit 100 GB/month is far away for a static app.
5. OK — security architecture: no server, no auth, no endpoints. Data never leaves the device except search text to MusicBrainz.
6. OK — rollback posture: revert commit, Pages redeploys in about a minute; PWA cache caveat handled in Section 9.
7. Value test: the plan adds no process artifacts. Nothing to cut.

#### currentDecision (FIX-STORAGE)
Question: D4.1 — FIX-STORAGE: Protect the list from Safari's 7-day deletion?
A) Ask for persistent storage + install prompt after the first save (recommended): call `navigator.storage.persist()` on first save; on iPhone Safari when not installed, show a one-time card "Add Backlog to your Home Screen so your list stays saved" with the two-step instructions; keep export reminder. Effort S, risk low. Test: unit test for when the card shows; manual check on an iPhone.
B) Export reminder only (current plan). Effort S, risk high.

#### currentDecision (OPEN-TARGET)
Question: D4.2 — OPEN-TARGET: Open the exact album when MusicBrainz knows its streaming link?
A) Use MusicBrainz streaming links when present, search page otherwise (recommended): add `url-rels` to the release request already made for track lengths, store `spotifyUrl`/`appleMusicUrl`. Effort S, risk low. Test: unit test with recorded reply that has and lacks a Spotify link.
B) Always open a search page in the chosen service. Effort S, risk low.

#### currentDecision (OFFLINE-COVERS)
Question: D4.3 — OFFLINE-COVERS: Cache cover images so the queue looks right offline?
A) Runtime-cache cover images in the service worker (recommended): cache-first for coverartarchive.org and archive.org images, capped at 500 entries. Effort S, risk low. Test: Playwright offline run asserts covers render.
B) Accept blank tiles offline and soften the 1.0 bar wording. Effort S, risk low.

Section 1 decisions: FIX-STORAGE, OPEN-TARGET, OFFLINE-COVERS all approved (D4.1-D4.3, option A).

### Section 2: Error & Rescue Map

```
  METHOD/CODEPATH                 | WHAT CAN GO WRONG                 | ERROR CLASS
  --------------------------------|-----------------------------------|----------------------
  lookup/musicbrainz.search       | offline                           | TypeError (fetch)
                                  | rate limit exceeded               | HTTP 503
                                  | no reply in 10 s                  | AbortError (timeout)
                                  | reply for an older query arrives  | (stale response)
                                  |   after a newer one               |
                                  | malformed body                    | SyntaxError (JSON)
                                  | zero matches                      | (empty result)
  lookup/musicbrainz.release      | any of the above                  | same
    (length + url-rels)           | no track lengths on release       | (missing data)
  lookup/covers                   | no cover (404)                    | HTTP 404
  store/database.write            | storage full                      | QuotaExceededError
                                  | IndexedDB unavailable (private    | InvalidStateError /
                                  |   mode in some browsers)          |  open() failure
  store/exportImport.import       | not JSON / wrong shape / newer    | SyntaxError /
                                  |   version / hostile values        |  ValidationError
  logic/pick                      | nothing fits the time limit       | (empty result)
  --------------------------------|-----------------------------------|----------------------

  ERROR                  | RESCUED? | RESCUE ACTION                         | USER SEES
  -----------------------|----------|---------------------------------------|----------------------------
  offline on search      | Y (plan) | none needed                           | "Adding needs a connection"
  HTTP 503               | N <- GAP | wait 1.5 s, retry once                | "MusicBrainz is busy, retrying"
  timeout                | N <- GAP | abort at 10 s                         | "No reply. Try again" button
  stale response         | N <- GAP | drop replies for superseded queries   | always the latest results
  JSON SyntaxError       | N <- GAP | treat as failed request               | same as timeout
  zero matches           | Y (plan) | hand-entry form                       | "No matches. Add it by hand"
  release detail fails   | N <- GAP | save album without length/links       | length "unknown", Open searches
  cover 404              | Y (plan) | title tile                            | plain tile with title
  QuotaExceededError     | N <- GAP | abort write, keep form contents       | "Your device storage is full"
  IndexedDB unavailable  | N <- GAP | detect at startup                     | banner: list won't be saved here
  import invalid         | partial  | see Section 3 (IMPORT-VALIDATE)       | specific reason, nothing changed
  pick: nothing fits     | N <- GAP | see Section 4 (PICK-EDGES)            | -
```

No catch-all handlers are planned yet; the implementer must name these errors rather than wrap lookups in a single try/catch. Logging: no server, so "logging" is the console plus visible messages (Section 8).

#### currentDecision (SEARCH-CLIENT)
Question: D5.1 — SEARCH-CLIENT: Make search show only the latest results and handle MusicBrainz being busy or slow?
A) One search client (recommended): cancel the previous request when typing continues, ignore replies for older queries, 10 s timeout, one retry after 1.5 s on HTTP 503, visible messages. Effort S, risk low. Tests: controlled-order unit test (old reply arrives last, screen keeps new results), 503-then-200 test, timeout test.
B) Debounce only (current plan). Effort S, risk medium.

#### currentDecision (STORAGE-ERRORS)
Question: D5.2 — STORAGE-ERRORS: Show a clear message when the browser can't save?
A) Detect and explain (recommended): check storage at startup, show a banner when the list can't be saved in this browser; on a full device, keep what the user typed and say why. Effort S, risk low. Tests: unit tests with a failing Dexie open and a QuotaExceededError write.
B) Leave unhandled. Effort S, risk medium.

### Section 3: Security & Threat Model

| Threat | Likelihood | Impact | Plan mitigates? |
|---|---|---|---|
| Hostile import file: `javascript:` URL in coverUrl/spotifyUrl rendered as a link or image source; huge strings or millions of rows freezing the tab | Low (needs someone to share a crafted file) | Med (script runs in Backlog's origin, can read or wipe the list) | No -> IMPORT-VALIDATE |
| Text injection via album titles from MusicBrainz or import | Low | Low | Yes, React escapes text by default; never use `dangerouslySetInnerHTML` |
| Supply chain (npm dependencies) | Low | Med | Partly: few dependencies; add Dependabot alerts (GitHub setting, free) |
| Secrets | none | none | No secrets exist by design |
| Data classification | Personal taste data only, stays on device | Low | Yes |
| Auth / IDOR / SQL / prompt injection | not applicable: no server, no accounts, no database server, no AI | - | - |

#### currentDecision (IMPORT-VALIDATE)
Question: D6.1 — IMPORT-VALIDATE: Check imported files before loading them?
A) Validate every import (recommended): accept only the Backlog format and known versions, only https links, length limits per field, at most 10,000 albums; reject with a specific reason and change nothing. Effort S, risk low. Tests: unit tests for javascript: URL, wrong version, oversize file, valid file.
B) Load whatever the file contains. Effort S, risk medium.

### Section 4: Data Flow & Interaction Edge Cases

```
  ADD BY NAME
  typed text -> trim/len check -> debounce 400 ms -> search client -> 5 matches -> tap
     |               |                                  |                         |
   empty: no       > 200 chars:                   stale/503/timeout:       already saved?
   request         cut to 200                     SEARCH-CLIENT            ONE-PER-ALBUM
                                                                              |
  tap -> release detail (length, url-rels) -> write album -> queue shows it -> persist()
              |                                   |                         (FIX-STORAGE)
        fails: save without                 quota/unavailable:
        length (PICK-EDGES)                 STORAGE-ERRORS

  PICK FOR ME
  queue(To listen) -> filter by time limit -> random choice -> reveal -> Open
       |                    |                     |
     empty: prompt     none fit / unknown     same as last pick:
     to add            length: PICK-EDGES     PICK-EDGES

  IMPORT
  file -> parse -> IMPORT-VALIDATE -> merge by MusicBrainz ID (ONE-PER-ALBUM) -> write -> summary
```

Async ordering: the only shared mutable state across awaits is (a) the search results shown for the current text and (b) an album record written by Add and by Import. (a) Invariant: the results on screen match the current text. Schedule: query "radio" sent, query "radiohead" sent, "radiohead" reply arrives, then "radio" reply arrives last and overwrites the screen. Violated under the current plan; SEARCH-CLIENT prevents it (sequence check). (b) Add and Import on the same album at once is not realistically reachable (import is a modal action); Dexie transactions serialize writes.

| Interaction | Edge case | Handled? | How |
|---|---|---|---|
| Tap a match | double tap saves twice | No -> ONE-PER-ALBUM | unique MusicBrainz ID, disable button while saving |
| Tap a match | album already in queue or listened | No -> ONE-PER-ALBUM | "Already in your queue" with link to it |
| Import | file contains albums already saved | No -> ONE-PER-ALBUM | merge by MusicBrainz ID, keep the newer rating/note |
| Pick for me | queue empty | Partly (empty state) | prompt to add |
| Pick for me | nothing under the limit | No -> PICK-EDGES | say so, offer shortest |
| Pick for me | albums with unknown length | No -> PICK-EDGES | excluded from timed picks only |
| Pick for me | same album twice in a row | No -> PICK-EDGES | avoid last pick when 2+ albums qualify |
| Mark listened | undo a mistaken tap | Partly | the Album screen can move it back to the queue; an Undo toast is new behavior, not proposed under SCOPE REDUCTION |
| Clear samples | user added own albums first | Unclear | clear only records flagged `sample: true` |
| Queue | 1,000+ albums | OK | IndexedDB handles it; grid needs lazy image loading (native `loading="lazy"`) |
| Navigate away mid-search | | OK | request aborted by SEARCH-CLIENT |

"Clear samples" and lazy images are spelled-out implementation of existing requirements (no new behavior), recorded as tasks.

#### currentDecision (ONE-PER-ALBUM)
Question: D5.3 — ONE-PER-ALBUM: Keep each album in the list only once?
A) One record per MusicBrainz ID (recommended): adding a saved album shows "Already in your queue"; double taps can't save twice; import merges by ID and keeps the newer rating and note. Effort S, risk low. Tests: double-tap, re-add, import-with-overlap unit tests.
B) Allow duplicates. Effort S, risk low.

#### currentDecision (PICK-EDGES)
Question: D5.4 — PICK-EDGES: Define what Pick for me does at the edges?
A) Define the edges (recommended): albums with unknown length are left out of timed picks only; if nothing fits, say so and offer the shortest album; never repeat the previous pick when two or more qualify. Effort S, risk low. Tests: unit tests for each case, plus "a 40-minute pick never returns a longer album" across 1,000 random runs with a fixed seed.
B) Leave undefined. Effort S, risk medium.

Section 2 and 4 decisions: SEARCH-CLIENT, STORAGE-ERRORS, ONE-PER-ALBUM, PICK-EDGES approved (D5.1-D5.4, option A). IMPORT-VALIDATE pending (asked with the Section 9-11 batch).

### Section 5: Code Quality Review

- OK: module layout follows its job (screens, components, lookup, store, logic). After CUT-LINK and CUT-LOG, `lookup/links.ts` and `screens/Log` leave the layout; the Listened tab reuses the Queue grid.
- OK: no premature abstractions; no plugin system, no state library. Keep it that way: React state + Dexie live queries are enough.
- Implementation note (from approved PICK-EDGES test): `logic/pick.ts` takes the random function as a parameter so the seeded test is deterministic. Not a new behavior.
- Implementation note (from approved SEARCH-CLIENT): one module owns all MusicBrainz requests, so throttling, retry and staleness live in one place. Screens never call `fetch` directly.
- No function in the plan needs more than five branches; `pick` is the most complex and stays small with PICK-EDGES' three rules.
No issues needing decisions.

### Section 6: Test Review

```
  NEW THING                      TYPE          HAPPY                  FAILURE                    EDGE
  Add by name (search->save)     unit+E2E      match saved            503, timeout, stale reply  empty text, 200+ chars, 0 matches
  Release detail (len+links)     unit          length+links stored    detail fails -> saved      no lengths, no links
  Covers                         unit+E2E      cover shown            404 -> tile                offline -> cached (OFFLINE-COVERS)
  Storage                        unit          write ok               quota, unavailable         persist() denied (FIX-STORAGE)
  Install card                   unit          shows once on iOS      -                          already installed, dismissed
  Queue sort/filter              unit          each sort order        -                          0, 1, 1,000 albums
  Pick for me                    unit          random within limit    nothing fits               unknown length, repeat, 1,000 runs
  Open button                    unit          exact link             -> search fallback         no service chosen
  Mark listened + rating/note    unit+E2E      moves to Listened      write fails                re-open from Album screen
  Export / import                unit          round trip lossless    invalid file rejected      overlap merge, old version file
  Sample list                    E2E           12 samples on first    -                          clear keeps user albums
  Offline                        E2E           queue + covers render  -                          first visit offline
  Five-step loop                 E2E           full loop              -                          -
```

Assertion checks for approved behaviors (each author-mapped, no user input needed):
- SEARCH-CLIENT: assert screen shows "radiohead" results when the "radio" reply resolves last; rejects a screen showing "radio" results. no_claim=live MusicBrainz behavior (recorded replies; unit only).
- PICK-EDGES: assert no pick over the limit in 1,000 seeded runs; rejects any single longer album. no_claim=true randomness quality (seeded generator).
- FIX-STORAGE: assert card shows once when iOS Safari and not standalone; rejects showing when installed. no_claim=Safari's actual eviction (manual iPhone check covers presence of card only).
- OFFLINE-COVERS: assert covers render with network disabled after one online visit; no_claim=first-ever visit offline (cannot work by design).
- Export/import round trip: assert every field equal after export then import. no_claim=none beyond protects.

Test ambition: the 2am-Friday test is the E2E five-step loop on recorded replies plus the offline run. The hostile-QA test is a crafted import file with a `javascript:` URL (IMPORT-VALIDATE). The chaos test is MusicBrainz returning 503 on every request: the app must stay usable for the existing queue.
Pyramid: mostly unit, a handful of Playwright flows. Flakiness: no live network in CI (recorded replies); randomness seeded; no time-dependent assertions except the 10 s timeout, tested with fake timers.
The "first album in under 10 seconds" bar has no automated check; it stays a stopwatch test with three people before launch (existing requirement, now explicit).

### Section 7: Performance Review

- MusicBrainz pacing: the plan's own mitigation ("one request at a time, remember earlier answers") is implemented as: at least 1 second between requests and an in-memory cache keyed by query text. This is spelling out the plan's existing risk mitigation, not new scope.
- Slowest paths [estimated]: first search reply 300-900 ms; cover image via archive.org redirect 0.5-1.5 s; release detail 300-800 ms after a tap. Use the 250 px cover size in the grid.
- Memory: 10,000 albums x about 1 KB = about 10 MB in IndexedDB; the grid lazy-loads images (`loading="lazy"`).
- No database server, no connection pools, no background jobs.
No issues needing decisions.

### Section 8: Observability & Debuggability Review

- No telemetry, by design: the privacy promise is that nothing leaves the device. This is an accepted product constraint, stated in the README.
- Visible errors replace logs: every failure in the Section 2 map now shows the user a message (approved rows).
- Debuggability: a bug report needs the app version and browser. The version is shown in Settings (part of SW-UPDATE below, pending), and the bug template asks for browser and version (existing template item, made explicit).
- "Is it working?" signal for the owner: GitHub stars, issues and Pages traffic are the only signals. Accepted; no analytics proposed under SCOPE REDUCTION.

### Section 9: Deployment & Rollout Review

- Rollout: push to main, tests pass, Pages publishes. No servers, no migrations on a server.
- **WARNING — cached old versions (SW-UPDATE).** An installed PWA keeps serving the cached version. A broken release stays on phones until the service worker updates, and a silent auto-update can swap code mid-session. Rollback (revert commit, about a minute to republish) only reaches users when their service worker picks it up.
- Browser database changes: Dexie schema versions must only add fields or indexes, never rename or drop, so an old export or an old cached app still works.
- Post-deploy check: open the live URL, add one album, confirm offline load. Manual, in the launch checklist.

#### currentDecision (SW-UPDATE)
Question: D6.2 — SW-UPDATE: Control how installed copies get new versions?
A) Prompt to update + show version (recommended): vite-plugin-pwa prompt mode shows "New version ready, reload"; Settings shows the version; database changes additive only. Effort S, risk low. Test: unit test that the prompt appears when a new worker is waiting.
B) Auto-update silently. Effort S, risk medium.

### Section 10: Long-Term Trajectory Review

- Debt: low. The one long-lived contract is the export file format; it carries a version number and MusicBrainz IDs, which is the right foundation.
- Reversibility: 4/5. Everything is a static site except the export format, which old files depend on.
- 1-year question: a new contributor can follow four folders and one service. Yes.
- **WARNING — the plan never says why Backlog exists next to Side B and albumz (POSITIONING).** For the portfolio goal this matters more than any feature: a visitor who knows Side B sees a copy. The honest edge: open source, no install or account, works on any device, your list is a file you own, built on open music data.

#### currentDecision (POSITIONING)
Question: D6.3 — POSITIONING: Add a "why this exists" pitch to the plan and README?
A) Add it (recommended): README opens with the edge in one line, plus a short comparison with Side B, albumz and notes apps. Effort S, risk low.
B) Keep the current pitch. Effort S, risk low.

### Section 11: Design & UX Review

```
  first visit                       returning
      |                                 |
      v                                 v
  QUEUE (sample list) --search box--> matches --tap--> saved (toast) --> QUEUE
    |  [To listen | Listened]                     \--already saved--> "Already in your queue"
    |-- Pick for me --> reveal --> ALBUM --Open--> music app
    |                             |-- Mark listened --> rating + note --> Listened tab
    |-- tap cover --> ALBUM       |-- Move back to queue
    |-- Settings: music app, export/import, clear samples, version
```

| Feature | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Search | spinner in box | "No matches. Add it by hand" | busy/timeout/offline messages | 5 cover cards | some covers missing -> tiles |
| Queue | skeleton grid | prompt + search box | storage banner | grid | albums without length show "unknown" |
| Pick for me | reveal animation | "Add an album first" | - | album shown | "Nothing under 40 min, shortest is 52" |
| Import | progress | - | specific reason, nothing changed | "Added 12, merged 3" | - |

- Information architecture: the plan makes Add a separate screen. Capture is the moment that decides whether people use the app (Step 0 eureka), so every tap before typing matters.
- **WARNING — saving takes an extra screen (MERGE-ADD).** Putting the search box at the top of the Queue removes a screen and a tap from every save.
- AI-slop risk: low. Covers carry the visuals; one accent; no gradients or hero sections.
- Responsive and accessibility: covered by the plan's rules (keyboard, 44 px targets, WCAG AA, alt text).
- Recommendation: none further; /plan-design-review is skipped for scope reduction per the skill.

#### currentDecision (MERGE-ADD)
Question: D6.4 — MERGE-ADD: Put the search box at the top of the Queue and drop the Add screen?
A) Merge (recommended): three screens (Queue, Album, Settings); `/` focuses the box. Effort S, risk low.
B) Keep a separate Add screen. Effort S, risk low.

Section 3, 9, 10, 11 decisions: IMPORT-VALIDATE, SW-UPDATE, POSITIONING, MERGE-ADD approved (D6.1-D6.4, option A).

## Outside Voice

Codex: unavailable. `gstack-codex-probe` reported MODEL_UNUSABLE_INSTALL ("binary or vendor payload is missing"); fix: `npm install -g @openai/codex`. Native fallback (Claude Plan subagent, same harness) completed within the 5-minute timer with VERDICT: FINDINGS. Native findings only; no external outside coverage.

| # | Sev | Finding | Analysis (evidence) | Disposition |
|---|---|---|---|---|
| 1 | Critical | Capture fix deferred; MB URL lookup + Android share target are cheap | MB `/ws/2/url` returned 404 for both the Spotify and Apple In Rainbows links (live, 2026-11-17), so the cheap mechanism is false. Share target only helps once link reading exists. CUT-LINK's basis (link reading is fragile) is confirmed, not weakened | Not reopened (D3.1 stands); capture weakness recorded as top dream-state gap |
| 2 | High | "Keep newer rating" impossible without updatedAt | Correct | Correction: add `updatedAt` (set on every rating/note/status change). Implements approved ONE-PER-ALBUM |
| 3 | High | Hand-entered albums have no MusicBrainz ID | Correct | Correction: identity key = MusicBrainz ID, else normalized artist + title. Implements approved ONE-PER-ALBUM "each album once" |
| 4 | High | Release-group vs release selection unstated | Correct and stronger: In Rainbows has 20 releases, 2 with a Spotify link, 0 with Apple (live) | Decision LENGTH-RULE |
| 5 | High | Renaming/moving origin later strands every list | Correct: IndexedDB is per origin | Decision NAME-FIRST |
| 6 | High | Opaque cover responses may blow quota | False: every hop (coverartarchive 307, archive.org 302, CDN 200) sends `access-control-allow-origin: *` (live) | Factual correction; OFFLINE-COVERS stands |
| 7 | High | Scope does not fit 36-48 h | Time estimate was already flagged unverified; Claude Code compression applies; approved rows are not reopened by reviewer agreement | Disagreement recorded; open question "is 6-8 h/week realistic" stays |
| 8 | Medium | Search pacing / no debounce / shared queue | Plan already has a 400 ms debounce (Section 4) and one module owning all MusicBrainz calls (Section 5). Release lookups share the same 1 req/s queue | Factual correction, covered |
| 9 | Medium | Export from installed iOS app may fail | Plausible (WebKit history with downloads in standalone mode); unverified | Decision IOS-EXPORT |
| 10 | Medium | Partial track lengths | Correct | Folded into LENGTH-RULE |
| 11 | Medium | Album page refresh 404s on GitHub Pages | Correct: Pages has no single-page fallback | Correction: hash routing. Required for the Album screen to be reachable |
| 12 | Medium | Samples underspecified; cut them | Bundling as static JSON is implementation (no live requests). Cut is a scope call | Decision SAMPLES |
| 13 | Low | Open questions contradict spec | Ratings question is a genuine preference check with a default; singles decides the search filter, so it must be answered before Week 2 | Correction: mark singles "answer before Week 2" |
| 14 | Low | MusicBrainz forum launch scrutiny | Fair | Correction: README states pacing and caching before the forum post |
| 15 | Low | "File you own" vs custom JSON | JSON is open and documented; CSV is deferred, not dropped | Correction: README describes the format and links the schema |

#### currentDecision (LENGTH-RULE)
Question: D7.1 — LENGTH-RULE: Which edition sets an album's length, and where do streaming links come from?
A) Earliest official release with full track lengths sets length; partial sums count as unknown; streaming links gathered from every edition (same request) (recommended). Effort S, risk low.
B) Use the first release MusicBrainz returns. Effort S, risk medium.

#### currentDecision (NAME-FIRST)
Question: D7.2 — NAME-FIRST: Settle the name and final web address in Week 1, before the first deploy?
A) Decide in Week 1 (recommended). B) Leave it as an open question.

#### currentDecision (IOS-EXPORT)
Question: D7.3 — IOS-EXPORT: Make export work inside the installed iPhone app?
A) Share-sheet fallback + test in Week 5 (recommended). B) Download link only.

#### currentDecision (SAMPLES)
Question: D7.4 — SAMPLES: Keep the 12-album sample list in v1? Include / Defer / Cut / Hold.

Outside-voice decisions: LENGTH-RULE, NAME-FIRST, IOS-EXPORT, SAMPLES approved (D7.1-D7.4, option A). Corrections CORR-UPDATEDAT, CORR-MANUAL-ID, CORR-HASH-ROUTING applied as direct implementations of approved behavior. CUT-LINK not reopened.

Remaining TODO choices: none unanswered. The three deferred items (link reading, CSV, theme toggle) were answered in D3.1, D3.3, D3.4; no new TODO proposals arose in Sections 1-11 or the outside voice.

Approval readiness: PASS. Checked rows and answers: MODE (D2), CUT-LINK (D3.1, deferred; reopen check kept it deferred), CUT-LOG (D3.2), CUT-CSV (D3.3, deferred), CUT-THEME (D3.4, deferred), FIX-STORAGE (D4.1), OPEN-TARGET (D4.2), OFFLINE-COVERS (D4.3), SEARCH-CLIENT (D5.1), STORAGE-ERRORS (D5.2), ONE-PER-ALBUM (D5.3), PICK-EDGES (D5.4), IMPORT-VALIDATE (D6.1), SW-UPDATE (D6.2), POSITIONING (D6.3), MERGE-ADD (D6.4), LENGTH-RULE (D7.1), NAME-FIRST (D7.2), IOS-EXPORT (D7.3), SAMPLES (D7.4), CORR-UPDATEDAT and CORR-MANUAL-ID (implement D5.3), CORR-HASH-ROUTING (required by the approved Album screen). No unapproved remedies in accepted work.

## Accepted plan changes (to apply to the Backlog doc)

1. Screens: Queue (search box at top, To listen / Listened tabs, Pick for me), Album, Settings (music app, export/import, clear samples, version). Add and Log screens removed.
2. Adding: by name only in v1. Search client: 400 ms debounce, cancel superseded requests, ignore stale replies, at least 1 s between MusicBrainz calls (searches and release lookups share one queue), in-memory cache, 10 s timeout, one retry after 1.5 s on HTTP 503, visible messages, hand-entry form on zero matches.
3. Album details: length from the earliest official release with every track length known (partial sums = unknown); Spotify/Apple links gathered from all releases of the album in one request; Open uses an exact link when present, otherwise a search page (expect search to be common: 2 of 20 In Rainbows releases carry a Spotify link).
4. Data model adds `updatedAt`, `spotifyUrl`, `appleMusicUrl`, `sample`. One record per album: MusicBrainz ID, else normalized artist + title. Re-add shows "Already in your queue". Import merges by that key keeping the newer `updatedAt`. Dexie schema changes additive only.
5. Pick for me: unknown lengths skipped for timed picks; nothing fits -> message + shortest; no back-to-back repeat; random function injectable for seeded tests.
6. Storage protection: `navigator.storage.persist()` on first save; one-time iPhone "Add to Home Screen" card when not installed; export reminder every 10 albums; startup banner when the browser cannot save; full-device message keeps typed input.
7. Export/import: JSON only. iPhone installed app uses the share sheet when downloads are unsupported; tested on a real installed iPhone in Week 5. Import validation: Backlog format + known versions, https links only, field length limits, at most 10,000 albums, specific rejection, no partial load.
8. PWA: cover images cached cache-first (500 cap); updates in prompt mode; version shown in Settings; hash routing so Album pages survive refresh on GitHub Pages.
9. Samples: 12 bundled albums (static JSON), excluded from export and the reminder count, removed by Clear samples (sample-flagged only).
10. Week 1 adds: decide the name and final web address before the first deploy.
11. README: opens with the edge (open source, no install, no account, any device, your list is a file you own, open music data) and a short comparison with Side B, albumz and notes apps; documents the export format; states MusicBrainz pacing and caching before the MusicBrainz forum post.
12. Open questions: "singles count?" must be answered before Week 2 (it sets the search filter).
13. Deferred (TODOS): link reading, CSV export, theme toggle.

## NOT in scope

| Item | Disposition | Answer | Why |
|---|---|---|---|
| Add by pasted link | Deferred (TODOS) | D3.1; reopen check after outside voice | Fragile: Odesli closed, Spotify oEmbed lacks artist, MusicBrainz URL lookup 404 for both test links |
| CSV export | Deferred (TODOS) | D3.3 | JSON covers backup and restore; good first issue |
| Manual theme toggle | Deferred (TODOS) | D3.4 | Device setting covers most people |
| Separate Log screen | Replaced (Listened tab) | D3.2 | Same feature, one fewer screen |
| Separate Add screen | Replaced (search box on Queue) | D6.4 | One fewer tap per save |
| Android share target | Not proposed | outside #1 analysis | Useless without link reading |
| Accounts, sync, sharing, playback, telemetry | Excluded by the plan | plan text | Need a server or break the privacy promise |

## What already exists

- MusicBrainz search and release lookups: reused, no key (probed).
- Cover Art Archive: reused, CORS-readable through the full redirect chain (probed).
- Dexie, vite-plugin-pwa, Vitest, Playwright: reused libraries, no custom infrastructure.
- albumz (open source, self-hosted): reference for MusicBrainz matching logic; check its licence before copying any code.
- No existing Backlog code: greenfield.

## Dream state delta

```
  CURRENT                      AFTER THIS PLAN                       12-MONTH IDEAL
  lost recs, no repo   --->    open, installable list with safe  --> one tap from any share menu,
                               storage, honest pitch, live demo      portable file, contributors
                               GAP LEFT: capture is still "open the app and type"
```
The plan now meets the ideal on trust (no silent data loss, portable file, clear pitch) and demo quality. It does not close the capture gap: link reading and share-sheet saving are the first post-v1 work.

## Error & Rescue Registry

| Codepath | Failure | Error | Rescue | User sees | Row |
|---|---|---|---|---|---|
| lookup/musicbrainz.search | offline | TypeError | none | "Adding needs a connection" | plan |
| lookup/musicbrainz.search | busy | HTTP 503 | wait 1.5 s, retry once | "MusicBrainz is busy, retrying" | SEARCH-CLIENT |
| lookup/musicbrainz.search | no reply | AbortError at 10 s | stop | "No reply. Try again" | SEARCH-CLIENT |
| lookup/musicbrainz.search | late old reply | stale | drop | latest results only | SEARCH-CLIENT |
| lookup/musicbrainz.search | bad body | SyntaxError | treat as failed | same as timeout | SEARCH-CLIENT |
| lookup/musicbrainz.search | no matches | empty | hand-entry form | "No matches. Add it by hand" | plan |
| lookup/musicbrainz.release | any failure / no full lengths | as above / missing | save without length/links | length "unknown", Open searches | LENGTH-RULE, PICK-EDGES |
| lookup/covers | 404 | HTTP 404 | title tile | plain tile | plan |
| store/database.write | full device | QuotaExceededError | abort, keep input | "Your device storage is full" | STORAGE-ERRORS |
| store/database.open | unavailable | open failure | detect at startup | banner: list won't be saved here | STORAGE-ERRORS |
| store (Safari) | 7-day eviction | none (silent) | persist() + install card + reminder | card after first save | FIX-STORAGE |
| store/exportImport.import | invalid/hostile/oversize | ValidationError | reject whole file | specific reason, nothing changed | IMPORT-VALIDATE |
| store/exportImport.export | download unsupported (iOS standalone) | NotAllowed / no-op | navigator.share({files}) | share sheet | IOS-EXPORT |
| logic/pick | nothing fits | empty | message + shortest | "Nothing under 40 min, shortest is 52" | PICK-EDGES |
| service worker | stale version | n/a | prompt to reload | "New version ready, reload" | SW-UPDATE |

## Failure Modes Registry

```
  CODEPATH              | FAILURE MODE          | RESCUED? | TEST? | USER SEES?            | LOGGED?
  ----------------------|-----------------------|----------|-------|-----------------------|----------------
  search                | stale reply           | Y (plan) | Y     | correct results       | n/a (no server)
  search                | 503 / timeout         | Y (plan) | Y     | message               | console
  release lookup        | fails / partial       | Y (plan) | Y     | length unknown        | console
  storage (Safari)      | 7-day eviction        | Y (plan) | Y*    | install card          | n/a
  storage               | quota / unavailable   | Y (plan) | Y     | banner / message      | console
  import                | hostile file          | Y (plan) | Y     | rejection reason      | console
  export (iOS installed)| download fails        | Y (plan) | Y**   | share sheet           | n/a
  pick                  | nothing fits          | Y (plan) | Y     | message + shortest    | n/a
  service worker        | broken cached release | Y (plan) | Y     | reload prompt         | n/a
  router                | refresh on /album     | Y (plan) | Y     | album page            | n/a
  ----------------------|-----------------------|----------|-------|-----------------------|----------------
  * unit test for the card; eviction itself checked manually on an iPhone. ** manual installed-iPhone test, Week 5.
```
0 CRITICAL GAPS remain in the plan (all now have a planned rescue, test and visible message). "Rescued" means planned, not implemented.

## Diagrams

Produced: system architecture (Section 1), data flow with shadow paths (Section 4), error flow (Section 2 map), user flow and states (Section 11). State machine for an album:

```
  [new] --save--> [queued] --mark listened--> [listened]
                     ^                            |
                     +------ move back to queue --+
  [queued]/[listened] --import merge--> same state, newer updatedAt wins
  invalid: [listened] without rating is allowed (rating optional); [new] never persists without an identity key
```
Deployment: push -> CI tests -> Pages publish -> service worker detects new version -> user taps reload. Rollback: revert commit -> Pages republishes (about 1 min) -> users get it via the same reload prompt.

## Stale Diagram Audit

The Backlog doc has two drawings: "How it is built" (shows a Link preview service and Screens without the queue search box) and the six-week timeline (Week 5 says "Add by pasted link"). Both are stale after D3.1 and D6.4 and need updating when the accepted changes are applied.

## Reality rows

REALITY: premise-table finding 1 contradicted (Safari 7-day storage, remedied by FIX-STORAGE), 2 unverified (timeline, 10-second add) 2026-11-17-backlog.md:46-48
REALITY: already-done pass greenfield, no repository exists to hold prior work 2026-11-17-backlog.md:531
REALITY: surface-check pass every named outside service probed live 2026-11-17 2026-11-17-backlog.md:39-45
REALITY: binding-decisions pass gstack-decision-search returned no prior decisions; ledger starts empty 2026-11-17-backlog.md:79
REALITY: numbers finding "six weeks" [estimated] 2026-11-17-backlog.md:47; "under ten seconds" [estimated] 2026-11-17-backlog.md:48; release link counts (2 of 20 with Spotify) [measured: `curl https://musicbrainz.org/ws/2/release?release-group=6e335887-60ba-38f0-95af-fae7774336bf&inc=url-rels&fmt=json&limit=50`]
REALITY: deferred-asks pass no linked issue 2026-11-17-backlog.md:57
REALITY: pr-count pass no ship-policy; solo greenfield, one PR per milestone 2026-11-17-backlog.md:75

PLAN_REALITY: phase=ceo rows=0/7 missing=none unreceipted=all verdict=repair. Warning at gate after two repair attempts: the checker verifies receipts against a git repository, and this greenfield plan has none (no root repository; hex IDs read as commits). The receipts above point at lines in this review file and at live commands.

## Implementation Tasks
Synthesized from this review's findings. Each task derives from a specific finding above. Run with Claude Code or Codex; checkbox as you ship. Effort ratios assumed: features ~30x, tests ~50x, decisions ~3x.

- [ ] **T1 (P1, human: ~1h / CC: ~20min)** — project — Decide the name and final web address before the first deploy
  - Surfaced by: Outside voice #5 — NAME-FIRST (D7.2)
  - Files: to be determined (repo name, vite.config base, PWA manifest scope/start_url)
  - Verify: live URL matches the chosen final address; manifest `start_url` and `scope` match it
- [ ] **T2 (P1, human: ~4h / CC: ~15min)** — lookup — Build the single MusicBrainz client: debounce, shared 1 req/s queue, cancel + stale-drop, 10 s timeout, one 503 retry, cache, messages
  - Surfaced by: Section 2/4 — SEARCH-CLIENT (D5.1); Section 7 pacing
  - Files: src/lookup/musicbrainz.ts, tests/unit/musicbrainz.test.ts
  - Verify: ordering test (old reply resolves last), 503-then-200 test, fake-timer timeout test pass
- [ ] **T3 (P1, human: ~3h / CC: ~15min)** — store — Storage protection and storage errors: persist(), iPhone install card, startup check banner, quota message, export reminder
  - Surfaced by: Section 1 — FIX-STORAGE (D4.1); Section 2 — STORAGE-ERRORS (D5.2)
  - Files: src/store/database.ts, src/components/InstallCard.tsx, tests/unit/storage.test.ts
  - Verify: unit tests for card condition, failing open, quota write; manual check on an iPhone
- [ ] **T4 (P1, human: ~2h / CC: ~10min)** — store — Data model: updatedAt, identity key (MBID else normalized artist+title), unique constraint, sample flag, links; additive Dexie versions
  - Surfaced by: Section 4 — ONE-PER-ALBUM (D5.3); Outside voice #2, #3
  - Files: src/store/database.ts, tests/unit/identity.test.ts
  - Verify: double-tap, re-add and hand-entered re-import tests pass
- [ ] **T5 (P1, human: ~3h / CC: ~15min)** — lookup — Release selection rule and links from all releases
  - Surfaced by: Section 1 — OPEN-TARGET (D4.2); Outside voice #4, #10 — LENGTH-RULE (D7.1)
  - Files: src/lookup/musicbrainz.ts, tests/recorded/, tests/unit/release.test.ts
  - Verify: recorded In Rainbows reply yields original-edition length and a Spotify link; partial-length reply yields unknown
- [ ] **T6 (P1, human: ~2h / CC: ~10min)** — logic — Pick for me rules with injectable random
  - Surfaced by: Section 4 — PICK-EDGES (D5.4)
  - Files: src/logic/pick.ts, tests/unit/pick.test.ts
  - Verify: seeded 1,000-run test never exceeds the limit; nothing-fits and no-repeat tests pass
- [ ] **T7 (P1, human: ~2h / CC: ~10min)** — store — Import validation and merge by identity key with newer updatedAt
  - Surfaced by: Section 3 — IMPORT-VALIDATE (D6.1); ONE-PER-ALBUM (D5.3)
  - Files: src/store/exportImport.ts, tests/unit/import.test.ts
  - Verify: javascript: URL, wrong version, oversize, overlap-merge and round-trip tests pass
- [ ] **T8 (P1, human: ~2h / CC: ~10min)** — store — iPhone export via share sheet fallback
  - Surfaced by: Outside voice #9 — IOS-EXPORT (D7.3)
  - Files: src/store/exportImport.ts
  - Verify: export works from the installed app on a real iPhone in Week 5
- [ ] **T9 (P2, human: ~2h / CC: ~10min)** — pwa — Cover image cache (500 cap), prompt-mode updates, version in Settings
  - Surfaced by: Section 1 — OFFLINE-COVERS (D4.3); Section 9 — SW-UPDATE (D6.2)
  - Files: vite.config.ts, src/screens/Settings.tsx, tests/e2e/offline.spec.ts
  - Verify: Playwright offline run shows covers; waiting-worker prompt unit test passes
- [ ] **T10 (P2, human: ~1h / CC: ~5min)** — routing — Hash routing so Album pages survive refresh on GitHub Pages
  - Surfaced by: Outside voice #11
  - Files: src/main.tsx
  - Verify: refresh on an album page on the live site shows the album
- [ ] **T11 (P2, human: ~4h / CC: ~15min)** — screens — Search box on Queue, To listen / Listened tabs; remove Add and Log screens
  - Surfaced by: Section 11 — MERGE-ADD (D6.4); Step 0 — CUT-LOG (D3.2)
  - Files: src/screens/Queue.tsx, src/screens/Album.tsx
  - Verify: five-step E2E passes with three screens; stopwatch check with three people
- [ ] **T12 (P2, human: ~4h / CC: ~15min)** — sample — 12 bundled sample albums, excluded from export and reminder, Clear samples
  - Surfaced by: Outside voice #12 — SAMPLES (D7.4)
  - Files: src/sample/albums.json, tests/e2e/samples.spec.ts
  - Verify: first visit shows 12 samples with no network calls; Clear keeps user albums
- [ ] **T13 (P2, human: ~2h / CC: ~10min)** — docs — README positioning, export format, MusicBrainz pacing note
  - Surfaced by: Section 10 — POSITIONING (D6.3); Outside voice #14, #15
  - Files: README.md
  - Verify: first README line states the edge; comparison table present; pacing paragraph present before forum post

_No new tasks from Section 5, Section 6 beyond those above, Section 7 or Section 8._

## Completion Summary

```
  +====================================================================+
  |            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
  +====================================================================+
  | Mode selected        | SCOPE REDUCTION                             |
  | System Audit         | Greenfield, no repo; 6 outside services     |
  |                      | probed live; 6 competitors found            |
  | Step 0               | Reduction: 3 deferred, Log -> tab; capture  |
  |                      | is the deciding moment (eureka)             |
  | Section 1  (Arch)    | 3 issues found                              |
  | Section 2  (Errors)  | 15 error paths mapped, 8 GAPS (all planned) |
  | Section 3  (Security)| 1 issue found, 0 High severity              |
  | Section 4  (Data/UX) | 11 edge cases mapped, 6 unhandled -> fixed  |
  | Section 5  (Quality) | 0 issues found                              |
  | Section 6  (Tests)   | Diagram produced, 0 gaps after decisions    |
  | Section 7  (Perf)    | 0 issues found                              |
  | Section 8  (Observ)  | 0 gaps found (no telemetry by design)       |
  | Section 9  (Deploy)  | 1 risk flagged                              |
  | Section 10 (Future)  | Reversibility: 4/5, debt items: 1           |
  | Section 11 (Design)  | 1 issue                                     |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (7 items)                           |
  | What already exists  | written                                     |
  | Dream state delta    | written                                     |
  | Error/rescue registry| 15 rows, 0 CRITICAL GAPS                    |
  | Failure modes        | 10 total, 0 CRITICAL GAPS                   |
  | TODOS.md updates     | 3 items (deferred scope; in this file)      |
  | Scope proposals      | 0 proposed, 0 accepted (reduction mode)     |
  | CEO plan             | skipped by mode                             |
  | Outside voice        | codex unavailable (broken install);         |
  |                      | native fallback completed, 15 findings      |
  | Lake Score           | 5/5 recommendations chose complete option   |
  | Diagrams produced    | 6 (architecture, data flow, error flow,     |
  |                      | user flow, state machine, deploy/rollback)  |
  | Stale diagrams found | 2 (in the Backlog doc)                      |
  | Unresolved decisions | 0                                           |
  | Reality rows         | 0/7 rows (PLAN_REALITY repair: no git repo),|
  |                      | 2 unverified                                |
  +====================================================================+
```

### Unresolved Decisions
None. Product questions the plan already lists (rating style, singles before Week 2, weekly hours) are the owner's to answer and are not review decisions.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | CLEAR | mode: SCOPE_REDUCTION, 0 critical gaps |
| Outside Review | Codex via `/plan-ceo-review` (failed) + native Claude fallback | Independent 2nd opinion | 1 | unavailable (native fallback completed) | 15 native findings; 15 resolved (4 by decision, 7 corrected, 1 disagreement recorded, 3 confirmed covered); 0 unresolved; no completed external review |
| Eng Review | `/autoplan` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **OUTSIDE COVERAGE:** codex, plan-review, unavailable (MODEL_UNUSABLE_INSTALL; fix `npm install -g @openai/codex`); native Claude Plan subagent completed with 15 findings (not outside coverage).
- **VERDICT:** CEO CLEARED. Eng review required.

NO UNRESOLVED DECISIONS
