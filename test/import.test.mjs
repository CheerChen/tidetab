// Export-to-visit conversion. Synthetic rows only: no real history.
import { test } from "node:test";
import assert from "node:assert/strict";
import { toVisitRecords } from "../src/import.mjs";

test("visits map to their url, parsed time and core transition; orphans are dropped", () => {
  const urls = [{ id: 1, url: "https://github.com/acme/api", title: "acme/api" }];
  const visits = [
    { id: 10, url_id: 1, visit_time: "2026-01-30T10:00:00.000Z", core_transition: 1 },
    { id: 11, url_id: 99, visit_time: "2026-01-30T11:00:00.000Z", core_transition: 0 },
  ];
  assert.deepEqual(toVisitRecords(urls, visits), [
    { visitId: 10, url: "https://github.com/acme/api", title: "acme/api", time: Date.parse("2026-01-30T10:00:00.000Z"), transition: 1 },
  ]);
});

test("a missing title becomes an empty string", () => {
  const [v] = toVisitRecords([{ id: 1, url: "https://example.com/" }], [{ id: 1, url_id: 1, visit_time: "2026-01-01T00:00:00Z", core_transition: 0 }]);
  assert.equal(v.title, "");
});
