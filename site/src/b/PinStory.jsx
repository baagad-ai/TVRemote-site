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
import { useEnvironment } from '../environment';

gsap.registerPlugin(ScrollTrigger);
const SENT = 'YouTube search action sent. Check the TV.';
export const STEPS = [
  { id: 'search', title: 'Type a YouTube search on your phone keyboard.', tv: 'assets/board/tv-home-1440.webp', tvAlt: 'The drawn TV with YouTube open and an empty search box.', phone: 'assets/board/loop1-typing-keyframe-2.webp', phoneAlt: 'The Remote on a phone: the YouTube search sheet for Living Room TV, with lofi hip being typed on the phone keyboard.' },
  { id: 'results', title: `Send it. \u201c${SENT}\u201d`, tv: 'assets/board/tv-results-f0-1440.webp', tvAlt: 'The drawn TV showing YouTube results for lofi beats, with the first result highlighted.', phone: 'assets/board/loop1-typing-keyframe-4.webp', phoneAlt: `The Remote's remote screen for Living Room TV with the line \u201c${SENT}\u201d`, chip: SENT },
  { id: 'link', title: 'Share a YouTube link. Review it, pick the TV, open it.', tv: 'assets/board/tv-playing-1440.webp', tvAlt: 'The drawn TV playing the shared YouTube video.', phone: 'assets/board/youtube-share-540.webp', phoneAlt: "The Remote's share sheet: a YouTube link, Living Room TV selected, and an Open on Living room button." }
];
// Held plateaus (step index while holding) and eased moves between them.
const HOLD = [[0, .22], [.39, .61], [.78, 1]];
const sine = t => -(Math.cos(Math.PI * t) - 1) / 2;
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

function Scene({ v, eager = false }) {
  const i = Math.min(1, Math.floor(v)), t = v - i, a = CAM[i], b = CAM[Math.min(2, i + 1)];
  const cam = { s: lerp(a.s, b.s, t), x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  const op = k => Math.max(0, 1 - Math.abs(v - k));
  return <div className="pin-scene" style={{ '--cam-s': cam.s.toFixed(4), '--cam-x': `${cam.x.toFixed(2)}px`, '--cam-y': `${cam.y.toFixed(2)}px` }}>
    <div className="pin-tv">{STEPS.map((s, k) => <img key={s.id} src={s.tv} alt="" width="1440" height="810" loading={eager ? 'eager' : 'lazy'} decoding="async" style={{ opacity: k === 0 ? 1 : op(k) }} />)}</div>
    <div className="pin-phone b-frame">{STEPS.map((s, k) => <img key={s.id} src={s.phone} alt="" width="342" height="706" loading="lazy" decoding="async" style={{ opacity: k === 0 ? 1 : op(k) }} />)}</div>
    <p className="pin-bubble" style={{ opacity: op(1) }}>{SENT}</p>
  </div>;
}
export function PinStill({ index }) {
  const s = STEPS[index];
  return <figure className="pin-still">
    <div className="pin-still-tv"><img src={s.tv} alt={s.tvAlt} width="1440" height="810" loading="lazy" decoding="async" /></div>
    <div className="pin-still-phone b-frame"><img src={s.phone} alt={s.phoneAlt} width="342" height="706" loading="lazy" decoding="async" /></div>
  </figure>;
}
export default function PinStory() {
  const { ready, motion } = useEnvironment(), root = useRef(null), stage = useRef(null);
  const [fits, setFits] = useState(false), [focusMode, setFocusMode] = useState(false), [v, setV] = useState(1);
  const pinned = ready && motion && fits && !focusMode;
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
    if (!pinned) { setV(1); return; }
    const node = root.current, before = node.getBoundingClientRect(), wasAbove = before.bottom < 0;
    setV(0);
    const st = ScrollTrigger.create({ trigger: stage.current, pin: true, pinSpacing: true, start: 'top top', end: '+=400%', scrub: 1, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: self => setV(stepValue(self.progress)),
      onToggle: self => { if (self.isActive) document.dispatchEvent(new CustomEvent('remote:loop', { detail: { k: 'pin', el: node } })); } });
    setV(stepValue(st.progress));
    if (wasAbove) { const delta = node.getBoundingClientRect().height - before.height; if (delta) scrollBy(0, delta); }
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => { const h = node.getBoundingClientRect(), above = h.bottom < 0, height = h.height; st.kill(true); if (above) { const delta = node.getBoundingClientRect().height - height; if (delta) scrollBy(0, delta); } };
  }, [pinned]);
  const step = Math.round(v);
  return <section ref={root} className={`b-pin ${pinned ? 'is-pinned' : 'is-stacked'}`} id="search-proof" data-track-section="search" aria-labelledby="pin-title">
    <span id="share-story" className="b-anchor" aria-hidden="true" />
    <div ref={stage} className="b-pin-stage">
      <div className="b-wrap b-pin-grid">
        {pinned && <div className="b-pin-media" aria-hidden="true"><Scene v={v} eager /></div>}
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
        </div>
      </div>
    </div>
  </section>;
}
