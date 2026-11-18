// Service worker: records every visit into the extension's own IndexedDB,
// keeps the snapshot and async SPA titles synced on visit, and logs clicks locally.
import { buildSnapshot } from "./lib/snapshot.mjs";

const HALF_LIFE_DAYS = 14;
const REBUILD_MINUTES = 24 * 60;
const SEED_CHUNK = 50;
const TITLE_RETRY_MS = 2500;
const TITLE_RETRY_WINDOW_MS = 20_000;

// Placeholder titles set before an SPA finishes rendering the real document.title.
const SHELL_TITLES = new Set(["", "Jira", "Confluence", "GitHub", "Redirecting..."]);

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

// Chrome updates HistoryItem.title in place after an SPA sets document.title,
// without firing history.onVisited again. Backfill visits from chrome.history.
async function syncTitles(visits) {
  const items = await chrome.history.search({ text: "", startTime: 0, maxResults: 100000 });
  const byUrl = new Map();
  for (const item of items) {
    if (item.url && item.title && !SHELL_TITLES.has(item.title.trim())) {
      byUrl.set(item.url, item);
    }
  }
  const dirty = [];
  for (const v of visits) {
    const item = byUrl.get(v.url);
    if (!item) continue;
    const shell = SHELL_TITLES.has((v.title ?? "").trim());
    if ((shell || v.time >= item.lastVisitTime) && v.title !== item.title) {
      v.title = item.title;
      dirty.push(v);
    }
  }
  if (dirty.length) await put("visits", dirty);
}

let running = false;
let pending = false;
let retryTimer;

function scheduleRebuild(delayMs = TITLE_RETRY_MS) {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(rebuild, delayMs);
}

async function rebuild() {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  try {
    do {
      pending = false;
      const visits = await getAll("visits");
      await syncTitles(visits);
      const now = Date.now();
      const snapshot = buildSnapshot(visits, now, { halfLifeDays: HALF_LIFE_DAYS });
      await chrome.storage.local.set({ snapshot });
      if (visits.some((v) => now - v.time < TITLE_RETRY_WINDOW_MS && SHELL_TITLES.has((v.title ?? "").trim()))) {
        scheduleRebuild(TITLE_RETRY_MS);
      }
    } while (pending);
  } finally {
    running = false;
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await seed();
  await rebuild();
});

chrome.runtime.onStartup.addListener(() => rebuild());

chrome.history.onVisited.addListener(async (item) => {
  await recordItem(item);
  await rebuild();
  scheduleRebuild(TITLE_RETRY_MS);
});

chrome.alarms.get("rebuild", (alarm) => {
  if (!alarm) chrome.alarms.create("rebuild", { periodInMinutes: REBUILD_MINUTES });
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "rebuild") rebuild();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "click") put("clicks", [{ key: msg.key, hub: msg.hub, href: msg.href, asOf: msg.asOf, time: Date.now() }]);
  if (msg.type === "sync") rebuild();
});
