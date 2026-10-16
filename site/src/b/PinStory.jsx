// 2 · The single pinned section (CONCEPT-B-GUIDE.md §2, board gen.py:173-188): media LEFT (the drawn TV 720px wide,
// bleeding off the left edge with the lime glow, the phone overlapping it, the "sent" bubble), copy RIGHT.
// Owner ruling 16 Oct: until Build's re-render matches the board, the 3-step story is driven by the board's own 2D
// frames instead of the GLB (3d-prod is whitelisted per slot in media.js; empty now). One ScrollTrigger pin
// (pinSpacing, end +=400%, scrub 1, no snap) maps scroll to a progress with held plateaus: step 1 holds 0-.22, eases
// to step 2 (.22-.39), step 2 holds .39-.61 (mid-scroll), eases to step 3 (.61-.78), step 3 holds to the release.
// Each move is a slow sine in-out dolly of the whole scene plus crossfades of the TV and phone screens.
// Off below 900 px wide or 640 px tall, under reduced motion, and while keyboard focus is inside: then three stacked
// stills (phone over a TV crop). Analytics: remote:loop k='pin' when the pin becomes active.
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitText from '../components/SplitText';
import { PIN } from './media';
import { useEnvironment } from '../environment';
import { useGpuLease, useInView, lowEnd } from './lease';
import { PhoneLoop, phoneScreenUrl } from './slots';

gsap.registerPlugin(ScrollTrigger);
const SENT = 'YouTube search action sent. Check the TV.';
export const STEPS = [
  { id: 'search', title: 'Type a YouTube search on your phone keyboard.', tv: 'assets/board/tv-home-1440.webp', tvAlt: 'The drawn TV with YouTube open and an empty search box.', phoneAlt: 'The Remote on a phone: the YouTube search sheet for Living Room TV, with lofi hip being typed on the phone keyboard.' },
  { id: 'results', title: `Send it. \u201c${SENT}\u201d`, tv: 'assets/board/tv-results-f0-1440.webp', tvAlt: 'The drawn TV showing YouTube results for lofi beats, with the first result highlighted.', phoneAlt: `The Remote's remote screen for Living Room TV with the line \u201c${SENT}\u201d`, chip: SENT },
  { id: 'link', title: 'Share a YouTube link. Review it, pick the TV, open it.', tv: 'assets/board/tv-playing-1440.webp', tvAlt: 'The drawn TV playing the shared YouTube video.', phoneAlt: "The Remote's share sheet: a YouTube link, Living Room TV selected, and an Open on Living room button." }
];
// Held plateaus (step index while holding) and eased moves between them.
const HOLD = [[0, .2], [.4, .6], [.8, 1]]; // snap points 0 / .5 / 1 sit inside the holds
const sine = t => -(Math.cos(Math.PI * t) - 1) / 2;
// Texture swaps happen when a camera move has finished (never during it): step index changes at .4 and .8.
export const stepIndex = p => (p >= HOLD[2][0] ? 2 : p >= HOLD[1][0] ? 1 : 0);
export function stepValue(p) { // continuous 0..2 with plateaus
  if (p <= HOLD[0][1]) return 0;
  if (p < HOLD[1][0]) return sine((p - HOLD[0][1]) / (HOLD[1][0] - HOLD[0][1]));
  if (p <= HOLD[1][1]) return 1;
  if (p < HOLD[2][0]) return 1 + sine((p - HOLD[1][1]) / (HOLD[2][0] - HOLD[1][1]));
  return 2;
}
// "Camera dolly" per step (board frame = step 2 at scale 1): close on the phone, the board frame, a slight pull-back.
const CAM = [{ s: 1.06, x: 14, y: -10 }, { s: 1, x: 0, y: 0 }, { s: .97, x: -8, y: 6 }];
const lerp = (a, b, t) => a + (b - a) * t;

