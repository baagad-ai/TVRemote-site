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
import { useGpuLease, lowEnd } from './lease';
import { PhoneLoop, phoneScreenSvg } from './slots';
import DrawnTV from './DrawnTV';

gsap.registerPlugin(ScrollTrigger);
const SENT = 'YouTube search action sent. Check the TV.';
export const STEPS = [
  { id: 'search', title: 'Type a YouTube search on your phone keyboard.', tv: 'assets/board/tv-home-1440.webp', tvAlt: 'The drawn TV with YouTube open and an empty search box.', drawn: 'home', phoneAlt: 'The Remote on a phone: the YouTube search sheet for Living Room TV, with lofi hip being typed on the phone keyboard.' },
  { id: 'results', title: `Send it. \u201c${SENT}\u201d`, tv: 'assets/board/tv-results-f0-1440.webp', tvAlt: 'The drawn TV showing YouTube results for lofi beats, with the first result highlighted.', drawn: 'results', phoneAlt: `The Remote's remote screen for Living Room TV with the line \u201c${SENT}\u201d`, chip: SENT },
  { id: 'link', title: 'Share a YouTube link. Review it, pick the TV, open it.', tv: 'assets/board/tv-playing-1440.webp', tvAlt: 'The drawn TV playing the shared YouTube video.', drawn: 'playing', phoneAlt: "The Remote's share sheet: a YouTube link, Living Room TV selected, and an Open on Living room button." }
];
// Held plateaus (step index while holding) and eased moves between them.
const HOLD = [[0, .2], [.4, .6], [.8, 1]]; // snap points 0 / .5 / 1 sit inside the holds
const sine = t => -(Math.cos(Math.PI * t) - 1) / 2;
// Texture swaps happen when a camera move has finished (never during it): step index changes at .4 and .8.
export const SNAP = [0, .5, 1]; // one snap point per step, inside its hold
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

