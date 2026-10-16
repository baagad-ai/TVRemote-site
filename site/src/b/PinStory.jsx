// 2 · The single pinned section: YouTube search -> results on the TV -> a shared link playing (3 steps, 300vh).
// One ScrollTrigger (pin + pinSpacing, end +=300%, scrub .5, snap 0/.5/1) that releases with the last step frozen.
// Off below 900 px wide or 640 px tall, under reduced motion, and while keyboard focus is inside: then the three
// steps stack with a still each. The live three.js scene (pin-runtime.js) loads only when the pin nears view, while
// this section holds the page's one GPU lease; otherwise, and until it is ready, the DOM stills show in the same box.
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitText from '../components/SplitText';
import DrawnTV from './DrawnTV';
import { useEnvironment } from '../environment';
import { useGpuLease, useInView, lowEnd } from './lease';
import { scrollIdle } from '../scroll-idle';
import { PIN } from './media';

gsap.registerPlugin(ScrollTrigger);
const SENT = 'YouTube search action sent. Check the TV.';
export const STEPS = [
  { id: 'search', title: 'Type a YouTube search on your phone.', text: 'The Remote opens a YouTube search sheet for the TV you picked. You type on your phone keyboard, not the TV\u2019s letter grid.', tv: { state: 'home' }, phone: 'assets/showcase/youtube-search.png', phoneAlt: 'The YouTube search sheet in The Remote for Living Room TV, with lofi beats typed on the phone keyboard.', tvAlt: 'The drawn TV on its home row, before anything is sent.' },
  { id: 'results', title: 'Send, and the results open on the TV.', text: `Tap search and the app confirms: \u201c${SENT}\u201d The TV opens YouTube with the results.`, tv: { state: 'results', focus: 0 }, phone: 'assets/showcase/youtube-search.png', phoneAlt: 'The YouTube search sheet in The Remote with lofi beats typed, ready to send to Living Room TV.', tvAlt: 'The drawn TV showing YouTube results for lofi beats, with the first result highlighted.', chip: SENT },
  { id: 'link', title: 'Share a YouTube link from your phone. It plays on the TV.', text: 'Share a YouTube link to The Remote, check it, pick the TV and open it. Search and links depend on the TV\u2019s YouTube version.', tv: { state: 'playing' }, phone: 'assets/showcase/youtube-share.png', phoneAlt: "The Remote's share sheet: a YouTube link, Living Room TV in Living room selected, and an Open on Living room button.", tvAlt: 'The drawn TV playing the shared YouTube video.' }
];
const SWAPS = [0, .43, .79]; // placeholder swap points (pin-runtime PLACEHOLDER); Build's pin-contract.json replaces them
const stepFor = (p, swaps) => swaps.reduce((i, at, j) => p >= at ? j : i, 0);

