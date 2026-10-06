// Offline preview: rank an exported Chrome history and print what the new tab
// page would show. Usage: node scripts/preview.mjs [--half-life 14] [--per-hub 8] [--min-hub 2]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parseArgs } from "node:util";
import { rank, learnFolds } from "../src/rank.mjs";

const { values: args } = parseArgs({
  options: {
    data: { type: "string", default: "data" },
    "half-life": { type: "string", default: "14" },
    "per-hub": { type: "string", default: "8" },
    "min-hub": { type: "string", default: "2" },
  },
});

const urls = JSON.parse(readFileSync(`${args.data}/history_urls.json`, "utf8"));
const rawVisits = JSON.parse(readFileSync(`${args.data}/history_visits.json`, "utf8"));
const byId = new Map(urls.map((u) => [u.id, u]));
const visits = rawVisits.flatMap((v) => {
  const u = byId.get(v.url_id);
  return u ? [{ url: u.url, title: u.title, time: Date.parse(v.visit_time), transition: v.core_transition }] : [];
});

// Score as of the newest visit so the preview is reproducible.
const now = Math.max(...visits.map((v) => v.time));
const perHub = Number(args["per-hub"]);
// Learn folds once so the "now" and "a week ago" rankings share entry keys.
const folds = learnFolds(visits);
const hubs = rank(visits, now, { halfLifeDays: Number(args["half-life"]), folds });

const day = (t) => new Date(t).toISOString().slice(0, 10);
const ago = (t) => `${Math.round((now - t) / 86400e3)}d`;
const out = [`# tidetab preview — as of ${day(now)}, half-life ${args["half-life"]}d\n`];

// Entry label: rule label, plus the page title when it adds information.
const name = (e) => {
  const t = e.title && e.title !== e.label ? e.title : "";
  return (e.label && t ? `${e.label}  ${t}` : e.label || t || e.key).slice(0, 70);
};

const shown = hubs.filter((h) => h.score >= Number(args["min-hub"]));
for (const h of shown) {
  out.push(`## ${h.name}  (score ${h.score.toFixed(1)}, ${h.entries.length} entries)`);
  for (const e of h.entries.slice(0, perHub)) {
    out.push(`  ${e.score.toFixed(2).padStart(6)}  ${name(e)}  [${e.visits} visits, ${e.typed} typed, last ${ago(e.last)}]`);
  }
  out.push("");
}

// The tide check: entries with many visits overall that have already faded.
const faded = hubs
  .flatMap((h) => h.entries)
  .filter((e) => e.visits >= 10 && now - e.last > 21 * 86400e3)
  .sort((a, b) => b.visits - a.visits)
  .slice(0, 12);
out.push("## Ebbed (>=10 visits, idle >21d)");
for (const e of faded) {
  out.push(`  ${e.score.toFixed(2).padStart(6)}  ${name(e)}  [${e.hub}, ${e.visits} visits, last ${ago(e.last)}]`);
}

out.push(`\n## Learned folds (${folds.size})`, ...[...folds].sort().map((k) => `  ${k}`));

const hidden = hubs.length - shown.length;
out.push(`\n(${shown.length} hubs shown, ${hidden} below score ${args["min-hub"]} hidden)`);
const text = out.join("\n");
mkdirSync("out", { recursive: true });
writeFileSync("out/preview.md", text + "\n");
console.log(text);

// Snapshot for UI prototypes: top entries per hub with a 7-day trend, written
// as a script (not JSON) so pages opened from file:// can load it.
const WEEK = 7 * 86400e3;
const before = new Map(
  rank(visits.filter((v) => v.time <= now - WEEK), now - WEEK, { halfLifeDays: Number(args["half-life"]), folds })
    .flatMap((h) => h.entries)
    .map((e) => [e.key, e.score]),
);
const trend = (e) => {
  const prev = before.get(e.key) ?? 0;
  if (prev < 0.05) return "new";
  const r = e.score / prev;
  // A week with no visits decays to ~0.71 (half-life 14d), so that already reads as down.
  return r > 1.2 ? "up" : r < 0.85 ? "down" : "flat";
};
const snapshot = {
  asOf: now,
  hubs: hubs.map((h) => ({
    name: h.name,
    score: +h.score.toFixed(2),
    total: h.entries.length,
    entries: h.entries.slice(0, 20).map((e) => ({
      key: e.key,
      label: e.label ?? null,
      title: e.title || null,
      href: e.href,
      score: +e.score.toFixed(2),
      trend: trend(e),
      visits: e.visits,
      last: e.last,
    })),
  })),
};
writeFileSync("out/snapshot.js", `window.SNAPSHOT = ${JSON.stringify(snapshot)};\n`);
console.error(`wrote out/snapshot.js (${snapshot.hubs.length} hubs)`);
