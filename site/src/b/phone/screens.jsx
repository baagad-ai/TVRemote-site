// Static drawn screens: guest invite (also animated by PhoneLoop "invite"), guest remote, guest list, and the gallery set.
// Copy is the app's own (EnglishFallback strings) or the board's; device names are generic ("My phone", "Guest phone").
import { INK, PANEL, LINE, LIME, PAPER, W, HEAD, Tx, Muted, Card, I, Lit, PressLime, StatusBar, NavBar, RemoteHome, Keyboard, SearchSheet } from './ui.jsx';
import { QR_N, QR_PATH } from './qr.js';
const Head = ({ title, sub }) => <><StatusBar /><circle cx="40" cy="44" r="20" fill="none" stroke={LINE} /><I n="back" x={40} y={44} s={.85} /><Tx x={74} y={52} s={20} w={600} f={HEAD}>{title}</Tx>{sub && <Muted x={18} y={88} s={10.5}>{sub}</Muted>}</>;
const Btn = ({ x, y, w, h = 46, lime, children, s = 12.5 }) => <><rect x={x} y={y} width={w} height={h} rx={h / 2} fill={lime ? LIME : 'none'} stroke={lime ? 'none' : LINE} /><Tx x={x + w / 2} y={y + h / 2 + 4.5} s={s} w={600} c={lime ? INK : PAPER} a="middle">{children}</Tx></>;
export function InviteScreen({ copyLit = 0, copied = 0, joined = 0, doneLit = 0, spin = 0 }) {
  const q = 172 / (QR_N + 2);
  return <g>
    <Head title="Invite a guest" sub="Living Room TV · Living room" />
    <rect x="18" y="108" width="324" height="46" rx="6" fill="none" stroke={PAPER} strokeOpacity=".6" /><rect x="26" y="102" width="138" height="12" fill={INK} /><Muted x={30} y={111} s={9.5}>Your name (shown to guests)</Muted><Tx x={32} y={136} s={12.5}>My phone</Tx>
    <Tx x={18} y={180} s={11.5}>On their phone, scan this code with the</Tx><Tx x={18} y={198} s={11.5}>camera, or open The Remote and type it in.</Tx>
    <Card x={18} y={214} w={324} h={252} r={18} />
    <rect x="94" y="226" width="172" height="172" rx="6" fill={PAPER} /><path d={QR_PATH} fill={INK} transform={`translate(${94 + q} ${226 + q}) scale(${q})`} />
    <Tx x={180} y={445} s={24} w={700} a="middle" f={HEAD} letterSpacing=".02em">WD6-3GZ</Tx>
    <Btn x={18} y={479} w={158}>Share link</Btn><Btn x={184} y={479} w={158}>Copy code</Btn><Lit k={copyLit} x={184} y={479} w={158} h={46} r={23} />
    <Card x={18} y={536} w={324} h={54} r={16} />
    <g opacity={1 - joined}><g transform={`translate(45 563) rotate(${spin})`}><circle r="10" fill="none" stroke={LINE} strokeWidth="2.5" /><path d="M0-10a10 10 0 0110 10" fill="none" stroke={LIME} strokeWidth="2.5" strokeLinecap="round" /></g><Tx x={70} y={568} s={13} w={500}>Waiting for guest…</Tx></g>
    {joined > 0 && <g opacity={joined}><circle cx="45" cy="563" r="12" fill={LIME} /><I n="check" x={45} y={563} s={.75} c={INK} w={2.2} /><Tx x={70} y={568} s={13} w={600}>Guest phone joined</Tx></g>}
    <Btn x={18} y={602} w={324} h={48} lime s={14}>Done</Btn><PressLime k={doneLit} x={18} y={602} w={324} h={48} />
    {copied > 0 && <g opacity={copied}><rect x="110" y="668" width="140" height="34" rx="17" fill={PANEL} stroke={LIME} /><Tx x={180} y={689} s={11.5} a="middle">Code copied</Tx></g>}
    <NavBar />
  </g>;
}
const GuestRow = ({ y, h, name, lines }) => <><Card x={18} y={y} w={324} h={h} r={16} /><Tx x={32} y={y + 25} s={13.5} w={600}>{name}</Tx>
  {lines.map((l, i) => l.dot ? <g key={i}><circle cx="35" cy={y + 42 + i * 17} r="2.6" fill={LIME} /><Muted x={42} y={y + 46 + i * 17} s={10}>{l.t}</Muted></g> : <Muted key={i} x={32} y={y + 46 + i * 17} s={10}>{l.t}</Muted>)}
  <rect x="234" y={y + (h - 40) / 2} width="94" height="40" rx="20" fill="none" stroke={PAPER} strokeOpacity=".7" /><Tx x={281} y={y + h / 2 + 4.5} s={11.5} w={600} a="middle">Remove</Tx></>;
