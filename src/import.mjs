// Turns a Chrome history export (urls + visits tables) into visit records for rank.mjs.
// visitId keeps the export's own visit id, so a visit seeded from the browser and the
// same visit in the export are one record, not two.
export function toVisitRecords(urls, visits) {
  const byId = new Map(urls.map((u) => [u.id, u]));
  return visits.flatMap((v) => {
    const u = byId.get(v.url_id);
    return u
      ? [{ visitId: v.id, url: u.url, title: u.title ?? "", time: Date.parse(v.visit_time), transition: v.core_transition }]
      : [];
  });
}
