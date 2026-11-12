// Assembles the loadable extension into dist/extension: source files plus the
// shared ranking modules and design tokens, which the extension needs as local files.
import { cpSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import { basename } from "node:path";

const out = "dist/extension";
rmSync(out, { recursive: true, force: true });
cpSync("extension", out, { recursive: true });
mkdirSync(`${out}/lib`, { recursive: true });
for (const f of ["src/rank.mjs", "src/snapshot.mjs", "prototypes/_shared/tokens.css"]) {
  copyFileSync(f, `${out}/lib/${basename(f)}`);
}
console.error(`built ${out} — load it via chrome://extensions > Load unpacked`);
