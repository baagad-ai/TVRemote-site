// Concept B sections 4-9 and the lime close (CONCEPT-B-GUIDE.md §4-9, board gen.py:115-124, 193-268).
import { useEffect, useRef, useState } from 'react';
import { PixelTransition, CircularGallery, AnimatedList, ScrollReveal } from '../components/rb/lazy';
import ScrollStack, { ScrollStackItem } from '../components/ScrollStack';
import { LiveCount } from './counter';
import { DownloadLink } from '../Download';
import { useEnvironment } from '../environment';
import { useGpuLease, useInView, lowEnd } from './lease';
import { ROOMS } from './media';
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
    {play && !narrow && r.mp4 && <video ref={video} data-track-loop={`rooms-${id}`} muted playsInline loop preload="metadata" poster={r.poster} aria-hidden="true">{r.webm && <source src={r.webm} type="video/webm" />}<source src={r.mp4} type="video/mp4" /></video>}</div>;
}
export function Rooms() {
  const { motion } = useEnvironment(), [room, setRoom] = useState('living'), [swap, setSwap] = useState({ from: 'living', to: 'living', n: 0, on: false });
  const wrap = useRef(null), inView = useInView(wrap, { threshold: .4 });
  const pick = id => { if (id === room) return; setRoom(id); setSwap(s => ({ from: s.to, to: id, n: s.n + 1, on: false })); };
  useEffect(() => { if (swap.n && !swap.on) { const t = requestAnimationFrame(() => setSwap(s => ({ ...s, on: true }))); return () => cancelAnimationFrame(t); } }, [swap]);
  const playing = motion && inView;
  return <section ref={wrap} className="b-rooms" id="inside" aria-labelledby="rooms-title">
    <div className="b-rooms-media">
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
export function Guests() {
  const { ready, motion } = useEnvironment();
  return <section className="b-section b-guests" id="guests" data-track-section="guests" aria-labelledby="guests-title">
    <div className="b-wrap b-guests-grid">
      <div className="b-guests-head"><Eyebrow>Friends over</Eyebrow><h2 id="guests-title">Hand out the remote, <em>not your phone.</em></h2>
        <p className="b-lede">Invite a guest from The Remote. They join on your home Wi-Fi from their own Android phone.</p></div>
      <div className="b-guests-stack"><ScrollStack itemScale={.04} baseScale={.92} itemStackDistance={70} stackTop={guestStackTop}>{GUESTS.map(([title, text], i) => <ScrollStackItem key={title} itemClassName="b-guest-card">
        <div className="b-guest-copy"><span className="b-tag">Step {i + 1}</span><h3>{title}</h3><p className="b-lede">{text}</p></div>
        <div className="b-guest-phone">{i === 0 && ready && motion ? <PhoneLoop name="invite" /> : <GuestCard i={i} />}</div>
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
export function Gallery() {
  const { ready, gpu, motion } = useEnvironment(), ref = useRef(null), inView = useInView(ref, { threshold: .3 }), [desktop, setDesktop] = useState(false);
  useEffect(() => { if (!ready) return; const q = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)'), u = () => setDesktop(q.matches && !lowEnd()); u(); q.addEventListener('change', u); return () => q.removeEventListener('change', u); }, [ready]);
  const lease = useGpuLease(ready && gpu && motion && desktop && inView, 'circular-gallery');
  return <section className="b-section b-gallery" id="screens" aria-labelledby="gallery-title">
    <div className="b-wrap"><Eyebrow>The real app</Eyebrow><h2 id="gallery-title">Every screen, <em>as it ships.</em></h2></div>
    <div ref={ref} className={`b-gallery-box ${lease ? 'is-live' : ''}`}>
      {lease ? <CircularGallery fallback={<GalleryArc />} items={ARC_ITEMS} bend={2.2} itemSize={GALLERY_SIZE} itemAspect={GALLERY_ASPECT} gap={.115} showTitles={false} shadow={0} fadeEdges={0} textColor="#eeeee6" borderRadius={.06} scrollEase={.05} autoScroll={0} openOnClick={false} snap={false} intro={false} dpr={1.5} className="b-circular" />
        : <GalleryArc flat={ready && !motion} />}
    </div>
  </section>;
}
// 7 · Proof: React Bits AnimatedList rows (spring in once, 70 ms stagger) + the live counter, unchanged.
const FACTS = ['Free', 'No ads', 'No account', 'Android 8.0 or later', 'Same home Wi-Fi', 'Android\u00a0TV and Google\u00a0TV'];
const StaticFacts = () => <ul className="b-facts">{FACTS.map(f => <li key={f}><span className="b-check" aria-hidden="true">✓</span><span>{f}</span></li>)}</ul>;
const LIST_VARS = { '--al-tile': '#151b16', '--al-tile-edge': '#354032', '--al-tile-highlight': 'transparent', '--al-tile-shadow': 'none', '--al-ink': '#eeeee6', '--al-muted': '#b0b9a2', '--al-ring': 'transparent', '--al-ring-fill': 'transparent', '--al-hover': 'none', '--al-press': 'none', '--al-active': 'none' };
export function Proof() {
  const { ready, motion } = useEnvironment();
  return <section className="b-section b-proof" aria-labelledby="proof-title"><div className="b-wrap b-proof-grid">
    <div><Eyebrow>Straight facts</Eyebrow><h2 id="proof-title">No catch. <em>Just a remote.</em></h2><LiveCount className="is-proof" /></div>
    {ready && motion ? <AnimatedList fallback={<StaticFacts />} className="b-facts-list" items={FACTS} renderItem={f => <><span className="b-check" aria-hidden="true">✓</span><span>{f}</span></>} frame={false} showGradients={false} displayScrollbar={false} selectOnHover={false} enableArrowNavigation={false} animation="pop" animateOnce stagger={.07} radius={28} gap={12} width={520} maxHeight="none" style={LIST_VARS} />
      : <StaticFacts />}
  </div></section>;
}
// 8 · Compatibility split: the Phone -> Home Wi-Fi -> Living Room TV line draws once (0.8 s); React Bits ScrollReveal
// on the paragraph. The privacy sentence is the approved one, verbatim.
export function TypeSplit() {
  const ref = useRef(null), seen = useInView(ref, { threshold: .4 }), [drawn, setDrawn] = useState(false), { ready, motion } = useEnvironment();
  useEffect(() => { if (seen) setDrawn(true); }, [seen]);
  const LEDE = "The Remote works with Android TV and Google TV devices that support Android TV Remote Service v2. Your phone needs Android 8.0 or later. There's no iPhone version.";
  return <section ref={ref} className={`b-section b-split ${drawn ? 'is-drawn' : ''}`} id="compatibility" aria-labelledby="compatibility-title"><div className="b-wrap b-split-grid">
    <div><Eyebrow>Will it work?</Eyebrow><h2 id="compatibility-title"><span className="b-h2-l1">Works with Android{'\u00a0'}TV</span> <em>and Google{'\u00a0'}TV.</em></h2>
      <div className="b-line" aria-hidden="true"><span className="b-chip is-on">Phone</span><svg viewBox="0 0 100 2" preserveAspectRatio="none"><line x1="0" y1="1" x2="100" y2="1" /></svg><span className="b-chip">Home Wi-Fi</span><svg className="is-fade" viewBox="0 0 100 2" preserveAspectRatio="none"><line x1="0" y1="1" x2="100" y2="1" /></svg><span className="b-chip">Living Room TV</span></div></div>
    <div className="b-split-copy">{ready && motion ? <ScrollReveal fallback={<p className="b-lede">{LEDE}</p>} as="p" baseOpacity={.2} enableBlur={false} baseRotation={0} containerClassName="b-reveal" textClassName="b-lede">{LEDE}</ScrollReveal> : <p className="b-lede">{LEDE}</p>}
      <p className="b-small">Remote commands go to your paired TV over the local network, without a developer cloud relay. The Remote doesn&rsquo;t keep a search history.</p></div>
  </div></section>;
}
// 9c · Lime close band: copy left, the approved room still 640x460 r28 on the right.
export function Closing() {
  return <section className="b-closing"><div className="b-wrap b-closing-grid"><div><Eyebrow className="on-lime">Ready when you are</Eyebrow><h2>A better remote. Already in your pocket.</h2><div className="b-closing-cta"><DownloadLink button="footer" /></div><p className="b-closing-fine">Free Android APK. No ads. No account.</p></div>
    <figure className="b-closing-still"><img src="assets/board/band-1280.webp" width="1280" height="920" loading="lazy" decoding="async" alt="The illustrated living room: the phone with The Remote in front of the drawn TV, lit by a lime light under the console." /></figure></div></section>;
}
export const TRADEMARK = 'YouTube is a trademark of Google LLC. The Remote is not affiliated with or endorsed by Google or YouTube.';
