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
    if (folder === 'assets/3d' && !/^room-(?:destinations(?:-(?:living|bedroom)-(?:1440|720)\.webp|-contract\.json|\.glb)|(?:living|bedroom)-mobile\.webp)$/.test(entry.name)) continue;
    if (!/\.(js|json|glb|webp|png|txt|md)$/i.test(entry.name)) throw Error('Unexpected public asset type');
    files.push(folder + '/' + entry.name);
  }
}
files.push('assets/focus-key.svg', 'assets/remote-demo-ltr.png', 'assets/work-sans-variable.ttf', 'assets/outfit-variable.ttf');
for (const relative of files) {
  const output = path.join(target, relative); await fs.mkdir(path.dirname(output), { recursive: true }); await fs.copyFile(path.join(root, relative), output);
}
console.log(`Staged ${files.length} public files. Worker, source, tests, strategy, and authoring assets excluded.`);

// The accepted comparison tree is copied into the same Pages artifact as production.
const previewPrefix = "previews/centered-story-20261006";
const previewFiles = [
  "nightline.css",
  "nightline.js",
  "beta-request.js",
  "assets/3d/room-bedroom-mobile.webp",
  "assets/3d/room-destinations-bedroom-1440.webp",
  "assets/3d/room-destinations-bedroom-720.webp",
  "assets/3d/room-destinations-contract.json",
  "assets/3d/room-destinations-living-1440.webp",
  "assets/3d/room-destinations-living-720.webp",
  "assets/3d/room-destinations.glb",
  "assets/3d/room-living-mobile.webp",
  "assets/focus-key.svg",
  "assets/licenses/Outfit-OFL.txt",
  "assets/licenses/WorkSans-OFL.txt",
  "assets/outfit-variable.ttf",
  "assets/screens-v2/tv-companion-setup-unpaired.png",
  "assets/screens-v2/welcome-beta6.png",
  "assets/screens-v2/welcome-beta6.webp",
  "assets/story-v2/chapter-controls-v2-desktop.png",
  "assets/story-v2/chapter-controls-v2-desktop.webp",
  "assets/story-v2/chapter-controls-v2-mobile.png",
  "assets/story-v2/chapter-controls-v2-mobile.webp",
  "assets/story-v2/chapter-controls-v2.glb",
  "assets/story-v2/chapter-navigation-v2-desktop.png",
  "assets/story-v2/chapter-navigation-v2-desktop.webp",
  "assets/story-v2/chapter-navigation-v2-mobile.png",
  "assets/story-v2/chapter-navigation-v2-mobile.webp",
  "assets/story-v2/chapter-navigation-v2.glb",
  "assets/story-v2/chapter-privacy-v2-desktop.png",
  "assets/story-v2/chapter-privacy-v2-desktop.webp",
  "assets/story-v2/chapter-privacy-v2-mobile.png",
  "assets/story-v2/chapter-privacy-v2-mobile.webp",
  "assets/story-v2/chapter-privacy-v2.glb",
  "assets/story-v2/chapter-welcome-v2-desktop.png",
  "assets/story-v2/chapter-welcome-v2-desktop.webp",
  "assets/story-v2/chapter-welcome-v2-mobile.png",
  "assets/story-v2/chapter-welcome-v2-mobile.webp",
  "assets/story-v2/chapter-welcome-v2.glb",
  "assets/story-v2/footer-desktop.glb",
  "assets/story-v2/footer-mobile.glb",
  "assets/story-v2/shared-room-desktop.png",
  "assets/story-v2/shared-room-desktop.webp",
  "assets/story-v2/shared-room-mobile.png",
  "assets/story-v2/shared-room-mobile.webp",
  "assets/work-sans-variable.ttf",
  "config.js",
  "guides/android-phone-google-tv-remote/index.html",
  "guides/android-tv-remote-app-cant-find-tv/index.html",
  "guides/index.html",
  "guides/lost-android-tv-remote/index.html",
  "guides/open-youtube-link-on-android-tv/index.html",
  "guides/search-youtube-tv-android-phone/index.html",
  "guides/type-on-android-tv-with-phone/index.html",
  "index.html",
  "licenses/GSAP-LICENSE-NOTICE.txt",
  "licenses/MagicUI-LICENSE.md",
  "licenses/Motion-LICENSE.md",
  "licenses/OGL-LICENSE.txt",
  "licenses/React-LICENSE.txt",
  "licenses/ReactBits-LICENSE.md",
  "licenses/ReactDOM-LICENSE.txt",
  "licenses/Three-LICENSE.txt",
  "privacy/index.html",
  "runtime/app.js",
  "runtime/chunk-6FDNMQBQ.js",
  "runtime/chunk-R4NJ4XCJ.js",
  "runtime/chunk-S2JDRDHA.js",
  "runtime/chunk-SQE76S5B.js",
  "styles.css"
];
for (const relative of previewFiles) {
  const source = path.join(root,previewPrefix,relative), output = path.join(target,previewPrefix,relative);
  const stat = await fs.lstat(source); if (!stat.isFile() || stat.isSymbolicLink()) throw Error("Invalid preview entry");
  await fs.mkdir(path.dirname(output), {recursive:true}); await fs.copyFile(source,output);
}
