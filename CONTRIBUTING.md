# Contributing to Earmark

Thanks for helping. This guide gets you from clone to a passing test in a few minutes.

## Setup

You need Node 22 (see `.nvmrc`).

```sh
npm ci
npm run dev     # app at the printed local URL
npm test        # unit tests
npm run lint
npx playwright install chromium   # once
npm run test:e2e                  # end-to-end, no live network
```

## How the code is organized

- `src/screens/`: React screens. No data rules here.
- `src/domain/`: pure functions for the rules (album identity, merging, Pick for me). Easiest place to start; everything is unit-testable.
- `src/db/`: the browser database (Dexie / IndexedDB).
- `src/mb/`: the only code allowed to call MusicBrainz.
- `src/jobs/`: background work (looking up album lengths, caching covers).

## Rules worth knowing

- Only `src/mb/` talks to the network, at most one MusicBrainz request per second.
- Follow `DESIGN.md` for anything visual.
- Every behaviour change comes with a test that would fail if the behaviour broke.
- The v1 spec in `docs/plan.md` is frozen. Ideas go to `TODOS.md` or an issue.

## Good first issues

Look for the `good first issue` label: small, self-contained tasks such as a keyboard shortcut or a CSV export.
