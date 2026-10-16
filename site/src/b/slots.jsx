// Design's live phone components for Concept B (drop-in for site/src/b/slots.jsx; same exports and props as the stub).
// Setup: copy /workspace/site-fix-1016/phone-components/src/ to site/src/b/phone/ (8 files, no assets), then replace
// site/src/b/slots.jsx with this file. Nothing else changes: PinStory keeps <PhoneLoop name="typing" step={k} /> and
// phoneScreenUrl('typing', i); the CSS (.b-frame .b-phoneloop .b-phoneloop-screen) is Marketing's, unchanged.
//   <PhoneLoop name="typing|trackpad|invite" step={0..2}? playing={bool}? tv? />
//     no step: the 10.00 s loop (runs only in view, tab visible, motion allowed; playing={false} holds the still).
//     step (typing): the pin's scroll-driven state, no timeline: 0 search typed, 1 sent (results on TV), 2 share sheet.
//     tv: also draw the TV on the same timeline (wide 1104:796 box, for a slot without its own TV; off by default).
//   <GuestCard i={0|1|2} />   0 invite (QR + code), 1 guest remote, 2 your guest list. Static, generic names.
//   phoneScreenSvg(name, step) / phoneScreenUrl(name, step): standalone 540 x 1170 SVG string / data URL.
// No analytics: loop_play's allow-list (hero, pin, rooms_*) has no key for these loops, so none is sent.
import Loop, { phoneScreenSvg, phoneScreenUrl } from './phone/PhoneLoop.jsx';
import Card from './phone/GuestCard.jsx';
export { phoneScreenSvg, phoneScreenUrl };
export function PhoneLoop({ name = 'typing', step, playing, tv = false, className = '', t }) { // t: optional external clock (Marketing, §3)
  return <div className={`b-frame b-phoneloop ${className}`.trim()} data-slot={`phone-loop:${name}`} data-step={step}>
    <div className="b-phoneloop-screen" style={tv ? { aspectRatio: '1104/796', borderRadius: 0, background: 'none' } : undefined}><Loop name={name} step={step} playing={playing} tv={tv} t={t} /></div>
  </div>;
}
export function GuestCard({ i = 0 }) {
  return <div className="b-frame b-phoneloop b-guestcard" data-slot={`guest-card:${i}`}>
    <div className="b-phoneloop-screen"><Card i={i} frame={false} /></div>
  </div>;
}
