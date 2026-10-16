// 3 · "Swipe and tap" bento (CONCEPT-B-GUIDE.md §3, board gen.py:226-243). Not mirrored: grid 300px 1fr 1fr 1fr with
// the phone tile FIRST (2 rows; it is also the demo pad), the drawn TV tile (2 cols: YouTube logo + results), then the
// board's 7 gesture tiles (Pointer "Coming soon", dashed). WebGL slot: free (DOM + SVG). No screenshots, no video.
// Auto demo, one 10.00 s timeline (Design's clock, phone/clock.js) drives BOTH the phone (<PhoneLoop name="trackpad"
// t={t} />) and the TV focus from the same t: rest on tile 1 | 1.0 s swipe right (0.8 s glide), the TV focus moves to
// tile 2 two frames after the glide ends | 3.4 s tap = OK, pulse 1 -> 1.06 -> 1 in 0.3 s | 5.8 s swipe left, focus
// back to tile 1 after that glide | hold to 10.0 s. Every value is a pure function of t, so t = 10 renders as t = 0.
// Moves: the focus ring (React Bits Star Border) slides one tile in 0.25 s power2.out (GSAP), settling on the tile.
// Visitors: a swipe on the pad (>= 24 px, direction locked) or an arrow key moves the focus one tile; a tap / Enter is
// OK; an edge gives a 6 px nudge back over 0.18 s, no wrap. No cursor, finger dot or trail on the TV, no long press.
// Reduced motion: a static focus (Design's still, t = 3.65: focus on tile 2, no pulse) + the text; the pad still works, instantly.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import StarBorder from '../components/rb/StarBorder';
import { useEnvironment } from '../environment';
import { YouTubeLogo } from './DrawnTV';
import { PhoneLoop } from './slots';
import { useLoopClock, clamp } from './phone/clock.js';

// Board TV tile geometry (viewBox 1600 x 900, measured from the board's tv-results-f2 frame). TY is 12 units above the
// board's 247 so the second row's lower caption bar (was y 897-911) ends at 899 inside the viewBox (QA 16 Oct: 4px clip).
const TX = 150, TY = 235, TW = 421, TH = 248, PX = 446, PY = 360, COLS = 3, RING = 6;
const tileXY = i => [TX + (i % COLS) * PX, TY + Math.floor(i / COLS) * PY];
const PANEL = '#151b16', LINE = '#354032', PAPER = '#eeeee6', MUTED = '#b0b9a2';
// The 10 s beats (seconds). Design's PhoneLoop.jsx (SWIPE_R 1, TAP 3.4, SWIPE_L 5.8, SW_D .8, TV_D .25) does not export
// its constants, so they are mirrored here: the TV focus moves 2 frames after each 0.8 s glide ends (1.867 s, 6.667 s,
// done 2.117 s / 6.917 s); the OK pulse is unchanged, 33 ms after the press (3.433 s).
export const BEATS = { right: 1.0, ok: 3.4, left: 5.8 }, GLIDE = .8, FOCUS_LAG = .067, OK_LAG = 1 / 30, STILL_T = 3.65; // STILL_T = Design's trackpad still (just after OK, focus on tile 2)
const out2 = x => 1 - (1 - clamp(x)) ** 2; // power2.out
const slide = (t, at) => out2((t - at - GLIDE - FOCUS_LAG) / .25);
const pulseAt = (t, at) => { const x = t - at - OK_LAG; return x < 0 || x > .3 ? 1 : x < .15 ? 1 + .06 * out2(x / .15) : 1 + .06 * (1 - out2((x - .15) / .15)); };
export const focusAt = t => slide(t, BEATS.right) - slide(t, BEATS.left); // 0 = tile 1, 1 = tile 2 (column)
export const scaleAt = t => pulseAt(t, BEATS.ok);

