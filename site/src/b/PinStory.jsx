// 2 · The single pinned section (CONCEPT-B-GUIDE.md §2, board gen.py:173-188): media LEFT (the drawn TV 720px wide,
// bleeding off the left edge with the lime glow, the phone overlapping it, the "sent" bubble), copy RIGHT.
// Owner ruling 16 Oct: until Build's re-render matches the board, the 3-step story is driven by the board's own 2D
// frames instead of the GLB (3d-prod is whitelisted per slot in media.js; empty now). One ScrollTrigger pin
// (pinSpacing, end +=400%, scrub 1, no snap) maps scroll to a progress with held plateaus: step 1 holds 0-.22, eases
// to step 2 (.22-.39), step 2 holds .39-.61 (mid-scroll), eases to step 3 (.61-.78), step 3 holds to the release.
// Each move is a slow sine in-out dolly of the whole scene plus crossfades of the TV and phone screens.
// Off on touch (pointer: coarse), below 1200 px wide or 640 px tall, under reduced motion, and while keyboard focus is
// inside: then three stacked stills (1440 stills above 390 px, 4:5 stills at 390), revealed as each scrolls in. Analytics: remote:loop k='pin' when the pin becomes active.
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitText from '../components/SplitText';
import { PIN } from './media';
import { useEnvironment } from '../environment';
import { useGpuLease, useInView, lowEnd } from './lease';
import { useLoopClock } from './phone/clock.js';
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
const HOLD = [[0, .2], [.4, .6], [.8, 1]];
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

