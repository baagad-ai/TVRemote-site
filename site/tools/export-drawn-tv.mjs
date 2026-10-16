// Re-exports assets/board/tv-{home,results-f0,playing}-1440.webp (the pin's 3D TV textures, PinStory.jsx) from the
// code-drawn TV (src/b/DrawnTV.jsx): solid site tokens only, panel tiles with a line outline (QA 16 Oct 21:00).
// node site/tools/export-drawn-tv.mjs  (needs esbuild, Playwright at /workspace/pwtool, python3 + Pillow)
import { build } from 'esbuild';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tv-'));
const entry = path.join(tmp, 'entry.jsx');
fs.writeFileSync(entry, `import { renderToStaticMarkup } from 'react-dom/server';\nimport DrawnTV from ${JSON.stringify(path.join(root, 'src/b/DrawnTV.jsx'))};\nexport const svg = s => renderToStaticMarkup(<DrawnTV state={s} focus={0} idPrefix="x" />);`);
await build({ entryPoints: [entry], outfile: path.join(tmp, 'tv.cjs'), bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', nodePaths: [path.join(root, '..', 'node_modules')], logLevel: 'warning' });
const req = createRequire(path.join(root, 'package.json')); const { svg } = createRequire(import.meta.url)(path.join(tmp, 'tv.cjs'));
const { chromium } = req('/workspace/pwtool/node_modules/playwright');
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1440, height: 810 } });
for (const [state, name] of [['home', 'tv-home'], ['results', 'tv-results-f0'], ['playing', 'tv-playing']]) {
  await p.setContent(`<!doctype html><style>html,body{margin:0;background:#0b0e0d}svg{display:block;width:1440px;height:810px}</style>${svg(state)}`);
  await p.evaluate(() => document.fonts.ready);
  const png = path.join(tmp, `${name}.png`); await p.screenshot({ path: png });
  execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(png)}).convert('RGB').save(${JSON.stringify(path.join(root, 'assets/board', name + '-1440.webp'))}, 'WEBP', lossless=True, method=6)`]);
  console.log('wrote', `assets/board/${name}-1440.webp`);
}
await b.close();