function BoardTV() {
  return <svg className="b-tvtile-svg" viewBox="0 0 1600 900" aria-hidden="true">
    {[186, 277, 369, 459, 550].map(y => <rect key={y} x="37" y={y} width="54" height="54" rx="14" fill={PANEL} stroke={LINE} strokeWidth="3" />)}
    <rect x="150" y="77" width="768" height="69" rx="34.5" fill={PANEL} stroke={LINE} strokeWidth="3" />
    <circle cx="190" cy="108" r="13" fill="none" stroke={PAPER} strokeWidth="4" /><path d="M200 118l12 12" stroke={PAPER} strokeWidth="4" strokeLinecap="round" />
    <text x="232" y="123" fill={PAPER} fontFamily="Work Sans, Work Sans Fallback, Arial, sans-serif" fontSize="34">lofi beats</text>
    <YouTubeLogo x={1248} y={88} height={46} />
    <text x="150" y="224" fill={MUTED} fontFamily="Work Sans, Work Sans Fallback, Arial, sans-serif" fontSize="28">Results</text>
    {Array.from({ length: 6 }, (_, i) => { const [x, y] = tileXY(i); return <g key={i}>
      <rect x={x} y={y} width={TW} height={TH} rx="16" fill={PANEL} stroke={LINE} strokeWidth="3" />
      <circle cx={x + TW - 62} cy={y + 62} r="38" fill={LINE} />
      <rect x={x + 22} y={y + TH - 62} width="200" height="26" rx="13" fill={LINE} />
      <rect x={x} y={y + TH + 14} width="316" height="16" rx="8" fill={LINE} />
      <rect x={x} y={y + TH + 42} width="205" height="14" rx="7" fill={PANEL} stroke={LINE} strokeWidth="3" />
    </g>; })}
  </svg>;
}
const ringBox = { left: `${((TX - RING) / 1600) * 100}%`, top: `${((TY - RING) / 900) * 100}%`, width: `${((TW + 2 * RING) / 1600) * 100}%`, height: `${((TH + 2 * RING) / 900) * 100}%` };
const STEP_X = (PX / (TW + 2 * RING)) * 100, STEP_Y = (PY / (TH + 2 * RING)) * 100; // one tile, in % of the ring box

