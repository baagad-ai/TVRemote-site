// Dry run of stage.mjs's copy rules: no files are written and no APK / production verification is involved.
// node tools/stage-dry-run.mjs  -> lists what would be staged and fails if a forbidden file would ship or a URL the
// built pages / CSS / runtime reference would be missing from the staged set.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import articles from '../src/guides.json' with { type: 'json' };
import { publicFiles, builtTextFiles, ASSET_URL } from '../stage-files.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = await publicFiles(root, articles), staged = new Set(files), problems = [];
for (const f of files) await fs.access(path.join(root, f)).catch(() => problems.push('missing source: ' + f));
const FORBIDDEN = [/(^|\/)phone-[^/]*\.webp$/i, /pin-step-/i, /^assets\/(?:showcase|gallery)\//, /^assets\/board\/(?:guests-|remote-home-|youtube-|your-tvs-|pair-name-|trackpad-pad-|loop\d)/];
for (const f of files) if (FORBIDDEN.some(r => r.test(f))) problems.push('forbidden file would be staged: ' + f);
// Literal asset URLs and local src/href/srcset/url() references in every built text file.
const refs = new Map();
const add = (raw, from) => {
  let ref = raw.split(/[?#]/)[0]; if (!ref || /^(?:https?:|data:|mailto:|tel:|blob:|javascript:|\/\/)/.test(ref)) return;
  // Root-relative stays as is; page-relative resolves against the page's folder (assets/... literals are root paths).
  ref = ref.startsWith('/') ? ref.slice(1) : /^assets\//.test(ref) || !from.endsWith('.html') ? ref : path.posix.normalize(path.posix.join(path.posix.dirname(from), ref));
  if (ref === '.' || ref === './') ref = ''; if (!refs.has(ref)) refs.set(ref, from);
};
for (const file of await builtTextFiles(root, articles)) {
  const text = await fs.readFile(path.join(root, file), 'utf8').catch(() => null); if (text == null) { problems.push('built file missing: ' + file); continue; }
  for (const m of text.matchAll(ASSET_URL)) add(m[0], file);
  if (file.endsWith('.html')) for (const m of text.matchAll(/\s(?:src|href|poster)="([^"]+)"|\ssrcset="([^"]+)"/gi)) {
    if (m[1]) add(m[1], file); else m[2].split(',').forEach(part => add(part.trim().split(/\s+/)[0], file));
  }
  if (file.endsWith('.css')) for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) add(m[1], file);
  if (file.endsWith('.js')) for (const m of text.matchAll(/import\(\s*["'](\.\/[^"']+)["']\s*\)|from\s*["'](\.\/[^"']+)["']/g)) add('runtime/' + (m[1] || m[2]).slice(2), file);
}
const routes = new Set(['', 'privacy/', 'guides/', 'join/', ...articles.map(a => `guides/${a.slug}/`)]);
for (const [ref, from] of refs) {
  if (ref.startsWith('api/') || ref.startsWith('#')) continue;
  const clean = ref;
  if (routes.has(clean) || routes.has(clean + '/') || staged.has(clean) || staged.has(clean + 'index.html') || staged.has(clean.replace(/\/$/, '') + '/index.html')) continue;
  if (/\.(?:apk)$/i.test(clean)) continue; // the APK is added by stage.mjs from the verified release only
  problems.push(`unresolved reference ${ref} (in ${from})`);
}
// Template references in the runtime: assets/3d-prod/${PROD_NAMES[key]} and assets/b/gallery-${name}.webp.
const app = await fs.readFile(path.join(root, 'runtime/app.js'), 'utf8');
for (const name of ['remote-home', 'youtube-search', 'youtube-share', 'your-tvs-g1', 'pair-name-and-room', 'guests-guest-remote', 'trackpad-pad'])
  if (!staged.has(`assets/b/gallery-${name}.webp`)) problems.push('gallery texture not staged: ' + name);
const prodPresent = (await fs.readdir(path.join(root, 'assets/3d-prod'))).filter(n => !n.startsWith('.') && !n.endsWith('.md') && n !== 'textures');
for (const n of prodPresent) if (!staged.has('assets/3d-prod/' + n)) problems.push('3d-prod file not staged: ' + n);
if (!app.includes('assets/3d-prod/')) problems.push('runtime no longer builds 3d-prod URLs (check the template rule)');
console.log(`Would stage ${files.length} files.`);
console.log(files.filter(f => f.startsWith('assets/')).join('\n'));
console.log(`Checked ${refs.size} references.`);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('PASS: no phone-*.webp, pin-step-*, showcase or gallery captures; every referenced URL is staged.');
