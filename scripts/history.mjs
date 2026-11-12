// Reads a Chrome profile's History database into visit records for rank.mjs.
// Node-only (node:sqlite); the extension gets the same records from chrome.history.
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

// Chrome stores times as microseconds since 1601-01-01 UTC; they exceed
// Number.MAX_SAFE_INTEGER, so they are read as BigInt.
const EPOCH_OFFSET_US = 11644473600000000n;

export function chromeTimeToMs(us) {
  return Number((BigInt(us) - EPOCH_OFFSET_US) / 1000n);
}

export function profileHistoryPath(profile) {
  return join(homedir(), "Library/Application Support/Google/Chrome", profile, "History");
}

// Chrome keeps History locked while running, so read a copy.
export function readHistory(path) {
  const dir = mkdtempSync(join(tmpdir(), "tidetab-"));
  try {
    const copy = join(dir, "History");
    copyFileSync(path, copy);
    const db = new DatabaseSync(copy, { readOnly: true });
    try {
      const stmt = db.prepare("SELECT u.url, u.title, v.visit_time, v.transition FROM visits v JOIN urls u ON u.id = v.url");
      stmt.setReadBigInts(true);
      const rows = stmt.all();
      return rows.map((r) => ({
        url: r.url,
        title: r.title ?? "",
        time: chromeTimeToMs(r.visit_time),
        transition: Number(r.transition) & 0xff,
      }));
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
