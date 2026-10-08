// New tab page: reads the frozen snapshot written by background.js. Never recomputes ranking.
const CORE = ["Jira", "GitHub", "Confluence"];
const PER_HUB = 16;
const CHIPS = 14;
const HUB_COLOR = { Jira: "--hub-jira", GitHub: "--hub-github", Confluence: "--hub-confluence", AWS: "--hub-aws", Microsoft: "--hub-microsoft", AI: "--hub-ai" };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const color = (hub) => `var(${HUB_COLOR[hub] ?? "--hub-other"})`;
const rising = (e) => e.trend === "up" || e.trend === "new";

// Primary text without what the hub already implies (same rules as the prototypes).
function text(e) {
  if (e.key.startsWith("jira:") && e.title?.startsWith(`[${e.label}]`)) return e.title.slice(e.label.length + 2).trim();
  if (e.key.startsWith("github:") && e.label?.includes("/")) return e.label.split("/")[1];
  return e.title || e.label || e.key;
}
function tag(e) {
  if (e.key.startsWith("jira:") && /^[A-Z]+-\d+$/.test(e.label ?? "")) return e.label;
  if (e.key.startsWith("github:") && e.label?.includes("/")) return e.label.split("/")[0];
  if (e.label?.startsWith(":")) return e.label;
  return "";
}

const { snapshot } = await chrome.storage.local.get("snapshot");
const all = snapshot ? snapshot.hubs.flatMap((h) => h.entries.map((e) => ({ ...e, hub: h.name }))) : [];

function row(e) {
  return `<li><a href="${esc(e.href)}" target="_blank" data-key="${esc(e.key)}" data-hub="${esc(e.hub)}"
    class="${e.trend === "down" ? "down" : ""}" title="${esc(e.title ?? e.label ?? "")}" style="--c:${color(e.hub)}">
    <span class="up">${rising(e) ? "▲" : ""}</span><span class="t">${esc(text(e))}</span><span class="k">${esc(tag(e))}</span></a></li>`;
}

function render() {
  const body = document.body;
  if (!snapshot) {
    body.insertAdjacentHTML("beforeend", '<p class="empty">快照尚未生成，请稍后重新打开新标签页。</p>');
    return;
  }
  const hubs = new Map(snapshot.hubs.map((h) => [h.name, h]));
  const section = (h, cls) => `
    <section class="col ${cls}" style="--c:${color(h.name)}">
      <h2><span>${esc(h.name)}</span><span>${h.total}</span></h2>
      <ul>${h.entries.slice(0, PER_HUB).map((e) => row({ ...e, hub: h.name })).join("")}</ul>
    </section>`;
  document.querySelector(".cols").innerHTML = CORE.map((n) => hubs.get(n)).filter(Boolean).map((h) => section(h)).join("");

  document.querySelector(".chips").innerHTML = all
    .filter((e) => e.hub !== "AWS" && !CORE.includes(e.hub))
    .sort((a, b) => b.score - a.score)
    .slice(0, CHIPS)
    .map((e) => `<a class="chip ${e.trend === "down" ? "down" : ""}" href="${esc(e.href)}" target="_blank"
      data-key="${esc(e.key)}" data-hub="${esc(e.hub)}" title="${esc(e.title ?? e.label ?? "")}" style="--c:${color(e.hub)}">
      <i></i>${esc((e.label && !e.label.startsWith(":") ? e.label : text(e)).slice(0, 18))}</a>`).join("");

  const input = document.querySelector(".search");
  const results = document.querySelector(".results");
  const search = (q) => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return all
      .filter((e) => words.every((w) => `${e.hub} ${e.label ?? ""} ${e.title ?? ""} ${e.href}`.toLowerCase().includes(w)))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  };
  input.addEventListener("input", () => (results.innerHTML = search(input.value).map(row).join("")));
  input.addEventListener("keydown", (ev) => {
    const first = ev.key === "Enter" && search(input.value)[0];
    if (first) window.open(first.href, "_blank");
    if (ev.key === "Escape") { input.value = ""; results.innerHTML = ""; }
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "/" && document.activeElement !== input) { ev.preventDefault(); input.focus(); }
  });
}

// Clicks are logged locally in IndexedDB (background.js); nothing leaves the browser.
document.addEventListener("click", (ev) => {
  const a = ev.target.closest("a[data-key]");
  if (a) chrome.runtime.sendMessage({ type: "click", key: a.dataset.key, hub: a.dataset.hub, href: a.href, asOf: snapshot?.asOf });
});

render();
