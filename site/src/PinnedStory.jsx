// Variant B (preview only): a pinned phone that plays the launch-film beats as you scroll.
// Real app screens only (Living Room TV in Living room). Without JS, on narrow or short
// screens, and with reduced motion it is a plain list of beats with no pinning.
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEnvironment } from './environment';
import { StoryCta } from './PhoneStory';

gsap.registerPlugin(ScrollTrigger);

const PIN = '(min-width: 741px) and (min-height: 700px)';
// Same curve as the film's shared-element push, as a GSAP ease function.
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t, dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => { let t = x; for (let i = 0; i < 6; i++) { const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= (sx(t) - x) / d; } return sy(Math.min(1, Math.max(0, t))); };
}
const push = bezier(0.65, 0, 0.35, 1);

const beats = [
  { id: 'share-story', eyebrow: '01 / Type it on your phone', title: <>Search YouTube<br /><em>from your phone.</em></>, text: 'Type the search on your phone keyboard. The results open on your TV.', shot: ['assets/showcase/youtube-search.png', 'The YouTube search sheet for Living Room TV, with lofi beats typed on the phone keyboard.', 2340] },
  { eyebrow: '02 / Pass it over', title: <>Share a link.<br /><em>It plays on the TV.</em></>, text: 'Share a YouTube link to The Remote, check it, and open it on Living Room TV.', shot: ['assets/showcase/youtube-share.png', "The Remote's share sheet: a YouTube link, Living Room TV in Living room selected, and an Open on Living room button.", 2340] },
  { eyebrow: '03 / Your TVs', title: <>Your TV,<br /><em>named by you.</em></>, text: 'Your saved TVs sit in one list, each with its room.', shot: ['assets/showcase/your-tvs.png', 'The Your TVs list in The Remote: Living Room TV, in Living room, connected.', 2340] },
  { id: 'inside', eyebrow: '04 / Give it a room', title: <>Your TVs,<br /><em>by room.</em></>, text: 'Name the TV and pick its room when you pair it.', shot: ['assets/showcase/pair-rooms.png', 'Pairing a TV in The Remote: the name Living Room TV, with the Living room room chip selected next to Bedroom.', 560] }
];

// After Open: the sheet is gone and the remote shows Living Room TV.
const afterShare = ['assets/showcase/remote-home.png', '', 2340];

function Shot({ shot, eager }) {
  const [src, alt, height] = shot;
  return <img src={src} alt={alt} width="1080" height={height} loading={eager ? 'eager' : 'lazy'} decoding="async" />;
}

export default function PinnedStory() {
  const { ready, motion } = useEnvironment(), root = useRef(null), [pinned, setPinned] = useState(false), [active, setActive] = useState(0);
  useEffect(() => {
    if (!ready) return;
    const wide = matchMedia(PIN), update = () => setPinned(motion && wide.matches);
    update(); wide.addEventListener('change', update);
    return () => wide.removeEventListener('change', update);
  }, [ready, motion]);
  useEffect(() => {
    if (!pinned) return;
    const el = root.current, q = s => el.querySelectorAll(s);
    const copies = q('.pin-copy'), screens = q('.pin-screen'), card = el.querySelector('.pin-room-card'), check = el.querySelector('.pin-check'), sheet = el.querySelector('.pin-sheet');
    const tl = gsap.timeline({ defaults: { ease: push, duration: 1 }, scrollTrigger: { trigger: el.querySelector('.pin-track'), start: 'top top', end: 'bottom bottom', scrub: 0.4, onUpdate: self => setActive(Math.min(3, Math.floor(self.progress * 4 + 0.08))) } });
    gsap.set([...copies].slice(1), { autoAlpha: 0, y: 28 }); gsap.set([...screens].slice(1), { autoAlpha: 0, yPercent: 8, scale: 0.96 });
    gsap.set(card, { autoAlpha: 0, yPercent: 40, scale: 0.9 }); gsap.set(check, { autoAlpha: 0, scale: 0 });
    const swap = (i, at) => {
      tl.to(copies[i], { autoAlpha: 0, y: -28, duration: 0.6 }, at).to(copies[i + 1], { autoAlpha: 1, y: 0, duration: 0.6 }, at + 0.35);
      if (screens[i + 1]) tl.to(screens[i], { autoAlpha: 0, scale: 0.94, yPercent: -4 }, at).to(screens[i + 1], { autoAlpha: 1, scale: 1, yPercent: 0 }, at + 0.1);
    };
    tl.to({}, { duration: 0.8 }, 0); // read the first beat
    swap(0, 0.8);
    // Commit on the share beat: the sheet slides away to the remote, then a springy check, 0 → 110 → 100 %.
    tl.to(sheet, { yPercent: 24, autoAlpha: 0, duration: 0.5 }, 1.85);
    tl.to(check, { autoAlpha: 1, scale: 1, ease: 'back.out(2.2)', duration: 0.45 }, 2.4);
    tl.to(check, { autoAlpha: 0, scale: 0.9, duration: 0.3 }, 3.0);
    swap(1, 3.0);
    // Rooms: the list steps back and the room picker pushes forward as a shared card.
    tl.to(screens[2], { scale: 0.9, filter: 'brightness(.45) blur(2px)' }, 4.9).to(card, { autoAlpha: 1, yPercent: 0, scale: 1 }, 4.9);
    tl.to(copies[2], { autoAlpha: 0, y: -28, duration: 0.6 }, 4.9).to(copies[3], { autoAlpha: 1, y: 0, duration: 0.6 }, 5.25);
    tl.to({}, { duration: 0.8 }, 6.0);
    return () => { tl.scrollTrigger?.kill(); tl.kill(); gsap.set([...copies, ...screens, card, check, sheet], { clearProps: 'all' }); setActive(0); };
  }, [pinned]);
  return <section ref={root} className={`pin-story ${pinned ? 'is-pinned' : ''}`} aria-label="How The Remote works">
    {pinned && beats.map((b, i) => b.id && <span key={b.id} id={b.id} className={`pin-anchor pin-anchor-${i}`} />)}
    <div className="pin-track">
      <div className="pin-stage page-width">
        <div className="pin-copies">
          {beats.map((b, i) => <div className="pin-beat" key={i} id={pinned ? undefined : b.id}>
            <div className="pin-copy" aria-hidden={pinned && active !== i ? true : undefined}><p className="eyebrow">{b.eyebrow}</p><h2>{b.title}</h2><p className="pin-text">{b.text}</p>{i === 3 && <div className="pin-actions"><StoryCta /></div>}</div>
            {!pinned && <figure className={`pin-static-phone ${i === 3 ? 'is-card' : ''}`}><Shot shot={b.shot} /></figure>}
          </div>)}
        </div>
        {pinned && <div className="pin-phone" aria-hidden="true">
          <div className="pin-phone-shell">{beats.slice(0, 3).map((b, i) => <div className="pin-screen" key={i}>{i === 1
              ? <><div className="pin-layer"><Shot shot={afterShare} /></div><div className="pin-layer pin-sheet"><Shot shot={b.shot} /></div></>
              : <Shot shot={b.shot} eager={i === 0} />}</div>)}
            <div className="pin-check"><span>✓</span>Sent to Living Room TV</div>
          </div>
          <div className="pin-room-card"><Shot shot={beats[3].shot} eager /></div>
          <p className="pin-progress"><span>0{active + 1}</span> / 04</p>
        </div>}
      </div>
    </div>
  </section>;
}
