// Writes the e-paper page: `bun scripts/trmnl.ts [out.html] [--demo=<fixture>]`.
//
// Run after `vite build` (it is chained in the "build" script), because Vite
// empties dist/ first. The result is one self-contained file: fonts and logo
// are embedded, see src/trmnl.ts for why.
//
// `bun scripts/trmnl.ts --check-png <file>` verifies instead that a screenshot
// of the page has exactly the size of the panel (used by the workflows).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { TRMNL_X, renderTrmnl } from "../src/trmnl";
import type { StatusPayload } from "../src/types";

const root = resolve(import.meta.dir, "..");
const args = process.argv.slice(2);

const checkAt = args.indexOf("--check-png");
if (checkAt >= 0) {
  // A PNG starts with an 8-byte signature, then the IHDR chunk: width and
  // height are the two big-endian 32-bit integers at offsets 16 and 20.
  const png = readFileSync(resolve(args[checkAt + 1] ?? "dist/trmnl.png"));
  const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];
  if (w !== TRMNL_X.width || h !== TRMNL_X.height) {
    console.error(`trmnl.png is ${w} × ${h}, expected ${TRMNL_X.width} × ${TRMNL_X.height}`);
    process.exit(1);
  }
  console.log(`trmnl.png is ${w} × ${h}`);
  process.exit(0);
}

const demo = args.find((a) => a.startsWith("--demo="))?.slice("--demo=".length);
const out = resolve(args.find((a) => !a.startsWith("--")) ?? resolve(root, "dist/trmnl.html"));
const source = demo ? `src/data/fixtures/${demo}.json` : "src/data/status.json";
if (!existsSync(resolve(root, source))) {
  console.error(`No such data file: ${source}`);
  process.exit(1);
}
const data = JSON.parse(readFileSync(resolve(root, source), "utf8")) as StatusPayload;

/** One @font-face with the latin subset of a variable font embedded. */
function fontFace(family: string, pkg: string, file: string): string {
  const woff2 = readFileSync(resolve(root, "node_modules", pkg, "files", file));
  return `@font-face { font-family: "${family}"; font-style: normal; font-weight: 100 1000; src: url(data:font/woff2;base64,${woff2.toString("base64")}) format("woff2-variations"); }`;
}

const html = renderTrmnl(data, {
  ...TRMNL_X,
  // The official logo, untouched: the panel turns its colours into greys.
  logoSvg: readFileSync(resolve(root, "public/isc-logo-black.svg"), "utf8").replace(/<\?xml[^>]*\?>/, "").trim(),
  fontCss: [
    fontFace("DM Sans Variable", "@fontsource-variable/dm-sans", "dm-sans-latin-wght-normal.woff2"),
    fontFace("Fira Code Variable", "@fontsource-variable/fira-code", "fira-code-latin-wght-normal.woff2"),
  ].join("\n"),
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`${out} (${TRMNL_X.width} × ${TRMNL_X.height}, ${(html.length / 1024).toFixed(0)} kB, from ${source})`);
