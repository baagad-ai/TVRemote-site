// 1 · Hero (CONCEPT-B-GUIDE.md §1, board gen.py:160-164). Design's lit living-room render is the full-bleed scene
// behind the copy, under the board's two ink gradients. Effects: Build's seamless 10 s video loop (no CSS zoom), React Bits Grainient as overlay grain (cursor off) holding the page's one GPU
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
export function StarCta({ button = 'hero', inView = true, color = '#d4fa7b', children }) {
  return <StarBorder as="div" className="star-cta" color={color} duration={6} thickness={1} radius={999} hover="none" clickPulse={false} backgroundColor="transparent" borderColor="transparent" textColor="#0b0e0d">{children || <DownloadLink button={button} />}</StarBorder>;
}
export default function Hero() {
  const { ready, motion, gpu } = useEnvironment(), root = useRef(null), media = useRef(null), video = useRef(null);
  const [desktop, setDesktop] = useState(false), [small, setSmall] = useState(false);
  const inView = useInView(root, { threshold: .3 });
  useEffect(() => { if (!ready) return; const q = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)'), u = () => setDesktop(q.matches && !lowEnd()); u(); q.addEventListener('change', u); return () => q.removeEventListener('change', u); }, [ready]);
  // Baagad 16 Oct (tablet): the loop plays on ANY device; 16:9 at 600 px and wider, the 4:5 loop below 600 px.
  useEffect(() => { if (!ready) return; const q = matchMedia('(max-width: 599px)'), u = () => setSmall(q.matches); u(); q.addEventListener('change', u); return () => q.removeEventListener('change', u); }, [ready]);
  const lease = useGpuLease(ready && gpu && desktop && inView, 'grainient');
  // Header: transparent at the very top, solid ink #0b0e0d as soon as the page has scrolled (Baagad 16 Oct: scrollY > 8),
  // so the hero copy never shows through it.
  useEffect(() => {
    const header = document.querySelector('.site-header'); if (!header) return;
    const update = () => header.classList.toggle('is-solid', scrollY > 8);
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
  // Build's loops, webm first then mp4: 16:9 at desktop sizes, the 4:5 loop in the 390 scene (poster alone until it
  // exists). Poster first: the <img> is the loop's frame 0 in a fixed box; the video (same poster) sits over it.
  // No size is assumed for the video files (CSS fills the box). No Save-Data / low-end.
  // Baagad 16 Oct: no hover / pointer / low-end gate any more (a 1024 touch tablet got the poster). Only reduced motion and
  // Save-Data keep the poster. The poster shows until the video's first frame has painted, then it is hidden.
  const loop = small ? (HERO.mp44x5 ? { webm: HERO.webm4x5, mp4: HERO.mp44x5, poster: HERO.crop } : null) : HERO.mp4 ? { webm: HERO.webm, mp4: HERO.mp4, poster: HERO.src } : null;
  const playVideo = Boolean(ready && motion && loop && !lowEnd() && !navigator.connection?.saveData);
  const [painted, setPainted] = useState(false);
  useEffect(() => { setPainted(false); }, [small]);
  useEffect(() => {
    const v = video.current; if (!v) return; v.muted = true; v.playbackRate = 1;
    const want = () => playVideo && inView && !document.hidden;
    const tryPlay = () => { if (want() && v.paused) v.play().catch(() => {}); };
    if (want()) tryPlay(); else v.pause();
    // Autoplay can be refused (battery saver, some tablets): retry on the first touch / click / key and on visibility.
    const retry = () => tryPlay(), vis = () => (document.hidden ? v.pause() : tryPlay());
    addEventListener('pointerdown', retry, { passive: true }); addEventListener('touchstart', retry, { passive: true }); addEventListener('keydown', retry); document.addEventListener('visibilitychange', vis);
    return () => { removeEventListener('pointerdown', retry); removeEventListener('touchstart', retry); removeEventListener('keydown', retry); document.removeEventListener('visibilitychange', vis); };
  }, [playVideo, inView, small]);
  return <section ref={root} className="b-hero" id="hero" data-track-section="hero" aria-labelledby="hero-title">
    <div className="b-hero-scene">
      <div className="b-hero-move" ref={media}><div className={`b-hero-loop${playVideo && painted ? ' is-painted' : ''}`}>
        <picture><source media="(max-width: 599px)" srcSet={HERO.crop} width="720" height="900" /><img src={HERO.src} srcSet={HERO.srcset} sizes="100vw" width="1920" height="1080" alt="An illustrated living room: a phone with The Remote's YouTube search typed for lofi beats, in front of a drawn TV showing YouTube results, lit by a lime light under the console." fetchPriority="high" loading="eager" decoding="async" /></picture>
        {playVideo && <video key={loop.mp4} ref={video} className="b-hero-video" data-track-loop="hero" muted autoPlay loop playsInline preload="auto" poster={loop.poster} aria-hidden="true" onPlaying={() => setPainted(true)}>{loop.webm && <source src={loop.webm} type="video/webm" />}<source src={loop.mp4} type="video/mp4" /></video>}
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
      <div className="b-hero-actions"><StarCta inView={inView}><a className="download-cta" href="#join-beta"><span>Join the beta</span><span className="cta-arrow" aria-hidden="true">↓</span></a></StarCta><DownloadLink button="hero" className="b-ghost b-hero-apk">Download the APK</DownloadLink></div>
      <LiveCount className="is-hero" />
    </div>
  </section>;
}
