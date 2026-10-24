import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { siteUrl, loadConfig } from './deployment-config.mjs';
import { approvedRelease } from './src/download-metrics.mjs';
const faq=JSON.parse(fs.readFileSync(new URL('./src/faq.json', import.meta.url),'utf8'));
const root=path.dirname(fileURLToPath(import.meta.url));
const canonical=siteUrl(process.env.SITE_URL);
const articles=JSON.parse(fs.readFileSync(path.join(root,'src/guides.json'),'utf8'));
assert.equal(articles.length,29);
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
 assert(!/The Remote(?:'|&#x27;)s Guest mode|Guest mode is on|Guest mode limits|main remote|<!--\s*CONDITIONAL/i.test(html),route+' contains retired Guest mode copy, a banned name or a raw CONDITIONAL marker');
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
{
 // /join (Guest access invite fallback): static, zero JavaScript, noindex, not in the sitemap, same download href as the homepage.
 const join=read('join/index.html');
 assert.equal((join.match(/<h1\b/g)||[]).length,1,'join needs one H1');
 assert(!/<script\b|\son[a-z]+=|javascript:|data-download-cta|cloudflareinsights|\/api\/|config\.js|runtime\//i.test(join),'join must stay static: no scripts, handlers, analytics or click counting');
 assert.match(join,/<meta name="robots" content="noindex, nofollow">/);
 assert(!/rel="canonical"|og:url/.test(join),'join has no canonical URL');
 for(const match of join.matchAll(/\b(?:href|src)="([^"]+)"/g)){const ref=match[1];if(/^https:\/\//.test(ref))continue;assert(ref.startsWith('/'),'join links must be root-absolute: '+ref);}
 const releaseJoin=approvedRelease(loadConfig());
 assert(releaseJoin?join.includes(`href="${releaseJoin.url.replaceAll('&','&amp;')}"`):join.includes('href="/#download"'),'join download link must match the homepage release');
 assert(!read('sitemap.xml').includes('/join'),'join stays out of the sitemap');
 const links=JSON.parse(read('.well-known/assetlinks.json'));
 assert.equal(links[0].target.package_name,loadConfig().apkRelease.packageName,'assetlinks package must match the release');
 assert.equal(links[0].target.sha256_cert_fingerprints[0].replaceAll(':','').toLowerCase(),loadConfig().apkRelease.certificateSha256,'assetlinks cert must match the release signer');
 const headers=read('_headers');
 for(const p of ['/join','/join/'])assert(new RegExp(`^${p.replace('/','\\/')}\\n(?:  .*\\n)*  Content-Security-Policy: [^\\n]*script-src 'none'`,'m').test(headers)&&new RegExp(`^${p.replace('/','\\/')}\\n(?:  .*\\n)*  Referrer-Policy: no-referrer$`,'m').test(headers),p+' needs a strict CSP and no-referrer in _headers');
 assert(!/^\/(?:join|\.well-known)/m.test(read('_redirects')),'_redirects must not touch /join or /.well-known');
}
const html=read('index.html'),privacy=read('privacy/index.html');
{
 // Landing plan: Concept B "Living Room" (approved 16 Oct 2026). Order, one eager image (the hero poster), lazy + async +
 // explicit size everywhere else, one pinned section, the trademark line, and the claim guardrails.
 const order=['class="b-hero"','id="search-proof"','id="trackpad"','id="inside"','id="guests"','id="screens"','id="compatibility"','id="download"','id="faq"'].map(m=>html.indexOf(m));
 assert(order.every((v,i)=>v>=0&&(i===0||v>order[i-1])),'landing order must follow Concept B: hero, pin, trackpad, rooms, guests, gallery, compatibility, download, FAQ');
 const imgs=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
 const eager=imgs.filter(t=>/loading="eager"/.test(t));
 assert.equal(eager.length,1,'only the hero image loads eagerly');assert.match(eager[0],/fetchPriority="high"|fetchpriority="high"/i);
 for(const t of imgs){assert(/\swidth="\d+"/.test(t)&&/\sheight="\d+"/.test(t),'image needs width and height: '+t.slice(0,90));if(!/loading="eager"/.test(t)&&!/width="32" height="32"/.test(t))assert(/loading="lazy"/.test(t)&&/decoding="async"/.test(t),'image must be lazy and async: '+t.slice(0,90));}
 assert.equal((html.match(/class="b-pin /g)||[]).length,1,'exactly one pinned section');
 assert(html.includes('YouTube is a trademark of Google LLC. The Remote is not affiliated with or endorsed by Google or YouTube.'),'footer trademark line');
 assert(!/any TV search box|type into any app/i.test(html),'typing is YouTube search only');
 for(const route of routes)assert(!/long[- ]?press|long ok/i.test(read(route).replace(/<script[\s\S]*?<\/script>/g,'')),route+': Long press is retired');
 assert(!/Pixel 8/i.test(html),'no device names');
 assert.equal(html.split('<meta name="google-site-verification" content="UZdeG9wcSvyzel4qHdnVUz0J00bSkjQ0E3jjGAxkb5w" />').length,2,'Search Console tag once in the homepage head');
 assert(html.indexOf('google-site-verification')<html.indexOf('</head>'));
 // Analytics hook points (cookie-free analytics wires to these; it must never gate the download link).
 for(const id of ['hero','search','guests','trackpad','download'])assert.equal((html.match(new RegExp(`data-track-section="${id}"`,'g'))||[]).length,1,'data-track-section '+id);
 assert([...html.matchAll(/<a\b[^>]*data-download-cta=[^>]*>/g)].every(m=>/data-track="download"/.test(m[0])),'download links carry data-track="download"');
 assert.equal((html.match(/data-track="faq-open" data-track-item="faq-\d\d"/g)||[]).length,faq.length,'every FAQ item is tracked');
 for(const k of ['nav','guide'])assert(html.includes(`data-track="${k}"`),'data-track '+k);
 for(const m of html.matchAll(/data-track-loop="([^"]+)"/g))assert(['hero','rooms-living','rooms-bedroom','rooms-kitchen'].includes(m[1]),'loop key not in Build contract: '+m[1]);
 for(const route of routes){const page=read(route),wants=!/^(404\.html|join\/)/.test(route);assert.equal(/<script src="[^"]*analytics\.js(?:\?v=[0-9a-f]+)?" defer><\/script>/.test(page),wants,route+(wants?' loads':' must not load')+' analytics.js');}
 assert(!/<script/.test(read('404.html')),'404 has no scripts');
 for(const f of fs.readdirSync(path.join(root,'runtime')))assert(!/serviceWorker\.register|caches\.open|document\.cookie\s*=/.test(read('runtime/'+f)),f+': no service worker, Cache Storage or cookies');
 assert(!/long-ok/.test(html),'long-ok markers are retired');
}
for(const route of routes) assert(!/data-beta-request-form|beta-enrollment|Google Play account email|Request beta access|beta-request\.js/i.test(read(route)),route+' must not expose the retired signup flow');
assert.match(html,/id="join-beta"/);assert.match(html,/href="#join-beta"/);
assert.match(html,/id="download"/);assert.match(html,/data-mobile-cta-bar[^>]*inert/);
const release=approvedRelease(loadConfig());
if(release) {{const sum=faq.find(x=>x.q==='How do I check the APK checksum?');assert(sum&&sum.a.includes(release.sha256)&&sum.a.includes(`The Remote ${release.version}:`),'FAQ checksum entry must carry the release config sha256 and version');const hdr=fs.readFileSync(new URL('./_headers', import.meta.url),'utf8');const hm=hdr.match(new RegExp(`^/downloads/${release.sha256}/\\*\\n(?:  .*\\n)*?  Content-Disposition: attachment; filename="([^"]+)"`,'m'));assert(hm,'_headers names the download file for this sha256');const fn=hm[1];assert(sum.a.includes(`certutil -hashfile ${fn} SHA256`)&&sum.a.includes(`shasum -a 256 ${fn}`),`FAQ checksum commands must use the saved file name ${fn} from _headers`);assert(faq.find(x=>x.q==='Is installing the APK safe?').a.includes('How do I check the APK checksum?'),'safety answer points at the checksum FAQ');assert(!html.includes('Check the APK checksum'),'no checksum row in the download card');}assert(html.includes(`href="${release.url.replaceAll('&','&amp;')}"`));assert.match(html,/data-download-cta="hero"/);assert(html.includes(release.sha256));}
else {assert.match(html,/Download is being prepared/);assert(!html.includes('data-download-cta='));}
assert.match(privacy,/Cloudflare Web Analytics/);assert.match(privacy,/click/i);assert.match(privacy,/D1/);
assert.match(read('styles.css'),/prefers-reduced-motion/);assert.match(read('styles.css'),/:focus-visible/);assert.match(read('styles.css'),/safe-area-inset-bottom/);
for(const [file,height] of [['showcase/remote-home.png',2340],['showcase/youtube-share.png',2340],['showcase/youtube-search.png',2340],['showcase/your-tvs.png',1880],['showcase/pair-name-and-room.png',2340],['showcase/trackpad-pad.png',2340],['showcase/guests-invite.png',2340],['showcase/guests-primary-guest-list.png',2340]]){
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
assert.equal((read('sitemap.xml').match(/<loc>/g)||[]).length,3+articles.length);
assert(!read('sitemap.xml').includes('baagad-ai.github.io'));
assert(read('robots.txt').includes(`Sitemap: ${canonical}sitemap.xml`));
console.log('PASS: nine prerendered routes, host metadata/links, direct download semantics, embedded GLB contracts, licenses and runtime budgets.',JSON.stringify(sizes));