export function Bento() {
  const { ready, motion } = useEnvironment(), root = useRef(null), ringEl = useRef(null), pulseEl = useRef(null);
  const [paused, setPaused] = useState(false), [user, setUser] = useState(false), [focus, setFocus] = useState(1), [status, setStatus] = useState('');
  const auto = ready && motion && !paused && !user;
  const t = useLoopClock(root, STILL_T, auto);
  const fRef = useRef(focus); fRef.current = focus;
  // Auto: the ring follows the shared clock (same render as the phone).
  useLayoutEffect(() => {
    if (user || !ringEl.current) return;
    const tt = auto ? t : STILL_T;
    gsap.set(ringEl.current, { xPercent: focusAt(tt) * STEP_X, yPercent: 0, x: 0 }); gsap.set(pulseEl.current, { scale: auto ? scaleAt(tt) : 1 });
  }, [t, auto, user]);
  useEffect(() => { if (!user) setFocus(Math.round(focusAt(auto ? t : STILL_T))); }, [t, auto, user]);
  const act = useCallback(action => {
    setUser(true);
    const f = fRef.current, ring = ringEl.current, quick = !motion;
    if (action === 'ok') { setStatus(`OK on result ${f + 1}.`); if (!quick) gsap.timeline().to(pulseEl.current, { scale: 1.06, duration: .15, ease: 'power2.out' }).to(pulseEl.current, { scale: 1, duration: .15, ease: 'power2.inOut' }); return; }
    const col = f % COLS, row = Math.floor(f / COLS);
    const next = action === 'left' ? (col > 0 ? f - 1 : -1) : action === 'right' ? (col < COLS - 1 ? f + 1 : -1) : action === 'up' ? (row > 0 ? f - COLS : -1) : (row < 1 ? f + COLS : -1);
    if (next < 0) { setStatus(`Result ${f + 1} of 6.`); if (!quick) { const k = { left: ['x', -6], right: ['x', 6], up: ['y', -6], down: ['y', 6] }[action]; gsap.fromTo(ring, { [k[0]]: 0 }, { [k[0]]: k[1], duration: .09, ease: 'power2.out', yoyo: true, repeat: 1 }); } return; }
    setFocus(next); setStatus(`Result ${next + 1} of 6.`);
    gsap.to(ring, { xPercent: (next % COLS) * STEP_X, yPercent: Math.floor(next / COLS) * STEP_Y, x: 0, y: 0, duration: quick ? 0 : .25, ease: 'power2.out', overwrite: 'auto' });
  }, [motion]);
  const onKey = event => {
    const action = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Enter: 'ok', ' ': 'ok' }[event.key];
    if (!action) return; event.preventDefault(); act(action);
  };
  const drag = useRef(null);
  const onDown = event => { drag.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture?.(event.pointerId); };
  const onUp = event => {
    const d = drag.current; drag.current = null; if (!d) return;
    const dx = event.clientX - d.x, dy = event.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) { act('ok'); return; }
    act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };
  return <div ref={root} className="b-bento">
    <div className="b-tile b-tile-pad">
      <div className="b-pad" tabIndex={0} role="application" aria-roledescription="demo trackpad" aria-label="Demo trackpad for the drawn TV: arrow keys or a swipe move the focus one tile, Enter or a tap is OK" onKeyDown={onKey} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; }}>
        <PhoneLoop name="trackpad" t={user ? 0 : auto ? t : STILL_T} playing={false} />
      </div>
      <p className="b-small b-pad-caption"><span className="b-show-m">One swipe = one tile. Tap = OK. </span>Swipe to move, tap for OK.</p>
      {/* WCAG 2.2.2: the auto demo can be paused. Small, in the phone tile's corner (outside the board's composition). */}
      {ready && motion && <button type="button" className="b-tp-pause" aria-label={paused ? 'Play the trackpad demo' : 'Pause the trackpad demo'} aria-pressed={paused} onClick={() => setPaused(p => !p)}>
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">{paused ? <path d="M4 2.5v11l9-5.5z" fill="currentColor" /> : <path d="M4 2.5h2.6v11H4zM9.4 2.5H12v11H9.4z" fill="currentColor" />}</svg></button>}
      <p className="visually-hidden" aria-live="polite">{status}</p>
    </div>
    <div className="b-tile b-tile-tv" role="img" aria-label={`Illustrated TV: YouTube results for lofi beats. Result ${focus + 1} of 6 is focused.`}>
      <BoardTV />
      <div ref={ringEl} className="b-tv-ring" style={ringBox} aria-hidden="true">
        <span ref={pulseEl} className="b-tv-ring-pulse">
          <StarBorder as="span" className="b-tv-star" color="#d4fa7b" duration={6} thickness={1} radius={12} hover="none" clickPulse={false} backgroundColor="transparent" borderColor="#d4fa7b" textColor="#d4fa7b"><span /></StarBorder>
        </span>
      </div>
      <span className="b-tag b-tv-tag" aria-hidden="true">Illustrated TV · focus steps one tile per swipe</span>
    </div>
    {GEST.map(([name, text, n, line]) => <div key={name} className="b-tile b-gest">{glyph(n, line)}<h3>{name}</h3><p className="b-small">{text}</p></div>)}
    <div className="b-tile b-gest is-soon"><span className="b-tag is-soon">Coming soon</span><h3>Pointer · For browsers</h3><p className="b-small">A separate switch on the Gestures screen.</p></div>
  </div>;
}
const glyph = (n, line) => <span className="b-glyph" aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i} />)}{line && <b />}</span>;
const GEST = [['Tap', 'OK', 1], ['Swipe', 'One step that way. Hold at the end to repeat.', 1, true], ['Two-finger tap', 'Back', 2], ['Two-finger swipe ←/→', 'Skip back / forward (varies by app)', 2, true], ['Three-finger tap', 'Play/Pause', 3], ['Three-finger swipe up', 'Home', 3, true]];
export default function TrackpadSection() {
  return <section className="b-section b-trackpad" id="trackpad" data-track-section="trackpad" aria-labelledby="trackpad-title">
    <div className="b-wrap">
      <div className="b-split-head"><div><p className="b-eyebrow"><span className="b-dot" aria-hidden="true" />Trackpad</p><h2 id="trackpad-title">Swipe and tap. <em>Watch the focus move.</em></h2></div>
        <p className="b-lede">Open the trackpad and your whole phone screen becomes a pad for the TV. One swipe moves the TV focus one step; a tap is OK. No pointer.</p></div>
      <Bento />
    </div>
  </section>;
}
