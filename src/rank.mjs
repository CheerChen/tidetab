// Pure ranking core shared by the extension and the offline preview.
// No browser or Node APIs here: input is plain visit records, output is plain data.

export const DEFAULTS = {
  halfLifeDays: 14,
  typedWeight: 2, // a visit typed in the address bar counts double
  sessionGapMinutes: 30, // repeat visits to one entry within this gap count once
  perHub: 8,
};

// Chrome core transition types (transition & 0xFF).
const TYPED = 1;
const AUTO_BOOKMARK = 2;
const MANUAL_SUBFRAME = 4;
const KEYWORD = 9;

// Hosts that are only ever passed through (sign-in, redirects, search results).
const SKIP_HOSTS = [
  /^login\.microsoftonline\.com$/,
  /^accounts\.google\.com$/,
  /^www\.google\.[a-z.]+$/,
  /\.claudeusercontent\.com$/,
  /^([a-z0-9-]+\.)?signin\.aws(\.amazon\.com)?$/,
  /^(auth|id)\.atlassian\.com$/,
  /^oidc\.[a-z0-9-]+\.amazonaws\.com$/,
  /^slack\.com$/, // link redirector; the workspace itself is app.slack.com
];

// Auth and redirect steps on any host.
const SKIP_PATHS = /\/(log-?in|sign-?in|oauth2?|callback|auth|sso|set_session|redirect)(\/|$)/i;

// Each rule returns { hub, key, label?, href? } (or an array of them, when one
// visit should credit several entries) for a URL it owns, null to skip it, or
// undefined to let the next rule try. href is the canonical link to show.
const RULES = [
  function github(u) {
    if (u.hostname !== "github.com") return undefined;
    const [owner, repo] = u.pathname.split("/").filter(Boolean);
    if (!owner || ["search", "login", "sessions"].includes(owner)) return null;
    if (["notifications", "pulls", "issues"].includes(owner)) {
      return { hub: "GitHub", key: `github:/${owner}`, label: owner, href: `${u.origin}/${owner}` };
    }
    if (!repo) return { hub: "GitHub", key: `github:${owner}`, label: owner, href: `${u.origin}/${owner}` };
    return {
      hub: "GitHub",
      key: `github:${owner}/${repo}`,
      label: `${owner}/${repo}`,
      href: `${u.origin}/${owner}/${repo}`,
    };
  },
  function atlassian(u, { typed }) {
    if (!u.hostname.endsWith(".atlassian.net")) return undefined;
    const p = u.pathname;
    const issueKey =
      p.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/)?.[1] ?? u.searchParams.get("selectedIssue");
    const issue = issueKey && {
      hub: "Jira",
      key: `jira:${issueKey}`,
      label: issueKey,
      href: `${u.origin}/browse/${issueKey}`,
      issue: issueKey,
    };
    // An issue opened in a board side panel credits both the board and the issue.
    const board = p.match(/^(\/jira\/software\/(?:c\/)?projects\/([^/]+)\/boards\/(\d+))(?:\/(\w+))?/);
    if (board) {
      const view = board[4] ?? "board";
      const b = {
        hub: "Jira",
        key: `jira:${board[2]}/${board[3]}/${view}`,
        label: `${board[2]} ${view}`,
        href: `${u.origin}${board[1]}${board[4] ? `/${board[4]}` : ""}`,
      };
      // A typed board URL is a saved link; its selectedIssue is a leftover.
      return issue && !typed ? [b, issue] : b;
    }
    if (issue) return issue;
    const page = p.match(/\/wiki\/spaces\/([^/]+)\/pages\/(?:edit-v2\/)?(\d+)/);
    if (page) {
      return { hub: "Confluence", key: `confluence:${page[2]}`, href: `${u.origin}/wiki/spaces/${page[1]}/pages/${page[2]}` };
    }
    const space = p.match(/\/wiki\/spaces\/([^/]+)\/?(?:overview)?$/);
    if (space) return { hub: "Confluence", key: `confluence:space/${space[1]}`, label: `space ${space[1]}` };
    if (p.startsWith("/wiki")) return p.includes("/search") ? null : { hub: "Confluence", key: `confluence:${p}` };
    if (p.startsWith("/jira") && !p.includes("/search")) {
      return { hub: "Jira", key: `jira:${p.replace(/\/\d+$/, "")}` };
    }
    return null;
  },
  function aws(u) {
    if (u.hostname.endsWith(".awsapps.com")) {
      return { hub: "AWS", key: "aws:portal", label: "access portal", href: `${u.origin}/start` };
    }
    if (!u.hostname.endsWith("console.aws.amazon.com")) return undefined;
    const service = u.pathname.split("/").filter(Boolean)[0];
    const home = "https://console.aws.amazon.com";
    if (!service || service === "console") {
      return { hub: "AWS", key: "aws:home", label: "console home", href: `${home}/console/home` };
    }
    return { hub: "AWS", key: `aws:${service}`, label: service, href: `${home}/${service}/home` };
  },
  function microsoft(u) {
    const h = u.hostname;
    if (h === "teams.microsoft.com" || h === "teams.cloud.microsoft") {
      return { hub: "Microsoft", key: "ms:teams", label: "Teams" };
    }
    if (h === "outlook.office.com" || h === "outlook.cloud.microsoft") {
      return { hub: "Microsoft", key: "ms:outlook", label: "Outlook" };
    }
    if (h.endsWith(".sharepoint.com")) {
      return { hub: "Microsoft", key: `ms:${h}${u.pathname.replace(/\/$/, "")}` };
    }
    return undefined;
  },
  function local(u) {
    if (!["localhost", "127.0.0.1"].includes(u.hostname)) return undefined;
    return { hub: "Local", key: u.origin, label: `:${u.port || 80}`, href: u.origin };
  },
];

