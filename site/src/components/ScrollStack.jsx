// Website-specific adaptation of React Bits ScrollStack at ca44b3f.
// Retains its progress, scale, pin/release and transform-cache algorithm;
// replaces Lenis with native scrolling. Full notice: ../../licenses/ReactBits-LICENSE.md.
import { useEffect, useRef } from 'react';
import { useEnvironment } from '../environment';

export const ScrollStackItem = ({ children, itemClassName = '' }) => <article className={`scroll-stack-card ${itemClassName}`}>{children}</article>;
export default function ScrollStack({ children, itemScale = .02, itemStackDistance = 24, baseScale = .94 }) {
  const ref = useRef(null), { motion } = useEnvironment();
  useEffect(() => {
    const root = ref.current, wide = matchMedia('(min-width: 1000px) and (min-height: 760px)');
    let frame = 0, cards = [], tops = [], endTop = 0, enabled = false;
    const cache = new Map(), original = new Map();
    const progress = (scroll, start, end) => Math.max(0, Math.min(1, (scroll - start) / Math.max(1, end - start)));
    const restore = () => { for (const [card, style] of original) card.setAttribute('style', style); cache.clear(); };
    const geometry = () => {
      restore();
      tops = cards.map(card => card.getBoundingClientRect().top + scrollY);
      endTop = root.querySelector('.scroll-stack-end').getBoundingClientRect().top + scrollY;
    };
    const update = () => {
      frame = 0;
      if (!enabled) return;
      const top = scrollY, height = innerHeight, stackPosition = height * .08;
      cards.forEach((card, i) => {
        const start = tops[i] - stackPosition - itemStackDistance * i;
        const end = tops[i] + height * .2;
        const release = endTop - height * .82;
        const scale = 1 - progress(top, start, end) * (1 - (baseScale + i * itemScale));
        const translateY = top < start ? 0 : Math.max(0, Math.min(top, release) - tops[i] + stackPosition + itemStackDistance * i);
        const transform = `translate3d(0,${translateY.toFixed(2)}px,0) scale(${scale.toFixed(3)})`;
        if (cache.get(i) !== transform) { card.style.transform = transform; cache.set(i, transform); }
      });
    };
    const schedule = () => { if (enabled && !frame) frame = requestAnimationFrame(update); };
    const configure = () => {
      enabled = motion && wide.matches;
      cancelAnimationFrame(frame); frame = 0; restore();
      if (enabled) { geometry(); schedule(); }
      root.dataset.stackActive = String(enabled);
    };
    cards = [...root.querySelectorAll('.scroll-stack-card')];
    cards.forEach(card => original.set(card, card.getAttribute('style') || ''));
    const resized = () => { if (enabled) geometry(); schedule(); };
    const observer = new ResizeObserver(resized); observer.observe(root);
    root.querySelectorAll('img').forEach(img => img.addEventListener('load', resized));
    window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', resized);
    wide.addEventListener('change', configure);
    // Focus and anchors always restore the ordinary document positions.
    const focus = () => { enabled = false; restore(); root.dataset.stackActive = 'false'; };
    root.addEventListener('focusin', focus);
    let disposed = false; document.fonts.ready.then(() => { if (!disposed) resized(); });
    configure();
    return () => {
      disposed = true; cancelAnimationFrame(frame); restore(); observer.disconnect();
      root.querySelectorAll('img').forEach(img => img.removeEventListener('load', resized));
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', resized);
      wide.removeEventListener('change', configure); root.removeEventListener('focusin', focus);
    };
  }, [motion, itemScale, itemStackDistance, baseScale]);
  return <div ref={ref} className="scroll-stack-scroller"><div className="scroll-stack-inner">{children}<div className="scroll-stack-end" /></div></div>;
}