function Scene({ v, idx, eager = false, sceneRef }) {
  const i = Math.min(1, Math.floor(v)), t = v - i, a = CAM[i], b = CAM[Math.min(2, i + 1)];
  const cam = { s: lerp(a.s, b.s, t), x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  const op = k => (k === idx ? 1 : 0);
  return <div ref={sceneRef} className="pin-scene" style={{ '--cam-s': cam.s.toFixed(4), '--cam-x': `${cam.x.toFixed(2)}px`, '--cam-y': `${cam.y.toFixed(2)}px` }}>
    <div className="pin-tv">{STEPS.map((s, k) => <img key={s.id} src={s.tv} alt="" width="1440" height="810" loading={eager ? 'eager' : 'lazy'} decoding="async" style={{ opacity: k === 0 ? 1 : op(k) }} />)}<span className="b-tag pin-tag">Illustrated TV · results open after Send</span></div>
    <div className="pin-phone">{STEPS.map((s, k) => <div key={s.id} className="pin-phone-layer" style={{ opacity: k === 0 ? 1 : op(k) }}><PhoneLoop name="typing" step={k} playing={false} /></div>)}</div>
    <p className="pin-bubble" style={{ opacity: idx === 1 ? 1 : 0 }}>{SENT}</p>
  </div>;
}
export function PinStill({ index }) {
  const s = STEPS[index];
  return <figure className="pin-still">
    <div className="pin-still-tv"><img src={s.tv} alt={s.tvAlt} width="1440" height="810" loading="lazy" decoding="async" /></div>
    <div className="pin-still-phone" role="img" aria-label={s.phoneAlt}><PhoneLoop name="typing" step={index} /></div>
  </figure>;
}
export default function PinStory() {
  const { ready, motion, gpu } = useEnvironment(), root = useRef(null), stage = useRef(null);
  const [fits, setFits] = useState(false), [focusMode, setFocusMode] = useState(false), [v, setV] = useState(1), [idx, setIdx] = useState(1);
  const pinned = ready && motion && fits && !focusMode;
  const near = useInView(root, { rootMargin: '50% 0px' }), sceneRef = useRef(null), host = useRef(null), live = useRef(null), vRef = useRef(1), idxRef = useRef(1);
  const lease = useGpuLease(pinned && near && gpu && !lowEnd() && Boolean(PIN.model), 'pin');
  const [is3d, setIs3d] = useState(false);
  // Our 3D (pin-tv-phone.glb): loaded only while the 'pin' GPU lease is held; DOM boxes give the board composition.
  useEffect(() => {
    if (!lease) return;
    const ctrl = new AbortController(); let api = null;
    import('./pin-scene.js').then(({ createPinScene }) => createPinScene(host.current, { modelUrl: PIN.model, tvTextures: STEPS.map(s => s.tv), phoneTextures: STEPS.map((_, i) => phoneScreenUrl('typing', i)), signal: ctrl.signal }))
      .then(a => { api = a; live.current = a; setIs3d(true); push(vRef.current); }).catch(() => setIs3d(false));
    return () => { ctrl.abort(); api?.dispose(); live.current = null; setIs3d(false); };
  }, [lease]);
  const push = value => { const node = sceneRef.current, api = live.current; if (!node || !api) return; const tv = node.querySelector('.pin-tv').getBoundingClientRect(), ph = node.querySelector('.pin-phone').getBoundingClientRect(), hr = host.current.getBoundingClientRect(), g = host.current.firstChild.style;
    g.left = `${tv.left - hr.left}px`; g.top = `${tv.top - hr.top}px`; g.width = `${tv.width}px`; g.height = `${tv.height}px`; api.update(value, idxRef.current, { left: tv.left + 10, top: tv.top + 10, width: tv.width - 20, height: tv.height - 20 }, { left: ph.left + 8, top: ph.top + 8, width: ph.width - 16, height: ph.height - 16 }); };
  useEffect(() => { vRef.current = v; idxRef.current = idx; requestAnimationFrame(() => push(v)); }, [v, idx, is3d]);
  useEffect(() => {
    if (!ready) return;
    const update = () => setFits(innerWidth >= 900 && innerHeight >= 640); update();
    addEventListener('resize', update); return () => removeEventListener('resize', update);
  }, [ready]);
  useEffect(() => {
    const node = root.current;
    const enter = event => { if (event.target.matches(':focus-visible')) setFocusMode(true); };
    const leave = event => { if (!node.contains(event.relatedTarget)) setFocusMode(false); };
    node.addEventListener('focusin', enter); node.addEventListener('focusout', leave);
    return () => { node.removeEventListener('focusin', enter); node.removeEventListener('focusout', leave); };
  }, []);
  useEffect(() => {
    if (!pinned) { setV(1); setIdx(1); return; }
    const node = root.current, before = node.getBoundingClientRect(), wasAbove = before.bottom < 0;
    setV(0); setIdx(0);
    // Guide §2: pin, end +=300%, scrub 0.5, snap 0/.5/1 (0.35 s power2.out) — each snap point is inside a hold.
    const st = ScrollTrigger.create({ trigger: stage.current, pin: true, pinSpacing: true, start: 'top top', end: '+=300%', scrub: .5, anticipatePin: 1, invalidateOnRefresh: true,
      snap: { snapTo: [0, .5, 1], duration: .35, ease: 'power2.out', delay: .15 },
      onUpdate: self => { setV(stepValue(self.progress)); setIdx(stepIndex(self.progress)); },
      onToggle: self => { if (self.isActive) document.dispatchEvent(new CustomEvent('remote:loop', { detail: { k: 'pin', el: node } })); } });
    setV(stepValue(st.progress)); setIdx(stepIndex(st.progress));
    if (wasAbove) { const delta = node.getBoundingClientRect().height - before.height; if (delta) scrollBy(0, delta); }
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => { const h = node.getBoundingClientRect(), above = h.bottom < 0, height = h.height; st.kill(true); if (above) { const delta = node.getBoundingClientRect().height - height; if (delta) scrollBy(0, delta); } };
  }, [pinned]);
  const step = idx;
  return <section ref={root} className={`b-pin ${pinned ? 'is-pinned' : 'is-stacked'}${is3d ? ' is-3d' : ''}`} id="search-proof" data-track-section="search" aria-labelledby="pin-title">
    <span id="share-story" className="b-anchor" aria-hidden="true" />
    <div ref={stage} className="b-pin-stage">
      {pinned && <div ref={host} className="pin-canvas-host" aria-hidden="true"><span className="pin-glow" /></div>}
      <div className="b-wrap b-pin-grid">
        {pinned && <div className="b-pin-media" aria-hidden="true"><Scene v={v} idx={idx} eager sceneRef={sceneRef} /></div>}
        <div className="b-pin-copy">
          <p className="b-eyebrow"><span className="b-dot" aria-hidden="true" />01 / YouTube search</p>
          <h2 id="pin-title"><span className="b-h2-desk">Search YouTube <em>from your phone.</em></span><span className="b-h2-m">Type on your phone. <em>Results on the TV.</em></span></h2>
          <p className="b-lede">Type the search on your phone keyboard. The results open on your TV.</p>
          <ol className="b-pin-steps">{STEPS.map((s, i) => <li key={s.id} className={`b-pin-step ${(pinned ? step : 1) === i ? 'is-on' : ''}`} aria-current={pinned && step === i ? 'step' : undefined}>
            <span className="b-step-no">0{i + 1}</span>
            <SplitText tag="span" text={s.title} className="b-step-title" textAlign="left" splitType="lines" enabled={motion} delay={40} duration={.6} ease="power3.out" from={{ opacity: 0, y: 18 }} to={{ opacity: 1, y: 0 }} />
            <span className="b-step-bar" aria-hidden="true" />
            {!pinned && <div className="b-pin-stacked-still"><PinStill index={i} /></div>}
          </li>)}</ol>
          {!pinned && <p className="b-small b-pin-note">Still frames on mobile (the live 3D pin runs on desktop only).</p>}
        </div>
      </div>
    </div>
  </section>;
}
