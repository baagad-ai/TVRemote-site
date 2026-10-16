// The live download counter with a count-up (QA rule 16 Oct, 19:22 IST). Build's DownloadCount (unchanged) owns the
// ONE shared /api/download-count request and renders nothing until a real number arrives; on a failed or blocked
// request it stays hidden, so the reserved .b-count-slot keeps the space (no layout shift, no placeholder number).
// When the number appears and the slot is in view, its text node counts from 0 up to the real value in 1.6 s with
// React Bits CountUp's "easeOut" curve (cubic-bezier(.33,1,.68,1), CountUp @ d9085a5) and always ends on the exact
// value React rendered. Screen readers get the real value only (aria-live stays on Build's <p>; the animated digits are
// only a visual effect). Off under reduced motion. React Bits' CountUp component itself renders its own digit roller and
// cannot display a number owned by DownloadCount without editing that file, which is Build's (not edited).
import { useEffect, useRef } from 'react';
import { DownloadCount } from '../DownloadCount.jsx';
import { useEnvironment } from '../environment';

const bezier = (x1, y1, x2, y2) => t => { // cubic-bezier solve (as motion's cubicBezier)
  let u = t; for (let i = 0; i < 8; i++) { const x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3 - t; const dx = 3 * (1 - u) ** 2 * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2); if (Math.abs(dx) < 1e-6) break; u -= x / dx; u = Math.min(1, Math.max(0, u)); }
  return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3;
};
const EASE = bezier(.33, 1, .68, 1), DURATION = 1600;
export function useCountUpSlot(slot) {
  const { ready, motion } = useEnvironment();
  useEffect(() => {
    if (!ready || !motion) return;
    const root = slot.current; let frame = 0, done = false, io = null;
    const run = node => {
      const target = node.nodeValue, value = Number(target.replace(/[^0-9]/g, ''));
      if (!Number.isSafeInteger(value) || value <= 0) return;
      done = true; const start = performance.now(), live = root.querySelector('.download-count');
      live?.setAttribute('aria-busy', 'true');
      const tick = now => {
        if (node.nodeValue !== target && !node.__counting) { live?.removeAttribute('aria-busy'); return; } // React updated it
        const t = Math.min(1, (now - start) / DURATION);
        node.__counting = true; node.nodeValue = t < 1 ? Math.round(value * EASE(t)).toLocaleString('en-US') : target; node.__counting = false;
        if (t < 1) frame = requestAnimationFrame(tick); else live?.removeAttribute('aria-busy');
      };
      node.nodeValue = '0'; frame = requestAnimationFrame(tick);
    };
    const arm = () => {
      const node = root.querySelector('.download-count b')?.firstChild;
      if (!node || done) return;
      io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { io.disconnect(); run(node); } }, { threshold: .6 });
      io.observe(root);
    };
    const mo = new MutationObserver(() => { if (!done && !io) arm(); }); mo.observe(root, { childList: true, subtree: true });
    arm();
    return () => { mo.disconnect(); io?.disconnect(); cancelAnimationFrame(frame); };
  }, [ready, motion, slot]);
}
export default function LiveCount({ className = '' }) {
  const slot = useRef(null); useCountUpSlot(slot);
  return <div ref={slot} className={`b-count-slot ${className}`.trim()}><DownloadCount /></div>;
}
