// 1 · Hero (CONCEPT-B-GUIDE.md §1, board gen.py:160-164). Design's lit living-room render is the full-bleed scene
// behind the copy, under the board's two ink gradients. Effects: seamless 10 s loop (slow push-in, equally slow
// ease back, start = end; PM 19:10), React Bits Grainient as overlay grain (cursor off) holding the page's one GPU
// lease while the hero is >= 30% visible, React Bits BlurText on the h1 (words, from top, 0.8 s), Star Border CTA,
// 8% image parallax. Reduced motion: the still, plain h1, no parallax. The QR lives in the download card, not here.
import { useEffect, useRef, useState } from 'react';
import { BlurText } from '../components/rb/lazy';
import StarBorder from '../components/rb/StarBorder';
import Grainient from '../components/rb/Grainient';
import { LiveCount } from './counter';
import { DownloadLink } from '../Download';
import { useEnvironment } from '../environment';
import { useGpuLease, useInView, lowEnd } from './lease';
import { HERO } from './media';

const H1 = 'Your phone. Your TV. One remote.';
export function StarCta({ button = 'hero', inView = true }) {
  return <StarBorder as="div" className="star-cta" color="#d4fa7b" duration={6} thickness={1} radius={999} hover="none" clickPulse={false} backgroundColor="transparent" borderColor="rgba(238,238,230,.0)" textColor="#0b0e0d"><DownloadLink button={button} /></StarBorder>;
}
export default function Hero() {
  const { ready, motion, gpu } = useEnvironment(), root = useRef(null), media = useRef(null), video = useRef(null);
  const [desktop, setDesktop] = useState(false);
  const inView = useInView(root, { threshold: .3 });
  useEffect(() => { if (!ready) return; const q = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)'), u = () => setDesktop(q.matches && !lowEnd()); u(); q.addEventListener('change', u); return () => q.removeEventListener('change', u); }, [ready]);
  const lease = useGpuLease(ready && gpu && desktop && inView, 'grainient');
  // Header: transparent over the hero, solid ink once past it (guide, Global).
  useEffect(() => {
    const node = root.current, header = document.querySelector('.site-header'); if (!header) return;
    const update = () => header.classList.toggle('is-solid', node.getBoundingClientRect().bottom <= header.offsetHeight);
    update(); addEventListener('scroll', update, { passive: true }); addEventListener('resize', update);
    return () => { removeEventListener('scroll', update); removeEventListener('resize', update); };
  }, []);
  // 8% parallax on the scene layer only (off under reduced motion).
  useEffect(() => {
    if (!motion) return;
    let frame = 0; const node = media.current;
    const update = () => { frame = 0; const r = root.current.getBoundingClientRect(); if (r.bottom < 0) return; node.style.transform = `translate3d(0, ${(Math.max(0, -r.top) * .08).toFixed(1)}px, 0)`; };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    addEventListener('scroll', schedule, { passive: true }); update();
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', schedule); node.style.transform = ''; };
  }, [motion]);
  // A whitelisted Blender loop (media.js) replaces the coded push-in; played only in view, never faster than 1x.
  const playVideo = ready && motion && desktop && HERO.mp4 && !navigator.connection?.saveData;
  useEffect(() => { const v = video.current; if (!v) return; v.playbackRate = 1; if (playVideo && inView && !document.hidden) v.play().catch(() => {}); else v.pause(); }, [playVideo, inView]);
  return <section ref={root} className={['b-hero', motion && inView && !playVideo && 'is-looping'].filter(Boolean).join(' ')} id="hero" data-track-section="hero" aria-labelledby="hero-title">
    <div className="b-hero-scene">
      <div className="b-hero-move" ref={media}><div className="b-hero-loop">
        <picture><source media="(max-width: 899px)" srcSet={HERO.crop} width="780" height="660" /><img src={HERO.src} srcSet={HERO.srcset} sizes="100vw" width="1920" height="1200" alt="An illustrated living room: a phone with The Remote's YouTube search typed for lofi beats, in front of a drawn TV showing YouTube results, lit by a lime light under the console." fetchPriority="high" loading="eager" decoding="async" /></picture>
        {playVideo && <video ref={video} className="b-hero-video" data-track-loop="hero" muted loop playsInline preload="auto" poster={HERO.src} width="1920" height="1200" aria-hidden="true">{HERO.webm && <source src={HERO.webm} type="video/webm" />}<source src={HERO.mp4} type="video/mp4" /></video>}
      </div></div>
      {lease && <div className="b-grain-live" aria-hidden="true"><Grainient className="b-grainient" colors={['#0b0e0d', '#151b16', '#d4fa7b']} speed={.15} grainAmount={.08} interactive={false} clickSwirl={false} intro={false} dpr={1} /></div>}
      <div className="b-grain" aria-hidden="true" />
      <div className="b-hero-scrim" aria-hidden="true" />
    </div>
    <div className="b-wrap b-hero-copy">
      <p className="b-eyebrow"><span className="b-dot" aria-hidden="true" />No ads. No account.<span className="b-hide-m"> Nothing to sign in to.</span></p>
      {ready && motion
        ? <BlurText fallback={<h1 id="hero-title" className="b-h1">Your phone.<br /><em>Your TV.</em><br />One remote.</h1>} as="h1" id="hero-title" text={H1} className="b-h1" animateBy="words" direction="top" delay={60} stepDuration={.4} trigger="load" wordClassName={[, , 'is-lime', 'is-lime']} breakAfter={[1, 3]} />
        : <h1 id="hero-title" className="b-h1">Your phone.<br /><em>Your TV.</em><br />One remote.</h1>}
      <p className="b-lede">A free phone remote for Android{'\u00a0'}TV and Google{'\u00a0'}TV. Type a YouTube search on your phone; the results open on your TV.</p>
      <div className="b-hero-actions"><StarCta inView={inView} /><a className="b-ghost" href="#search-proof">Watch it work <span aria-hidden="true">↓</span></a></div>
      <LiveCount className="is-hero" />
    </div>
  </section>;
}
