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
chrome.history -> collect -> normalize -> score ─┬─> new tab page, grouped by hub
                  (own store)                    └─> archive stale bookmarks
```

1. **Collect** — record every visit (`history.onVisited`) in the extension's
   own IndexedDB, so ranking is not limited by Chrome's 90-day history.
   On install, seed once from the profile's existing history.
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
The offline preview reads a copy of the local Chrome History database; its output
in `out/` is git-ignored.

## Development

No dependencies; Node 22+ only.

```
node --test                  # unit tests (synthetic data)
node scripts/preview.mjs     # rank Chrome "Profile 1" History -> out/preview.md, out/snapshot.js
open prototypes/newtab/compare.html   # layout variants, reads out/snapshot.js
node scripts/build-extension.mjs       # assemble dist/extension for "Load unpacked"
```

The preview reads `~/Library/Application Support/Google/Chrome/<profile>/History`
(a temporary copy, since Chrome locks it). Pick another profile with `--profile "<name>"`
or a file with `--history <path>`.

The `key` in `extension/manifest.json` pins the extension ID to
`aiglplahhcjicncfloiapkgahdfgojob`, wherever the unpacked folder lives. The visit
store in IndexedDB belongs to that ID, so do not remove or change the key. The
matching private key is kept outside the repo and is only needed for a Web Store
upload.

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
