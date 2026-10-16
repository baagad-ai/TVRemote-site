import { NativePhone } from './PhoneStory';
import { slot, SLOTS } from './slots';

// Landing section for the trackpad: copy next to the pad capture and Design's 2×4 gesture SVG.
// When trackpad-pad.png is present: large pad + SVG side by side (desktop) / stacked (mobile);
// the text gesture grid stays visually-hidden for screen readers. When the pad is missing: SVG
// only (same visually-hidden grid). Never app mocks here. Alt text from Design's FRAME-CHECK.md.
// trackpad-gestures-screen was dropped permanently.
const artAlt = 'Trackpad gestures: tap for OK, swipe to move one step, long press for Long OK, two-finger tap for Back, two-finger swipe left or right to skip back or forward, three-finger tap for Play/Pause, three-finger swipe up for Home.';
const gestures = [
  ['Tap', 'OK'],
  ['Swipe', 'One step that way. Swipe and hold still to keep moving.'],
  ['Long press', 'Long OK'],
  ['Two-finger tap', 'Back. Your phone’s back gesture works too.'],
  ['Two-finger swipe left', 'Skip back (varies by app)'],
  ['Two-finger swipe right', 'Skip forward (varies by app)'],
  ['Three-finger tap', 'Play/Pause'],
  ['Three-finger swipe up', 'Home']
];
export default function TrackpadSection() {
  const pad = slot(SLOTS.trackpad), art = slot(SLOTS.trackpadIllustration);
  const hasVisual = !!(pad || art);
  return <div className="feature-band"><section className={`feature-section trackpad-section page-width ${hasVisual ? 'has-visual' : ''}`} id="trackpad" aria-labelledby="trackpad-title">
    <div className="feature-copy">
      <p className="eyebrow">Trackpad</p><h2 id="trackpad-title">Swipe and tap. <br /><em>Eyes on the TV.</em></h2>
      <p className="feature-lede">Open the trackpad and your whole phone screen becomes a pad for the TV, over the same connection as the remote.</p>
      <ul className={`gesture-grid${art || pad ? " visually-hidden" : ""}`}>{gestures.map(([gesture, action]) => <li key={gesture}><strong>{gesture}</strong><span>{action}</span></li>)}</ul>
      <p className="fine-print">Your phone’s volume keys control the TV while the pad is open. One Exit button in the corner takes you back to the buttons. Help and remapping are on the Gestures screen. Power is never a gesture. Available controls vary by TV. Skip back and forward vary by app.</p>
      <a className="text-link" href="guides/tv-remote-app-trackpad-gestures/">Every trackpad gesture ↗</a>
    </div>
    {hasVisual && <div className={`trackpad-visual${pad && art ? ' has-pad-art' : ''}`}>
      {pad && <NativePhone shot={[pad.src, 'The trackpad in The Remote, connected to Living Room TV, with the Exit button in the corner.', null, pad.height]} className="trackpad-pad-phone" />}
      {art && <figure className="feature-illustration" role="img" aria-label={artAlt}><img src={art.src} alt={artAlt} width={art.height.width} height={art.height.height} loading="lazy" decoding="async" /></figure>}
    </div>}
  </section></div>;
}
