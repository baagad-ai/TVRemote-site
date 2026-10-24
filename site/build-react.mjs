import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import articles from './src/guides.json' with { type: 'json' };
import faq from './src/faq.json' with { type: 'json' };
import { loadConfig, siteUrl, verifyApkAsset } from './deployment-config.mjs';
import { approvedRelease } from './src/download-metrics.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, '..'), scratch = path.join(repo, '.build');
const config = loadConfig();
const canonical = siteUrl(process.env.SITE_URL);
if (process.argv.includes('--production')) verifyApkAsset(config);
await fs.mkdir(scratch, { recursive: true });
// Landing image slots (src/slots.js): only PNGs that exist in assets/showcase are offered to the bundle.
const showcase = {};
for (const name of await fs.readdir(path.join(root, 'assets/showcase'))) {
  const file = path.join(root, 'assets/showcase', name);
  if (name.endsWith('.png')) showcase[name] = (await fs.readFile(file)).readUInt32BE(20);
  else if (name.endsWith('.svg')) { const box = (await fs.readFile(file, 'utf8')).match(/viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/); showcase[name] = box ? { width: Math.round(+box[1]), height: Math.round(+box[2]) } : { width: 1200, height: 800 }; }
}
// Concept B 3D slots (src/b/media.js): Build's production files in assets/3d-prod/ replace their placeholders.
const prodFiles = {};
for (const name of await fs.readdir(path.join(root, 'assets/3d-prod')).catch(() => [])) if (!name.startsWith('.') && !name.endsWith('.md')) prodFiles[name] = (await fs.stat(path.join(root, 'assets/3d-prod', name))).size;
const define = { __SHOWCASE_FILES__: JSON.stringify(showcase), __PROD_FILES__: JSON.stringify(prodFiles) };
// One stylesheet: the base site styles, then Concept B's landing styles (src/living-room.css).
// Then each Concept B section's own stylesheet (src/b/sections/<section>.css) in page order, when present.
const SECTION_CSS = ['hero', 'pin', 'bento', 'rooms', 'guests', 'gallery', 'proof', 'finale'];
const sectionCss = (await Promise.all(SECTION_CSS.map(name => fs.readFile(path.join(root, 'src/b/sections', name + '.css'), 'utf8').catch(() => '')))).filter(Boolean).join('\n');
await fs.writeFile(path.join(root, 'styles.css'), (await fs.readFile(path.join(root, 'src/site.css'), 'utf8')) + '\n' + (await fs.readFile(path.join(root, 'src/living-room.css'), 'utf8')) + (sectionCss ? '\n' + sectionCss : ''));
await build({ entryPoints: [path.join(root, 'src/render.jsx')], outfile: path.join(scratch, 'render.cjs'), bundle: true, platform: 'node', format: 'cjs', packages: 'external', external: ['./scene-runtime.js'], jsx: 'automatic', define, logLevel: 'warning' });
const { render } = createRequire(import.meta.url)(path.join(scratch, 'render.cjs'));
const browserBuild = await build({ metafile: true, entryPoints: { app: path.join(root, 'src/client.jsx') }, outdir: path.join(root, 'runtime'), bundle: true, splitting: true, format: 'esm', platform: 'browser', target: 'es2022', jsx: 'automatic', minify: true, sourcemap: false, chunkNames: 'chunk-[hash]', define: { ...define, 'process.env.NODE_ENV': '"production"' }, legalComments: 'eof', logLevel: 'warning' });
const generated = new Set(Object.keys(browserBuild.metafile.outputs).map(file => path.basename(file)));
for (const name of await fs.readdir(path.join(root, 'runtime'))) if (/^chunk-[A-Z0-9]+\.js$/.test(name) && !generated.has(name)) await fs.unlink(path.join(root, 'runtime', name));
function document(route, markup) {
  const privacy = route === 'privacy', article = articles.find(a => route === `guides/${a.slug}`), guides = route === 'guides', prefix = article ? '../../' : privacy || guides ? '../' : '';
  const suffix = route === 'landing' ? '' : route + '/';
  // Google Search Console ownership token (homepage only), copied verbatim from the owner.
  const verification = route === 'landing' ? '<meta name="google-site-verification" content="UZdeG9wcSvyzel4qHdnVUz0J00bSkjQ0E3jjGAxkb5w" />' : '';
  const faqSchema = route === 'landing' ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })) }).replaceAll('<', '\\u003c')}</script>` : '';
  const escape = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const title = escape(article ? article.title : guides ? 'Android TV and Google TV guides and answers' : privacy ? 'Privacy policy | The Remote' : 'The Remote: free Android TV and Google TV remote for your phone');
  const description = escape(article ? article.description : guides ? 'Practical answers about phone remotes for Android TV and Google TV: pairing, YouTube search, shared links, guests, trackpad gestures, missing TVs and lost remotes.' : privacy ? 'How The Remote handles local app data, optional diagnostics, website analytics, and download click counts.' : 'A free phone remote for Android TV and Google TV. Search YouTube from your phone, share links to the right TV, and invite guests to use their own phones. No ads, no sign-up.');
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#0b0e0d"><title>${title}</title><meta name="description" content="${description}">${verification}<link rel="canonical" href="${canonical}${suffix}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${canonical}${suffix}"><meta property="og:image" content="${canonical}assets/og-preview.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="The Remote. Skip the TV keyboard on YouTube. Free for Android. No ads. No account. Download the app at theremote-site.pages.dev."><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="${prefix}assets/focus-key.svg" type="image/svg+xml"><link rel="preload" href="${prefix}assets/outfit-variable.ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="${prefix}styles.css">${faqSchema}</head><body id="top" data-route="${route}"><div id="root">${markup}</div><script src="${prefix}config.js"></script><script src="${prefix}analytics.js" defer></script><script type="module" src="${prefix}runtime/app.js"></script></body></html>\n`;
}
// 404 page: Cloudflare Pages serves 404.html (with a 404 status) for unknown paths at any depth,
// so it uses root-absolute URLs, is noindex, has no canonical URL, and loads no scripts (no runtime, analytics or click counting).
{
  const title = 'Page not found | The Remote';
  await fs.writeFile(path.join(root, '404.html'), `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#0b0e0d"><meta name="robots" content="noindex"><title>${title}</title><meta name="description" content="This page doesn’t exist on The Remote’s website."><link rel="icon" href="/assets/focus-key.svg" type="image/svg+xml"><link rel="preload" href="/assets/outfit-variable.ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="/styles.css"></head><body id="top" data-route="not-found"><div id="root">${render('not-found', config)}</div></body></html>\n`);
}
// /join: landing page for Guest access invite links (https://theremote-site.pages.dev/join#<invite>) when The Remote
// isn't installed. Plain static HTML with ZERO JavaScript (no runtime, config, analytics or click counting), noindex,
// outside the sitemap. The invite code stays after the #, which browsers never send to a server. Root-absolute URLs so
// /join and /join/ both work. _headers gives it a strict CSP (script-src 'none') and Referrer-Policy: no-referrer.
{
  const release = approvedRelease(config);
  const esc = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const download = release ? `<a class="download-cta" href="${esc(release.url)}" download rel="noreferrer"><span>Download the app</span><span class="cta-arrow" aria-hidden="true">↗</span></a>` : '<a class="download-cta" href="/#download"><span>Download the app</span><span class="cta-arrow" aria-hidden="true">↗</span></a>';
  await fs.mkdir(path.join(root, 'join'), { recursive: true });
  await fs.writeFile(path.join(root, 'join/index.html'), `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#0b0e0d"><meta name="robots" content="noindex, nofollow"><meta name="referrer" content="no-referrer"><title>Get The Remote, then scan again | The Remote</title><meta name="description" content="This invite opens in The Remote on an Android phone. Download the app, then scan the QR code again or type the invite code."><link rel="icon" href="/assets/focus-key.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"></head><body id="top" data-route="join"><header class="site-header page-width"><a class="brand" href="/"><img src="/assets/focus-key.svg" alt="" width="30" height="30"><span>The Remote.</span></a></header><main id="main" class="guides-main join-main page-width"><div class="section-heading"><p class="eyebrow">Guest access invite</p><h1>Get The Remote, then scan again</h1><p>This invite opens in The Remote on an Android phone (Android 8.0 or later). Download the app, then scan the QR code again or type the invite code.</p></div><div class="join-actions">${download}</div></main><footer class="site-footer page-width"><p class="join-note">The invite code stays in this link. It's never sent to our server.</p></footer></body></html>\n`);
}
for (const route of ['landing', 'privacy', 'guides', ...articles.map(a => 'guides/' + a.slug)]) {
  const output = path.join(root, route === 'landing' ? 'index.html' : route + '/index.html');
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, document(route, render(route, config)));
}
await fs.writeFile(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['', 'privacy/', 'guides/', ...articles.map(a => 'guides/' + a.slug + '/')].map(p => `<url><loc>${canonical}${p}</loc></url>`).join('')}</urlset>\n`);
await fs.writeFile(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${canonical}sitemap.xml\n`);
console.log(`Prerendered ${3 + articles.length} public routes`+' and the 404 page; built shared React runtime and lazy GLB chunk.');
