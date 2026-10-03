import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(process.argv[2] || ".");
if (!fs.existsSync(root)) throw new Error("Staging directory is missing: " + root);
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile()) files.push(file);
  }
}
walk(root);
const localPath = (reference, fromFile) => {
  if (!reference || /^(?:[a-z]+:|\/\/|#)/i.test(reference)) return null;
  const noHash = reference.split("#", 1)[0];
  const queryAt = noHash.indexOf("?");
  const pathname = queryAt < 0 ? noHash : noHash.slice(0, queryAt);
  if (!pathname) return null;
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { decoded = pathname; }
  const resolved = path.resolve(path.dirname(fromFile), decoded);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Asset escapes staging root: " + reference);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return { resolved, pathname, query: queryAt < 0 ? "" : noHash.slice(queryAt + 1), hash: reference.includes("#") ? reference.slice(reference.indexOf("#")) : "" };
};
function version(reference, fromFile) {
  const local = localPath(reference, fromFile);
  if (!local) return reference;
  const digest = crypto.createHash("sha256").update(fs.readFileSync(local.resolved)).digest("hex").slice(0, 16);
  const query = local.query.replace(/(?:^|&)v=[^&]*/g, "").replace(/^&|&$/g, "");
  return local.pathname + (query ? "?" + query + "&" : "?") + "v=" + digest + local.hash;
}
function versionSrcset(sourceSet, fromFile) {
  return sourceSet.split(",").map((candidate) => {
    const match = candidate.trim().match(/^(\S+)(?:\s+(.+))?$/);
    if (!match) return candidate.trim();
    return version(match[1], fromFile) + (match[2] ? " " + match[2] : "");
  }).join(", ");
}
let assetCount = 0;
const cssFiles = files.filter((file) => file.endsWith(".css"));
const moduleFiles = files.filter((file) => /\.(?:m?js)$/i.test(file));
const htmlFiles = files.filter((file) => file.endsWith(".html"));

for (const file of cssFiles) {
  let css = fs.readFileSync(file, "utf8");
  css = css.replace(/url\((["']?)([^"')]+)\1\)/gi, (whole, quote, ref) => {
    const result = version(ref.trim(), file);
    if (result !== ref.trim()) assetCount += 1;
    return "url(" + quote + result + quote + ")";
  });
  fs.writeFileSync(file, css);
}
for (const file of moduleFiles) {
  let script = fs.readFileSync(file, "utf8");
  script = script.replace(/\bfrom\s*(["'])([^"']+)\1/g, (whole, quote, ref) => {
    const result = version(ref, file);
    if (result !== ref) assetCount += 1;
    return "from " + quote + result + quote;
  });
  script = script.replace(/\bimport\s*(?:\(\s*)?(["'])([^"']+)\1/g, (whole, quote, ref) => {
    const result = version(ref, file);
    if (result !== ref) assetCount += 1;
    return whole.replace(ref, result);
  });
  fs.writeFileSync(file, script);
}
for (const file of htmlFiles) {
  let html = fs.readFileSync(file, "utf8");
  html = html.replace(/<[^>]+>/g, (tag) => {
    tag = tag.replace(/\b(href|src|poster|content)=(["'])(.*?)\2/gi, (whole, name, quote, ref) => {
      const result = version(ref, file);
      if (result !== ref) assetCount += 1;
      return name + "=" + quote + result + quote;
    });
    return tag.replace(/\bsrcset=(["'])(.*?)\1/gi, (whole, quote, sourceSet) => {
      const result = versionSrcset(sourceSet, file);
      if (result !== sourceSet) assetCount += 1;
      return "srcset=" + quote + result + quote;
    });
  });
  fs.writeFileSync(file, html);
}

function verify(reference, fromFile, source) {
  const local = localPath(reference, fromFile);
  if (local && version(reference, fromFile) !== reference) throw new Error("Missing or stale content hash in " + source + ": " + reference);
}
for (const file of cssFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/url\((["']?)([^"')]+)\1\)/gi)) verify(match[2].trim(), file, path.relative(root, file));
}
for (const file of moduleFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/\bfrom\s*(["'])([^"']+)\1/g)) verify(match[2], file, path.relative(root, file));
  for (const match of text.matchAll(/\bimport\s*(?:\(\s*)?(["'])([^"']+)\1/g)) verify(match[2], file, path.relative(root, file));
}
for (const file of htmlFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const tag of text.matchAll(/<[^>]+>/g)) {
    for (const match of tag[0].matchAll(/\b(href|src|poster|content)=(["'])(.*?)\2/gi)) verify(match[3], file, path.relative(root, file));
    for (const match of tag[0].matchAll(/\bsrcset=(["'])(.*?)\1/gi)) {
      for (const candidate of match[2].split(",")) {
        const reference = candidate.trim().match(/^(\S+)/)?.[1];
        if (reference) verify(reference, file, path.relative(root, file));
      }
    }
  }
}
console.log("Hashed and verified " + assetCount + " local stylesheet, module, font, image, and media references in " + root);
