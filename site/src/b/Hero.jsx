// 1 · 3D hero. Text, CTA, QR and the live counter are server-rendered first; the poster is the LCP image.
// Desktop with motion: Build's seamless 8-10 s hero loop plays while in view, with a Pause control (WCAG 2.2.2). Grainient (React Bits) is
// the shader background and holds the page's single GPU lease only while the hero is >= 30% visible on a fine
// pointer; it reacts to the visitor's own mouse there and is never mounted on touch, reduced motion or Save-Data
// (a still CSS grain stays). 390: copy, CTA, counter, then the 4:5 crop (poster only).
import { useEffect, useRef, useState } from 'react';
import SplitText from '../components/SplitText';
import StarBorder from '../components/rb/StarBorder';
import Grainient from '../components/rb/Grainient';
import { DownloadCount } from '../DownloadCount.jsx';
import { DownloadLink } from '../Download';
import QrHint from '../QrHint';
import { useEnvironment } from '../environment';
import { useGpuLease, useInView, finePointer, lowEnd } from './lease';
import { HERO } from './media';

const TITLE = <>Your phone. <em>Your TV.</em> One remote.</>;
export function StarCta({ button = 'hero' }) {
  return <StarBorder as="div" className="star-cta" color="#d4fa7b" duration={6} thickness={1} radius={999} hover="none" clickPulse={false} backgroundColor="transparent" borderColor="rgba(212,250,123,.35)" textColor="#0b0e0d"><DownloadLink button={button} /></StarBorder>;
}
export default function Hero() {
  const { ready, motion, gpu } = useEnvironment(), root = useRef(null), media = useRef(null), video = useRef(null);
  const [desktop, setDesktop] = useState(false), [paused, setPaused] = useState(false);
  const inView = useInView(root, { threshold: .3 });
  useEffect(() => { if (!ready) return; const q = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)'), u = () => setDesktop(q.matches && !lowEnd()); u(); q.addEventListener('change', u); return () => q.removeEventListener('change', u); }, [ready]);
  const lease = useGpuLease(ready && gpu && desktop && inView, 'grainient');
  // 8% parallax on the media while scrolling (off under reduced motion).
  useEffect(() => {
    if (!motion) return;
    let frame = 0; const node = media.current;
    const update = () => { frame = 0; const r = root.current.getBoundingClientRect(); if (r.bottom < 0) return; node.style.transform = `translate3d(0, ${(Math.max(0, -r.top) * .08).toFixed(1)}px, 0)`; };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    addEventListener('scroll', schedule, { passive: true }); update();
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', schedule); node.style.transform = ''; };
  }, [motion]);
  const playVideo = ready && motion && desktop && HERO.mp4 && !navigator.connection?.saveData;
  useEffect(() => { const v = video.current; if (!v) return; if (playVideo && inView && !paused && !document.hidden) v.play().catch(() => {}); else v.pause(); }, [playVideo, inView, paused]);
  return <section ref={root} className="b-hero" id="hero" data-track-section="hero" aria-labelledby="hero-title">
    <div className="b-hero-bg" aria-hidden="true">{lease && <Grainient className="b-grainient" colors={['#0b0e0d', '#151b16', '#d4fa7b']} speed={.15} grainAmount={.08} interactive={finePointer()} clickSwirl={false} intro={false} dpr={1} />}<div className="b-grain" /></div>
    <div className="b-wrap b-hero-grid">
      <div className="b-hero-copy">
        <p className="b-eyebrow"><span className="status-dot" />No ads. No account. Nothing to sign in to.</p>
        <SplitText id="hero-title" tag="h1" text={TITLE} className="b-h1" textAlign="left" splitType="words" enabled={motion} delay={60} duration={.35 * 2} ease="power3.out" from={{ opacity: 1, filter: 'blur(10px)', y: -14 }} to={{ opacity: 1, filter: 'blur(0px)', y: 0 }} rootMargin="0px" />
        <p className="b-lede">A free phone remote for Android{'\u00a0'}TV and Google{'\u00a0'}TV. Type a YouTube search on your phone; the results open on your TV.</p>
        <div className="b-hero-actions"><StarCta /><a className="b-ghost" href="#search-proof">Watch it work <span aria-hidden="true">↓</span></a><QrHint spot="hero" /></div>
        <div className="b-count-slot"><DownloadCount className="hero-count" /></div>
        <p className="b-note">Free Android APK. No ads. No account.</p>
      </div>
      <figure className="b-hero-media" ref={media}>
        <picture><source media="(max-width: 899px)" srcSet={HERO.crop} /><img src={HERO.src} srcSet={HERO.srcset} sizes="(max-width: 899px) 100vw, 60vw" width="1600" height="900" alt="An illustrated living room: a phone with The Remote's YouTube search typed for lofi beats, in front of a drawn TV showing YouTube results, lit by a lime light under the console." fetchPriority="high" loading="eager" decoding="async" /></picture>
        {playVideo && <video ref={video} className="b-hero-video" data-track-loop="hero" muted loop playsInline preload="auto" poster={HERO.src} width="1600" height="900" aria-hidden="true">{HERO.webm && <source src={HERO.webm} type="video/webm" />}<source src={HERO.mp4} type="video/mp4" /></video>}
        {playVideo && <button type="button" className="b-chip b-media-pause" aria-pressed={paused} onClick={() => setPaused(p => !p)}>{paused ? 'Play' : 'Pause'} animation</button>}
      </figure>
    </div>
  </section>;
}
