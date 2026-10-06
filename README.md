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

## Status

Design stage. Next: tune normalization and scoring offline against an
exported history before writing the extension.
