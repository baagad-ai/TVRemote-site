import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { gzipSync } from "node:zlib";

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, "vendor/signal-dock/scene-enhancement.js");

await build({
  absWorkingDir: root,
  entryPoints: ["src/signal-dock-entry.js"],
  outfile: output,
  bundle: true,
  minify: true,
  treeShaking: true,
  legalComments: "none",
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  logLevel: "info"
});

const generated = readFileSync(output, "utf8");
const normalized = generated.replace(/^ +\t/gm, "\t").replace(/[ \t]+$/gm, "");
writeFileSync(output, normalized);
const bytes = Buffer.from(normalized);
const gzipBytes = gzipSync(bytes, { level: 9 }).byteLength;
if (gzipBytes > 200_000) {
  throw new Error(`Signal Dock enhancement is ${gzipBytes} gzip bytes; budget is 200000.`);
}
console.log(`Signal Dock enhancement: ${bytes.byteLength} bytes minified, ${gzipBytes} gzip bytes.`);