// Learned granularity for hosts without a rule. A path segment that looks like
// an id splits a URL into a template prefix and an instance. Templates whose
// instances are rarely revisited (chats, posts, CI runs, meeting links) fold
// into one entry; templates whose instances are revisited stay one entry each.
export const FOLD = { minInstances: 3, maxRevisitShare: 0.25 };

function isIdSegment(s) {
  return /^\d+$/.test(s) || /^[0-9a-f-]{16,}$/i.test(s) || (s.length >= 12 && /\d/.test(s));
}

// { key, href } of the template a URL belongs to, or null when no segment is an id.
function template(u) {
  const segs = u.pathname.split("/").filter(Boolean);
  const i = segs.findIndex(isIdSegment);
  if (i < 0) return null;
  const prefix = segs.slice(0, i);
  // A one-segment prefix ("/c", "/chat") is just a route; fold to the site itself.
  const path = prefix.length <= 1 ? "" : `/${prefix.join("/")}`;
  return { key: `${u.hostname}${path}`, href: `${u.origin}${path}` };
}

// Returns the set of template keys that should fold, learned from visit history.
export function learnFolds(visits, { sessionGapMinutes = DEFAULTS.sessionGapMinutes } = {}) {
  const gap = sessionGapMinutes * 60e3;
  const sessions = new Map(); // instance -> number of separate sessions
  const last = new Map();
  const instances = new Map(); // template key -> Set of instances
  for (const v of [...visits].sort((a, b) => a.time - b.time)) {
    let u;
    try {
      u = new URL(v.url);
    } catch {
      continue;
    }
    const t = template(u);
    if (!t) continue;
    const inst = `${u.hostname}${u.pathname}`;
    if (v.time - (last.get(inst) ?? -Infinity) >= gap) sessions.set(inst, (sessions.get(inst) ?? 0) + 1);
    last.set(inst, v.time);
    if (!instances.has(t.key)) instances.set(t.key, new Set());
    instances.get(t.key).add(inst);
  }
  const folds = new Set();
  for (const [key, set] of instances) {
    if (set.size < FOLD.minInstances) continue;
    const revisited = [...set].filter((i) => sessions.get(i) >= 2).length;
    if (revisited / set.size < FOLD.maxRevisitShare) folds.add(key);
  }
  return folds;
}

