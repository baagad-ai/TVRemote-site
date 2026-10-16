import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import articles from './src/guides.json' with { type: 'json' };
import { loadConfig, verifyApkAsset } from './deployment-config.mjs';
import { publicFiles } from './stage-files.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const config = loadConfig();
const apkAsset = config?.apkRelease ? verifyApkAsset(config) : null;
const target = path.resolve(process.argv[2] || '_site');
const relativeTarget = path.relative(path.dirname(root), target);
if (!relativeTarget || relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget) || target === root) throw Error('Choose a separate staging directory');
await fs.mkdir(target, { recursive: true });
if ((await fs.readdir(target)).length) throw Error('Staging directory must be empty to prevent publishing stale files');
const files = await publicFiles(root, articles);
if (!files.includes('404.html')) throw Error('404.html must be staged at the root of _site');
for (const relative of files) {
  const output = path.join(target, relative); await fs.mkdir(path.dirname(output), { recursive: true }); await fs.copyFile(path.join(root, relative), output);
}
if (apkAsset) {
  const output = path.join(target, apkAsset.relativePath);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, apkAsset.data, { flag: 'wx' });
}
console.log(`Staged ${files.length} public files. Worker, source, tests, strategy, and authoring assets excluded.`);