function Scene({ v, idx, phoneIdx = idx, eager = false, sceneRef }) {
  const i = Math.min(1, Math.floor(v)), t = v - i, a = CAM[i], b = CAM[Math.min(2, i + 1)];
  const cam = { s: lerp(a.s, b.s, t), x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  const op = k => (k === idx ? 1 : 0);
  return <div ref={sceneRef} className="pin-scene" style={{ '--cam-s': cam.s.toFixed(4), '--cam-x': `${cam.x.toFixed(2)}px`, '--cam-y': `${cam.y.toFixed(2)}px` }}>
    {/* Fallback under the canvas (no WebGL, before the pin holds the context): Build's step-1 still when it lands,
        else a code-drawn TV (SVG, lime glow) + the phone with its phoneScreenSvg screen, following the steps. */}
    {PIN.fallback && <img className="pin-fallback" src={PIN.fallback} alt="" width="1600" height="1000" decoding="async" />}
    <div className={`pin-tv${PIN.fallback ? ' is-geom' : ''}`}>{!PIN.fallback && STEPS.map((s, k) => <div key={s.id} className="pin-tv-layer" style={{ opacity: k === 0 ? 1 : op(k) }}><DrawnTV state={s.drawn} focus={0} idPrefix={`pin${k}`} /></div>)}<span className="b-tag pin-tag">Illustrated TV · results open after Send</span></div>
    <div className={`pin-phone${PIN.fallback ? ' is-geom' : ''}`}>{!PIN.fallback && STEPS.map((s, k) => <div key={s.id} className="pin-phone-layer" style={{ opacity: k === 0 ? 1 : (k === phoneIdx ? 1 : 0) }}><PhoneLoop name="typing" step={k} playing={false} /></div>)}</div>
    <p className="pin-bubble" style={{ opacity: phoneIdx === 1 ? 1 : 0 }}>{SENT}</p>
  </div>;
}
// 390 / reduced-motion stills: Build's re-render per step when it lands (PIN.stills), else a code-drawn interim (the
// drawn TV crop at the right, the phone with phoneScreenSvg('typing', step) overlapping at the left). No app captures.
export function PinStill({ index }) {
  const s = STEPS[index], built = PIN.stills[index];
  if (built) return <figure className="pin-still is-built"><img src={built} alt={`${s.tvAlt} ${s.phoneAlt}`} width="780" height="975" loading="lazy" decoding="async" /></figure>;
  return <figure className="pin-still">
    <div className="pin-still-tv" role="img" aria-label={s.tvAlt}><DrawnTV state={s.drawn} focus={0} idPrefix={`still${index}`} /></div>
    <div className="pin-still-phone" role="img" aria-label={s.phoneAlt}><PhoneLoop name="typing" step={index} /></div>
  </figure>;
}
export default function PinStory() {
  const { ready, motion, gpu } = useEnvironment(), root = useRef(null), stage = useRef(null);
  const [fits, setFits] = useState(false), [focusMode, setFocusMode] = useState(false), [v, setV] = useState(1), [idx, setIdx] = useState(1);
  const pinned = ready && motion && fits && !focusMode;
  const [near, setNear] = useState(false), sceneRef = useRef(null), host = useRef(null), live = useRef(null), vRef = useRef(1), idxRef = useRef(1), phoneRef = useRef(1);
  // Step 02 "Send it": the phone keeps the typed search (typing step 0: "lofi beats", keyboard up) until step 02's snap
  // has finished, then shows step 1 (sent). The TV switches at the step change as before.
  const [sent, setSent] = useState(true), sentRef = useRef(true);
  const lease = useGpuLease(pinned && near && gpu && !lowEnd() && Boolean(PIN.model), 'pin');
  const [is3d, setIs3d] = useState(false);
  // "Near" = the pin's top has come up past 60% of the viewport (never at load: the hero's Grainient owns the slot).
  useEffect(() => {
    if (!pinned) { setNear(false); return; }
    const st = ScrollTrigger.create({ trigger: root.current, start: 'top 60%', end: 'bottom top', refreshPriority: -1, invalidateOnRefresh: true, onToggle: self => setNear(self.isActive) });
    requestAnimationFrame(() => { ScrollTrigger.refresh(); setNear(st.isActive); }); return () => st.kill();
  }, [pinned]);
  // Our 3D (pin-tv-phone.glb): loaded only while the 'pin' GPU lease is held; DOM boxes give the board composition.
  useEffect(() => {
    if (!lease) return;
    const ctrl = new AbortController(); let api = null;
    import('./pin-scene.js').then(({ createPinScene }) => createPinScene(host.current, { modelUrl: PIN.model, tvTextures: STEPS.map(s => s.tv), phoneTextures: STEPS.map((_, i) => phoneScreenSvg('typing', i)), signal: ctrl.signal }))
      .then(a => { api = a; live.current = a; push(vRef.current); requestAnimationFrame(() => requestAnimationFrame(() => { if (!ctrl.signal.aborted) setIs3d(true); })); }).catch(() => setIs3d(false));
    // The canvas stays hidden (CSS: .pin-canvas-host until .is-3d) and the fallback stays visible until createPinScene has
    // loaded every texture and put the phoneScreenSvg / DrawnTV maps on PhoneScreen / TVScreen (the glb's baked screen
    // material is disposed) and the first frame has rendered. Any texture failure rejects: the fallback stays.
    return () => { ctrl.abort(); api?.dispose(); live.current = null; setIs3d(false); };
  }, [lease]);
  const push = value => { const node = sceneRef.current, api = live.current; if (!node || !api) return; const tv = node.querySelector('.pin-tv').getBoundingClientRect(), ph = node.querySelector('.pin-phone').getBoundingClientRect(), hr = host.current.getBoundingClientRect(), g = host.current.firstChild.style;
    g.left = `${tv.left - hr.left}px`; g.top = `${tv.top - hr.top}px`; g.width = `${tv.width}px`; g.height = `${tv.height}px`; api.update(value, idxRef.current, phoneRef.current, { left: tv.left, top: tv.top, width: tv.width, height: tv.height }, { left: ph.left + 8, top: ph.top + 8, width: ph.width - 16, height: ph.height - 16 }); };
  const phoneIdx = pinned && idx === 1 && !sent ? 0 : idx;
  useEffect(() => { vRef.current = v; idxRef.current = idx; phoneRef.current = phoneIdx; requestAnimationFrame(() => push(v)); }, [v, idx, phoneIdx, is3d]);
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
    const setSentBoth = x => { if (sentRef.current !== x) { sentRef.current = x; setSent(x); } };
    if (!pinned) { setV(1); setIdx(1); setSentBoth(true); return; }
    const node = root.current, before = node.getBoundingClientRect(), wasAbove = before.bottom < 0;
    setV(0); setIdx(0); setSentBoth(false);
    // Settled on step 02 = its snap tween finished, or scrolling stopped right on the snap point (no tween needed).
    const settle = self => { if (stepIndex(self.progress) === 1 && Math.abs(self.progress - .5) < .01) setSentBoth(true); };
    // Guide §2: pin, end +=300%, scrub 0.5, snap 0/.5/1 (0.35 s power2.out) — each snap point is inside a hold.
    const st = ScrollTrigger.create({ trigger: stage.current, pin: true, pinSpacing: true, start: 'top top', end: '+=300%', scrub: .5, anticipatePin: 1, invalidateOnRefresh: true,
      // QA 16 Oct: the snap follows the label. It goes to the snap point of the step the label shows (stepIndex of the
      // real scroll progress, the same thresholds .4 / .8), never a velocity-projected neighbour: label 02 -> snaps to 02.
      snap: { snapTo: (_, self) => SNAP[stepIndex(self.progress)], inertia: false, duration: .35, ease: 'power2.out', delay: .15, onComplete: () => settle(st) },
      onUpdate: self => { setV(stepValue(self.progress)); setIdx(stepIndex(self.progress)); if (stepIndex(self.progress) !== 1) setSentBoth(false); },
      onToggle: self => { if (self.isActive) document.dispatchEvent(new CustomEvent('remote:loop', { detail: { k: 'pin', el: node } })); } });
    setV(stepValue(st.progress)); setIdx(stepIndex(st.progress)); settle(st);
    const scrollEnd = () => settle(st); ScrollTrigger.addEventListener('scrollEnd', scrollEnd);
    if (wasAbove) { const delta = node.getBoundingClientRect().height - before.height; if (delta) scrollBy(0, delta); }
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => { ScrollTrigger.removeEventListener('scrollEnd', scrollEnd); const h = node.getBoundingClientRect(), above = h.bottom < 0, height = h.height; st.kill(true); if (above) { const delta = node.getBoundingClientRect().height - height; if (delta) scrollBy(0, delta); } };
  }, [pinned]);
  const step = idx;
  return <section ref={root} className={`b-pin ${pinned ? 'is-pinned' : 'is-stacked'}${is3d ? ' is-3d' : ''}`} id="search-proof" data-track-section="search" aria-labelledby="pin-title">
    <span id="share-story" className="b-anchor" aria-hidden="true" />
    <div ref={stage} className="b-pin-stage">
      {pinned && <div ref={host} className="pin-canvas-host" aria-hidden="true"><span className="pin-glow" /></div>}
      <div className="b-wrap b-pin-grid">
        {pinned && <div className="b-pin-media" aria-hidden="true"><Scene v={v} idx={idx} phoneIdx={phoneIdx} eager sceneRef={sceneRef} /></div>}
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
