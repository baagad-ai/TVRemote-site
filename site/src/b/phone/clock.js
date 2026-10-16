// One deterministic timeline per loop. Scenes are pure functions of t in [0, LOOP); t = LOOP renders the same as t = 0.
// rAF only while the component is on screen (IntersectionObserver) and the tab is visible; reduced motion = one still.
import { useEffect, useState } from 'react';
export const LOOP = 10;
export const clamp = x => (x < 0 ? 0 : x > 1 ? 1 : x);
export const sine = x => (1 - Math.cos(Math.PI * clamp(x))) / 2;                       // sine in-out
export const p2 = x => { x = clamp(x); return x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2; }; // power2 in-out
export const seg = (t, a, d, f = p2) => f((t - a) / d);                                 // 0 -> 1 over [a, a + d]
export const lerp = (a, b, k) => a + (b - a) * k;
// soft 0 -> 1 -> 0 envelope (sine edges): starts at a, rises r, holds h, falls f
export const bump = (t, a, r = .2, h = .15, f = .45) => { const x = t - a; return x < 0 || x > r + h + f ? 0 : x < r ? sine(x / r) : x < r + h ? 1 : 1 - sine((x - r - h) / f); };
const live = typeof window !== 'undefined' ? (window.__phoneLoops ||= new Set()) : new Set();
if (typeof window !== 'undefined') window.__phoneLoopSeek = t => live.forEach(fn => fn(t)); // test hook: freezes every loop at t
export function useLoopClock(ref, still, enabled = true) { // enabled=false: hold the still (e.g. playing={false})
  const [t, setT] = useState(still);
  useEffect(() => {
    const el = ref.current, mq = matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0, inView = false, at = 0, base = 0, frozen = false;
    const tick = now => { at = ((now - base) / 1000) % LOOP; setT(at); raf = requestAnimationFrame(tick); };
    const run = () => { if (raf || frozen || !enabled || mq.matches || !inView || document.hidden) return; base = performance.now() - at * 1000; raf = requestAnimationFrame(tick); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const sync = () => { stop(); if ((mq.matches || !enabled) && !frozen) setT(still); run(); };
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { threshold: .2 });
    const seek = x => { frozen = true; stop(); setT(x); };
    io.observe(el); mq.addEventListener('change', sync); document.addEventListener('visibilitychange', sync); live.add(seek);
    return () => { stop(); io.disconnect(); mq.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); live.delete(seek); };
  }, [ref, still, enabled]);
  return t;
}
