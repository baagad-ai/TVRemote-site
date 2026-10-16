// Concept B sections 4-9 and the lime close (CONCEPT-B-GUIDE.md §4-9, board gen.py:115-124, 193-268).
import { useEffect, useRef, useState } from 'react';
import { PixelTransition, CircularGallery, ScrollReveal, BlurText } from '../components/rb/lazy';
import ScrollStack, { ScrollStackItem } from '../components/ScrollStack';
import { LiveCount } from './counter';
import { DownloadLink } from '../Download';
import { useEnvironment } from '../environment';
import { useGpuLease, useInView, lowEnd } from './lease';
import { ROOMS, CLOSING } from './media';
import { StarCta } from './Hero';
import { PhoneLoop, GuestCard } from './slots';

const Eyebrow = ({ children, className = '' }) => <p className={`b-eyebrow ${className}`}><span className="b-dot" aria-hidden="true" />{children}</p>;
const Frame = ({ src, alt, w = 342, h = 706, className = '' }) => <div className={`b-frame ${className}`}><img src={src} alt={alt} width={w} height={h} loading="lazy" decoding="async" /></div>;

// 4 · Rooms (Build's final loops, 21:05): at 1440 each room is full-section media (inset 0, cover, poster first, webm
// then mp4) under the copy column, which sits above it (z-index) and overlaps the room's edge as on the board. At 390
// each room is a 4:5 poster right under the copy (the 1440 video is not shown there). Previously: chips swap the lit
// room with React Bits PixelTransition (0.5 s; instant under reduced motion). Slots per room in media.js
// (Build's loops/posters once whitelisted; the board render until then). Only the selected room's loop plays.
const ROOM_LIST = [['living', 'Living room'], ['bedroom', 'Bedroom'], ['kitchen', 'Kitchen']], NAMES = Object.fromEntries(ROOM_LIST);
// 390 (max-width 899px, the rooms mobile layout): no <video> at all (nothing fetched or played), the 4:5 poster only.
const useNarrow = () => { const [n, setN] = useState(true); useEffect(() => { const q = matchMedia('(max-width: 899px)'), f = () => setN(q.matches); f(); q.addEventListener('change', f); return () => q.removeEventListener('change', f); }, []); return n; };
function RoomMedia({ id, play }) {
  const r = ROOMS[id], video = useRef(null), narrow = useNarrow();
  useEffect(() => { const v = video.current; if (!v) return; v.playbackRate = 1; if (play) v.play().catch(() => {}); else v.pause(); }, [play]);
  return <div className="room-media"><picture>{r.crop !== r.poster && <source media="(max-width: 899px)" srcSet={r.crop} />}<img src={r.poster} width={r.own ? 1440 : 1200} height={r.own ? 760 : 936} alt={r.own ? `Illustrated rooms with the ${NAMES[id].toLowerCase()} lit in lime.` : 'Illustrated rooms: a living room lit in lime and a bedroom beside it.'} loading="lazy" decoding="async" /></picture>
    {play && !narrow && r.mp4 && <video ref={video} data-track-loop={`rooms-${id}`} muted playsInline loop preload="metadata" poster={r.poster} aria-hidden="true">{r.webm && <source src={r.webm} type="video/webm" />}<source src={r.mp4} type="video/mp4" /></video>}
    {play && narrow && r.mp44x5 && <video ref={video} data-track-loop={`rooms-${id}-4x5`} muted playsInline loop autoPlay preload="metadata" poster={r.crop} aria-hidden="true">{r.webm4x5 && <source src={r.webm4x5} type="video/webm" />}<source src={r.mp44x5} type="video/mp4" /></video>}</div>;
}
export function Rooms() {
  const { motion } = useEnvironment(), [room, setRoom] = useState('living'), [swap, setSwap] = useState({ from: 'living', to: 'living', n: 0, on: false });
  const wrap = useRef(null), sw = useRef(null), inView = useInView(wrap, { threshold: .4 });
  const pick = id => { if (id === room) return; setRoom(id); setSwap(s => ({ from: s.to, to: id, n: s.n + 1, on: false })); };
  useEffect(() => { if (swap.n && !swap.on) { const t = requestAnimationFrame(() => setSwap(s => ({ ...s, on: true }))); return () => cancelAnimationFrame(t); } }, [swap]);
  const playing = motion && inView;
  return <section ref={wrap} className="b-rooms" id="inside" aria-labelledby="rooms-title">
    <div className="b-rooms-media" onPointerDown={e => { sw.current = [e.clientX, e.clientY]; }} onPointerUp={e => { const [x, y] = sw.current || [], dx = e.clientX - x; sw.current = null; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - y)) { const i = ROOM_LIST.findIndex(([k]) => k === room); pick(ROOM_LIST[(i + (dx < 0 ? 1 : ROOM_LIST.length - 1)) % ROOM_LIST.length][0]); } }}>
      {motion ? <div inert className="b-rooms-pixwrap"><PixelTransition fallback={<RoomMedia id={room} play={false} />} key={swap.n} firstContent={<RoomMedia id={swap.from} play={playing && !swap.on && swap.from === room} />} secondContent={<RoomMedia id={swap.to} play={playing && swap.on} />} active={swap.on} trigger="click" gridSize={10} pixelColor="#0b0e0d" animationStepDuration={.5} aspectRatio="auto" className="b-rooms-pixels" /></div>
        : <RoomMedia id={room} play={false} />}
    </div>
    <div className="b-rooms-vignette" aria-hidden="true" />
    <div className="b-wrap b-rooms-copy">
      <Eyebrow>Rooms</Eyebrow>
      <h2 id="rooms-title">The right TV. <em>The right room.</em></h2>
      <p className="b-lede">Name each TV and pick its room when you pair it. Your saved TVs sit in one list, each with its room.</p>
      <div className="b-chips" role="group" aria-label="Rooms">{ROOM_LIST.map(([id, name]) => <button key={id} type="button" className="b-chip" data-track="rooms-chip" data-track-item={`rooms_${id}`} aria-pressed={room === id} onClick={() => pick(id)}>{room === id && <span className="room-dot" aria-hidden="true" />}{name}</button>)}</div>
      <div className="b-rooms-inset"><Frame src="assets/board/pair-rooms-540.webp" w={540} h={1170} alt="Pairing a TV in The Remote: the code from the TV screen, the name Living Room TV and the room chips Living room, Bedroom and Kitchen." /></div>
    </div>
  </section>;
}
// 5 · Guests (CONCEPT-B-GUIDE.md §5, board gen.py mock_guests_stack): grid 440px 1fr gap 70, the heading column sticky
// on the left; three step cards in the repo's ScrollStack (native scroll) settling at 0 / 70 / 140 px with scale .92 /
// .96 / 1, released before the gallery. Each card: tag, h3 40px, lede, and Design's code-drawn phone (240px) on the right:
// step 1 the live invite loop (<PhoneLoop name="invite" />; Design's still under reduced motion), steps 2-3 <GuestCard>.
// Copy is the board's, with PM's final guest paragraph (16 Oct 20:58) verbatim across cards 1 and 3: the invite
// sentences on the invite card, the removal + limit sentences on "Your list". Generic names only (Design).
// Reduced motion, narrow screens and keyboard focus inside: a plain list (ScrollStack restores the document flow).
const GUESTS = [
  ['Invite a guest', "Guests scan the QR with their phone camera, or type the code. An invite works once and runs out after 2 minutes. If it runs out, invite again for a new one. The access it gives never expires."],
  ['Their phone, full remote', 'Arrows, media, volume, YouTube search and links, on their own Android phone.'],
  ['Your list', "The Remote removes a guest by itself only when they're off your Wi-Fi and haven't connected for 7 days in a row. You can remove a guest any time; if they're away, it takes effect next time they're on your Wi-Fi. You can also limit a guest to media and volume only."]
];
const guestStackTop = () => (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header')) || 84) + 32;
function useCardEntry(ref, on) { // batch-staggered entry for the unpinned guest cards (see guests.css)
  useEffect(() => {
    const root = ref.current; if (!on || !root) return;
    const io = new IntersectionObserver(es => { let n = 0; for (const e of es) if (e.isIntersecting) { e.target.style.setProperty('--d', `${n++ * 120}ms`); e.target.classList.add('is-in'); io.unobserve(e.target); } }, { threshold: .15 });
    root.querySelectorAll('.b-guest-card').forEach(c => io.observe(c));
    return () => io.disconnect();
  }, [on]);
}
export function Guests() {
  const { ready, motion } = useEnvironment(), sec = useRef(null), anim = ready && motion; useCardEntry(sec, anim);
  return <section ref={sec} className={`b-section b-guests ${anim ? 'is-anim' : ''}`} id="guests" data-track-section="guests" aria-labelledby="guests-title">
    <div className="b-wrap b-guests-grid">
      <div className="b-guests-head"><Eyebrow>Friends over</Eyebrow><h2 id="guests-title">Hand out the remote, <em>not your phone.</em></h2>
        <p className="b-lede">Invite a guest from The Remote. They join on your home Wi-Fi from their own Android phone.</p></div>
      <div className="b-guests-stack"><ScrollStack itemScale={.04} baseScale={.92} itemStackDistance={70} stackTop={guestStackTop}>{GUESTS.map(([title, text], i) => <ScrollStackItem key={title} itemClassName="b-guest-card">
        <div className="b-guest-copy"><span className="b-tag">Step {i + 1}</span><h3>{title}</h3><p className="b-lede">{text}</p></div>
        <div className="b-guest-phone">{ready && motion && !navigator.connection?.saveData ? <PhoneLoop name={['guestjoin', 'guestremote', 'guestlist'][i]} /> : <GuestCard i={i} />}</div>
      </ScrollStackItem>)}</ScrollStack></div>
    </div>
  </section>;
}
// 6 · Gallery: React Bits CircularGallery (OGL; GPU lease 'circular-gallery') on a fine-pointer desktop, with the
// board's 7 framed phones; drag / wheel / arrow keys turn the arc, no autoplay. Elsewhere (touch, reduced motion, no
// WebGL, before the lease) the same 7 phones sit on the board's static arc (390: a swipe row).
const SHOTS = [
  ['remote-home', 'Remote', 'The remote for Living Room TV: D-pad, OK, Back, Home, Play and volume, with a Search YouTube button.'],
  ['youtube-search', 'YouTube search', 'The YouTube search sheet for Living Room TV, with lofi beats typed on the phone keyboard.'],
  ['youtube-share', 'Share a link', 'The share sheet: a YouTube link, Living Room TV selected, and an Open on Living room button.'],
  ['your-tvs-g1', 'Your TVs', 'The Your TVs list: Living Room TV in Living room, connected.'],
  ['pair-name-and-room', 'Name and room', 'Pairing a TV: the name Living Room TV and the Living room chip selected.'],
  ['guests-guest-remote', 'Guest remote', "A guest's own phone with The Remote connected to Living Room TV."],
  ['trackpad-pad', 'Trackpad', 'The trackpad for Living Room TV: the whole screen is a pad, mid swipe to the right.']
];
// Design's code-drawn phones (phone-components/gallery, ORDER.txt order): 440x932, bezel baked in, transparent corners.
const GALLERY_ASPECT = 440 / 932;
// CircularGallery centres its first item and loops, so the list starts at the board's centre phone (your-tvs-g1, 4th):
// the cyclic order, and so the arc, is the board's (remote-home ... trackpad-pad), with your-tvs-g1 in the middle.
const ARC_ITEMS = [...SHOTS.slice(3), ...SHOTS.slice(0, 3)].map(([n, text, alt]) => ({ image: `assets/b/gallery-${n}.webp`, text, alt }));
// Plane height = 0.6 x box height x itemSize: 477px tall = the board's ~225px-wide phone in the 700px box.
const GALLERY_SIZE = 477 / (.6 * 700);
const GalleryArc = ({ flat = false }) => <ul className={`b-arc${flat ? ' is-flat' : ''}`}>{SHOTS.map(([n, , alt], i) => <li key={n} style={{ '--i': i - 3 }}><img src={`assets/b/gallery-${n}.webp`} alt={alt} width="440" height="932" loading="lazy" decoding="async" /></li>)}</ul>;
// Baagad 16 Oct: under 900 px the gallery moves on its own too (no snap): a transform track of the phones, two copies
// (the second aria-hidden), ~24 px/s, draggable either way (touch or mouse), resuming 1.5 s after the drag ends; it
// pauses off-screen, on hover, and with the 32 px pause control (WCAG 2.2.2). Reduced motion: a static row you scroll.
function GalleryTrack({ paused }) {
  const box = useRef(null), track = useRef(null);
  useEffect(() => {
    const el = box.current, tr = track.current; let raf = 0, last = 0, x = 0, w = 1, drag = null, resumeAt = 0, inView = false, hover = false;
    const measure = () => { w = tr.firstChild.getBoundingClientRect().width || 1; };
    const place = () => { x = ((x % w) + w) % w; tr.style.transform = `translate3d(${-x}px,0,0)`; };
    const tick = now => { const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now; if (!drag && !paused.current && !hover && now >= resumeAt) x += 24 * dt; place(); raf = requestAnimationFrame(tick); };
    const run = () => { if (!raf && inView && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); } }, stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? run() : stop(); }); io.observe(el);
    const ro = new ResizeObserver(measure); ro.observe(tr); measure();
    const down = e => { drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, start: x, moved: false }; };
    const move = e => { if (!drag || drag.id !== e.pointerId) return; const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved) { if (Math.hypot(dx, dy) < 6) return; if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; } drag.moved = true; el.setPointerCapture?.(e.pointerId); }
      x = drag.start - dx; place(); };
    const up = e => { if (drag && drag.id === e.pointerId) { drag = null; resumeAt = performance.now() + 1500; } };
    const enter = e => { if (e.pointerType === 'mouse') hover = true; }, leave = () => { hover = false; };
    const vis = () => (document.hidden ? stop() : run());
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('pointerenter', enter); el.addEventListener('pointerleave', leave); document.addEventListener('visibilitychange', vis);
    return () => { stop(); io.disconnect(); ro.disconnect(); el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('pointerenter', enter); el.removeEventListener('pointerleave', leave); document.removeEventListener('visibilitychange', vis); };
  }, []);
  return <div ref={box} className="b-gtrack"><div ref={track} className="b-gtrack-inner"><GalleryArc /><div aria-hidden="true"><GalleryArc /></div></div></div>;
}
const PauseBtn = ({ paused, onClick, what }) => <button type="button" className="b-marq-btn b-pause-btn" aria-pressed={paused} aria-label={`${paused ? 'Play' : 'Pause'} ${what}`} onClick={onClick}>
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">{paused ? <path d="M4 2.5v11l9-5.5z" fill="currentColor" /> : <path d="M4 2.5h2.6v11H4zM9.4 2.5H12v11H9.4z" fill="currentColor" />}</svg></button>;
export function Gallery() {
  const { ready, gpu, motion } = useEnvironment(), ref = useRef(null), inView = useInView(ref, { threshold: .3 }), [desktop, setDesktop] = useState(false);
  // Baagad 16 Oct: the live gallery runs at 900 px and wider on touch too (tablets swipe it), and under reduced motion
  // (no auto-scroll there, drag still works). It auto-scrolls slowly and resumes 1.5 s after a drag / swipe / wheel.
  useEffect(() => { if (!ready) return; const q = matchMedia('(min-width: 900px)'), u = () => setDesktop(q.matches && !lowEnd()); u(); q.addEventListener('change', u); return () => q.removeEventListener('change', u); }, [ready]);
  const lease = useGpuLease(ready && (gpu || (!motion && !navigator.connection?.saveData)) && desktop && inView, 'circular-gallery');
  const [paused, setPaused] = useState(false), pausedRef = useRef(false); pausedRef.current = paused;
  return <section className="b-section b-gallery" id="screens" aria-labelledby="gallery-title">
    <div className="b-wrap"><Eyebrow>The real app</Eyebrow><h2 id="gallery-title">Every screen, <em>as it ships.</em></h2></div>
    <div ref={ref} className={`b-gallery-box ${lease ? 'is-live' : ''}`}>
      {ready && motion && <div className="b-gallery-ctl"><PauseBtn paused={paused} onClick={() => setPaused(p => !p)} what="screen gallery" /></div>}
      {lease ? <CircularGallery fallback={<GalleryArc />} items={ARC_ITEMS} bend={2.2} itemSize={GALLERY_SIZE} itemAspect={GALLERY_ASPECT} gap={.115} showTitles={false} shadow={0} fadeEdges={0} textColor="#eeeee6" borderRadius={.109} scrollEase={.05} autoScroll={motion && !paused ? .6 : 0} openOnClick={false} snap={false} intro={false} dpr={1.5} className="b-circular" />
        : ready && motion && !desktop ? <GalleryTrack paused={pausedRef} /> : <GalleryArc flat={ready && !motion} />}
    </div>
  </section>;
}
// 1b · Proof marquee (Baagad 16 Oct; Concept A §2 .marq): directly below the hero, a full-width text ticker of the six
// true facts, ✦ between them. Two identical copies of the list sit in one track (the second aria-hidden); each copy
// ends with its own ✦ and the same gap after it (padding-right = gap), so translating the track by -50% lands exactly
// on the next "Free". ~40 px/s: the duration is the measured copy width / 40. Transform only. Paused on hover and
// off-screen (IntersectionObserver); the Pause/Play button handles keyboard pausing (no focus-within pause, QA 22:37). Reduced motion: one static row that wraps, no copy, no trailing ✦.
const MARQ = ['Free', 'No ads', 'No account', 'Android 8.0 or later', 'Same home Wi-Fi', 'Android\u00a0TV and Google\u00a0TV'];
const MarqCopy = ({ hidden }) => <ul className="b-marq-copy" aria-hidden={hidden || undefined}>{MARQ.map(f => <li key={f}><span>{f}</span><span className="b-marq-sep" aria-hidden="true">✦</span></li>)}</ul>;
export function ProofMarquee() {
  const { ready, motion } = useEnvironment(), band = useRef(null), copy = useRef(null), [dur, setDur] = useState(60), [off, setOff] = useState(false), [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!ready || !motion || !copy.current) return;
    const measure = () => setDur(Math.max(10, copy.current.getBoundingClientRect().width / 40));
    const ro = new ResizeObserver(measure); ro.observe(copy.current); measure();
    const io = new IntersectionObserver(([e]) => setOff(!e.isIntersecting)); io.observe(band.current);
    return () => { ro.disconnect(); io.disconnect(); };
  }, [ready, motion]);
  const still = ready && !motion;
  // WCAG 2.2.2 (Design spec): a 32 px pause / play circle at the band's right end, above the track on a short panel fade.
  return <section ref={band} className={`b-marq${still ? ' is-still' : ''}${off ? ' is-off' : ''}${paused ? ' is-paused' : ''}`} aria-label="Straight facts">
    <div className="b-marq-track" style={{ '--marq-dur': `${dur.toFixed(2)}s` }}><div ref={copy} className="b-marq-unit"><MarqCopy /></div>{!still && <div className="b-marq-unit" aria-hidden="true"><MarqCopy hidden /></div>}</div>
    {ready && motion && <div className="b-marq-ctl"><button type="button" className="b-marq-btn" aria-pressed={paused} aria-label={paused ? 'Play facts ticker' : 'Pause facts ticker'} onClick={() => setPaused(x => !x)}>
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">{paused ? <path d="M4 2.5v11l9-5.5z" fill="currentColor" /> : <path d="M4 2.5h2.6v11H4zM9.4 2.5H12v11H9.4z" fill="currentColor" />}</svg></button></div>}
  </section>;
}
// 7 · Proof (Baagad 16 Oct): six facts, none ever dim. When the band comes into view (IntersectionObserver, once) the
// checks tick in one after another, 150 ms apart, and stay fully checked: full-strength text, lime checks. Before
// hydration, without JS and under reduced motion they are all checked straight away. Plus the live counter, unchanged.
const FACTS = ['Free', 'No ads', 'No account', 'Android 8.0 or later', 'Same home Wi-Fi', 'Android\u00a0TV and Google\u00a0TV'];
export function Proof() {
  const { ready, motion } = useEnvironment(), list = useRef(null), [ticked, setTicked] = useState(FACTS.length), [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!ready || !motion || armed) return;
    const node = list.current; if (!node) return;
    setTicked(0); setArmed(true);
    let timers = [];
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) return; io.disconnect(); timers = FACTS.map((_, i) => setTimeout(() => setTicked(n => Math.max(n, i + 1)), 150 * (i + 1))); }, { threshold: .35 });
    io.observe(node);
    return () => { io.disconnect(); timers.forEach(clearTimeout); setTicked(FACTS.length); };
  }, [ready, motion]);
  return <section className="b-section b-proof" aria-labelledby="proof-title"><div className="b-wrap b-proof-grid">
    <div><Eyebrow>Straight facts</Eyebrow><h2 id="proof-title">No catch. <em>Just a remote.</em></h2><LiveCount className="is-proof" /></div>
    <ul ref={list} className="b-facts">{FACTS.map((f, i) => <li key={f} className={i < ticked ? 'is-ticked' : ''}><span className="b-check" aria-hidden="true">✓</span><span>{f}</span></li>)}</ul>
  </div></section>;
}
// 8 · Compatibility split: the Phone -> Home Wi-Fi -> Living Room TV line draws once (0.8 s), then one lime pulse runs
// the line every 10 s and each chip brightens as it arrives (CSS, transform/opacity/stroke only); React Bits ScrollReveal
// on the paragraph. The privacy sentence is the approved one, verbatim.
// The headline reuses the hero's React Bits BlurText reveal (words, from top): plays once on entry; static under reduced motion.
const H2_TEXT = 'Works with Android\u00a0TV and Google\u00a0TV.';
const H2_STATIC = <h2 id="compatibility-title"><span className="b-h2-l1">Works with Android{'\u00a0'}TV</span> <em>and Google{'\u00a0'}TV.</em></h2>;
export function TypeSplit() {
  const ref = useRef(null), seen = useInView(ref, { threshold: .4 }), [drawn, setDrawn] = useState(false), { ready, motion } = useEnvironment();
  useEffect(() => { if (seen) setDrawn(true); }, [seen]);
  const LEDE = "The Remote works with Android TV and Google TV devices that support Android TV Remote Service v2. Your phone needs Android 8.0 or later. There's no iPhone version.";
  return <section ref={ref} className={`b-section b-split ${drawn ? 'is-drawn' : ''}`} id="compatibility" aria-labelledby="compatibility-title"><div className="b-wrap b-split-grid">
    <div><Eyebrow>Will it work?</Eyebrow>{ready && motion ? <BlurText fallback={H2_STATIC} as="h2" id="compatibility-title" text={H2_TEXT} animateBy="words" direction="top" delay={60} stepDuration={.4} trigger="view" threshold={.4} wordClassName={[, , , 'is-lime', 'is-lime']} breakAfter={[2]} /> : H2_STATIC}
      <div className="b-line" aria-hidden="true"><span className="b-chip is-on b-hop-1">Phone</span><svg viewBox="0 0 100 2" preserveAspectRatio="none"><line x1="0" y1="1" x2="100" y2="1" /><line className="b-pulse" x1="0" y1="1" x2="100" y2="1" /></svg><span className="b-chip b-hop-2">Home Wi-Fi</span><svg className="is-fade" viewBox="0 0 100 2" preserveAspectRatio="none"><line x1="0" y1="1" x2="100" y2="1" /><line className="b-pulse is-2" x1="0" y1="1" x2="100" y2="1" /></svg><span className="b-chip b-hop-3">Living Room TV</span></div></div>
    <div className="b-split-copy">{ready && motion ? <ScrollReveal fallback={<p className="b-lede">{LEDE}</p>} as="p" baseOpacity={.2} enableBlur={false} baseRotation={0} containerClassName="b-reveal" textClassName="b-lede">{LEDE}</ScrollReveal> : <p className="b-lede">{LEDE}</p>}
      <p className="b-small">Remote commands go to your paired TV over the local network, without a developer cloud relay. The Remote doesn&rsquo;t keep a search history.</p></div>
  </div></section>;
}
// 9c · Lime close band: copy left, the approved room still 640x460 r28 on the right.
// 9 · Closing lime band: an entry reveal (y 24 -> 0 + fade, once), the CSS stepped grain (no WebGL: the mobile budget
// keeps one context), the React Bits Star Border on the CTA, and Build's 10 s band loop over the still once PM passes it
// (16:9, 4:5 under 900 px). Reduced motion / Save-Data: the still, no grain motion, no reveal.
export function Closing() {
  const { ready, motion } = useEnvironment(), ref = useRef(null), vid = useRef(null), inView = useInView(ref, { threshold: .25 }), [seen, setSeen] = useState(false), narrow = useNarrow();
  const live = ready && motion && !navigator.connection?.saveData, src = narrow ? [CLOSING.webm4x5, CLOSING.mp44x5] : [CLOSING.webm, CLOSING.mp4];
  useEffect(() => { if (inView) setSeen(true); const v = vid.current; if (v) { if (inView) v.play().catch(() => {}); else v.pause(); } }, [inView]);
  return <section ref={ref} className={`b-closing ${live ? 'is-anim' : ''} ${seen ? 'is-seen' : ''}`}><div className="b-grain is-band" aria-hidden="true" /><div className="b-wrap b-closing-grid"><div className="b-closing-copy"><Eyebrow className="on-lime">Ready when you are</Eyebrow><h2>A better remote. Already in your pocket.</h2><div className="b-closing-cta">{live ? <StarCta button="footer" inView={inView} color="#0b0e0d" /> : <DownloadLink button="footer" />}</div><p className="b-closing-fine">Free Android APK. No ads. No account.</p></div>
    <figure className="b-closing-still"><picture>{CLOSING.poster4x5 && <source media="(max-width: 899px)" srcSet={CLOSING.poster4x5} />}<img src={CLOSING.poster} width="1280" height="920" loading="lazy" decoding="async" alt="The illustrated living room: the phone with The Remote in front of the drawn TV, lit by a lime light under the console." /></picture>{live && src[1] && <video ref={vid} muted playsInline loop preload="metadata" aria-hidden="true">{src[0] && <source src={src[0]} type="video/webm" />}<source src={src[1]} type="video/mp4" /></video>}</figure></div></section>;
}
export const TRADEMARK = 'YouTube is a trademark of Google LLC. The Remote is not affiliated with or endorsed by Google or YouTube.';
