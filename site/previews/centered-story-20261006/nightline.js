import {mountBetaRequest} from './beta-request.js';

const $ = selector => document.querySelector(selector);
const stage = $('#stage'), phone = $('#phone'), runway = $('#runway');
const copyText = $('#copy-text'), world = $('#world'), portrait = $('#world-mobile');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width:900px)');
const scenes = [
  {name:'Welcome', eyebrow:'START AT HOME', headline:'Your TV.<br>In good hands.', lede:'Your phone, a familiar remote.<br>Pair on your home network.', screen:'Native Welcome · setup only', pending:'Welcome'},
  {name:'The path', eyebrow:'FIND YOUR TV', headline:'A shorter path<br>to your TV.', lede:'Find a compatible TV on your network.<br>Pair with its on-screen code.', screen:'Discovery capture pending', pending:'Find your TV'},
  {name:'Your rooms', eyebrow:'YOUR ROOMS', headline:'The right room.<br>A familiar remote.', lede:'Choose the room.<br>Keep the controls close.', screen:'Paired-controls capture pending', pending:'Your remote'},
  {name:'Before you send', eyebrow:'BEFORE YOU SEND', headline:'Good ideas.<br>Less thumb work.', lede:'Type on your phone.<br>Review your YouTube search before sending.', screen:'Composer capture pending', pending:'Your search'},
  {name:'A quieter evening', eyebrow:'THE REMOTE', headline:'A quieter evening.<br>Within reach.', lede:'Free app. Private beta review.<br>Manual Google Play invitations.', screen:'', pending:''}
];
const colors = [[13,15,18],[17,24,25],[23,27,33],[17,24,25],[13,15,18]];
const poses = [[0,0,1,-2],[30,10,.94,2],[-25,20,.9,-2],[25,5,.94,2],[-35,35,.86,-2]];
// Artist-authored room geometry stays together. Only the left props are fitted
// below the reserved copy column; right-hand seating/TV retain their layering.
const artNodes = Object.fromEntries(['plant','lamp','tv','sofa','people','table','spark','signal','composer-art'].map(key => [key, world.querySelector('.'+key)]));
const rightRoom=[70,28,.95];
const artPlacement = {plant:[30,270,.75],lamp:[180,364,.65],tv:rightRoom,sofa:rightRoom,people:rightRoom,table:rightRoom};
const sceneOpacity = [.42,.55,.8,.55,1];
const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
const smooth = (from,to,value) => {const t=clamp((value-from)/(to-from),0,1);return t*t*(3-2*t)};
let frame=0, progress=0, scene=-1, range=1, origin=0, active=true, paints=0;

function measure() {
  origin = runway.getBoundingClientRect().top + scrollY;
  // Sticky travel is determined by the CSS stage height, including stable mobile vh.
  range = Math.max(1,runway.offsetHeight-stage.offsetHeight);
  schedule();
}

function changeScene(index) {
  scene=index; stage.dataset.scene=String(index);
  const data=scenes[index];
  $('#headline').innerHTML=data.headline;
  $('#eyebrow').textContent=data.eyebrow;
  $('#lede').innerHTML=data.lede;
  $('#screen-label').textContent=data.screen;
  $('#pending-title').textContent=data.pending;
  const native=index===0;
  if(!native&&document.activeElement===$('#full-screen'))$('.cta').focus({preventScroll:true});
  $('#native').hidden=!native;
  $('#pending').hidden=native;
  $('#full-screen').hidden=!native;
  $('#chapter-number').textContent=String(index+1).padStart(2,'0')+' / 05';
  $('#chapter-name').textContent=data.name;
  document.querySelectorAll('header nav a').forEach((link,i)=>{
    const selected=index<3&&i===index;
    link.classList.toggle('active',selected);
    if(selected)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');
  });
}

