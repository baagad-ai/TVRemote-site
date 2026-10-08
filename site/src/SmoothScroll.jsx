// Desktop wheel/trackpad smoothing with Lenis (MIT, ../licenses/Lenis-LICENSE.txt).
// One scroll idea only: smoother wheel input on desktop. Phones keep native touch
// scrolling (Lenis is never created for coarse pointers), and reduced motion gets
// no Lenis at all, torn down live if the preference changes.
import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const DESKTOP = '(hover: hover) and (pointer: fine)';
const REDUCED = '(prefers-reduced-motion: reduce)';

// Same-page anchors: smooth-scroll, then update the URL and move focus like a
// native jump would, so skip links and keyboard users land in the right place.
function anchorTarget(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const link = event.target.closest?.('a[href*="#"]');
  if (!link || link.target || link.hasAttribute('download')) return null;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return null;
  const id = decodeURIComponent(url.hash.slice(1));
  const node = id === 'top' ? document.body : document.getElementById(id);
  return node ? { node, hash: url.hash } : null;
}

export default function SmoothScroll() {
  useEffect(() => {
    const desktop = matchMedia(DESKTOP), reduced = matchMedia(REDUCED);
    let lenis = null, tick = null;
    const onClick = event => {
      const target = lenis && anchorTarget(event);
      if (!target) return;
      event.preventDefault();
      const { node, hash } = target;
      // Keyboard activation (Enter on a skip link) jumps instantly; pointer clicks glide.
      lenis.scrollTo(node === document.body ? 0 : node, {
        immediate: event.detail === 0,
        onComplete: () => {
          if (location.hash !== hash) history.pushState(null, '', hash);
          // Match a native fragment jump: the target becomes the focus start point.
          if (!node.matches('a[href],button,input,select,textarea,summary,[tabindex]')) {
            node.setAttribute('tabindex', '-1');
            node.addEventListener('blur', () => node.removeAttribute('tabindex'), { once: true });
          }
          node.focus({ preventScroll: true });
        },
      });
    };
    const stop = () => {
      if (!lenis) return;
      gsap.ticker.remove(tick); gsap.ticker.lagSmoothing(500, 33);
      document.removeEventListener('click', onClick);
      lenis.destroy(); lenis = null; tick = null;
      ScrollTrigger.refresh();
    };
    const start = () => {
      if (lenis) return;
      lenis = new Lenis({ autoRaf: false, smoothWheel: true, syncTouch: false, lerp: 0.12, wheelMultiplier: 1, anchors: false });
      lenis.on('scroll', ScrollTrigger.update);
      tick = time => lenis?.raf(time * 1000);
      gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
      document.addEventListener('click', onClick);
    };
    const configure = () => (desktop.matches && !reduced.matches ? start() : stop());
    configure();
    desktop.addEventListener('change', configure); reduced.addEventListener('change', configure);
    return () => { desktop.removeEventListener('change', configure); reduced.removeEventListener('change', configure); stop(); };
  }, []);
  return null;
}
