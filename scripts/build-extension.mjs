// Assembles the loadable extension into dist/extension: source files plus the
// shared ranking modules and design tokens, which the extension needs as local files.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const args = process.argv.slice(2);
const store = args.length === 1 && args[0] === "--store";
if (args.length && !store) throw new Error("Usage: node scripts/build-extension.mjs [--store]");

const out = store ? "dist/store" : "dist/extension";
const manifest = JSON.parse(readFileSync("extension/manifest.json", "utf8"));
if (store) delete manifest.key;
const files = [
  ...["background.js", "newtab/index.html", "newtab/newtab.js", "newtab/i18n.mjs", "newtab/privacy.js", "icons/tab.svg", ...Object.values(manifest.icons)]
    .map((f) => [`extension/${f}`, f]),
  ...readdirSync("extension/_locales", { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map(({ name }) => [`extension/_locales/${name}/messages.json`, `_locales/${name}/messages.json`]),
  ...["src/rank.mjs", "src/snapshot.mjs", "extension/newtab/tokens.css"]
    .map((f) => [f, `lib/${basename(f)}`]),
];

rmSync(out, { recursive: true, force: true });
for (const [source, target] of files) {
  const path = `${out}/${target}`;
  mkdirSync(dirname(path), { recursive: true });
  copyFileSync(source, path);
}
writeFileSync(`${out}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);

if (store) {
  const zip = `dist/tidetab-${manifest.version}-store.zip`;
  rmSync(zip, { force: true });
  execFileSync("zip", ["-q", "-X", resolve(zip), "manifest.json", ...files.map(([, f]) => f)], { cwd: out });
  console.error(`built ${zip}`);
} else {
  console.error(`built ${out} — load it via chrome://extensions > Load unpacked`);
}
