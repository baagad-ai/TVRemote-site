import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const script = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'site.js'), 'utf8');
class Element {
  constructor(text = '') { this.textContent=text;this.className='';this.hidden=false;this.children=[];this.attributes={};this.events={};this.styles={};this.classList={add:(name)=>this.className+=' '+name};this.style={setProperty:(k,v)=>this.styles[k]=v}; }
  setAttribute(k,v){this.attributes[k]=v;}
  replaceWith(e){this.replacement=e;}
  append(e){this.children.push(e);}
  addEventListener(k,f){this.events[k]=f;}
  getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
}
function run(config, {reduce=false,fine=false}={}){
  const ctas=Array.from({length:4},()=>new Element('Beta access coming soon'));
  const nodes={betaStatus:new Element('Beta access is on the way'),betaAnswer:new Element('Not yet from this page.'),note:new Element('The Play opt-in will be added here.'),video:new Element(),placeholder:new Element(),caption:new Element('Placeholder'),intro:new Element('The beta film is being prepared.'),tilt:new Element(),reveal:new Element()};nodes.video.hidden=true;
  const media={matches:reduce,events:{},addEventListener(k,f){this.events[k]=f;}}; let cancelled=0; let draw;
  const selectors={'[data-beta-answer]':nodes.betaAnswer,'[data-beta-video]':nodes.video,'[data-video-placeholder]':nodes.placeholder,'[data-video-caption]':nodes.caption,'[data-video-intro]':nodes.intro,'[data-tilt]':nodes.tilt};
  const context={window:{remoteSiteConfig:config,matchMedia:q=>q.includes('reduced')?media:{matches:fine}},document:{getElementById:()=>nodes.betaStatus,querySelector:s=>selectors[s],querySelectorAll:s=>s==='[data-beta-cta]'?ctas:s==='.mobile-cta-note'?[nodes.note]:s==='[data-reveal]'?[nodes.reveal]:[],createElement:()=>new Element()},requestAnimationFrame:f=>{draw=f;return 1;},cancelAnimationFrame:()=>cancelled++};
  vm.runInNewContext(script,context);return {ctas,nodes,media,draw:()=>draw?.(),cancelled:()=>cancelled};
}
const absent=run({});assert(absent.ctas.every(c=>!c.replacement));assert.equal(absent.nodes.video.hidden,true);assert.equal(absent.nodes.placeholder.hidden,false);assert.match(absent.nodes.betaAnswer.textContent,/Not yet/);assert.match(absent.nodes.intro.textContent,/prepared/);
const supplied=run({betaOptInUrl:'https://example.invalid/opt-in-test',betaCtaLabel:'Join the beta',betaStatus:'Open the official opt-in',videoSrc:'assets/test.mp4',videoPoster:'assets/test.webp',videoCaptions:'assets/test.vtt'});
assert(supplied.ctas.every(c=>c.replacement?.href==='https://example.invalid/opt-in-test'));assert(supplied.ctas.every(c=>c.replacement?.textContent==='Join the beta'));assert.doesNotMatch(supplied.nodes.betaAnswer.textContent,/Not yet/);assert.match(supplied.nodes.betaAnswer.textContent,/Eligibility/);assert.equal(supplied.nodes.video.hidden,false);assert.equal(supplied.nodes.placeholder.hidden,true);assert.doesNotMatch(supplied.nodes.intro.textContent,/prepared/);assert.equal(supplied.nodes.video.children[0].src,'assets/test.vtt');assert.equal(supplied.nodes.video.children[0].kind,'captions');assert.equal(supplied.nodes.video.poster,'assets/test.webp');
const motion=run({}, {fine:true});motion.nodes.tilt.events.pointermove({clientX:75,clientY:75});motion.draw();assert.notEqual(motion.nodes.tilt.styles['--tilt-x'],'0deg');motion.media.matches=true;motion.media.events.change();assert.equal(motion.nodes.tilt.styles['--tilt-x'],'0deg');assert.equal(motion.nodes.tilt.styles['--tilt-y'],'0deg');
console.log('PASS: Node DOM simulation for absent/configured beta/video states, captions/poster, and runtime reduced-motion reset. This is not browser QA.');
