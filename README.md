# tidetab

A self-learning new tab page for Chrome. It watches where you actually go,
groups destinations by hub (GitHub, Jira, Confluence, AWS, ...), and lets
links rise while you use them and ebb away when you stop — like a tide.

Bookmarks you no longer visit are archived, never deleted, so the address bar
can still find them.

## Why

Bookmarks follow an 80/20 split: a few links get used all the time, most are
never clicked again. Per-project folders lose their meaning as soon as the
project ends. tidetab replaces manual curation with a ranking learned from
your own history.

## Design

```
chrome.history ─┐
history export ─┼─> collect -> normalize -> score ─┬─> new tab page, grouped by hub
(one-time seed) ┘   (own store)                    └─> archive stale bookmarks
```

1. **Collect** — record every visit (`history.onVisited`) in the extension's
   own IndexedDB, so ranking is not limited by Chrome's 90-day history.
   Seed once from existing history or an exported JSON.
2. **Normalize** — fold URLs into entries with per-hub rules: a GitHub repo
   absorbs its PRs and files, a Jira issue is keyed by issue key, a Confluence
   page by page id, AWS by service; everything else by URL without query/hash.
3. **Score** — frecency: each visit decays exponentially (half-life ~14 days),
   typed visits weigh more. Active projects rise, finished ones fade out.
4. **Show** — the new tab page renders the top entries of each hub as columns.
5. **Archive** — bookmarks unvisited for 60+ days move to `Archive/<year>-Q<n>`.
   Dry-run first: proposed moves are listed and applied only on confirmation.

## Privacy

All data stays in the browser. No network requests, no remote code.
History exports used for seeding or tuning live in `data/` (git-ignored).

## Development

No dependencies; Node 22+ only.

```
node --test                  # unit tests (synthetic data)
node scripts/preview.mjs     # rank data/history_*.json -> out/preview.md, out/snapshot.js
open prototypes/newtab/compare.html   # layout variants, reads out/snapshot.js
node scripts/build-extension.mjs       # assemble dist/extension for "Load unpacked"
```

`data/` holds a history export (`history_urls.json`, `history_visits.json`)
and is git-ignored, as is `out/`.

## Status

- Done: ranking core with learned fold templates (layer 1: URL granularity),
  offline preview, three layout prototypes. Variant C (core columns + chips)
  is the closest so far.
- Done: extension skeleton in `extension/` (MV3). The service worker records
  visits into IndexedDB, rebuilds the snapshot daily, and logs new-tab clicks
  locally. The new tab page shows Jira, GitHub and Confluence as three
  columns (16 items each). AWS is ranked per console URL but not shown.
- Next: check the skeleton in Chrome; chip labels need the site name; then the
  one-week trial.
- Later: hubs that promote/demote themselves (layer 2) and project clusters
  that span hubs (layer 3).
