// The public file list for stage.mjs (and its dry run, tools/stage-dry-run.mjs). Folder-staged assets as before, plus
// assets/board/: only the board files the built pages actually reference (the folder also holds authoring frames and
// app captures that must never ship).
import fs from 'node:fs/promises';
import path from 'node:path';

export const PAGE_FILES = articles => ['index.html', '404.html', 'join/index.html', 'privacy/index.html', 'guides/index.html', ...articles.map(a => `guides/${a.slug}/index.html`)];
// assets/showcase and assets/gallery (real app captures from the earlier site) are no longer staged: no built page
// references them, and captures must not ship.
const FOLDERS = ['runtime', 'licenses', 'assets/3d', 'assets/licenses', 'assets/b', 'assets/3d-prod', 'assets/3d-prod/textures'];
export const ASSET_URL = /assets\/[A-Za-z0-9_\-./]+\.(?:webp|png|jpe?g|svg|glb|json|webm|mp4|ttf|woff2?|txt)/g;

// Every built text file a browser loads: the pages, the stylesheet and the runtime chunks.
export async function builtTextFiles(root, articles) {
  const runtime = (await fs.readdir(path.join(root, 'runtime'))).filter(n => n.endsWith('.js')).map(n => `runtime/${n}`);
  return [...PAGE_FILES(articles), 'styles.css', 'analytics.js', 'config.js', ...runtime];
}
export async function referencedAssets(root, articles) {
  const refs = new Set();
  for (const file of await builtTextFiles(root, articles)) {
    const text = await fs.readFile(path.join(root, file), 'utf8').catch(() => '');
    for (const m of text.matchAll(ASSET_URL)) refs.add(m[0]);
  }
  return refs;
}
export async function publicFiles(root, articles) {
  const files = [...PAGE_FILES(articles), '.well-known/assetlinks.json', 'styles.css', 'config.js', 'analytics.js', 'sitemap.xml', 'robots.txt', '_headers', '_redirects', '_routes.json'];
  for (const folder of FOLDERS) {
    for (const entry of await fs.readdir(path.join(root, folder), { withFileTypes: true })) {
      if (entry.name.startsWith('.') || (folder === 'assets/3d-prod' && /\.md$/i.test(entry.name))) continue;
      if (folder === 'assets/3d-prod' && entry.isDirectory() && entry.name === 'textures') continue; // staged as its own folder (pin screen textures)
      if (!entry.isFile()) throw Error('Unexpected nested public asset');
      if (folder === 'assets/3d' && !/^(?:remote-hero\.glb|room-(?:destinations(?:-(?:living|bedroom)-(?:1440|720)\.webp|-contract\.json|\.glb)|(?:living|bedroom)-mobile\.webp))$/.test(entry.name)) continue; // remote-hero.glb: Concept B pin placeholder
      if (!/\.(js|json|glb|webp|png|txt|md)$/i.test(entry.name) && !(/^assets\/(?:b|3d-prod)$/.test(folder) && /\.(?:webm|mp4)$/i.test(entry.name)) ) throw Error('Unexpected public asset type');
      files.push(folder + '/' + entry.name);
    }
  }
  // Design's board assets: referenced ones only.
  for (const ref of [...await referencedAssets(root, articles)].filter(r => r.startsWith('assets/board/')).sort()) {
    if (!/\.webp$/i.test(ref)) throw Error('Unexpected board asset type: ' + ref);
    await fs.access(path.join(root, ref)).catch(() => { throw Error('Referenced board asset missing: ' + ref); });
    files.push(ref);
  }
  files.push('assets/focus-key.svg', 'assets/qr-download.svg', 'assets/og-preview.png', 'assets/work-sans-variable.ttf', 'assets/outfit-variable.ttf');
  return [...new Set(files)];
}
