import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
const root=path.dirname(fileURLToPath(import.meta.url));
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
 assert.match(html,/rel="canonical" href="https:\/\/theremote-site.pages.dev\//);
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
const html=read('index.html'),privacy=read('privacy/index.html');
assert.match(html,/data-beta-request-form/);assert.match(html,/Google Play account email/);assert.match(html,/<input(?=[^>]*name="consent")(?=[^>]*required)/);assert.match(html,/data-request-status[^>]*role="status"/);
assert.match(html,/<fieldset disabled/);assert.match(html,/data-request-result[^>]*hidden/);assert.match(html,/data-mobile-cta-bar[^>]*inert/);
assert.match(html,/manual.*Google Play|manually through Google Play/);assert.match(html,/accept.*invitation|Accept.*invitation/);
assert.match(privacy,/private Cloudflare D1 database/);assert.match(privacy,/Cloudflare Turnstile/);assert.match(privacy,/request removal/);
assert.match(privacy,/doesn&#x27;t store the IP/);assert.match(privacy,/doesn&#x27;t enroll/);
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
assert.equal((read('sitemap.xml').match(/<loc>/g)||[]).length,9);
console.log('PASS: nine prerendered routes, metadata/links, honest screenshots and beta semantics, embedded GLB contracts, licenses and runtime budgets.',JSON.stringify(sizes));