export function PinStill({ index, eager = false }) {
  const s = STEPS[index], still = PIN.stills[index];
  if (still) return <figure className="pin-still"><img src={still} alt={`${s.tvAlt} ${s.phoneAlt}`} width="1600" height="1000" loading={eager ? 'eager' : 'lazy'} decoding="async" /></figure>;
  return <figure className="pin-still is-drawn">
    <div className="pin-still-tv"><DrawnTV {...s.tv} idPrefix={`pin${index}`} title={s.tvAlt} /></div>
    <div className="pin-still-phone"><img src={s.phone} alt={s.phoneAlt} width="1080" height="2340" loading="lazy" decoding="async" /></div>
    {s.chip && <p className="pin-chip">{s.chip}</p>}
  </figure>;
}
function svgUrl(node) {
  const markup = new XMLSerializer().serializeToString(node);
  return URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
}
export default function PinStory() {
  const { ready, motion, gpu } = useEnvironment(), root = useRef(null), stage = useRef(null), canvasHost = useRef(null), runtime = useRef(null);
  const [fits, setFits] = useState(false), [focusMode, setFocusMode] = useState(false), [step, setStep] = useState(0), [live, setLive] = useState(false);
  const pinned = ready && motion && fits && !focusMode;
  const near = useInView(root, { rootMargin: '50% 0px 50% 0px' });
  const lease = useGpuLease(pinned && gpu && near && !lowEnd(), 'tv-scene');
  useEffect(() => {
    if (!ready) return;
    const update = () => setFits(innerWidth >= 900 && innerHeight >= 640); update();
    addEventListener('resize', update); return () => removeEventListener('resize', update);
  }, [ready]);
  // Keyboard focus inside the section turns the pin off (stacked steps); it comes back once focus has left.
  useEffect(() => {
    const node = root.current;
    const enter = event => { if (event.target.matches(':focus-visible')) setFocusMode(true); };
    const leave = event => { if (!node.contains(event.relatedTarget)) setFocusMode(false); };
    node.addEventListener('focusin', enter); node.addEventListener('focusout', leave);
    return () => { node.removeEventListener('focusin', enter); node.removeEventListener('focusout', leave); };
  }, []);
  // The pin. Keeps the reader's place when it switches on or off above the viewport.
  useEffect(() => {
    if (!pinned) return;
    const node = root.current, before = node.getBoundingClientRect(), wasAbove = before.bottom < 0;
    const proxy = { p: 0 }, swaps = () => runtime.current?.contract?.steps?.map(s => s.swapAt) || SWAPS;
    const tl = gsap.timeline({ scrollTrigger: { trigger: stage.current, pin: true, pinSpacing: true, start: 'top top', end: '+=300%', scrub: .5, anticipatePin: 1, snap: { snapTo: [0, .5, 1], duration: .35, ease: 'power2.out' }, invalidateOnRefresh: true,
      // Analytics (INTEGRATION.md §4): the pin animation is running on screen -> loop_play k=pin (deduped by analytics.js).
      onToggle: self => { if (self.isActive) document.dispatchEvent(new CustomEvent('remote:loop', { detail: { k: 'pin', el: node } })); } } });
    tl.to(proxy, { p: 1, ease: 'none', duration: 1, onUpdate: () => { const s = stepFor(proxy.p, swaps()); setStep(s); runtime.current?.setProgress(proxy.p); } });
    if (wasAbove) { const delta = node.getBoundingClientRect().height - before.height; if (delta) scrollBy(0, delta); }
    const refresh = () => ScrollTrigger.refresh(); document.fonts.ready.then(refresh);
    return () => { const h = node.getBoundingClientRect(), above = h.bottom < 0, height = h.height; tl.scrollTrigger?.kill(true); tl.kill(); setStep(0); if (above) { const delta = node.getBoundingClientRect().height - height; if (delta) scrollBy(0, delta); } };
  }, [pinned]);
  // Live scene while this section holds the GPU lease.
  useEffect(() => {
    if (!lease) return;
    let canceled = false; const controller = new AbortController(), urls = [];
    (async () => {
      try {
        await scrollIdle(); if (canceled) return;
        const { createPinScene } = await import('./pin-runtime.js'); if (canceled) return;
        const tvs = [...root.current.querySelectorAll('.pin-layers .drawn-tv')].map(svgUrl); urls.push(...tvs);
        const scene = await createPinScene(canvasHost.current, { contractUrl: PIN.contract, modelUrl: PIN.model || 'assets/3d/remote-hero.glb', tvTextures: tvs, phoneTextures: STEPS.map(s => s.phone), signal: controller.signal });
        if (canceled) { scene.dispose(); return; }
        runtime.current = scene; const st = ScrollTrigger.getAll().find(t => t.pin === stage.current);
        scene.setProgress(st ? st.progress : 0); setLive(true); ScrollTrigger.refresh();
      } catch { if (!canceled && canvasHost.current) canvasHost.current.dataset.sceneStatus = 'fallback'; }
    })();
    return () => { canceled = true; controller.abort(); runtime.current?.dispose(); runtime.current = null; setLive(false); urls.forEach(u => URL.revokeObjectURL(u)); };
  }, [lease]);
  return <section ref={root} className={`b-pin ${pinned ? 'is-pinned' : 'is-stacked'}`} id="search-proof" data-track-section="search" aria-labelledby="pin-title">
    <span id="share-story" className="b-anchor" aria-hidden="true" />
    <div ref={stage} className="b-pin-stage">
      <div className="b-wrap b-pin-grid">
        <div className="b-pin-copy">
          <p className="b-eyebrow">01 / YouTube search</p>
          <h2 id="pin-title">Search on the phone. <em>Results on the TV.</em></h2>
          <ol className="b-pin-steps">{STEPS.map((s, i) => <li key={s.id} className={`b-pin-step ${pinned && step !== i ? 'is-dim' : 'is-on'}`} aria-current={pinned && step === i ? 'step' : undefined}>
            <span className="b-step-no">0{i + 1}</span>
            <div><SplitText tag="h3" text={s.title} className="b-h3" textAlign="left" splitType="lines" enabled={motion} delay={40} duration={.6} ease="power3.out" from={{ opacity: 0, y: 18 }} to={{ opacity: 1, y: 0 }} />
              <p className="b-body">{s.text}</p>
              {!pinned && <div className="b-pin-stacked-still"><PinStill index={i} /></div>}</div>
          </li>)}</ol>
          <a className="b-link" data-track="guide" href="guides/search-youtube-tv-android-phone/">How YouTube search works ↗</a>
        </div>
        {pinned && <div className="b-pin-media" aria-hidden={live ? 'true' : undefined}>
          <div className="pin-box">
            <div className={`pin-layers ${live ? 'is-hidden' : ''}`}>{STEPS.map((s, i) => <div key={s.id} className={`pin-layer ${step === i ? 'is-on' : ''}`}><PinStill index={i} /></div>)}</div>
            <div ref={canvasHost} className={`pin-canvas-host ${live ? 'is-live' : ''}`} />
            {live && STEPS[step].chip && <p className="pin-chip pin-chip-live">{STEPS[step].chip}</p>}
          </div>
          <p className="b-pin-progress" aria-hidden="true"><span>0{step + 1}</span> / 03</p>
        </div>}
      </div>
    </div>
  </section>;
}