// Trailing site names that only add noise to a short label.
const TITLE_SUFFIX = / [-|–] (JIRA|Confluence|Microsoft Teams|GitHub)$| - [^-]+ - Confluence$| \/ X$/;
function stripUrl(url) {
  return url.replace(/[?#].*$/, "").replace(/\/$/, "");
}

export function cleanTitle(t) {
  return (t ?? "").replace(TITLE_SUFFIX, "").trim();
}

export function normalize(rawUrl, { typed = false, folds = new Set() } = {}) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return [];
  }
  if (!["http:", "https:"].includes(u.protocol)) return [];
  if (SKIP_HOSTS.some((re) => re.test(u.hostname)) || SKIP_PATHS.test(u.pathname)) return [];
  for (const rule of RULES) {
    const r = rule(u, { typed });
    if (r !== undefined) return r === null ? [] : [r].flat();
  }
  // Fallback: grouped by host; one entry per page unless its template folds.
  const t = template(u);
  if (t && folds.has(t.key)) return [{ hub: u.hostname, key: t.key, href: t.href }];
  const path = u.pathname.replace(/\/$/, "");
  return [{ hub: u.hostname, key: `${u.origin}${path}`, href: `${u.origin}${path}` }];
}

// visits: [{ url, title, time (ms epoch), transition (core type) }]
// Returns hubs sorted by total score, each with its entries sorted by score.
export function rank(visits, now, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const lambda = Math.LN2 / (o.halfLifeDays * 86400e3);
  const gap = o.sessionGapMinutes * 60e3;
  const entries = new Map();

  const sorted = [...visits].sort((a, b) => a.time - b.time);
  const folds = o.folds ?? learnFolds(sorted, o);
  for (const v of sorted) {
    if (v.transition === MANUAL_SUBFRAME) continue;
    const typed = [TYPED, AUTO_BOOKMARK, KEYWORD].includes(v.transition);
    for (const n of normalize(v.url, { typed, folds })) {
      let e = entries.get(n.key);
      if (!e) {
        e = { ...n, title: "", score: 0, visits: 0, typed: 0, first: v.time, last: -Infinity };
        entries.set(n.key, e);
      }
      if (typed) e.typed++;
      // Within one session only the first visit scores, unless this one was typed.
      if (v.time - e.last >= gap || typed) {
        e.visits++;
        e.score += (typed ? o.typedWeight : 1) * Math.exp(-lambda * (now - v.time));
      }
      e.last = v.time;
      // Prefer the title of the canonical page itself; a sub-page title (a PR,
      // a search, a board with an issue panel) only fills in when nothing else has.
      const title = cleanTitle(v.title);
      const canonical = n.href && stripUrl(v.url) === stripUrl(n.href);
      if (title && (!n.issue || title.includes(n.issue)) && (canonical || !e.title || !e.titleCanonical)) {
        if (canonical || !e.titleCanonical) e.title = title;
        if (canonical) e.titleCanonical = true;
      }
      if (!e.href) e.href = v.url;
    }
  }

  // Unknown hosts often serve one page under several URLs (session ids, query
  // variants); merge entries of the same hub that share a title.
  const merged = new Map();
  for (const e of entries.values()) {
    const k = e.label || !e.title ? e.key : `${e.hub}\u0000${e.title}`;
    const m = merged.get(k);
    if (!m) {
      merged.set(k, e);
      continue;
    }
    const [keep, other] = m.score >= e.score ? [m, e] : [e, m];
    keep.score += other.score;
    keep.visits += other.visits;
    keep.typed += other.typed;
    keep.first = Math.min(keep.first, other.first);
    keep.last = Math.max(keep.last, other.last);
    merged.set(k, keep);
  }

  const hubs = new Map();
  for (const e of merged.values()) {
    if (!hubs.has(e.hub)) hubs.set(e.hub, { name: e.hub, score: 0, entries: [] });
    const h = hubs.get(e.hub);
    h.score += e.score;
    h.entries.push(e);
  }
  for (const h of hubs.values()) h.entries.sort((a, b) => b.score - a.score);
  return [...hubs.values()].sort((a, b) => b.score - a.score);
}
