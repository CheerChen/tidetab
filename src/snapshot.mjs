// Frozen view of the ranking, shared by the offline preview and the extension.
// Pure like rank.mjs: plain visit records in, plain snapshot object out.
import { rank, learnFolds } from "./rank.mjs";

const WEEK = 7 * 86400e3;

// Top entries per hub with a 7-day trend, so a page can show what is rising.
export function buildSnapshot(visits, now, { halfLifeDays, folds = learnFolds(visits), entriesPerHub = 20 } = {}) {
  const hubs = rank(visits, now, { halfLifeDays, folds });
  const before = new Map(
    rank(visits.filter((v) => v.time <= now - WEEK), now - WEEK, { halfLifeDays, folds })
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
  return {
    asOf: now,
    hubs: hubs.map((h) => ({
      name: h.name,
      score: +h.score.toFixed(2),
      total: h.entries.length,
      entries: h.entries.slice(0, entriesPerHub).map((e) => ({
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
}
