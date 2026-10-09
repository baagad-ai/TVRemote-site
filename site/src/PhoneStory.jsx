import { useEffect, useRef, useState } from 'react';
import SplitText from './components/SplitText';
import { useEnvironment } from './environment';
import { DownloadLink } from './Download';
import QrHint from './QrHint';

const shots = [
  ['assets/showcase/remote-home.png', 'The Remote on an Android phone: Living Room TV connected, with a D-pad, volume keys and a Search YouTube button.', 'App screen · Living Room TV'],
  ['assets/showcase/youtube-share.png', "The Remote's share sheet after sharing a YouTube video: the link, Living Room TV in Living room selected, and an Open on Living room button. Nothing plays until you confirm.", 'Review the link. Choose its TV.'],
  ['assets/showcase/your-tvs.png', 'The Your TVs list in The Remote: one TV, Living Room TV, labeled with its room.', 'Your TV, named by its room.']
];
export function NativePhone({ shot = 0, className = '', priority = false, annotation }) {
  const [src, alt, caption, height = 2340] = Array.isArray(shot) ? shot : shots[shot];
  return <figure className={`native-phone ${className}`}><div className="native-phone-shell"><img src={src} alt={alt} width="1080" height={height} loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : 'auto'} />{annotation !== undefined && <span className={`phone-annotation annotation-${annotation}`} aria-hidden="true" />}</div><figcaption>{caption}</figcaption></figure>;
}
export function StoryCta() { return <DownloadLink button="hero" />; }
function LinkJourney({ ready, step, setStep }) {
  const names = ['Check the link', 'Choose its TV', 'Open when ready'];
  return <div className="link-journey"><div className="journey-rail" role="group" aria-label="Explore the share review preview">{names.map((name, i) => <button key={name} disabled={!ready} type="button" aria-pressed={step === i} onClick={() => setStep(i)}><span className="journey-number">0{i + 1}</span><span>{name}</span></button>)}</div><div className="journey-progress" aria-hidden="true"><span style={{ width: `${(step + 1) / 3 * 100}%` }} /></div><p className="journey-status" role="status">{['Review the shared YouTube link before sending.', 'Check its TV destination. You can choose another saved TV.', 'Open sends the request. Playback still needs TV confirmation.'][step]}</p><p className="fine-print">Choose a step to highlight it in the preview. No link is sent.</p></div>;
}
export default function PhoneStory({ Destination, heroOnly = false }) {
  const { ready, motion } = useEnvironment(), root = useRef(null), [active, setActive] = useState(0), [room, setRoom] = useState('living'), [shareStep, setShareStep] = useState(0);
  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const chapters = [...root.current.querySelectorAll('[data-chapter]')];
      const line = innerHeight * .43;
      const current = chapters.findIndex(node => { const r = node.getBoundingClientRect(); return r.top <= line && r.bottom > line; });
      if (current >= 0) setActive(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule); update();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [ready]);
  return <div ref={root} className={`phone-story chapter-${active} ${ready ? 'story-ready' : ''} ${heroOnly ? 'hero-only' : ''}`}>
    <div className="story-grid page-width">
      <div className="story-chapters">
        <section className="story-chapter hero" id="search-proof" data-chapter="0" aria-labelledby="hero-title">
          <div className="chapter-copy"><div className="hero-heading"><p className="eyebrow"><span className="status-dot" />The phone remote for Android TV + Google TV</p><SplitText id="hero-title" tag="h1" text="Skip the TV keyboard on YouTube." className="hero-title" textAlign="left" splitType="words" enabled={motion} delay={70} duration={.75} from={{ opacity: 1, y: 20 }} to={{ opacity: 1, y: 0 }} rootMargin="0px" /><p className="hero-lede">Search YouTube on your phone.<br />Watch it on your TV.</p></div><div className="hero-followthrough"><p className="chapter-description">A full keyboard for YouTube searches. A quick way to share a link. Your TVs, organized by room.</p><div className="hero-actions"><StoryCta /><QrHint spot="hero" /><a className="text-link" href="#share-story">See how it works <span aria-hidden="true">↓</span></a></div><p className="hero-note">Free Android APK. No ads. No account.</p><a className="chapter-guide text-link" href="guides/search-youtube-tv-android-phone/">How YouTube search works ↗</a><p className="fine-print chapter-limit">Search support depends on your TV and its YouTube version.</p></div></div>
          <NativePhone className="inline-proof" priority />
        </section>
        {!heroOnly && <><section className="story-chapter share-section" id="share-story" data-chapter="1" aria-labelledby="share-title">
          <div className="chapter-copy"><p className="eyebrow">02 / From finding to sharing</p><h2 id="share-title">Found a good one?<br /><em>Pass it over.</em></h2><p className="chapter-description">Share a YouTube link with The Remote. Review it, choose your TV, then send it over.</p><LinkJourney ready={ready} step={shareStep} setStep={setShareStep} /><a className="chapter-guide text-link" href="guides/open-youtube-link-on-android-tv/">A closer look at sharing ↗</a></div>
          <NativePhone shot={1} className="inline-proof" annotation={shareStep} />
        </section>
        <section className="story-chapter room-section" id="inside" data-chapter="2" aria-labelledby="rooms-title">
          <div className="chapter-copy"><p className="eyebrow">03 / Give it a destination</p><h2 id="rooms-title">The right TV.<br /><em>The right room.</em></h2><p className="chapter-description">Give each saved TV a name and room. Pick the living-room screen without guessing which one is which.</p><div className="room-picker" role="group" aria-label="Choose an illustrated room">{[['living', 'Living room'], ['bedroom', 'Bedroom']].map(([id, name]) => <button key={id} disabled={!ready} type="button" aria-pressed={room === id} onClick={() => setRoom(id)}><span className="room-dot" aria-hidden="true" />{name}<span className="selection-mark" aria-hidden="true">{room === id ? "✓" : "○"}</span></button>)}</div><p className="room-status" role="status">{room === 'living' ? 'Living room' : 'Bedroom'} selected in this preview.</p>{Destination && <Destination room={room} />}<p className="fine-print">The room scene is an illustration.</p></div>
          <NativePhone shot={2} className="inline-proof" />
        </section>
      </>}</div>
      {!heroOnly && <div className="story-proof" aria-hidden="true"><div className="story-proof-sticky"><p className="proof-label"><span>APP PREVIEW</span><span>0{active + 1} / 03</span></p><div className="proof-phone-track">{shots.map((shot, i) => <div className={`proof-phone ${active === i ? 'is-active' : ''}`} key={shot[0]}><NativePhone shot={i} priority={i === 0} annotation={i === 1 ? shareStep : undefined} /></div>)}</div><p className="proof-native-caption"><span className="status-dot" />{shots[active][2]}</p></div></div>}
    </div><div className="story-spec page-width"><span>Android TV + Google TV</span><span>Pairs on your home network</span><span>Free. No ads. No account.</span><a href="#compatibility">Check your TV ↗</a></div>
  </div>;
}
export function ControlsProof() {
  const { ready } = useEnvironment(), [view, setView] = useState('remote');
  const screens = { remote: ['Remote', ['assets/showcase/remote-home.png', 'The remote for Living Room TV: D-pad, OK, Back, Home, Play and volume, with a Search YouTube button.', 'YouTube, close to hand.']], search: ['Search', ['assets/showcase/youtube-search.png', 'The YouTube search sheet for Living Room TV, with a search typed on the phone keyboard.', 'Search YouTube from your phone.']] };
  return <section className="controls-proof page-width" aria-labelledby="controls-title"><div className="controls-copy"><p className="eyebrow">And the everyday controls</p><h2 id="controls-title">All within<br /><em>thumb’s reach.</em></h2><p>Navigation, volume and YouTube actions on one screen. Switch to Search to type a YouTube search on your phone keyboard.</p><div className="app-picker" role="group" aria-label="Choose an app screen">{Object.entries(screens).map(([id, [label]]) => <button key={id} type="button" disabled={!ready} aria-pressed={view === id} onClick={() => setView(id)}>{label}<span className="selection-mark" aria-hidden="true">{view === id ? "✓" : "○"}</span></button>)}</div><p className="fine-print">App previews. Available controls vary by TV.</p><details className="tv-detail-proof"><summary>Make the names your own</summary><p>Name your TV and pick its room when you pair it.</p><NativePhone className="pair-detail-phone" shot={['assets/showcase/pair-name-and-room.png', 'Pairing a TV in The Remote: the name Living Room TV, with the Living room chip selected.', 'Give your TV a name and room.', 1420]} /></details></div><NativePhone shot={screens[view][1]} className="control-phone" /></section>;
}
