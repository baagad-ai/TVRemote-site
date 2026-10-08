import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import articles from './src/guides.json' with { type: 'json' };
import { loadConfig, playTestingEnabled, verifyApkAsset } from './deployment-config.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const config = loadConfig();
const apkAsset = config?.apkRelease ? verifyApkAsset(config) : null;
const target = path.resolve(process.argv[2] || '_site');
const relativeTarget = path.relative(path.dirname(root), target);
if (!relativeTarget || relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget) || target === root) throw Error('Choose a separate staging directory');
await fs.mkdir(target, { recursive: true });
if ((await fs.readdir(target)).length) throw Error('Staging directory must be empty to prevent publishing stale files');
const files = ['index.html', 'privacy/index.html', 'guides/index.html', 'styles.css', 'config.js', 'sitemap.xml', 'robots.txt', '_headers', '_redirects', '_routes.json', ...(playTestingEnabled(config) ? ['join/index.html'] : []), ...articles.map(a => `guides/${a.slug}/index.html`)];
for (const folder of ['runtime', 'licenses', 'assets/3d', 'assets/showcase', 'assets/licenses']) {
  for (const entry of await fs.readdir(path.join(root, folder), { withFileTypes: true })) {
    if (!entry.isFile()) throw Error('Unexpected nested public asset');
    if (folder === 'assets/3d' && !/^room-(?:destinations(?:-(?:living|bedroom)-(?:1440|720)\.webp|-contract\.json|\.glb)|(?:living|bedroom)-mobile\.webp)$/.test(entry.name)) continue;
    if (!/\.(js|json|glb|webp|png|txt|md)$/i.test(entry.name)) throw Error('Unexpected public asset type');
    files.push(folder + '/' + entry.name);
  }
}
files.push('assets/focus-key.svg', 'assets/remote-demo-ltr.png', 'assets/og-preview.png', 'assets/work-sans-variable.ttf', 'assets/outfit-variable.ttf');
for (const relative of files) {
  const output = path.join(target, relative); await fs.mkdir(path.dirname(output), { recursive: true }); await fs.copyFile(path.join(root, relative), output);
}
if (apkAsset) {
  const output = path.join(target, apkAsset.relativePath);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, apkAsset.data, { flag: 'wx' });
}
console.log(`Staged ${files.length} public files. Worker, source, tests, strategy, and authoring assets excluded.`);
