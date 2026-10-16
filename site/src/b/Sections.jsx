// Concept B sections 4-9: rooms moment, guests stack, gallery, proof band, type split, lime close, footer.
import { useEffect, useRef, useState } from 'react';
import PixelTransition from '../components/rb/PixelTransition';
import CircularGallery from '../components/rb/CircularGallery';
import ScrollStack, { ScrollStackItem } from '../components/ScrollStack';
import { DownloadCount } from '../DownloadCount.jsx';
import { DownloadLink } from '../Download';
import QrHint from '../QrHint';
import { useEnvironment } from '../environment';
import { useGpuLease, useInView, lowEnd } from './lease';
import { ROOMS } from './media';

// 4 · Full-bleed rooms moment. Chips swap the lit room with PixelTransition (instant under reduced motion); only the
// selected room's loop is loaded and playing (Build's loops; posters until they land).
function RoomMedia({ room, play }) {
  // Build's room loops are seamless 8-10 s loops; the section's Pause control stops them.
  const r = ROOMS[room], video = useRef(null);
  useEffect(() => { const v = video.current; if (!v) return; if (play) v.play().catch(() => {}); else v.pause(); }, [play]);
  const alt = room === 'living' ? 'Illustrated rooms: the Living room is lit in lime, the Bedroom is dark.' : 'Illustrated rooms: the Bedroom is lit in lime, the Living room is dark.';
  return <div className="room-media"><picture><source media="(max-width: 899px)" srcSet={r.crop} /><img src={r.poster} width="1440" height="810" alt={alt} loading="lazy" decoding="async" /></picture>
    {play && r.mp4 && <video ref={video} data-track-loop={`rooms-${room}`} muted playsInline loop preload="metadata" poster={r.poster} aria-hidden="true">{r.webm && <source src={r.webm} type="video/webm" />}<source src={r.mp4} type="video/mp4" /></video>}</div>;
}
export function Rooms() {
  const { ready, motion } = useEnvironment(), [room, setRoom] = useState('living'), [paused, setPaused] = useState(false), wrap = useRef(null), inView = useInView(wrap, { threshold: .4 });
  const loops = Boolean(ROOMS.living.mp4 || ROOMS.bedroom.mp4), playing = motion && inView && !paused;
  useEffect(() => { const card = wrap.current?.querySelector('.pixelated-image-card'); if (card) { card.setAttribute('tabindex', '-1'); card.removeAttribute('role'); } }, [ready]);
  return <section className="b-rooms" id="inside" aria-labelledby="rooms-title">
    <div ref={wrap} className="b-rooms-media">
      <PixelTransition firstContent={<RoomMedia room="living" play={playing && room === 'living'} />} secondContent={<RoomMedia room="bedroom" play={playing && room === 'bedroom'} />} active={room === 'bedroom'} trigger="click" gridSize={10} pixelColor="#0b0e0d" animationStepDuration={.4} aspectRatio="auto" className="b-rooms-pixels" />
    </div>
    <div className="b-rooms-copy b-wrap">
      <p className="b-eyebrow">Rooms</p>
      <h2 id="rooms-title">The right TV. <em>The right room.</em></h2>
      <p className="b-body">Name each TV and pick its room when you pair it. Your saved TVs sit in one list, each with its room, so the search goes to the screen you meant.</p>
      <div className="b-chips" role="group" aria-label="Choose an illustrated room">{[['living', 'Living room'], ['bedroom', 'Bedroom']].map(([id, name]) => <button key={id} type="button" className="b-chip" aria-pressed={room === id} onClick={() => setRoom(id)}><span className="room-dot" aria-hidden="true" />{name}</button>)}{loops && motion && <button type="button" className="b-chip" aria-pressed={paused} onClick={() => setPaused(p => !p)}>{paused ? 'Play' : 'Pause'} animation</button>}</div>
      <p className="b-small" role="status">{room === 'living' ? 'Living room' : 'Bedroom'} lit in this illustration.</p>
      <figure className="b-rooms-inset"><div className="b-phone-shell"><img src="assets/showcase/pair-name-and-room.png" width="1080" height="2340" loading="lazy" decoding="async" alt="Pairing a TV in The Remote: the name Living Room TV, with the Living room chip selected." /></div></figure>
    </div>
  </section>;
}
// 5 · Guests: the repo's ScrollStack (native scroll; plain list on narrow screens, reduced motion and focus).
const GUESTS = [
  ['Invite', 'Invite a guest from The Remote on your phone. Invites work on your home Wi-Fi only, and unused invite codes expire after 2 minutes.', 'assets/showcase/guests-invite.png', 'Inviting a guest to Living Room TV in The Remote: the name My phone, a QR code and an invite code, waiting for the guest.'],
  ['Their phone', "They scan the QR code with their own phone's camera, or type the code, then control the TV from their own Android phone, even when yours is put away.", 'assets/showcase/guests-guest-remote.png', "A guest's own phone with The Remote connected to Living Room TV."],
  ['Your list', 'Remove guests any time, or limit one to Media and volume only. Every Primary remote can invite and remove guests.', 'assets/showcase/guests-primary-guest-list.png', 'The guest list for Living Room TV on a Primary remote: two guests with Remove buttons, an Invite a guest button, and This phone, My phone, connected.']
];
export function Guests() {
  return <section className="b-section b-guests" id="guests" data-track-section="guests" aria-labelledby="guests-title">
    <div className="b-wrap b-guests-grid">
      <div className="b-guests-head"><p className="b-eyebrow">Friends over</p><h2 id="guests-title">Hand out the remote, <em>not your phone.</em></h2>
        <p className="b-body">Invite a guest from The Remote. They join on your home Wi-Fi from their own Android phone. No server stores guest data.</p>
        <p className="b-small">Guests need The Remote on an Android phone (Android 8.0 or later). There&rsquo;s no iPhone version. Guests join your home Wi-Fi, not a separate guest network.</p>
        <a className="b-link" data-track="guide" href="guides/guests-control-google-tv-without-google-account/">How Guest access works ↗</a></div>
      <div className="b-guests-stack"><ScrollStack itemScale={.04} baseScale={.92} itemStackDistance={28}>{GUESTS.map(([label, text, src, alt], i) => <ScrollStackItem key={label} itemClassName="b-guest-card">
        <div><p className="b-step-tag">Step {i + 1}</p><h3 className="b-h3">{label}</h3><p className="b-body">{text}</p></div>
        <div className="b-phone-shell"><img src={src} alt={alt} width="1080" height="2340" loading="lazy" decoding="async" /></div>
      </ScrollStackItem>)}<div className="scroll-stack-end" aria-hidden="true" /></ScrollStack></div>
    </div>
  </section>;
}
// 6 · Real screenshots. CircularGallery (WebGL) only on a fine-pointer desktop holding the GPU lease; otherwise a
// flat scroll-snap row of the same images (also the reduced-motion view).
const SHOTS = [
  ['remote-home', 'Remote', 'The remote for Living Room TV: D-pad, OK, Back, Home, Play and volume, with a Search YouTube button.'],
  ['youtube-search', 'YouTube search', 'The YouTube search sheet for Living Room TV, with lofi beats typed on the phone keyboard.'],
  ['youtube-share', 'Share a link', "The share sheet: a YouTube link, Living Room TV selected, and an Open on Living room button."],
  ['your-tvs-g1', 'Your TVs', 'The Your TVs list: Living Room TV in Living room, connected.'],
  ['pair-rooms', 'Pair and pick a room', 'Pairing a TV: the code from the TV screen, the name Living Room TV and the Living room chip.'],
  ['guests-primary-guest-list', 'Guests', 'The guest list for Living Room TV, with This phone shown as My phone.']
];
export function Gallery() {
  const { ready, gpu } = useEnvironment(), ref = useRef(null), inView = useInView(ref, { threshold: .3 }), [desktop, setDesktop] = useState(false);
  useEffect(() => { if (!ready) return; const q = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)'), u = () => setDesktop(q.matches && !lowEnd()); u(); q.addEventListener('change', u); return () => q.removeEventListener('change', u); }, [ready]);
  const lease = useGpuLease(ready && gpu && desktop && inView, 'circular-gallery');
  return <section className="b-section b-gallery" id="screens" aria-labelledby="gallery-title">
    <div className="b-wrap"><p className="b-eyebrow">The real app</p><h2 id="gallery-title">Every screen, <em>as it ships.</em></h2>
      <p className="b-body">Real captures from The Remote on an Android phone. {lease ? 'Drag, scroll or use the arrow keys to turn the row.' : 'Swipe or scroll the row.'}</p></div>
    <div ref={ref} className={`b-gallery-box ${lease ? 'is-live' : ''}`}>
      {lease ? <CircularGallery items={SHOTS.map(([n, text, alt]) => ({ image: `assets/gallery/${n}-720.webp`, text, alt }))} bend={2} textColor="#eeeee6" borderRadius={.06} scrollEase={.05} autoScroll={0} openOnClick={false} font="500 16px Outfit, system-ui, sans-serif" dpr={1.5} className="b-circular" />
        : <ul className="b-shot-row">{SHOTS.map(([n, text, alt]) => <li key={n}><figure><div className="b-phone-shell"><img src={`assets/gallery/${n}-720.webp`} alt={alt} width="720" height="1560" loading="lazy" decoding="async" /></div><figcaption>{text}</figcaption></figure></li>)}</ul>}
    </div>
  </section>;
}
// 7 · Proof band: facts that spring in once (70 ms stagger) + the live counter, unchanged. No other numbers.
const FACTS = ['Free', 'No ads', 'No account', 'Android 8.0 or later', 'Same home Wi-Fi', 'Android\u00a0TV and Google\u00a0TV'];
export function Proof() {
  const ref = useRef(null), seen = useInView(ref, { threshold: .3 }), [shown, setShown] = useState(false), { motion } = useEnvironment();
  useEffect(() => { if (seen) setShown(true); }, [seen]);
  return <section className="b-section b-proof" aria-labelledby="proof-title"><div className="b-wrap b-proof-grid">
    <div><p className="b-eyebrow">Straight facts</p><h2 id="proof-title">No catch. <em>Just a remote.</em></h2><div className="b-count-slot"><DownloadCount className="proof-count" /></div></div>
    <ul ref={ref} className={`b-facts ${shown || !motion ? 'is-in' : ''}`}>{FACTS.map((f, i) => <li key={f} style={{ transitionDelay: `${i * 70}ms` }}><span className="b-fact-dot" aria-hidden="true" />{f}</li>)}</ul>
  </div></section>;
}
// 8 · Typographic split: compatibility + privacy, a 1 px lime line draws once (phone -> home Wi-Fi -> TV, no cloud).
export function TypeSplit() {
  const ref = useRef(null), seen = useInView(ref, { threshold: .4 }), [drawn, setDrawn] = useState(false);
  useEffect(() => { if (seen) setDrawn(true); }, [seen]);
  return <section ref={ref} className={`b-section b-split ${drawn ? 'is-drawn' : ''}`} id="compatibility" aria-labelledby="compatibility-title"><div className="b-wrap b-split-grid">
    <div><p className="b-eyebrow">Will it work?</p><h2 id="compatibility-title">Works with Android{'\u00a0'}TV <em>and Google{'\u00a0'}TV.</em></h2>
      <div className="b-line" aria-hidden="true"><span className="b-node is-lime">Phone</span><svg viewBox="0 0 100 2" preserveAspectRatio="none"><line x1="0" y1="1" x2="100" y2="1" /></svg><span className="b-node">Home Wi-Fi</span><svg viewBox="0 0 100 2" preserveAspectRatio="none"><line x1="0" y1="1" x2="100" y2="1" /></svg><span className="b-node">Living Room TV</span></div></div>
    <div className="b-split-copy"><p className="b-body">The Remote works with Android{'\u00a0'}TV and Google{'\u00a0'}TV devices that support Android{'\u00a0'}TV Remote Service v2. Your phone needs Android 8.0 or later. There&rsquo;s no iPhone version.</p>
      <p className="b-body">Your phone and TV pair over your home Wi-Fi. Available controls vary by TV model and firmware. YouTube search and links depend on the TV&rsquo;s YouTube version.</p>
      <p className="b-small">Remote commands go to your paired TV over the local network, without a developer cloud relay. The Remote doesn&rsquo;t keep a search history.</p>
      <a className="b-link" href="privacy/">How your data is handled ↗</a></div>
  </div></section>;
}
// 9 · Lime close band with the room still. CTA, QR and fine print as today.
export function Closing() {
  return <section className="closing-section b-closing"><div className="b-wrap b-closing-grid"><div><p className="b-eyebrow">Ready when you are</p><h2>A better remote. Already in your pocket.</h2><div className="b-closing-cta"><DownloadLink button="footer" /></div><QrHint spot="closing" /><p className="fine-print">Free Android APK. No ads. No account.</p></div>
    <figure className="b-closing-still"><img src="assets/b/hero-placeholder-960.webp" width="960" height="540" loading="lazy" decoding="async" alt="The illustrated living room again: the phone with The Remote in front of the drawn TV." /></figure></div></section>;
}
export const TRADEMARK = 'YouTube is a trademark of Google LLC. The Remote is not affiliated with or endorsed by Google or YouTube.';
