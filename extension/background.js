// Service worker: records every visit into the extension's own IndexedDB,
// rebuilds the frozen snapshot daily, and logs new-tab clicks locally.
import { buildSnapshot } from "./lib/snapshot.mjs";

const HALF_LIFE_DAYS = 14;
const REBUILD_MINUTES = 24 * 60;
const SEED_CHUNK = 50;

// Chrome transition names -> core transition codes that rank.mjs understands.
const TRANSITIONS = {
  link: 0, typed: 1, auto_bookmark: 2, auto_subframe: 3, manual_subframe: 4, generated: 5,
  start_page: 6, form_submit: 7, reload: 8, keyword: 9, keyword_generated: 10,
};

const dbp = new Promise((resolve, reject) => {
  const req = indexedDB.open("tidetab", 1);
  req.onupgradeneeded = () => {
    req.result.createObjectStore("visits", { keyPath: "visitId" });
    req.result.createObjectStore("clicks", { autoIncrement: true });
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function put(store, rows) {
  const db = await dbp;
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, "readwrite");
    for (const r of rows) t.objectStore(store).put(r);
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });
}

async function getAll(store) {
  const db = await dbp;
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Visits of one history item as rank.mjs records; only the newest unless asked for all.
async function recordItem(item, { all = false } = {}) {
  const visits = await chrome.history.getVisits({ url: item.url });
  const picked = all ? visits : visits.filter((v) => v.visitTime >= item.lastVisitTime);
  await put(
    "visits",
    picked.map((v) => ({
      visitId: v.visitId,
      url: item.url,
      title: item.title ?? "",
      time: v.visitTime,
      transition: TRANSITIONS[v.transition] ?? 0,
    })),
  );
}

async function seed() {
  const items = await chrome.history.search({ text: "", startTime: 0, maxResults: 100000 });
  for (let i = 0; i < items.length; i += SEED_CHUNK) {
    await Promise.all(items.slice(i, i + SEED_CHUNK).map((item) => recordItem(item, { all: true })));
  }
}

async function rebuild() {
  const visits = await getAll("visits");
  const snapshot = buildSnapshot(visits, Date.now(), { halfLifeDays: HALF_LIFE_DAYS });
  await chrome.storage.local.set({ snapshot });
}

chrome.runtime.onInstalled.addListener(async () => {
  await seed();
  await rebuild();
});

chrome.history.onVisited.addListener((item) => recordItem(item));

chrome.alarms.get("rebuild", (alarm) => {
  if (!alarm) chrome.alarms.create("rebuild", { periodInMinutes: REBUILD_MINUTES });
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "rebuild") rebuild();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "click") put("clicks", [{ key: msg.key, hub: msg.hub, href: msg.href, asOf: msg.asOf, time: Date.now() }]);
});
