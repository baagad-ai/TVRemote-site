// 3 · Trackpad bento + the TV-tile demo (DOM/SVG only, no WebGL). Tile A: the drawn TV, where the lime focus moves
// exactly ONE tile per swipe or arrow press, a tap / Enter is OK (pulse, then the result opens and plays), and Back
// returns. No cursor, no pointer dot, no hold action, no wrap at the edges. The pad shows only its own lime trail.
// Tile B: Build's trackpad recording (quick swipes and taps only) in a 272 px phone, with a pause control.
// Gesture tiles list only what the app does; Pointer is "Coming soon". No hold-only gesture is shown.
import { useCallback, useEffect, useRef, useState } from 'react';
import DrawnTV from './DrawnTV';
import StarBorder from '../components/rb/StarBorder';
import { useEnvironment } from '../environment';
import { useInView } from './lease';

const COLS = 3, COUNT = 6;
const AUTO = ['results', 'right', 'right', 'down', 'ok', 'back', 'idle'];
export function TvDemo() {
  const { ready, motion } = useEnvironment(), root = useRef(null), pad = useRef(null), trail = useRef(null);
  const inView = useInView(root, { threshold: .35 });
  const [mode, setMode] = useState('idle'), [focus, setFocus] = useState(0), [pulse, setPulse] = useState(0), [nudge, setNudge] = useState(''), [rise, setRise] = useState(false);
  const [paused, setPaused] = useState(false), [touched, setTouched] = useState(false), [status, setStatus] = useState('');
  const state = useRef({ mode, focus }); state.current = { mode, focus };
  useEffect(() => { if (ready && !motion) { setMode('results'); setFocus(1); } }, [ready, motion]);
  const bump = dir => { setNudge(''); requestAnimationFrame(() => setNudge(dir)); };
  const act = useCallback(action => {
    const { mode: m, focus: f } = state.current;
    if (action === 'idle') { setMode('idle'); setFocus(0); setStatus('TV home row.'); return; }
    if (action === 'results') { if (m === 'idle') { setMode('results'); setFocus(0); setRise(r => !r || true); setStatus('Search sent. YouTube results on the TV. Result 1 of 6.'); } return; }
    if (action === 'back') { if (m === 'playing') { setMode('results'); setStatus(`Back to the results. Result ${f + 1} of 6.`); } return; }
    if (action === 'ok') { if (m !== 'results') return; setPulse(p => p + 1); setStatus(`OK. Result ${f + 1} opens.`); setTimeout(() => { if (state.current.mode === 'results') { setMode('playing'); setStatus(`Result ${f + 1} is playing.`); } }, motion ? 320 : 0); return; }
    if (m !== 'results') return;
    const col = f % COLS, row = Math.floor(f / COLS);
    const next = action === 'left' ? (col > 0 ? f - 1 : -1) : action === 'right' ? (col < COLS - 1 ? f + 1 : -1) : action === 'up' ? (row > 0 ? f - COLS : -1) : (row < 1 ? f + COLS : -1);
    if (next < 0) { bump(action); setStatus(`Result ${f + 1} of 6. That is the edge.`); return; }
    setFocus(next); setStatus(`Result ${next + 1} of 6.`);
  }, [motion]);
  // Auto demo: only while in view, with motion, not paused, and until the visitor uses the pad.
  useEffect(() => {
    if (!ready || !motion || !inView || paused || touched) return;
    let i = 0; act('idle');
    const timer = setInterval(() => { act(AUTO[i % AUTO.length]); i++; }, 1000);
    return () => clearInterval(timer);
  }, [ready, motion, inView, paused, touched, act]);
  const user = action => { setTouched(true); act(action); };
  const onKey = event => {
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Enter: 'ok', ' ': 'ok', Escape: 'back' };
    const action = map[event.key]; if (!action) return;
    event.preventDefault(); if (state.current.mode === 'idle' && action !== 'back') { user('results'); return; } user(action);
  };
  // Swipe: one drag >= 24 px, direction locked to its dominant axis, is ONE step. A short touch is a tap (OK).
  const drag = useRef(null), fingers = useRef(new Set());
  const drawTrail = points => { const t = trail.current; if (!t) return; t.setAttribute('points', points.map(p => p.join(',')).join(' ')); t.classList.remove('is-fading'); };
  const onDown = event => {
    fingers.current.add(event.pointerId); setTouched(true);
    if (fingers.current.size === 2) { drag.current = { two: true }; return; }
    const r = pad.current.getBoundingClientRect(); drag.current = { x: event.clientX, y: event.clientY, r, points: [[event.clientX - r.left, event.clientY - r.top]], moved: false };
    pad.current.setPointerCapture?.(event.pointerId); drawTrail(drag.current.points);
  };
  const onMove = event => { const d = drag.current; if (!d || d.two || !fingers.current.has(event.pointerId)) return; d.points.push([event.clientX - d.r.left, event.clientY - d.r.top]); if (d.points.length > 40) d.points.shift(); drawTrail(d.points); };
  const onUp = event => {
    const d = drag.current; fingers.current.delete(event.pointerId); trail.current?.classList.add('is-fading');
    if (!d) return; if (d.two) { if (!fingers.current.size) { drag.current = null; user('back'); } return; }
    drag.current = null;
    const dx = event.clientX - d.x, dy = event.clientY - d.y;
    if (state.current.mode === 'idle') { user('results'); return; }
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) { user('ok'); return; }
    user(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };
  const onCancel = event => { fingers.current.delete(event.pointerId); drag.current = null; trail.current?.classList.add('is-fading'); };
  const label = mode === 'idle' ? 'TV home row' : mode === 'playing' ? `Result ${focus + 1} playing` : `Result ${focus + 1} of 6`;
  return <div ref={root} className="tv-demo">
    <div className="tv-demo-screen">
      {mode === 'results'
        ? <StarBorder as="div" className="tv-demo-frame" color="#d4fa7b" duration={6} thickness={1} radius={18} hover="none" clickPulse={false} backgroundColor="#151b16" borderColor="#354032" textColor="#eeeee6"><DrawnTV state="results" focus={focus} pulse={pulse} nudge={nudge} rise={rise && motion} idPrefix="demo" title={`Illustrated TV: YouTube results for lofi beats. ${label}.`} /></StarBorder>
        : <div className="tv-demo-frame"><DrawnTV state={mode === 'playing' ? 'playing' : 'home'} focus={0} idPrefix="demo" title={`Illustrated TV: ${label}.`} /></div>}
    </div>
    <div className="tv-demo-controls">
      <div ref={pad} className="tv-demo-pad" tabIndex={0} aria-label="Demo trackpad: arrow keys move focus one tile, Enter is OK" aria-describedby="tv-demo-help" onKeyDown={onKey} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel}>
        <svg className="tv-demo-trail" aria-hidden="true"><polyline ref={trail} points="" /></svg>
        <span id="tv-demo-help">Swipe to move one tile · Tap for OK</span>
      </div>
      <div className="tv-demo-buttons">
        <button type="button" className="b-chip" onClick={() => user('results')} disabled={mode !== 'idle'}>Send search</button>
        <button type="button" className="b-chip" onClick={() => user('back')} disabled={mode !== 'playing'}>Back</button>
        {motion && <button type="button" className="b-chip" aria-pressed={paused} onClick={() => setPaused(p => !p)}>{paused ? 'Play demo' : 'Pause demo'}</button>}
      </div>
    </div>
    <p className="visually-hidden" aria-live="polite">{status}</p>
  </div>;
}
function LoopPhone() {
  const { motion } = useEnvironment(), ref = useRef(null), video = useRef(null), inView = useInView(ref, { threshold: .25 }), [paused, setPaused] = useState(false);
  useEffect(() => { const v = video.current; if (!v) return; if (motion && inView && !paused) v.play().catch(() => {}); else v.pause(); }, [motion, inView, paused]);
  return <figure ref={ref} className="b-loop-phone">
    <div className="b-phone-shell">{motion
      ? <video ref={video} muted loop playsInline preload="none" poster="assets/b/trackpad-loop-poster.webp" width="540" height="1170" aria-label="The Remote's trackpad for Living Room TV: quick swipes show Swipe Right and Swipe Down, and quick taps send OK."><source src="assets/b/trackpad-loop.webm" type="video/webm" /><source src="assets/b/trackpad-loop.mp4" type="video/mp4" /></video>
      : <img src="assets/b/trackpad-loop-poster.webp" width="540" height="1170" loading="lazy" decoding="async" alt="The Remote's trackpad for Living Room TV: swipe to move, tap for OK, two-finger tap for Back." />}</div>
    <figcaption>Swipe to move, tap for OK.</figcaption>
    {motion && <button type="button" className="b-chip b-loop-pause" aria-pressed={paused} onClick={() => setPaused(p => !p)}>{paused ? 'Play' : 'Pause'} recording</button>}
  </figure>;
}
const glyph = (n, line) => <span className="b-glyph" aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i} />)}{line && <b />}</span>;
export default function TrackpadSection() {
  return <section className="b-section b-trackpad" id="trackpad" data-track-section="trackpad" aria-labelledby="trackpad-title">
    <div className="b-wrap">
      <div className="b-split-head"><div><p className="b-eyebrow">Trackpad</p><h2 id="trackpad-title">Swipe and tap. <em>Watch the focus move.</em></h2></div>
        <p className="b-body">Open the trackpad and your whole phone screen becomes a pad for the TV. One swipe moves the TV&rsquo;s focus one step; a tap is OK. Try it on the demo pad, or use the arrow keys.</p></div>
      <div className="b-bento">
        <div className="b-tile b-tile-demo"><TvDemo /></div>
        <div className="b-tile b-tile-loop"><LoopPhone /></div>
        <div className="b-tile">{glyph(1, true)}<h3 className="b-h3">Swipe</h3><p className="b-small">Moves one step that way. Swipe and hold still at the end to keep moving.</p></div>
        <div className="b-tile">{glyph(1)}<h3 className="b-h3">Tap</h3><p className="b-small">OK.</p></div>
        <div className="b-tile">{glyph(2)}<h3 className="b-h3">Two-finger tap</h3><p className="b-small">Back. Your phone&rsquo;s back gesture works too.</p></div>
        <div className="b-tile">{glyph(3)}<h3 className="b-h3">Three-finger tap</h3><p className="b-small">Play/Pause.</p></div>
        <div className="b-tile b-tile-wide"><p className="b-small"><strong>Two-finger swipe</strong> left or right skips back or forward (varies by app). <strong>Three-finger swipe up</strong> is Home. Your volume keys control the TV while the pad is open. Power is never a gesture.</p><p className="b-soon"><span className="b-soon-tag">Coming soon</span> Pointer, for browsers. It will be a separate switch on the Gestures screen.</p></div>
      </div>
      <a className="b-link" data-track="guide" href="guides/tv-remote-app-trackpad-gestures/">Every trackpad gesture ↗</a>
    </div>
  </section>;
}
