import { NativePhone } from './PhoneStory';
import { slot, SLOTS } from './slots';

// Landing section for Guest access: a causal 3-step row (invite → their phone → your list), stacked on
// mobile, no carousel. Real phone captures only, through image slots: a step's phone renders only when
// its file exists in assets/showcase (see src/slots.js); otherwise the step is text-only.
const steps = [
  { label: 'Invite', file: SLOTS.guestsInvite, alt: 'Inviting a guest to Living Room TV from a Primary remote in The Remote.', points: [<>Invites work on your home Wi-Fi only. Unused invite codes expire after 2 minutes and are only used for joining.</>] },
  { label: 'Their phone, full remote', file: SLOTS.guestsGuest, alt: "A guest's own phone with The Remote connected to Living Room TV.", points: [<>Guests get everything on the remote by default: the arrows, media keys, volume, YouTube search, link sharing, Power and the apps list. They can’t rename the TV, change its room, manage guests or unpair it.</>] },
  { label: 'Your list', file: SLOTS.guestsPrimary, alt: 'The Guest access list for Living Room TV on a Primary remote, with an Invite button.', points: [<>Every Primary remote can invite and remove guests. If a phone is away, the list shows Removal pending until both phones are on your Wi-Fi. Guests who stop coming around are removed over time.</>, <><strong>Or just the basics.</strong> You can limit a guest to Media and volume only: play/pause, volume and mute.</>] }
];
export default function GuestsSection() {
  return <section className="feature-section steps-section guests-section page-width" id="guests" aria-labelledby="guests-title">
    <div className="feature-heading"><p className="eyebrow">Friends over</p><h2 id="guests-title">Hand out the remote, <br /><em>not your phone.</em></h2></div>
    <p className="feature-lede">Invite a guest from The Remote on your phone. They join on your home Wi-Fi with a short invite code, then control the TV from their own Android phone, even when yours is put away. They can scan the QR code with their phone's camera or type the code.</p>
    <ol className="guest-steps">{steps.map(({ label, file, alt, points }, i) => { const found = slot(file); return <li key={label} className={`guest-step ${found ? 'has-shot' : ''}`}>
      {found && <NativePhone shot={[found.src, alt, null, found.height]} className="guest-step-phone" />}
      <div className="guest-step-copy"><p className="step-label"><span>Step {i + 1}</span> · {label}</p><ul className="feature-points">{points.map((point, j) => <li key={j}>{point}</li>)}</ul></div>
    </li>; })}</ol>
    <div className="steps-footer"><p className="fine-print">Guests need The Remote on an Android phone (Android 8.0 or later). There’s no iPhone version. Guests join your home Wi-Fi, not a separate guest network.</p><a className="text-link" href="guides/guests-control-google-tv-without-google-account/">How Guest access works ↗</a></div>
  </section>;
}
