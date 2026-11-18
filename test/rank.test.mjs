// Unit tests for the ranking core. Synthetic data only: no real history.
// Run with: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { learnFolds, normalize, rank } from "../src/rank.mjs";

const DAY = 86400e3;
const HOUR = 3600e3;
const NOW = Date.parse("2026-01-31T00:00:00Z");
const LINK = 0;
const TYPED = 1;

const visit = (url, ago, { transition = LINK, title = "" } = {}) => ({
  url,
  title,
  time: NOW - ago,
  transition,
});

// Each id visited once, a day apart: nothing is ever revisited.
const chats = (n) =>
  Array.from({ length: n }, (_, i) => visit(`https://app.example.com/chat/c0ffee${i}aaaabbbbcccc`, (i + 1) * DAY));

// Each id visited in two separate sessions: every instance is revisited.
const docs = (n) =>
  Array.from({ length: n }, (_, i) => [
    visit(`https://app.example.com/design/p/${1000 + i}`, (i + 1) * DAY),
    visit(`https://app.example.com/design/p/${1000 + i}`, (i + 1) * DAY + 2 * HOUR),
  ]).flat();

const entry = (hubs, key) => hubs.flatMap((h) => h.entries).find((e) => e.key === key);

test("rarely revisited id paths fold into the site", () => {
  const folds = learnFolds(chats(5));
  assert.ok(folds.has("app.example.com"));
  const [n] = normalize("https://app.example.com/chat/c0ffee9aaaabbbbcccc", { folds });
  assert.equal(n.key, "app.example.com");
  assert.equal(n.href, "https://app.example.com");
});

test("revisited id paths stay one entry each", () => {
  const folds = learnFolds(docs(4));
  assert.equal(folds.has("app.example.com/design/p"), false);
  const keys = new Set(rank(docs(4), NOW).flatMap((h) => h.entries).map((e) => e.key));
  assert.equal(keys.size, 4);
});

test("chats fold while saved projects on the same site stay separate", () => {
  const hubs = rank([...chats(5), ...docs(3)], NOW);
  const site = hubs.find((h) => h.name === "app.example.com");
  assert.equal(site.entries.length, 4); // one folded chat entry + three projects
  assert.equal(entry(hubs, "app.example.com").visits, 5);
});

test("fold threshold sits at a 25% revisit share", () => {
  // n of 10 instances get a second session.
  const mixed = (n) =>
    Array.from({ length: 10 }, (_, i) => {
      const url = `https://feed.example.com/post/${5000 + i}`;
      const first = visit(url, (i + 1) * DAY);
      return i < n ? [first, visit(url, (i + 1) * DAY + 2 * HOUR)] : [first];
    }).flat();
  assert.ok(learnFolds(mixed(2)).has("feed.example.com"));
  assert.equal(learnFolds(mixed(3)).has("feed.example.com"), false);
});

test("too few instances never fold", () => {
  assert.equal(learnFolds(chats(2)).size, 0);
});

test("GitHub PR sub-pages credit the PR while other sub-pages credit the repo", () => {
  const [pr] = normalize("https://github.com/acme/widget/pull/42/files");
  assert.equal(pr.key, "github:acme/widget#42");
  assert.equal(pr.label, "widget#42");
  assert.equal(pr.href, "https://github.com/acme/widget/pull/42");

  const [repo] = normalize("https://github.com/acme/widget/actions");
  assert.equal(repo.key, "github:acme/widget");
  assert.equal(repo.href, "https://github.com/acme/widget");
});

test("an issue opened in a board panel credits board and issue, unless typed", () => {
  const url = "https://acme.atlassian.net/jira/software/projects/ABC/boards/7/backlog?selectedIssue=ABC-12";
  assert.deepEqual(
    normalize(url).map((n) => n.key),
    ["jira:ABC/7/backlog", "jira:ABC-12"],
  );
  assert.deepEqual(
    normalize(url, { typed: true }).map((n) => n.key),
    ["jira:ABC/7/backlog"],
  );
});

test("sign-in hosts and auth paths are skipped", () => {
  assert.deepEqual(normalize("https://login.microsoftonline.com/common/oauth2"), []);
  assert.deepEqual(normalize("https://tool.example.com/oauth2/callback?code=x"), []);
  assert.deepEqual(normalize("chrome-extension://abc/page.html"), []);
});

test("score decays with age and typed visits weigh double", () => {
  const hubs = rank(
    [
      visit("https://a.example.com/x", 1 * DAY),
      visit("https://b.example.com/x", 15 * DAY),
      visit("https://c.example.com/x", 15 * DAY, { transition: TYPED }),
    ],
    NOW,
    { halfLifeDays: 14 },
  );
  const a = entry(hubs, "https://a.example.com/x");
  const b = entry(hubs, "https://b.example.com/x");
  const c = entry(hubs, "https://c.example.com/x");
  assert.ok(a.score > b.score);
  assert.ok(Math.abs(c.score - 2 * b.score) < 1e-9);
});

test("repeat visits within one session count once", () => {
  const url = "https://a.example.com/x";
  const hubs = rank([visit(url, 3 * HOUR), visit(url, 3 * HOUR - 60e3), visit(url, 1 * HOUR)], NOW);
  assert.equal(entry(hubs, url).visits, 2);
});

test("AWS console pages are not merged by service: each URL is its own entry", () => {
  const a = normalize("https://console.aws.amazon.com/ec2/home?region=ap-northeast-1#Instances:");
  const b = normalize("https://console.aws.amazon.com/ec2/home/?region=ap-northeast-1#Volumes:");
  const c = normalize("https://console.aws.amazon.com/ec2/v2/home#Images");
  assert.equal(a[0].key, "aws:/ec2/home");
  assert.equal(b[0].key, "aws:/ec2/home");
  assert.equal(c[0].key, "aws:/ec2/v2/home");
  assert.equal(a[0].href, "https://console.aws.amazon.com/ec2/home");
});
