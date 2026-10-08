import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { siteUrl, loadConfig } from './deployment-config.mjs';
import { approvedRelease } from './src/download-metrics.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const canonical=siteUrl(process.env.SITE_URL);
const articles=JSON.parse(fs.readFileSync(path.join(root,'src/guides.json'),'utf8'));
assert.equal(articles.length,6);
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const routes=['index.html','privacy/index.html','guides/index.html',...articles.map(a=>'guides/'+a.slug+'/index.html')];
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
 assert(!/editorial-review|publication gate|content launch plan|research-ai-search|Google Groups|groups\.google\.com/i.test(html),route+' contains private strategy or legacy flow');
 assert(!/<p># /.test(html),route+' duplicates the title');
 for(const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const ref=match[1];if(/^(https?:|mailto:|#|data:)/.test(ref))continue;
  const file=path.resolve(path.dirname(path.join(root,route)),ref.split('#')[0].split('?')[0]);
  if(ref.endsWith('/')||/\/#/.test(ref))assert(fs.existsSync(path.join(file,'index.html')),route+': '+ref);
  else assert(fs.existsSync(file),route+': '+ref);
 }
}
{
 // 404 page: Pages serves it for unknown paths at any depth, so links must be root-absolute and resolve from the site root.
 const notFound=read('404.html');
 assert.equal((notFound.match(/<h1\b/g)||[]).length,1,'404 needs one H1');
 assert.match(notFound,/<meta name="robots" content="noindex">/);
 assert.match(notFound,/<main\b[^>]*id="main"/);assert.match(notFound,/class="skip-link" href="#main"/);
 assert(!/<script\b|rel="canonical"|og:url|data-download-cta|cloudflareinsights|\/api\/metrics/i.test(notFound),'404 must stay static: no scripts, canonical, analytics or click counting');
 for(const href of ['/','/guides/','/privacy/'])assert(notFound.includes(`href="${href}"`),'404 needs a link to '+href);
 for(const match of notFound.matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const ref=match[1];if(/^(https?:|mailto:|#|data:)/.test(ref))continue;
  assert(ref.startsWith('/'),'404 links must be root-absolute: '+ref);
  const file=path.join(root,ref.split('#')[0].split('?')[0]);
  assert(fs.existsSync(ref.split('#')[0].endsWith('/')?path.join(file,'index.html'):file),'404.html: '+ref);
 }
 const release404=approvedRelease(loadConfig());
 assert(release404?notFound.includes(`href="${release404.url.replaceAll('&','&amp;')}"`):notFound.includes('href="/#download"'),'404 download link must match the homepage release');
 assert(!read('sitemap.xml').includes('404'),'404 stays out of the sitemap');
}
const html=read('index.html'),privacy=read('privacy/index.html');
for(const route of routes) assert(!/data-beta-request-form|beta-enrollment|Google Play account email|Request beta access|turnstile|beta-request\.js/i.test(read(route)),route+' must not expose the retired signup flow');
assert.match(html,/id="download"/);assert.match(html,/data-mobile-cta-bar[^>]*inert/);
const release=approvedRelease(loadConfig());
if(release) {assert(html.includes(`href="${release.url.replaceAll('&','&amp;')}"`));assert.match(html,/data-download-cta="hero"/);assert(html.includes(release.sha256));}
else {assert.match(html,/Download is being prepared/);assert(!html.includes('data-download-cta='));}
assert.match(privacy,/Cloudflare Web Analytics/);assert.match(privacy,/click/i);assert.match(privacy,/D1/);
assert.match(read('styles.css'),/prefers-reduced-motion/);assert.match(read('styles.css'),/:focus-visible/);assert.match(read('styles.css'),/safe-area-inset-bottom/);
for(const [file,height] of [['showcase/remote-home.png',2340],['showcase/youtube-share-review.png',2340],['showcase/youtube-search.png',2340],['showcase/your-tvs.png',2340],['showcase/pair-name-and-room.png',1420]]){
 const bytes=fs.readFileSync(path.join(root,'assets',file));
 assert.equal(bytes.readUInt32BE(16),1080,file);assert.equal(bytes.readUInt32BE(20),height,file);
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
assert.equal((read('sitemap.xml').match(/<loc>/g)||[]).length,9);
assert(!read('sitemap.xml').includes('baagad-ai.github.io'));
assert(read('robots.txt').includes(`Sitemap: ${canonical}sitemap.xml`));
console.log('PASS: nine prerendered routes, host metadata/links, direct download semantics, embedded GLB contracts, licenses and runtime budgets.',JSON.stringify(sizes));