function Scene({ v, idx, phoneIdx = idx, eager = false, sceneRef }) {
  const i = Math.min(1, Math.floor(v)), t = v - i, a = CAM[i], b = CAM[Math.min(2, i + 1)];
  const cam = { s: lerp(a.s, b.s, t), x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  const op = k => (k === idx ? 1 : 0);
  return <div ref={sceneRef} className="pin-scene" style={{ '--cam-s': cam.s.toFixed(4), '--cam-x': `${cam.x.toFixed(2)}px`, '--cam-y': `${cam.y.toFixed(2)}px` }}>
    {/* Fallback under the canvas (no WebGL, before the pin holds the context): Build's step-1 still when it lands,
        else a code-drawn TV (SVG, lime glow) + the phone with its phoneScreenSvg screen, following the steps. */}
    {PIN.fallback && <img className="pin-fallback" src={PIN.fallback} alt="" width="1600" height="1000" decoding="async" />}
    <div className={`pin-tv${PIN.fallback ? ' is-geom' : ''}`}>{!PIN.fallback && STEPS.map((s, k) => <div key={s.id} className="pin-tv-layer" style={{ opacity: k === 0 ? 1 : op(k) }}><DrawnTV state={s.drawn} focus={0} idPrefix={`pin${k}`} /></div>)}</div>
    <div className={`pin-phone${PIN.fallback ? ' is-geom' : ''}`}>{!PIN.fallback && STEPS.map((s, k) => <div key={s.id} className="pin-phone-layer" style={{ opacity: k === 0 ? 1 : (k === phoneIdx ? 1 : 0) }}><PhoneLoop name="typing" step={k} playing={false} /></div>)}</div>
    <p className="pin-bubble" style={{ opacity: phoneIdx === 1 ? 1 : 0 }}>{SENT}</p>
  </div>;
}
// 390 / reduced-motion stills: Build's re-render per step when it lands (PIN.stills), else a code-drawn interim (the
// drawn TV crop at the right, the phone with phoneScreenSvg('typing', step) overlapping at the left). No app captures.
export function PinStill({ index }) {
  const s = STEPS[index], built = PIN.stills[index];
  // Baagad 16 Oct: wider than 390 (tablets, touch, < 1200 px) the stacked step uses Build's 1600x1000 1440 still, full
  // width of its column; 390 and below keep the 4:5 still. The wide set is used only once all three exist.
  const wide = PIN.wide.every(Boolean) && PIN.wide[index];
  if (built) return <figure className={`pin-still is-built${wide ? ' has-wide' : ''}`}><picture>{wide && <source media="(min-width: 391px)" srcSet={wide} width="1600" height="1000" />}<img src={built} alt={`${s.tvAlt} ${s.phoneAlt}`} width="780" height="975" loading="lazy" decoding="async" /></picture></figure>;
  return <figure className="pin-still">
    <div className="pin-still-tv" role="img" aria-label={s.tvAlt}><DrawnTV state={s.drawn} focus={0} idPrefix={`still${index}`} /></div>
    <div className="pin-still-phone" role="img" aria-label={s.phoneAlt}><PhoneLoop name="typing" step={index} /></div>
  </figure>;
}
// PM 22:13 / 22:36 / 22:37 (touch / under 1200 px): no pin. The SAME three.js scene (pin-tv-phone.glb, PhoneScreen /
// TVScreen) plays one 10 s seamless loop while on screen. Both screens are live CanvasTextures composited from Build's
// pin-design PNGs plus overlays drawn here, re-uploaded only when the frame's state changes. PM's 4 beats (the TV
// reacts 1 frame after each phone press, no cursor or caret on the TV, every state change is hard; no cross-fade):
//  1.0-2.2 "lofi" types letter by letter into the TV's YouTube search bar, mirrored in the phone field (keys flash lime)
//  3.5     Send: the phone's Send button lights lime; the TV shows the results (tv-results-f0, tile 1 focused)
//  6.0     OK: the phone's OK lights; tile 1 plays on the TV (tv-playing)
//  8.0     Back: the phone's Back lights; the TV returns to the EMPTY search (frame 0) | 9-10 hold on frame 0
// One renderer (the 'pin' GPU lease), DPR <= 1.5, demand rendering, paused off-screen (useLoopClock + the lease).
// No WebGL / the scene fails: Design's 2D <PhoneLoop name="typing" tv />. Reduced motion / Save-Data: the stills.
const TEX = n => `assets/3d-prod/textures/loop-${n}.png`;
const LOOP_SRC = { p1: TEX('phone-1-typed'), p2: TEX('phone-2-sent'), t1: TEX('tv-search-typing-1440'), t2: TEX('tv-results-f0-1440'), t3: TEX('tv-playing-1440') };
const L_KEYS = [['l', 1.0], ['o', 1.4], ['f', 1.8], ['i', 2.2]], L_SEND = 3.5, L_OK = 6.0, L_BACK = 8.0, TV_LAG = 1 / 30;
// Key centres on phone-1-typed (1080 x 2340): row 1 q..p at x 54 + 108k, y 1644; row 2 a..l at x 108 + 108k, y 1793.
const KEY_XY = { l: [972, 1793], o: [918, 1644], f: [432, 1793], i: [810, 1644] };
const flash = (t, a, d = .45) => { const x = t - a; return x < 0 || x > d ? 0 : x < .06 ? x / .06 : 1 - (x - .06) / (d - .06); };
export function loopFrame(t) {
  const n = lag => (t >= L_BACK + lag ? 0 : L_KEYS.filter(([, a]) => t >= a + lag).length);
  const phone = t >= L_SEND + .25 && t < L_BACK + .45 ? 1 : 0; // the remote screen holds until Back's light fades
  const tv = t >= L_BACK + TV_LAG ? 0 : t >= L_OK + TV_LAG ? 2 : t >= L_SEND + TV_LAG ? 1 : 0;
  const key = L_KEYS.map(([k, a]) => [k, flash(t, a, .3)]).find(([, v]) => v > 0);
  return { typed: t >= L_SEND + .25 ? 0 : n(0), tvTyped: n(TV_LAG), phone, tv, key, send: flash(t, L_SEND), ok: flash(t, L_OK), back: flash(t, L_BACK), step: tv };
}
const LOAD = src => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
function drawPhone(g, img, f) {
  g.drawImage(f.phone ? img.p2 : img.p1, 0, 0, 1080, 2340);
  const lit = (v, fn) => { if (v <= 0) return; g.globalAlpha = v; fn(); g.globalAlpha = 1; };
  if (!f.phone) {
    g.fillStyle = '#0b0e0d'; g.fillRect(150, 1250, 690, 66); // the baked "lofi beats" -> what has been typed so far
    g.fillStyle = '#eeeee6'; g.font = '47px "Work Sans", system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText('lofi'.slice(0, f.typed), 169, 1283);
    if (f.key) { const [k, v] = f.key, [x, y] = KEY_XY[k]; lit(v, () => { g.fillStyle = '#d4fa7b'; rr(g, x - 47, y - 58, 94, 116, 16); g.fill(); g.fillStyle = '#0b0e0d'; g.font = '600 50px "Work Sans", system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(k, x, y + 2); g.textAlign = 'left'; }); }
    lit(f.send, () => { g.strokeStyle = '#d4fa7b'; g.lineWidth = 10; g.beginPath(); g.arc(970, 1281, 82, 0, 7); g.stroke(); g.fillStyle = '#eeeee6'; g.globalAlpha *= .45; g.beginPath(); g.arc(970, 1281, 60, 0, 7); g.fill(); });
  } else {
    lit(f.ok, () => { g.strokeStyle = '#d4fa7b'; g.lineWidth = 12; g.beginPath(); g.arc(540, 947, 118, 0, 7); g.stroke(); g.fillStyle = '#eeeee6'; g.globalAlpha *= .4; g.beginPath(); g.arc(540, 947, 99, 0, 7); g.fill(); });
    lit(f.back, () => { g.fillStyle = '#d4fa7b'; rr(g, 54, 1273, 306, 147, 26); g.fill(); g.fillStyle = '#0b0e0d'; g.font = '600 42px "Work Sans", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('\u2190', 207, 1318); g.font = '500 36px "Work Sans", system-ui, sans-serif'; g.fillText('Back', 207, 1380); g.textAlign = 'left'; });
  }
}
function drawTV(g, img, f) {
  g.drawImage([img.t1, img.t2, img.t3][f.tv], 0, 0, 1440, 810);
  if (f.tv < 2) { g.fillStyle = '#151b16'; g.fillRect(425, 68, 600, 46); g.fillStyle = '#eeeee6'; g.font = '32px "Work Sans", system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText(f.tv ? 'lofi' : 'lofi'.slice(0, f.tvTyped), 435, 91); } // empty bar at frame 0
}
function PinLoop({ onStep }) {
  const { gpu } = useEnvironment(), box = useRef(null), host = useRef(null), tvEl = useRef(null), phEl = useRef(null), api = useRef(null), cv = useRef(null), sig = useRef('');
  const inView = useInView(box, { threshold: .15 }), [mode, setMode] = useState('poster');
  const lease = useGpuLease(gpu && inView && mode !== '2d' && Boolean(PIN.model), 'pin');
  const t = useLoopClock(box, 0, true), fr = loopFrame(t), tRef = useRef(0); tRef.current = t;
  useEffect(() => { if (!gpu) setMode('2d'); }, [gpu]);
  const paint = () => { const c = cv.current, a = api.current; if (!c || !a) return; const f = loopFrame(tRef.current);
    const s = JSON.stringify([f.typed, f.tvTyped, f.phone, f.tv, f.key && [f.key[0], +f.key[1].toFixed(2)], +f.send.toFixed(2), +f.ok.toFixed(2), +f.back.toFixed(2)]);
    if (s !== sig.current) { sig.current = s; drawPhone(c.pg, c.img, f); drawTV(c.tg, c.img, f); a.refresh(); } // upload only on change
    a.update(0, 0, 0, tvEl.current.getBoundingClientRect(), phEl.current.getBoundingClientRect()); };
  useEffect(() => {
    if (!lease) return;
    const ctrl = new AbortController();
    (async () => {
      const entries = await Promise.all(Object.entries(LOOP_SRC).map(async ([k, src]) => [k, await LOAD(src)])); await document.fonts?.ready;
      const pc = Object.assign(document.createElement('canvas'), { width: 1080, height: 2340 }), tc = Object.assign(document.createElement('canvas'), { width: 1440, height: 810 });
      cv.current = { img: Object.fromEntries(entries), pg: pc.getContext('2d'), tg: tc.getContext('2d') }; sig.current = '';
      const f = loopFrame(tRef.current); drawPhone(cv.current.pg, cv.current.img, f); drawTV(cv.current.tg, cv.current.img, f);
      const { createPinScene } = await import('./pin-scene.js');
      return createPinScene(host.current, { modelUrl: PIN.model, tvTextures: [tc], phoneTextures: [pc], signal: ctrl.signal });
    })().then(a => { if (ctrl.signal.aborted) { a.dispose(); return; } api.current = a; paint(); requestAnimationFrame(() => requestAnimationFrame(() => { if (!ctrl.signal.aborted) setMode('3d'); })); })
      .catch(() => { if (!ctrl.signal.aborted) setMode('2d'); });
    return () => { ctrl.abort(); api.current?.dispose(); api.current = null; cv.current = null; host.current?.replaceChildren(); setMode(m => (m === '3d' ? 'poster' : m)); };
  }, [lease]);
  useEffect(() => { paint(); }, [t, mode]);
  useEffect(() => { onStep(fr.step); }, [fr.step]);
  return <div ref={box} className={`pin-loop is-${mode}`} aria-hidden="true">
    <picture className="pin-loop-poster">{PIN.wide[0] && <source media="(min-width: 391px)" srcSet={PIN.wide[0]} width="1600" height="1000" />}<img src={PIN.stills[0] || PIN.wide[0]} alt="" width="780" height="975" decoding="async" /></picture>
    <span ref={tvEl} className="pin-loop-tv" /><span ref={phEl} className="pin-loop-phone" />
    <div ref={host} className="pin-loop-host" />
    {mode === '2d' && <div className="pin-loop-2d"><PhoneLoop name="typing" tv /></div>}
  </div>;
}
export default function PinStory() {
  const { ready, motion, gpu } = useEnvironment(), root = useRef(null), stage = useRef(null);
  const [fits, setFits] = useState(false), [focusMode, setFocusMode] = useState(false), [v, setV] = useState(1), [idx, setIdx] = useState(1);
  const pinned = ready && motion && fits && !focusMode;
  const [near, setNear] = useState(false), sceneRef = useRef(null), host = useRef(null), live = useRef(null), vRef = useRef(1), idxRef = useRef(1), phoneRef = useRef(1), glowBox = useRef(null);
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
    if (!glowBox.current) { glowBox.current = [tv.width, tv.height]; g.width = `${tv.width}px`; g.height = `${tv.height}px`; } g.transform = `translate(${tv.left - hr.left}px,${tv.top - hr.top}px) scale(${tv.width / glowBox.current[0]},${tv.height / glowBox.current[1]})`; /* transform only: no layout shift */ api.update(value, idxRef.current, phoneRef.current, { left: tv.left, top: tv.top, width: tv.width, height: tv.height }, { left: ph.left + 8, top: ph.top + 8, width: ph.width - 16, height: ph.height - 16 }); };
  const phoneIdx = pinned && idx === 1 && !sent ? 0 : idx;
  useEffect(() => { vRef.current = v; idxRef.current = idx; phoneRef.current = phoneIdx; requestAnimationFrame(() => push(v)); }, [v, idx, phoneIdx, is3d]);
  useEffect(() => {
    if (!ready) return;
    // Baagad 16 Oct (tablet test): never pin on touch or under 1200 px wide; those get the three stacked stills.
    const mq = matchMedia('(pointer: coarse), (max-width: 1199px)');
    const update = () => setFits(!mq.matches && innerHeight >= 640); update();
    addEventListener('resize', update); mq.addEventListener('change', update);
    return () => { removeEventListener('resize', update); mq.removeEventListener('change', update); };
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
    // Settled on step 02 = scrolling has stopped while the label reads 02 (there is no snap any more).
    const settle = self => { if (stepIndex(self.progress) === 1) setSentBoth(true); };
    // Guide §2: pin, end +=300%, scrub 0.5. The snap 0/.5/1 was removed (Baagad 16 Oct).
    // Baagad 16 Oct: no snap at any width; the pin follows the scroll. pinType 'transform' (with Lenis driving the
    // scroll on fine pointers) keeps the pin a transform, so pinning and the 3D swap-in report no layout shift.
    const st = ScrollTrigger.create({ trigger: stage.current, pin: true, pinSpacing: true, pinType: matchMedia('(hover: hover) and (pointer: fine)').matches ? 'transform' : 'fixed', start: 'top top', end: '+=300%', scrub: .5, invalidateOnRefresh: true,
      onUpdate: self => { setV(stepValue(self.progress)); setIdx(stepIndex(self.progress)); if (stepIndex(self.progress) !== 1) setSentBoth(false); },
      onToggle: self => { if (self.isActive) document.dispatchEvent(new CustomEvent('remote:loop', { detail: { k: 'pin', el: node } })); } });
    setV(stepValue(st.progress)); setIdx(stepIndex(st.progress)); settle(st);
    const scrollEnd = () => settle(st); ScrollTrigger.addEventListener('scrollEnd', scrollEnd);
    if (wasAbove) { const delta = node.getBoundingClientRect().height - before.height; if (delta) scrollBy(0, delta); }
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => { ScrollTrigger.removeEventListener('scrollEnd', scrollEnd); const h = node.getBoundingClientRect(), above = h.bottom < 0, height = h.height; st.kill(true); if (above) { const delta = node.getBoundingClientRect().height - height; if (delta) scrollBy(0, delta); } };
  }, [pinned]);
  // 390 / stacked (PM 21:44): the stills are a plain scroll list, so the active step follows the reader. It is the last
  // step whose top has passed 55% of the viewport (01 until then); scrolling back up walks it back down.
  const [stackIdx, setStackIdx] = useState(0), [seen, setSeen] = useState(0);
  useEffect(() => {
    if (pinned) return;
    let raf = 0;
    const read = () => { raf = 0; const items = root.current?.querySelectorAll('.b-pin-step'); if (!items) return; let k = 0; items.forEach((li, i) => { if (li.getBoundingClientRect().top <= innerHeight * .55) k = i; }); setStackIdx(k); };
    const queue = () => { if (!raf) raf = requestAnimationFrame(read); };
    read(); addEventListener('scroll', queue, { passive: true }); addEventListener('resize', queue);
    // Each stacked step plays its entrance once as it scrolls in (IntersectionObserver, no ScrollTrigger, no pin).
    const items = [...root.current.querySelectorAll('.b-pin-step')];
    // Seen steps live in React state (a classList.add would be wiped by the next render of the step's className).
    const io = new IntersectionObserver(list => { for (const e of list) if (e.isIntersecting) { const k = items.indexOf(e.target); setSeen(m => m | (1 << k)); io.unobserve(e.target); } }, { threshold: .2 });
    items.forEach(li => io.observe(li));
    return () => { cancelAnimationFrame(raf); removeEventListener('scroll', queue); removeEventListener('resize', queue); io.disconnect(); };
  }, [pinned]);
  // Touch / < 1200 px with motion (and no Save-Data): the 10 s three.js loop instead of the three stills.
  const loopMode = !pinned && ready && motion && !focusMode && !(typeof navigator !== 'undefined' && navigator.connection?.saveData);
  const [loopStep, setLoopStep] = useState(0);
  const step = pinned ? idx : loopMode ? loopStep : stackIdx;
  return <section ref={root} className={`b-pin ${pinned ? 'is-pinned' : 'is-stacked'}${loopMode ? ' is-loop' : ''}${!pinned && ready && motion ? ' is-reveal' : ''}${is3d ? ' is-3d' : ''}`} id="search-proof" data-active-step={step + 1} data-track-section="search" aria-labelledby="pin-title">
    <span id="share-story" className="b-anchor" aria-hidden="true" />
    <div ref={stage} className="b-pin-stage">
      {pinned && <div ref={host} className="pin-canvas-host" aria-hidden="true"><span className="pin-glow" /></div>}
      <div className="b-wrap b-pin-grid">
        {loopMode && <div className="b-pin-loopcol"><PinLoop onStep={setLoopStep} /></div>}
        {pinned && <div className="b-pin-media" aria-hidden="true"><Scene v={v} idx={idx} phoneIdx={phoneIdx} eager sceneRef={sceneRef} /></div>}
        <div className="b-pin-copy">
          <p className="b-eyebrow"><span className="b-dot" aria-hidden="true" />01 / YouTube search</p>
          <h2 id="pin-title"><span className="b-h2-desk">Search YouTube <em>from your phone.</em></span><span className="b-h2-m">Type on your phone. <em>Results on the TV.</em></span></h2>
          <p className="b-lede">Type the search on your phone keyboard. The results open on your TV.</p>
          <ol className="b-pin-steps">{STEPS.map((s, i) => <li key={s.id} className={`b-pin-step${step === i ? ' is-on' : ''}${seen & (1 << i) ? ' is-seen' : ''}`} aria-current={step === i ? 'step' : undefined}>
            <span className="b-step-no">0{i + 1}</span>
            <SplitText tag="span" text={s.title} className="b-step-title" textAlign="left" splitType="lines" enabled={motion && pinned} delay={40} duration={.6} ease="power3.out" from={{ opacity: 0, y: 18 }} to={{ opacity: 1, y: 0 }} />
            <span className="b-step-bar" aria-hidden="true" />
            {!pinned && !loopMode && <div className="b-pin-stacked-still"><PinStill index={i} /></div>}
          </li>)}</ol>
          
        </div>
      </div>
    </div>
  </section>;
}
