import {mountBetaRequest} from './beta-request.js';
const $=s=>document.querySelector(s),stage=$('#stage'),phone=$('#phone'),runway=$('#runway');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:760px)');
const scenes=[
 {name:'Welcome',eyebrow:'01 / A LITTLE LESS FRICTION',headline:'Your TV.<br>In good hands.',lede:'Start with your phone.<br>Pair on your home network.',screen:'Native Welcome · setup only',pending:'Welcome'},
 {name:'The path',eyebrow:'02 / FROM FINDING TO SHARING',headline:'A shorter path<br>to your TV.',lede:'Find a compatible TV on your network.<br>Pair with its on-screen code.',screen:'Discovery · native capture pending',pending:'Find your TV'},
 {name:'Your rooms',eyebrow:'03 / FAMILIAR PLACES',headline:'The right room.<br>A familiar remote.',lede:'A room to settle into.<br>Real paired-controls capture pending.',screen:'Remote · paired capture pending',pending:'The controls stay close'},
 {name:'Before you send',eyebrow:'04 / A LITTLE MORE ROOM TO THINK',headline:'Good ideas.<br>Less thumb work.',lede:'The regular YouTube composer, before sending.<br>Native capture with real input pending.',screen:'YouTube composer · native capture pending',pending:'Before you send'},
 {name:'A quieter evening',eyebrow:'05 / ONE LITTLE REMOTE',headline:'A quieter evening.<br>Within reach.',lede:'Free app. Private beta review.<br>Manual Google Play invitations.',screen:'Native screen story pending',pending:'Capture story pending'}
];
const colors=[[13,15,18],[17,24,25],[23,27,33],[17,24,25],[13,15,18]];
const poses=[[0,0,1,-2],[-180,10,.88,4],[150,25,.78,-4],[-135,0,.88,3],[-340,70,.62,-7]];
// SVG translations are in the original 1440 × 900 viewBox. Each scene respects its copy zone.
const art={
 plant:[[-250,0,1,0],[50,0,.9,.5],[760,0,1,.7],[50,0,.9,.4],[-10,50,1,.7]],
 lamp:[[-380,0,1,0],[-150,0,1,.45],[570,0,1,.65],[-150,0,1,.4],[-50,195,1,.75]],
 tv:[[0,0,1,.75],[-970,50,.8,.55],[30,0,1,.75],[-1010,30,.8,.35],[390,430,.65,.65]],
 sofa:[[0,0,1,.3],[-1440,0,1,0],[20,0,1,.5],[-1440,0,1,0],[0,100,1,.9]],
 people:[[250,150,1,0],[250,150,1,0],[200,130,1,0],[200,130,1,0],[0,100,1,1]],
 table:[[220,150,1,0],[220,150,1,0],[200,130,1,0],[200,130,1,0],[0,90,1,.8]],
 spark:[[0,0,1,.4],[-640,70,1,.55],[0,0,1,.45],[-650,50,1,.5],[40,40,1,.3]],
 signal:[[0,0,1,.2],[-320,-80,1,.55],[600,50,.7,0],[-320,-100,.7,0],[300,140,.8,0]],
 'composer-art':[[-500,0,1,0],[-500,0,1,0],[-500,0,1,0],[0,0,1,.8],[-500,0,1,0]]
};
const artNodes=Object.fromEntries(Object.keys(art).map(key=>[key,$('.'+key)]));
let frame=0,progress=0,target=0,scene=-1,range=1,origin=0,active=true,paints=0;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
function measure(){origin=runway.getBoundingClientRect().top+scrollY;range=Math.max(1,runway.offsetHeight-innerHeight);schedule()}
function protectCopy(){const box=$('#copy').getBoundingClientRect(),matrix=$('#world').getScreenCTM()?.inverse();if(!matrix)return;const a=new DOMPoint(box.left-28,box.top-28).matrixTransform(matrix),b=new DOMPoint(box.right+28,box.bottom+28).matrixTransform(matrix),mask=$('#copy-safe-zone');for(const[k,v]of Object.entries({x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y}))mask.setAttribute(k,String(v))}
function render(){
 frame=0;paints++;target=clamp((scrollY-origin)/range*4,0,4);
 progress=reduced.matches?target:Math.abs(target-progress)<.003?target:progress+(target-progress)*.24;
 const index=Math.min(4,Math.floor(progress+.4)),a=reduced.matches?index:Math.floor(progress),b=reduced.matches?index:Math.min(4,a+1),t=reduced.matches?0:progress-a,q=t*t*(3-2*t),mix=(x,y)=>x+(y-x)*q;
 const rgb=colors[a].map((v,i)=>Math.round(mix(v,colors[b][i])));stage.style.backgroundColor=`rgb(${rgb.join(',')})`;
 let[x,y,s,r]=poses[a].map((v,i)=>mix(v,poses[b][i]));
 if(mobile.matches){x=clamp(x*.11,-20,20);y=index===4?35:0;s=.82;r*=.3}
 if(reduced.matches)r=0;
 const phoneOpacity=reduced.matches?(index===4?0:1):clamp((3.95-progress)*2.3,0,1);
 phone.style.transform=`translate(${x}px,${y}px) scale(${s}) rotate(${r}deg)`;phone.style.opacity=String(phoneOpacity);phone.inert=phoneOpacity<.05;phone.style.pointerEvents=phoneOpacity<.05?'none':'auto';
 const artState={};
 for(const [key,node]of Object.entries(artNodes)){
  const v=art[key][a].map((x,i)=>mix(x,art[key][b][i]));
  // Smaller screens keep the editorial art lower than the copy and the complete phone frame.
  if(mobile.matches&&index<4){if(key==='plant'||key==='lamp'||key==='sofa'||key==='people'||key==='table')v[3]=0;if(key==='tv'){v[0]=-200;v[1]=110;v[3]*=.45}if(key==='composer-art')v[3]=0;if(key==='signal')v[3]*=.4;}
  node.style.setProperty('transform',`translate(${v[0]}px,${v[1]}px) scale(${v[2]})`,'important');node.style.opacity=String(v[3]);artState[key]=v.map(x=>Math.round(x*100)/100);
 }
 $('#route').style.strokeDashoffset=String(reduced.matches?0:1450-progress*345);
 $('.meter i').style.width=(progress/4*100)+'%';
 if(index!==scene){scene=index;stage.dataset.scene=String(index);const d=scenes[index];$('#headline').innerHTML=d.headline;$('#eyebrow').textContent=d.eyebrow;$('#lede').innerHTML=d.lede;$('#screen-label').textContent=d.screen;$('#pending-title').textContent=d.pending;$('.pending-number').textContent=String(index+1).padStart(2,'0');$('#native').hidden=index!==0;$('#pending').hidden=index===0;$('#full-screen').hidden=index!==0;$('#chapter-number').textContent=String(index+1).padStart(2,'0')+' / 05';$('#chapter-name').textContent=d.name;document.querySelectorAll('header nav a').forEach((e,i)=>{const selected=index<3?i===index:false;e.classList.toggle('active',selected);if(selected)e.setAttribute('aria-current','step');else e.removeAttribute('aria-current')});if(!reduced.matches)$('#copy').animate([{opacity:.25,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.2,.7,.2,1)'});}
 protectCopy();window.nightlineState={progress,target,scene:index,reduced:reduced.matches,phone:{x,y,scale:s,rotation:r},phoneOpacity,background:rgb,art:artState,paints};
 if(active&&!reduced.matches&&Math.abs(target-progress)>.003)schedule();
}
function schedule(){if(active&&!frame)frame=requestAnimationFrame(render)}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure);reduced.addEventListener('change',measure);mobile.addEventListener('change',measure);
document.addEventListener('visibilitychange',()=>{active=!document.hidden;if(!active){cancelAnimationFrame(frame);frame=0}else measure()});
const menu=$('#menu');function closeMenu(){menu.setAttribute('aria-expanded','false');menu.textContent='Menu +';$('#mobile-menu').hidden=true}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'Close ×':'Menu +';$('#mobile-menu').hidden=!open});$('#mobile-menu').addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
$('#full-screen').addEventListener('click',()=>$('#capture-dialog').showModal());$('#close-dialog').addEventListener('click',()=>$('#capture-dialog').close());
if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add('revealed');observer.unobserve(e.target)}},{threshold:.16});document.querySelectorAll('[data-reveal]').forEach(e=>observer.observe(e))}
mountBetaRequest(document.querySelector('.capture-island'),window.remoteSiteConfig);
measure();render();
