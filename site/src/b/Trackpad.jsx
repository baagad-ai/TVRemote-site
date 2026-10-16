// 3 · "Swipe and tap" bento (CONCEPT-B-GUIDE.md §3, board gen.py:226-243). Grid 300px 1fr 1fr 1fr: the phone tile
// first (2 rows; it is also the demo pad), the drawn TV tile (2 cols) with the YouTube results and the lime focus on
// tile 3, then the board's 7 gesture tiles. The focus ring is a React Bits Star Border; a swipe (pointer drag
// >= 24 px, direction locked) or an arrow key moves it ONE tile (0.25 s power2.out), a tap / Enter pulses it
// 1 -> 1.06 -> 1 in 0.3 s (OK). No cursor or pointer on the TV, no hold action, no wrap at the edges.
// Auto demo (in view, motion, until the visitor uses the pad): a seamless 10 s loop that starts and ends on tile 3,
// 1 s hold, 3 presses about 2.5 s apart (left, OK, right), each move a soft 0.8 s ease-in-out with a settle.
import { useCallback, useEffect, useRef, useState } from 'react';
import StarBorder from '../components/rb/StarBorder';
import { useEnvironment } from '../environment';
import { useInView } from './lease';

const COLS = 3, START = 2;
const ring = i => ({ left: `${((168 + 540 * (i % COLS)) / 1920) * 100}%`, top: `${((288 + 432 * Math.floor(i / COLS)) / 1080) * 100}%` });
const LOOP = [[1000, 'left'], [3500, 'ok'], [6000, 'right']]; // 10 s cycle, back on tile 3 by 6.8 s, hold to 10 s
export function TvTile() {
  const { ready, motion } = useEnvironment(), root = useRef(null), pad = useRef(null);
  const inView = useInView(root, { threshold: .35 });
  const [focus, setFocus] = useState(START), [pulse, setPulse] = useState(0), [nudge, setNudge] = useState(''), [auto, setAuto] = useState(true);
  const [paused, setPaused] = useState(false), [touched, setTouched] = useState(false), [status, setStatus] = useState('');
  const state = useRef(focus); state.current = focus;
  const act = useCallback((action, by = 'user') => {
    setAuto(by === 'auto');
    const f = state.current;
    if (action === 'ok') { setPulse(p => p + 1); setStatus(`OK on result ${f + 1}.`); return; }
    const col = f % COLS, row = Math.floor(f / COLS);
    const next = action === 'left' ? (col > 0 ? f - 1 : -1) : action === 'right' ? (col < COLS - 1 ? f + 1 : -1) : action === 'up' ? (row > 0 ? f - COLS : -1) : (row < 1 ? f + COLS : -1);
    if (next < 0) { setNudge(''); requestAnimationFrame(() => setNudge(action)); setStatus(`Result ${f + 1} of 6. That is the edge.`); return; }
    setFocus(next); setStatus(`Result ${next + 1} of 6.`);
  }, []);
  useEffect(() => {
    if (!ready || !motion || !inView || paused || touched) return;
    setFocus(START); let timers = [];
    const cycle = () => { timers = LOOP.map(([at, a]) => setTimeout(() => act(a, 'auto'), at)); timers.push(setTimeout(cycle, 10000)); };
    cycle(); return () => timers.forEach(clearTimeout);
  }, [ready, motion, inView, paused, touched, act]);
  const user = action => { setTouched(true); act(action); };
  const onKey = event => {
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Enter: 'ok', ' ': 'ok' };
    const action = map[event.key]; if (!action) return; event.preventDefault(); user(action);
  };
  const drag = useRef(null);
  const onDown = event => { setTouched(true); drag.current = { x: event.clientX, y: event.clientY }; pad.current.setPointerCapture?.(event.pointerId); };
  const onUp = event => {
    const d = drag.current; drag.current = null; if (!d) return;
    const dx = event.clientX - d.x, dy = event.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) { user('ok'); return; }
    user(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };
  return <>
    <div ref={root} className="b-tile b-tile-pad">
      <div ref={pad} className="b-pad b-frame" tabIndex={0} role="application" aria-roledescription="demo trackpad" aria-label="Demo trackpad for the drawn TV: arrow keys or a swipe move the focus one tile, Enter or a tap is OK" onKeyDown={onKey} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; }}>
        <img src="assets/board/loop3-trackpad-keyframe-2.webp" alt="" width="342" height="706" loading="lazy" decoding="async" draggable="false" />
      </div>
      <p className="b-small">Swipe to move, tap for OK.</p>
      {motion && <button type="button" className="b-mini" aria-pressed={paused} onClick={() => setPaused(p => !p)}>{paused ? 'Play demo' : 'Pause demo'}</button>}
      <p className="visually-hidden" aria-live="polite">{status}</p>
    </div>
    <div className="b-tile b-tile-tv">
      <div className="b-tv-frame">
        <img src="assets/board/tv-grid-1440.webp" alt={`Illustrated TV: YouTube results for lofi beats. Result ${focus + 1} of 6 is focused.`} width="1440" height="810" loading="lazy" decoding="async" />
        <div className={`b-tv-ring ${auto ? 'is-auto' : ''} ${nudge ? `nudge-${nudge}` : ''}`} style={ring(focus)}>
          <span key={pulse} className={pulse ? 'b-tv-ring-pulse is-pulsing' : 'b-tv-ring-pulse'}>
            <StarBorder as="span" className="b-tv-star" color="#d4fa7b" duration={6} thickness={1} radius={14} hover="none" clickPulse={false} backgroundColor="transparent" borderColor="#d4fa7b" textColor="#d4fa7b"><span /></StarBorder>
          </span>
        </div>
      </div>
    </div>
  </>;
}
const glyph = (n, line) => <span className="b-glyph" aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i} />)}{line && <b />}</span>;
const GEST = [['Tap', 'OK', 1], ['Swipe', 'One step that way. Hold at the end to repeat.', 1, true], ['Two-finger tap', 'Back', 2], ['Two-finger swipe ←/→', 'Skip back / forward (varies by app)', 2, true], ['Three-finger tap', 'Play/Pause', 3], ['Three-finger swipe up', 'Home', 3, true]];
export default function TrackpadSection() {
  return <section className="b-section b-trackpad" id="trackpad" data-track-section="trackpad" aria-labelledby="trackpad-title">
    <div className="b-wrap">
      <div className="b-split-head"><div><p className="b-eyebrow"><span className="b-dot" aria-hidden="true" />Trackpad</p><h2 id="trackpad-title">Swipe and tap. <em>Watch the focus move.</em></h2></div>
        <p className="b-lede">Open the trackpad and your whole phone screen becomes a pad for the TV. One swipe moves the TV focus one step; a tap is OK. No pointer.</p></div>
      <div className="b-bento">
        <TvTile />
        {GEST.map(([name, text, n, line]) => <div key={name} className="b-tile b-gest">{glyph(n, line)}<h3>{name}</h3><p className="b-small">{text}</p></div>)}
        <div className="b-tile b-gest is-soon"><span className="b-tag is-soon">Coming soon</span><h3>Pointer · For browsers</h3><p className="b-small">A separate switch on the Gestures screen.</p></div>
      </div>
    </div>
  </section>;
}
