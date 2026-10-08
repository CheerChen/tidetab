// Snapshot shape and trend labels. Synthetic data only: no real history.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSnapshot } from "../src/snapshot.mjs";

const DAY = 86400e3;
const NOW = Date.parse("2026-01-31T00:00:00Z");
const visit = (url, ago, title = "") => ({ url, title, time: NOW - ago, transition: 0 });

test("hubs are grouped and sorted, entries carry href and trend", () => {
  const visits = [
    visit("https://github.com/acme/api/pull/3", 1 * DAY, "Fix"),
    visit("https://github.com/acme/api", 2 * DAY),
    visit("https://acme.atlassian.net/browse/OPS-12", 3 * DAY, "[OPS-12] Rotate keys - JIRA"),
  ];
  const snap = buildSnapshot(visits, NOW, { halfLifeDays: 14 });
  assert.equal(snap.asOf, NOW);
  const names = snap.hubs.map((h) => h.name);
  assert.ok(names.includes("GitHub") && names.includes("Jira"));
  const gh = snap.hubs.find((h) => h.name === "GitHub");
  assert.equal(gh.entries[0].key, "github:acme/api");
  assert.equal(gh.entries[0].trend, "new");
  assert.match(gh.entries[0].href, /^https:\/\/github\.com\/acme\/api$/);
});

test("an entry visited only last week reads as down this week", () => {
  const visits = [visit("https://github.com/acme/old", 10 * DAY)];
  const [e] = buildSnapshot(visits, NOW, { halfLifeDays: 14 }).hubs[0].entries;
  assert.equal(e.trend, "down");
});
