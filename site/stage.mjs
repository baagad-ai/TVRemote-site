import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import articles from './src/guides.json' with { type: 'json' };
const root = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(process.argv[2] || '_site');
if (target === root || target === path.dirname(root)) throw Error('Choose a separate staging directory');
await fs.mkdir(target, { recursive: true });
const files = ['index.html', 'privacy/index.html', 'guides/index.html', 'styles.css', 'config.js', 'sitemap.xml', ...articles.map(a => `guides/${a.slug}/index.html`)];
for (const folder of ['runtime', 'licenses', 'assets/3d', 'assets/showcase', 'assets/licenses']) {
  for (const entry of await fs.readdir(path.join(root, folder), { withFileTypes: true })) {
    if (!entry.isFile()) throw Error('Unexpected nested public asset');
    if (!/\.(js|json|glb|webp|png|txt|md)$/i.test(entry.name)) throw Error('Unexpected public asset type');
    files.push(folder + '/' + entry.name);
  }
}
files.push('assets/focus-key.svg', 'assets/remote-demo-ltr.png', 'assets/work-sans-variable.ttf', 'assets/outfit-variable.ttf');
for (const relative of files) {
  const output = path.join(target, relative); await fs.mkdir(path.dirname(output), { recursive: true }); await fs.copyFile(path.join(root, relative), output);
}
console.log(`Staged ${files.length} public files. Worker, source, tests, strategy, and authoring assets excluded.`);
