// <GuestCard i={0|1|2} />: code-drawn guest screens for the Guests scroll stack (board §5).
// 0 = Invite a guest (QR + code), 1 = the guest's own phone with the full remote, 2 = your guest list. Generic names only.
import { Phone, INK, W, H } from './ui.jsx';
import { InviteScreen, GuestRemote, GuestList } from './screens.jsx';
const CARDS = [[InviteScreen, 'Invite a guest: a QR code and a short code for their phone.'], [GuestRemote, 'A guest phone with the full remote for Living Room TV.'], [GuestList, 'Your guest list for Living Room TV: remove a guest any time.']];
// frame: draw the bezel (default). frame={false}: the 1080:2340 screen only, for a slot that draws its own .b-frame.
export default function GuestCard({ i = 0, frame = true, className = '' }) {
  const [Screen, label] = CARDS[i] || CARDS[0], vb = frame ? '0 0 376 796' : `0 0 ${W} ${H}`;
  return <div className={`guest-card-phone ${className}`.trim()} style={{ aspectRatio: frame ? '376 / 796' : `${W} / ${H}` }}><svg viewBox={vb} width="100%" height="100%" role="img" aria-label={label} style={{ display: 'block' }}>
    {frame ? <Phone width={376} height={796}><Screen /></Phone> : <><rect width={W} height={H} fill={INK} /><Screen /></>}</svg></div>;
}
