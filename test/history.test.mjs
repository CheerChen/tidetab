// Chrome History reader. Synthetic database only: no real history.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { chromeTimeToMs, readHistory } from "../scripts/history.mjs";

const toChrome = (iso) => BigInt(Date.parse(iso)) * 1000n + 11644473600000000n;

test("chrome times convert to whole epoch milliseconds", () => {
  assert.equal(chromeTimeToMs(toChrome("2026-01-30T10:00:00.000Z") + 999n), Date.parse("2026-01-30T10:00:00.000Z"));
});

test("visits join their url and title, with the core transition", () => {
  const dir = mkdtempSync(join(tmpdir(), "tidetab-test-"));
  try {
    const path = join(dir, "History");
    const db = new DatabaseSync(path);
    db.exec("CREATE TABLE urls (id INTEGER PRIMARY KEY, url TEXT, title TEXT)");
    db.exec("CREATE TABLE visits (id INTEGER PRIMARY KEY, url INTEGER, visit_time INTEGER, transition INTEGER)");
    db.prepare("INSERT INTO urls VALUES (1, 'https://github.com/acme/api', 'acme/api')").run();
    db.prepare("INSERT INTO visits VALUES (10, 1, ?, ?)").run(toChrome("2026-01-30T10:00:00.000Z"), 0x30000001);
    db.close();
    assert.deepEqual(readHistory(path), [
      { url: "https://github.com/acme/api", title: "acme/api", time: Date.parse("2026-01-30T10:00:00.000Z"), transition: 1 },
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
