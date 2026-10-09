// Desktop wheel/trackpad smoothing with Lenis (MIT, ../licenses/Lenis-LICENSE.txt).
// One scroll idea only: smoother wheel input on desktop. Phones keep native touch
// scrolling (Lenis is never created for coarse pointers), and reduced motion gets
// no Lenis at all, torn down live if the preference changes.
import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// One MediaQueryList per query for the page's lifetime (created on first use: the
// module is also loaded by the prerenderer, which has no window).
let queries = null;
const media = () => (queries ??= { desktop: matchMedia('(hover: hover) and (pointer: fine)'), reduced: matchMedia('(prefers-reduced-motion: reduce)') });
// Keys the browser scrolls or moves focus for natively; Lenis must not keep animating over them.
const NATIVE_KEYS = new Set(['Tab', 'Enter', ' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown']);
const px = value => Number.parseFloat(value) || 0;

// Same-page anchors clicked with a pointer. Keyboard activation is left to the browser.
function anchorTarget(event) {
  if (event.defaultPrevented || event.detail === 0 || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const link = event.target.closest?.('a[href*="#"]');
  if (!link || link.target || link.hasAttribute('download')) return null;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return null;
  const node = document.getElementById(decodeURIComponent(url.hash.slice(1)));
  return node ? { node, hash: url.hash } : null;
}

export default function SmoothScroll() {
  useEffect(() => {
    const { desktop, reduced } = media();
    let lenis = null, tick = null;
    // Lenis only learns about native scrolling (keyboard, focus, scrollbar, automation)
    // from scroll events, which arrive a frame late and are ignored while it animates.
    // Re-read the real position before anything that depends on it.
    const sync = () => { lenis?.reset(); lenis?.resize(); };
    // Unconditional: Lenis' 400 ms velocity timer can report isScrolling false for a frame mid-glide.
    const onKey = event => { if (NATIVE_KEYS.has(event.key)) lenis?.reset(); };
    const onPointer = event => { if (event.clientX >= document.documentElement.clientWidth) lenis?.reset(); };
    const onClick = event => {
      const target = lenis && anchorTarget(event);
      if (!target) return;
      event.preventDefault();
      const { node, hash } = target;
      sync();
      // Same landing as the native jump: live document position minus scroll-margin/-padding.
      const top = node.getBoundingClientRect().top + scrollY - px(getComputedStyle(node).scrollMarginTop) - px(getComputedStyle(document.documentElement).scrollPaddingTop);
      // URL updates at click time, like a native fragment link.
      if (location.hash !== hash) history.pushState(null, '', hash);
      lenis.scrollTo(top, {
        force: true,
        onComplete: instance => {
          // Finish with the browser's own fragment navigation (same URL, so no new history
          // entry): exact native landing, :target and focus start point, as without Lenis.
          location.replace(hash);
          instance.reset();
        },
      });
    };
    const stop = () => {
      if (!lenis) return;
      const dead = lenis; lenis = null;
      gsap.ticker.remove(tick); tick = null; gsap.ticker.lagSmoothing(500, 33);
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
      dead.destroy();
      // Lenis 1.3.26 destroy() leaves its 400 ms post-native-scroll timer armed; when it fires
      // it re-adds the `lenis` classes to <html>. Disarm it and make the dead instance inert.
      clearTimeout(dead._resetVelocityTimeout);
      dead.updateClassName = () => {};
      ScrollTrigger.refresh();
    };
    const start = () => {
      if (lenis) return;
      lenis = new Lenis({ autoRaf: false, smoothWheel: true, syncTouch: false, lerp: 0.12, wheelMultiplier: 1, anchors: false });
      lenis.on('scroll', ScrollTrigger.update);
      tick = time => lenis?.raf(time * 1000);
      gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
      document.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('pointerdown', onPointer, true);
    };
    const configure = () => (desktop.matches && !reduced.matches ? start() : stop());
    configure();
    desktop.addEventListener('change', configure); reduced.addEventListener('change', configure);
    return () => { desktop.removeEventListener('change', configure); reduced.removeEventListener('change', configure); stop(); };
  }, []);
  return null;
}