export function GuestList({ inviteLit = 0 }) {
  return <g>
    <Head title="Living Room TV" sub="Living room · Android TV" />
    <Tx x={18} y={114} s={13.5} w={600}>Guests</Tx><Muted x={18} y={136} s={10.5}>Friends on their own phones. No TV code needed. Up</Muted><Muted x={18} y={152} s={10.5}>to 10.</Muted>
    <GuestRow y={170} h={68} name="Guest phone" lines={[{ t: 'Connected', dot: 1 }]} />
    <GuestRow y={250} h={100} name="Guest phone 2" lines={[{ t: 'Away 5 days' }, { t: 'Auto-removes after 7 days away' }]} />
    <Muted x={18} y={372} s={10.5}>2 of 10 guests</Muted>
    <Btn x={18} y={386} w={324} h={48} lime s={14}>Invite a guest</Btn><PressLime k={inviteLit} x={18} y={386} w={324} h={48} />
    <path d="M18 448h324" stroke={LINE} /><Muted x={18} y={468} s={10} letterSpacing=".08em" w={600}>PRIMARY REMOTES</Muted><Muted x={18} y={492} s={10.5}>Phones paired with the TV's code. Full control.</Muted>
    <Card x={18} y={510} w={324} h={64} r={16} /><Tx x={32} y={536} s={13.5} w={600}>This phone</Tx><circle cx="35" cy="552" r="2.6" fill={LIME} /><Muted x={42} y={556} s={10}>My phone · Connected</Muted>
    {['Remove works in The Remote. The TV keeps trusting', 'guests until its paired devices are cleared, and', 'clearing them also unpairs every primary remote.'].map((l, i) => <Muted key={i} x={18} y={598 + i * 17} s={10.5}>{l}</Muted>)}
    <NavBar />
  </g>;
}
export const GuestRemote = () => <RemoteHome guest />;
const Dim = () => <><RemoteHome /><rect width={W} height="780" fill={INK} opacity=".55" /></>;
export const SearchScreen = () => <><Dim /><SearchSheet text="lofi beats" caret={0} /><Keyboard /></>;
export function ShareScreen() {
  return <><Dim /><rect x="0" y="420" width={W} height="362" rx="22" fill={PANEL} /><rect x="160" y="429" width="40" height="4" rx="2" fill={LINE} />
    <I n="share" x={22} y={447} s={.55} o={.7} /><Muted x={32} y={451} s={9.5}>Shared to The Remote</Muted>
    <Tx x={14} y={481} s={17} w={600} f={HEAD}>Open YouTube video?</Tx>
    <Card x={14} y={496} w={332} h={52} r={14} fill={INK} /><I n="link" x={36} y={522} s={.85} /><Tx x={56} y={518} s={12} w={600}>youtube.com/watch?v=…</Tx><Muted x={56} y={535} s={9.5}>YouTube link</Muted>
    <Muted x={14} y={570} s={10.5}>Choose a TV. Nothing sends until you confirm.</Muted>
    <Card x={14} y={584} w={332} h={58} r={14} fill={LIME} fillOpacity=".1" stroke={LIME} /><circle cx="35" cy="613" r="8" fill="none" stroke={LIME} strokeWidth="2" /><circle cx="35" cy="613" r="4" fill={LIME} />
    <Tx x={52} y={610} s={12.5} w={600} c={LIME}>Living Room TV</Tx><Muted x={52} y={625} s={9.5}>Living room · Connected</Muted><I n="tv" x={322} y={613} s={.8} c={LIME} />
    <Muted x={14} y={661} s={10.5}>TV still needs to confirm playback.</Muted>
    <Btn x={14} y={676} w={98} h={46}>Discard</Btn><rect x="120" y="676" width="226" height="46" rx="23" fill={LIME} /><path d="M159 692v14l11-7z" fill={INK} /><Tx x={242} y={703} s={12.5} w={600} c={INK} a="middle">Open on Living room</Tx>
    <NavBar /></>;
}
export function YourTVsScreen() {
  return <><Dim /><rect x="0" y="412" width={W} height="370" rx="22" fill={PANEL} /><rect x="160" y="421" width="40" height="4" rx="2" fill={LINE} />
    <Tx x={14} y={456} s={16} w={600} f={HEAD}>Your TVs</Tx><rect x="257" y="436" width="88" height="30" rx="15" fill="none" stroke={LINE} /><I n="pencil" x={274} y={451} s={.6} /><Tx x={309} y={455} s={11.5} a="middle">Manage</Tx>
    <Card x={14} y={480} w={332} h={56} r={14} fill={LIME} fillOpacity=".1" stroke={LIME} /><I n="tv" x={36} y={508} s={.85} c={LIME} /><Tx x={56} y={505} s={12.5} w={600}>Living Room TV</Tx><Muted x={56} y={521} s={9.5}>Living room · Connected</Muted><I n="check" x={300} y={508} s={.75} c={LIME} /><I n="dots" x={330} y={508} s={.7} />
    <rect x="14" y="546" width="332" height="44" rx="14" fill="none" stroke={LINE} strokeDasharray="5 4" /><I n="plus" x={150} y={568} s={.6} /><Tx x={188} y={572} s={12} w={600} a="middle">Add a TV</Tx>
    <Muted x={14} y={614} s={9.5} w={600} letterSpacing=".08em">MODES</Muted>
    <Card x={14} y={626} w={161} h={96} r={14} /><I n="sofa" x={32} y={646} s={.75} c={LIME} /><rect x="120" y="636" width="42" height="24" rx="12" fill={LINE} /><circle cx="133" cy="648" r="8" fill={PAPER} fillOpacity=".7" />
    <Tx x={26} y={679} s={12.5} w={600}>Couch mode</Tx><Muted x={26} y={696} s={9.5}>Dim phone, touch guard,</Muted><Muted x={26} y={710} s={9.5}>keep awake</Muted>
    <Card x={185} y={626} w={161} h={96} r={14} /><I n="people" x={203} y={646} s={.75} c={LIME} /><I n="chev" x={333} y={646} s={.6} />
    <Tx x={197} y={679} s={12.5} w={600}>Guest access</Tx><Muted x={197} y={696} s={9.5}>Invite friends or join with a</Muted><Muted x={197} y={710} s={9.5}>code</Muted>
    <NavBar /></>;
}
export function PairScreen() {
  return <><StatusBar /><I n="back" x={28} y={46} s={.95} /><Tx x={53} y={53} s={19} w={600} f={HEAD}>Pair your TV</Tx>
    <Tx x={18} y={82} s={11} w={600}>Code on the TV screen</Tx><Tx x={342} y={82} s={10.5} w={600} c={LIME} a="end">6 / 6</Tx>
    <rect x="18" y="91" width="324" height="58" rx="14" fill={INK} stroke={LIME} strokeWidth="1.6" /><Tx x={180} y={130} s={27} w={700} a="middle" f={HEAD} letterSpacing=".28em">A3F9C1</Tx>
    {Array.from({ length: 6 }, (_, i) => <rect key={i} x={18 + i * 55} y={156} width="49" height="4" rx="2" fill={LIME} />)}
    <Muted x={18} y={192} s={10.5}>Six characters, 0–9 or A–F.</Muted><Tx x={342} y={192} s={10.5} w={600} c={LIME} a="end">Request a new code</Tx>
    <Tx x={30} y={248} s={11.5} w={600} c={LIME}>Name and room</Tx><I n="up" x={330} y={244} s={.6} c={LIME} />
    <rect x="18" y="287" width="324" height="44" rx="12" fill="none" stroke={LIME} strokeWidth="1.6" /><rect x="26" y="281" width="48" height="12" fill={INK} /><Tx x={30} y={290} s={9.5} c={LIME}>TV name</Tx><Tx x={32} y={314} s={12.5}>Living Room TV</Tx><rect x="121" y="301" width="1.6" height="17" fill={LIME} />
    <Muted x={18} y={350} s={9.5}>Room</Muted>
    {[['sofa', 'Living room', 18, 96, 1], ['bed', 'Bedroom', 122, 86], ['pot', 'Kitchen', 216, 80]].map(([n, l, x, w, on]) => <g key={l}><rect x={x} y={366} width={w} height="31" rx="15.5" fill={on ? LIME : 'none'} fillOpacity={on ? .14 : 0} stroke={on ? LIME : LINE} /><I n={n} x={x + 16} y={381.5} s={.55} c={on ? LIME : PAPER} /><Tx x={x + 29} y={385.5} s={10.5} w={600}>{l}</Tx></g>)}
    <Btn x={18} y={406} w={324} h={48} lime s={12.5}>Pair this TV</Btn>
    <Keyboard sugg={['to', 'TV', 'MTV']} /><NavBar /></>;
}
