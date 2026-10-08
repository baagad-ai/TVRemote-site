import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { siteUrl, loadConfig, playTestingEnabled } from './deployment-config.mjs';
import { approvedRelease } from './src/download-metrics.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const canonical=siteUrl(process.env.SITE_URL);
const articles=JSON.parse(fs.readFileSync(path.join(root,'src/guides.json'),'utf8'));
assert.equal(articles.length,6);
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const config=loadConfig(),play=playTestingEnabled(config);
const routes=['index.html','privacy/index.html',...(play?['join/index.html']:[]),'guides/index.html',...articles.map(a=>'guides/'+a.slug+'/index.html')];
for(const article of articles)assert.equal(read('content/guides/'+article.slug+'.md').trim(),article.body.trim(),'Article body and metadata must stay in sync');
for(const route of routes){
 const html=read(route);
 assert.equal((html.match(/<h1\b/g)||[]).length,1,route+' needs one H1');
 assert.match(html,/<main\b[^>]*id="main"/);
 assert.match(html,/class="skip-link" href="#main"/);
 const suffix=route==='index.html'?'':route.replace(/index\.html$/,'');
 assert(html.includes(`rel="canonical" href="${canonical}${suffix}"`),route+' canonical host/path mismatch');
 assert(html.includes(`property="og:url" content="${canonical}${suffix}"`),route+' Open Graph host/path mismatch');
 assert.match(html,/<meta name="description" content="[^"]+"/);
 assert(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(html),route+' contains control characters');
 // /join/ legitimately links the configured Google Group while Play testing is on.
 const scrubbed=route==='join/index.html'?html.replaceAll(config.playTesting.groupUrl.replaceAll('&','&amp;'),''):html;
 assert(!/editorial-review|publication gate|content launch plan|research-ai-search|Google Groups|groups\.google\.com/i.test(scrubbed),route+' contains private strategy or legacy flow');
 assert(!/<p># /.test(html),route+' duplicates the title');
 for(const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const ref=match[1];if(/^(https?:|mailto:|#|data:)/.test(ref))continue;
  const file=path.resolve(path.dirname(path.join(root,route)),ref.split('#')[0].split('?')[0]);
  if(ref.endsWith('/')||/\/#/.test(ref))assert(fs.existsSync(path.join(file,'index.html')),route+': '+ref);
  else assert(fs.existsSync(file),route+': '+ref);
 }
}
const html=read('index.html'),privacy=read('privacy/index.html');
for(const route of routes) assert(!/data-beta-request-form|beta-enrollment|Google Play account email|Request beta access|turnstile|beta-request\.js/i.test(read(route)),route+' must not expose the retired signup flow');
assert.match(html,/id="download"/);assert.match(html,/data-mobile-cta-bar[^>]*inert/);
const release=approvedRelease(config);
assert.equal(fs.existsSync(path.join(root,'join/index.html')),play,'/join/ must exist only while playTesting.enabled');
assert.equal(read('sitemap.xml').includes('/join/'),play,'sitemap /join/ entry must follow playTesting.enabled');
for(const route of routes){const page=read(route);if(play){if(route!=='join/index.html'&&route!=='privacy/index.html')assert(/data-play-cta/.test(page),route+' needs the Play CTA');}else assert(!/data-play-cta|join\/|apk-sheet|Join the beta/.test(page),route+' must not show Play testing while it is off');}
if(play&&release){assert.match(html,/<dialog[^>]*class="apk-sheet"[^>]*aria-labelledby="apk-sheet-title"/);const join=read('join/index.html');assert(join.includes(`href="${config.playTesting.optInUrl}"`));assert(join.includes(`href="${release.url}"`));assert(!join.includes('apk-sheet'),'/join/ links straight to the APK');}
if(release) {assert(html.includes(`href="${release.url.replaceAll('&','&amp;')}"`));assert.match(html,/data-download-cta="hero"/);assert(html.includes(release.sha256));}
else {assert.match(html,/Download is being prepared/);assert(!html.includes('data-download-cta='));}
assert.match(privacy,/Cloudflare Web Analytics/);assert.match(privacy,/click/i);assert.match(privacy,/D1/);
{const css=read('styles.css');
 // Skip link: visually hidden (1px, clipped) until it takes focus; shown on :focus / :focus-visible.
 assert.match(css,/\.skip-link\{[^}]*clip-path:inset\(50%\)[^}]*\}/,'skip link must be visually hidden at rest');assert.match(css,/\.skip-link:focus,\.skip-link:focus-visible\{[^}]*clip-path:none/,'skip link must appear on focus');assert(!/\.skip-link\{[^}]*transform/.test(css),'skip link must not be parked off-screen with a transform');
 // scrollbar-gutter only while the APK sheet is open (html.sheet-open), never on html at rest.
 assert(!/(^|[}\s])html\{[^}]*scrollbar-gutter/.test(css),'scrollbar-gutter must not be applied to html at rest');assert.match(css,/html\.sheet-open\{[^}]*scrollbar-gutter:stable/);
 assert(!/MiB/.test(read('index.html')),'APK size is shown in MB');}
assert.match(read('styles.css'),/prefers-reduced-motion/);assert.match(read('styles.css'),/:focus-visible/);assert.match(read('styles.css'),/safe-area-inset-bottom/);
for(const file of ['remote-demo-ltr.png','showcase/youtube-share-review.png','showcase/youtube-manual-controls.png','showcase/spotify-controls-manual-demo.png','showcase/saved-tv-room-list-demo.png','showcase/tv-details-edit-demo.png']){
 const bytes=fs.readFileSync(path.join(root,'assets',file));
 assert.equal(bytes.readUInt32BE(16),1080);assert.equal(bytes.readUInt32BE(20),2340);
}
const contract=JSON.parse(read('assets/3d/room-destinations-contract.json'));
{
 const bytes=fs.readFileSync(path.join(root,'assets/3d',contract.model));
 assert(bytes.length<700_000);assert.equal(bytes.readUInt32LE(0),0x46546c67);
 const data=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));
 assert(![...(data.buffers||[]),...(data.images||[])].some(x=>x.uri&&!x.uri.startsWith('data:')));
 const names=new Set(data.nodes.map(x=>x.name));
 for(const value of [...Object.values(contract.destinations),...Object.values(contract.selection),...Object.values(contract.screens)])assert(names.has(value),value+' is required');
 const triangles=data.meshes.flatMap(x=>x.primitives).reduce((n,p)=>n+(data.accessors[p.indices].count/3),0);assert(triangles<12000);
 assert.equal(contract.camera.aspect_ratio,1.5);assert.equal(contract.poster_fit,'contain; preserve 3:2; do not crop');
 for(const state of Object.values(contract.poster))for(const file of Object.values(state))assert(fs.existsSync(path.join(root,'assets/3d',file)),file+' fallback missing');
}
const sizes=fs.readdirSync(path.join(root,'runtime')).map(name=>({name,gzip:gzipSync(fs.readFileSync(path.join(root,'runtime',name)),{level:9}).length}));
assert(sizes.find(x=>x.name==='app.js').gzip<240000,'Initial runtime budget');
assert(sizes.filter(x=>x.name!=='app.js').every(x=>x.gzip<240000),'Lazy runtime budget');
for(const name of ['ReactBits-LICENSE.md','MagicUI-LICENSE.md','React-LICENSE.txt','ReactDOM-LICENSE.txt','Motion-LICENSE.md','Three-LICENSE.txt','OGL-LICENSE.txt','GSAP-LICENSE-NOTICE.txt'])assert(fs.existsSync(path.join(root,'licenses',name)));
assert.equal((read('sitemap.xml').match(/<loc>/g)||[]).length,play?10:9);
assert(!read('sitemap.xml').includes('baagad-ai.github.io'));
assert(read('robots.txt').includes(`Sitemap: ${canonical}sitemap.xml`));
console.log(`PASS: ${routes.length} prerendered routes (Play testing ${play?'ON':'off'}), host metadata/links, direct download semantics, embedded GLB contracts, licenses and runtime budgets.`,JSON.stringify(sizes));
