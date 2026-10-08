import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import articles from './src/guides.json' with { type: 'json' };
import faq from './src/faq.json' with { type: 'json' };
import { loadConfig, siteUrl, verifyApkAsset } from './deployment-config.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, '..'), scratch = path.join(repo, '.build');
const config = loadConfig();
const canonical = siteUrl(process.env.SITE_URL);
if (process.argv.includes('--production')) verifyApkAsset(config);
await fs.mkdir(scratch, { recursive: true });
await fs.copyFile(path.join(root, 'src/site.css'), path.join(root, 'styles.css'));
await build({ entryPoints: [path.join(root, 'src/render.jsx')], outfile: path.join(scratch, 'render.cjs'), bundle: true, platform: 'node', format: 'cjs', packages: 'external', external: ['./scene-runtime.js'], jsx: 'automatic', logLevel: 'warning' });
const { render } = createRequire(import.meta.url)(path.join(scratch, 'render.cjs'));
const browserBuild = await build({ metafile: true, entryPoints: { app: path.join(root, 'src/client.jsx') }, outdir: path.join(root, 'runtime'), bundle: true, splitting: true, format: 'esm', platform: 'browser', target: 'es2022', jsx: 'automatic', minify: true, sourcemap: false, chunkNames: 'chunk-[hash]', define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'eof', logLevel: 'warning' });
const generated = new Set(Object.keys(browserBuild.metafile.outputs).map(file => path.basename(file)));
for (const name of await fs.readdir(path.join(root, 'runtime'))) if (/^chunk-[A-Z0-9]+\.js$/.test(name) && !generated.has(name)) await fs.unlink(path.join(root, 'runtime', name));
function document(route, markup) {
  const privacy = route === 'privacy', article = articles.find(a => route === `guides/${a.slug}`), guides = route === 'guides', prefix = article ? '../../' : privacy || guides ? '../' : '';
  const suffix = route === 'landing' ? '' : route + '/';
  const faqSchema = route === 'landing' ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })) }).replaceAll('<', '\\u003c')}</script>` : '';
  const escape = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const title = escape(article ? `${article.title} | The Remote` : guides ? 'Android TV and Google TV Guides | The Remote' : privacy ? 'Privacy policy | The Remote' : 'The Remote | Skip the TV keyboard');
  const description = escape(article ? article.description : guides ? 'Six practical guides to phone remotes, TV text entry, YouTube search, shared links, missing devices, and lost remotes.' : privacy ? 'How The Remote handles local app data, optional diagnostics, website analytics, and download click counts.' : 'A free phone remote for Android TV and Google TV. Type on your phone, send YouTube links to the right TV, and organize TVs by room. No ads, no account. Download the Android app.');
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#0b0e0d"><title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="${canonical}${suffix}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${canonical}${suffix}"><meta property="og:image" content="${canonical}assets/remote-demo-ltr.png"><link rel="icon" href="${prefix}assets/focus-key.svg" type="image/svg+xml"><link rel="preload" href="${prefix}assets/outfit-variable.ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="${prefix}styles.css">${faqSchema}</head><body id="top" data-route="${route}"><div id="root">${markup}</div><script src="${prefix}config.js"></script><script type="module" src="${prefix}runtime/app.js"></script></body></html>\n`;
}
for (const route of ['landing', 'privacy', 'guides', ...articles.map(a => 'guides/' + a.slug)]) {
  const output = path.join(root, route === 'landing' ? 'index.html' : route + '/index.html');
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, document(route, render(route, config)));
}
await fs.writeFile(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['', 'privacy/', 'guides/', ...articles.map(a => 'guides/' + a.slug + '/')].map(p => `<url><loc>${canonical}${p}</loc></url>`).join('')}</urlset>\n`);
await fs.writeFile(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${canonical}sitemap.xml\n`);
console.log('Prerendered nine public routes; built shared React runtime and lazy GLB chunk.');
