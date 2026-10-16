// One live WebGL context for the whole page (src/gpu-budget.js). A section asks for the lease while it wants
// its live canvas; taking the lease releases the previous owner synchronously (flushSync unmounts its canvas,
// whose cleanup loses the context) before the new owner creates one. Without the lease a section shows its poster.
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { acquireGPU } from '../gpu-budget';

export function useGpuLease(want, owner) {
  const [held, setHeld] = useState(false), done = useRef(null);
  useEffect(() => {
    if (!want) return;
    const key = Symbol(owner);
    const drop = acquireGPU(key, () => { done.current = null; flushSync(() => setHeld(false)); });
    done.current = drop; setHeld(true);
    return () => { if (done.current === drop) { drop(); done.current = null; } setHeld(false); };
  }, [want, owner]);
  return held;
}
// Visible ratio of an element (IntersectionObserver), with an optional rootMargin for "near view".
export function useInView(ref, { threshold = 0, rootMargin = '0px' } = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current; if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= threshold), { threshold: [0, threshold, 1], rootMargin });
    observer.observe(node); return () => observer.disconnect();
  }, [threshold, rootMargin]);
  return inView;
}
export const finePointer = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches;
export const lowEnd = () => typeof navigator !== 'undefined' && ((navigator.deviceMemory && navigator.deviceMemory < 4) || !webgl2());
let gl2 = null;
function webgl2() { if (gl2 === null) { try { const c = document.createElement('canvas'), g = c.getContext('webgl2'); gl2 = !!g; g?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { gl2 = false; } } return gl2; }