function render() {
  frame=0; paints++;
  // Native scrolling supplies the motion. No second easing clock or catch-up loop.
  progress=clamp((scrollY-origin)/range*4,0,4);
  const index=Math.min(4,Math.floor(progress+.5));
  const a=reduced.matches?index:Math.floor(progress), b=reduced.matches?index:Math.min(4,a+1);
  const q=reduced.matches?0:smooth(0,1,progress-a);
  const mix=(x,y)=>x+(y-x)*q;
  const textOpacity=reduced.matches?1:1-smooth(.32,.5,Math.abs(progress-index));
  // Content changes only at the zero-opacity midpoint; the copy column stays fixed.
  copyText.style.opacity=String(textOpacity);
  if(index!==scene)changeScene(index);
  const rgb=colors[a].map((v,i)=>Math.round(mix(v,colors[b][i])));
  stage.style.backgroundColor=`rgb(${rgb.join(',')})`;
  let [x,y,scale,rotation]=poses[a].map((v,i)=>mix(v,poses[b][i]));
  if(mobile.matches){x*=.2;y=0;scale=1;rotation*=.25}
  else x*=clamp((innerWidth-1100)/180,.3,1);
  if(reduced.matches)rotation=0;
  // Exit is complete before the wide finale copy appears at the next midpoint.
  const phoneOpacity=reduced.matches?(index===4?0:1):1-smooth(3.05,3.43,progress);
  phone.style.transform=`translate(${x}px,${y}px) scale(${scale}) rotate(${rotation}deg)`;
  phone.style.opacity=String(phoneOpacity);
  const hiddenPhone=phoneOpacity<.01;
  if(hiddenPhone&&!phone.inert&&phone.contains(document.activeElement))$('.cta').focus({preventScroll:true});
  phone.inert=hiddenPhone;
  phone.style.pointerEvents=hiddenPhone?'none':'auto';
  for(const element of [$('#native'),$('#pending'),$('#screen-label'),$('#full-screen')])element.style.opacity=String(textOpacity);
  const roomReveal=reduced.matches?(index===4?1:0):smooth(3.43,3.95,progress);
  // Portrait is a complete independent composition, never duplicate active hooks.
  portrait.style.opacity=String(mobile.matches?roomReveal:0);
  const worldOpacity=mix(sceneOpacity[a],sceneOpacity[b]);
  $('#world-art').style.opacity=String(worldOpacity);
  const artState={};
  for(const [key,node] of Object.entries(artNodes)) {
    const [tx,ty,size]=artPlacement[key]||[0,0,1];
    node.style.transform=`translate(${tx}px,${ty}px) scale(${size})`;
    // Opacity belongs to the complete scene, preserving internal opaque occlusion.
    const opacity=['spark','signal','composer-art'].includes(key)?0:1;
    node.style.opacity=String(opacity);artState[key]=[tx,ty,size,opacity];
  }
  world.querySelector('#route').style.strokeDashoffset=String(reduced.matches?0:1450-progress*345);
  $('.meter i').style.width=(progress/4*100)+'%';
  window.nightlineState={progress,target:progress,scene:index,reduced:reduced.matches,phone:{x,y,scale,rotation},phoneOpacity,textOpacity,portraitOpacity:mobile.matches?roomReveal:0,worldOpacity,background:rgb,art:artState,paints,range};
}

function schedule(){if(active&&!frame)frame=requestAnimationFrame(render)}
addEventListener('scroll',schedule,{passive:true});
addEventListener('resize',measure);
reduced.addEventListener('change',measure);mobile.addEventListener('change',measure);
document.addEventListener('visibilitychange',()=>{
  active=!document.hidden;
  if(!active){cancelAnimationFrame(frame);frame=0}else measure();
});

const menu=$('#menu');
function closeMenu(){menu.setAttribute('aria-expanded','false');menu.textContent='Menu +';$('#mobile-menu').hidden=true}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'Close ×':'Menu +';$('#mobile-menu').hidden=!open});
$('#mobile-menu').addEventListener('click',event=>{if(event.target.closest('a'))closeMenu()});
addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu()});
const storyTargets={start:0,share:1,rooms:2,controls:3,finish:4};
document.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');
  if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const hash=link.getAttribute('href').slice(1);
  if(!(hash in storyTargets))return;
  event.preventDefault();
  history.pushState(null,'','#'+hash);
  scrollTo({top:origin+range*storyTargets[hash]/4,behavior:reduced.matches?'instant':'smooth'});
  if(event.detail===0)$('#headline').focus({preventScroll:true});
});
addEventListener('hashchange',()=>{
  const key=location.hash.slice(1);
  if(key in storyTargets)scrollTo({top:origin+range*storyTargets[key]/4,behavior:'instant'});
});
$('#full-screen').addEventListener('click',()=>$('#capture-dialog').showModal());
$('#close-dialog').addEventListener('click',()=>$('#capture-dialog').close());
if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('revealed');observer.unobserve(entry.target)}},{threshold:.16});
  document.querySelectorAll('[data-reveal]').forEach(element=>observer.observe(element));
}
mountBetaRequest(document.querySelector('.capture-island'),window.remoteSiteConfig);
measure();render();
