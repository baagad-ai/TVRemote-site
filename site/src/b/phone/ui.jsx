// Drawn remote UI (SVG, 360 x 780 screen units = the 1080 x 2340 app capture / 3). Site tokens only.
// Layout, labels and copy follow the real app screens (assets/showcase/*.png) and its strings; names are generic.
export const INK = '#0b0e0d', PANEL = '#151b16', LINE = '#354032', LIME = '#d4fa7b', PAPER = '#eeeee6';
export const W = 360, H = 780, FONT = '"Work Sans", system-ui, sans-serif', HEAD = 'Outfit, "Work Sans", sans-serif';
const S = { fill: 'none', stroke: PAPER, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
export const Tx = ({ x, y, s = 11, w = 400, c = PAPER, o, a, f = FONT, children, ...p }) =>
  <text x={x} y={y} fontSize={s} fontWeight={w} fill={c} fillOpacity={o} textAnchor={a} fontFamily={f} {...p}>{children}</text>;
export const Muted = p => <Tx c={PAPER} o={.68} {...p} />;
export const Card = ({ x, y, w, h, r = 14, fill = PANEL, stroke = LINE, ...p }) => <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={stroke} {...p} />;
// icons, centred at 0,0, about 16 units
const IC = {
  tv: <><rect x="-8" y="-6" width="16" height="11" rx="2" /><path d="M-4 8h8M-3-10l3 4 3-4" /></>,
  hand: <path d="M-6 6c-2-3-3-5-1-6l2 2v-9a1.5 1.5 0 013 0v6-8a1.5 1.5 0 013 0v8-6a1.5 1.5 0 013 0v7c0 4-2 7-6 7-2 0-3-1-4-1zM5-9l3-3M8-6l3-1" />,
  dots: <><circle cx="0" cy="-6" r=".9" /><circle cx="0" cy="0" r=".9" /><circle cx="0" cy="6" r=".9" /></>,
  power: <path d="M0-8v7M-5.5-5a7.5 7.5 0 105.5-2.5M5.5-5A7.5 7.5 0 010-7.5" />,
  gear: <><circle r="3" /><path d="M0-8v2.5M0 5.5V8M-8 0h2.5M5.5 0H8M-5.7-5.7l1.8 1.8M3.9 3.9l1.8 1.8M-5.7 5.7l1.8-1.8M3.9-3.9l1.8-1.8" /><circle r="5.5" /></>,
  grid: <><rect x="-6" y="-6" width="5" height="5" rx="1" /><rect x="1" y="-6" width="5" height="5" rx="1" /><rect x="-6" y="1" width="5" height="5" rx="1" /><rect x="1" y="1" width="5" height="5" rx="1" /></>,
  cc: <><rect x="-7" y="-5" width="14" height="10" rx="2" /><path d="M-2-1.5h-2v3h2M4-1.5H2v3h2" /></>,
  audio: <path d="M-6-2v4h3l4 4V-6l-4 4zM4-3a4 4 0 010 6M6-6a8 8 0 010 12" />,
  keys: <>{[-5, 0, 5].map(x => [-4, 1].map(y => <circle key={x + ' ' + y} cx={x} cy={y} r=".9" />))}</>,
  back: <path d="M7 0H-7M-2-5l-5 5 5 5" />,
  home: <path d="M-7-1L0-7l7 6v8H2V2h-4v5h-5z" />,
  pp: <path d="M-7-6v12l7-6zM3-6v12M7-6v12" />,
  minus: <path d="M-7 0h14" />, plus: <path d="M-7 0h14M0-7v14" />,
  mute: <path d="M-7-2v4h3l4 4V-6l-4 4zM3-3l6 6M9-3l-6 6" />,
  search: <><circle cx="-1.5" cy="-1.5" r="5" /><path d="M2 2l5 5" /></>,
  close: <path d="M-5-5l10 10M5-5L-5 5" />, check: <path d="M-6 0l4 4 8-8" />,
  link: <path d="M-1 3l-2 2a3 3 0 01-4-4l3-3a3 3 0 014 0M1-3l2-2a3 3 0 014 4l-3 3a3 3 0 01-4 0" />,
  share: <><circle cx="-5" cy="0" r="2" /><circle cx="5" cy="-5" r="2" /><circle cx="5" cy="5" r="2" /><path d="M-3-1l6-3M-3 1l6 3" /></>,
  pencil: <path d="M-6 6l1-4 8-8 3 3-8 8zM1-4l3 3" />,
  sofa: <path d="M-8 5V0h16v5M-6 0v-4h12v4M-8 5h16" />, bed: <path d="M-8 6V-5M-8 2h16v4M-8-1h6v3M8 2V0a3 3 0 00-3-3H-1" />, pot: <path d="M-7-2h14v5a4 4 0 01-4 4h-6a4 4 0 01-4-4zM-9-2h18M-3-6h6" />,
  people: <><circle cx="-3" cy="-3" r="3" /><path d="M-9 7a6 6 0 0112 0M3-6a3 3 0 010 6M5 2a5 5 0 014 5" /></>,
  chev: <path d="M-3-5l5 5-5 5" />, up: <path d="M-6 3l6-6 6 6" />, down: <path d="M-6-3l6 6 6-6" />, left: <path d="M3-6l-6 6 6 6" />, right: <path d="M-3-6l6 6-6 6" />,
  play: <path d="M-4-6v12l9-6z" fill={PAPER} />, auto: <path d="M5-3a5.5 5.5 0 00-10 0M-5 3a5.5 5.5 0 0010 0M5-7v4H1M-5 7V3h4" />,
};
export const I = ({ n, x, y, s = 1, c = PAPER, w = 1.7, o }) => <g transform={`translate(${x} ${y}) scale(${s})`} {...S} stroke={c} strokeWidth={w / s} opacity={o}>{IC[n]}</g>;
export const StatusBar = () => <g><Tx x={20} y={17} s={11} w={500}>10:41</Tx><path d="M318 9l6 7 6-7a9 9 0 00-12 0z" fill={PAPER} /><path d="M334 16h8V7z" fill={PAPER} /><rect x="344" y="7" width="5" height="10" rx="1" fill={PAPER} /></g>;
export const NavBar = ({ y = 757 }) => <g fill={PAPER}><path d={`M67 ${y - 6}v12l-10-6z`} /><circle cx="180" cy={y} r="5.5" /><rect x="282" y={y - 5.5} width="11" height="11" rx="1.5" /></g>;
// lit: 0..1 highlight on a pressable area, drawn on the control itself (no finger dot, no cursor)
export const Lit = ({ k = 0, x, y, w, h, r }) => k > 0 ? <rect x={x} y={y} width={w} height={h} rx={r} fill={LIME} fillOpacity={.22 * k} stroke={LIME} strokeOpacity={k} strokeWidth="2" /> : null;
export const TvPill = ({ wide, guest }) => wide
  ? <g><Card x={14} y={30} w={332} h={guest ? 66 : 50} r={25} /><circle cx="40" cy="55" r="15" fill={LINE} fillOpacity=".55" /><I n="tv" x={40} y={56} s={.85} c={LIME} />
      <Tx x={66} y={50} s={13} w={600}>Living Room TV</Tx><circle cx="70" cy="63" r="2.6" fill={LIME} /><Muted x={77} y={66} s={10}>Living room · Connected</Muted>
      {guest && <g><rect x="66" y="72" width="38" height="15" rx="7.5" fill={LIME} fillOpacity=".18" stroke={LIME} /><Tx x={85} y={83} s={9} w={600} c={LIME} a="middle">Guest</Tx></g>}</g>
  : <g><Card x={14} y={32} w={142} h={46} r={23} /><circle cx="38" cy="55" r="14" fill={LINE} fillOpacity=".55" /><I n="tv" x={38} y={56} s={.8} c={LIME} />
      <Tx x={60} y={51} s={12.5} w={600}>Living …</Tx><circle cx="64" cy="64" r="2.6" fill={LIME} /><Muted x={70} y={67} s={9.5}>Living …</Muted><I n="down" x={140} y={55} s={.6} /></g>;
export const TopIcons = ({ y = 55, from = 186 }) => <g>{['hand', 'dots', 'power', 'gear'].map((n, i) => <I key={n} n={n} x={from + i * 45} y={y} s={.9} />)}</g>;
// The remote home (remote-home.png). lit: { search, ok, right, left, up, down, back, home, play } -> 0..1
export function RemoteHome({ lit = {}, guest = false }) {
  const dy = guest ? 50 : 0;
  return <g>
    <StatusBar />
    {guest ? <><TvPill wide guest /><TopIcons y={113} from={186} /></> : <><TvPill /><TopIcons /></>}
    <g transform={`translate(0 ${guest ? 58 : 0})`}>
      <Card x={18} y={93} w={324} h={116} r={16} /><rect x="30" y="106" width="32" height="32" rx="9" fill={LINE} fillOpacity=".6" /><I n="grid" x={46} y={122} s={.85} c={LIME} />
      <Tx x={74} y={118} s={12.5} w={600}>Any app</Tx><Muted x={74} y={132} s={9.5}>Controls for whatever is on Living</Muted><Muted x={74} y={144} s={9.5}>Room TV</Muted>
      <rect x="272" y="113" width="58" height="24" rx="12" fill="none" stroke={LINE} /><I n="auto" x={287} y={125} s={.6} /><Tx x={312} y={129} s={10} a="middle">Auto</Tx>
      {[['cc', 'Captions'], ['audio', 'Audio'], ['keys', 'More keys']].map(([n, l], i) => <g key={n}><rect x={30 + i * 102} y={158} width={94} height={40} rx="10" fill={LINE} fillOpacity=".38" /><I n={n} x={77 + i * 102} y={172} s={.7} /><Tx x={77 + i * 102} y={191} s={8.5} a="middle" w={i === 2 ? 600 : 400}>{l}</Tx></g>)}
      <circle cx="180" cy="316" r="97" fill={PANEL} stroke={LINE} />
      {[['up', 180, 256], ['down', 180, 376], ['left', 120, 316], ['right', 240, 316]].map(([n, x, y]) => <g key={n}><PressDisc k={lit[n]} x={x} y={y} r={22} wash={LIME} washK={.24} /><I n={n} x={x} y={y} s={.9} c={lit[n] > .5 ? LIME : undefined} /></g>)}
      <circle cx="180" cy="316" r="33" fill={LIME} /><PressDisc k={lit.ok} x={180} y={316} r={33} /><Tx x={180} y={322} s={16} w={700} c={INK} a="middle">OK</Tx>
      {[['back', 'Back'], ['home', 'Home'], ['pp', 'Play / pause']].map(([n, l], i) => <g key={n}><Card x={18 + i * 110} y={425} w={102} h={48} r={12} /><Lit k={lit[n === 'pp' ? 'play' : n]} x={18 + i * 110} y={425} w={102} h={48} r={12} /><I n={n} x={69 + i * 110} y={442} s={.8} /><Tx x={69 + i * 110} y={464} s={9.5} a="middle">{l}</Tx></g>)}
      <Card x={18} y={485} w={261} h={48} r={12} /><I n="minus" x={42} y={509} s={.8} /><I n="plus" x={255} y={509} s={.8} /><Tx x={148} y={503} s={9.5} a="middle">Volume 12</Tx><rect x="86" y="514" width="125" height="4" rx="2" fill={LINE} /><rect x="86" y="514" width="14" height="4" rx="2" fill={LIME} />
      <Card x={287} y={485} w={55} h={48} r={12} /><I n="mute" x={314} y={509} s={.8} />
      {guest && <Muted x={18} y={552} s={9.5}>Access ends after 7 days away from this home.</Muted>}
    </g>
    <g transform={`translate(0 ${dy * 0})`}>
      <rect x="12" y="662" width="336" height="56" rx="28" fill={PANEL} stroke={LINE} />
      <rect x="20" y="668" width="320" height="44" rx="22" fill={LIME} />
      {lit.search > 0 && <rect x={20 - 3 * lit.search} y={668 - 3 * lit.search} width={320 + 6 * lit.search} height={44 + 6 * lit.search} rx="25" fill="none" stroke={LIME} strokeOpacity={lit.search} strokeWidth="2.5" />}
      {lit.search > 0 && <rect x="20" y="668" width="320" height="44" rx="22" fill={PAPER} fillOpacity={.28 * lit.search} />}
      <path d="M126 683v14l11-7z" fill={INK} /><Tx x={186} y={695} s={12.5} w={600} c={INK} a="middle">Search YouTube</Tx>
    </g>
    <NavBar />
  </g>;
}
// Dark keyboard (site tokens instead of the system's light keyboard). keyLit: { char: 0..1 }
const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
export function keyPos(ch) { for (let r = 0; r < 3; r++) { const i = ROWS[r].indexOf(ch); if (i >= 0) return [18 + i * 36 + (r === 1 ? 18 : r === 2 ? 54 : 0), 548 + r * 50]; } return ch === ' ' ? [180, 698] : null; }
export function Keyboard({ y = 0, keyLit = {}, sugg = ['bears', 'beats', "beat's"] }) {
  return <g transform={`translate(0 ${y})`}>
    <rect x="0" y="478" width={W} height="262" fill={PANEL} />
    {sugg.map((s, i) => <Tx key={s} x={60 + i * 120} y={503} s={11.5} a="middle" w={i === 1 ? 600 : 400} o={i === 1 ? 1 : .7}>{s}</Tx>)}<path d="M120 492v16M240 492v16" stroke={LINE} />
    {ROWS.map((row, r) => [...row].map(ch => { const [x, yy] = keyPos(ch), k = keyLit[ch] || 0; return <g key={ch}><rect x={x - 15.5} y={yy - 20} width="31" height="40" rx="6" fill={LINE} fillOpacity={.5} />{k > 0 && <rect x={x - 15.5} y={yy - 20} width="31" height="40" rx="6" fill={LIME} fillOpacity={.3 * k} stroke={LIME} strokeOpacity={k} strokeWidth="1.6" />}<Tx x={x} y={yy + 5} s={14} a="middle">{ch}</Tx></g>; }))}
    <rect x="2" y="628" width="44" height="40" rx="6" fill={LINE} fillOpacity=".8" /><path d="M24 640l-8 8h5v7h6v-7h5z" fill={PAPER} />
    <rect x="314" y="628" width="44" height="40" rx="6" fill={LINE} fillOpacity=".8" /><path d="M326 648l6-7h16v14h-16zM335 645l6 6M341 645l-6 6" fill="none" stroke={PAPER} strokeWidth="1.5" />
    <rect x="2" y="678" width="56" height="40" rx="6" fill={LINE} fillOpacity=".8" /><Tx x={30} y={702} s={10.5} a="middle">?123</Tx>
    <rect x="70" y="678" width="220" height="40" rx="6" fill={LINE} fillOpacity=".5" />{keyLit[' '] > 0 && <rect x="70" y="678" width="220" height="40" rx="6" fill={LIME} fillOpacity={.3 * keyLit[' ']} stroke={LIME} strokeOpacity={keyLit[' ']} strokeWidth="1.6" />}
    <circle cx="326" cy="698" r="18" fill={LIME} /><I n="search" x={326} y={698} s={.8} c={INK} w={2} />
  </g>;
}
// Bottom sheet "Search YouTube on Living Room TV" (youtube-search.png). y = slide offset, text = typed so far.
export function SearchSheet({ y = 0, text = '', caret = 1, focus = 1, send = 0, ripple = 0 }) {
  return <g transform={`translate(0 ${y})`}>
    <rect x="0" y="343" width={W} height="440" rx="22" fill={PANEL} /><rect x="160" y="352" width="40" height="4" rx="2" fill={LINE} />
    <Tx x={16} y={386} s={12.5} w={600}>Search YouTube on Living Room TV</Tx><I n="close" x={332} y={382} s={.85} />
    <rect x="16" y="406" width="328" height="42" rx="21" fill={INK} stroke={focus ? LIME : LINE} strokeWidth={focus ? 2 : 1} />
    <I n="search" x={38} y={427} s={.75} />
    {text ? <Tx x={56} y={432} s={13}>{text}{caret > 0 && <tspan fill={LIME} fillOpacity={caret} fontWeight="300" dx="1">|</tspan>}</Tx>
      : <>{caret > 0 && <rect x="55" y="419" width="1.6" height="17" fill={LIME} opacity={caret} />}<Muted x={59} y={432} s={13}>Search YouTube</Muted></>}
    {text && <I n="close" x={290} y={427} s={.6} o={.7} />}
    <circle cx="325" cy="427" r="17" fill={LIME} />{send > 0 && <circle cx="325" cy="427" r="17" fill={PAPER} fillOpacity={.35 * send} />}<I n="search" x={325} y={427} s={.75} c={INK} w={2} />
    {ripple > 0 && ripple < 1 && <circle cx="325" cy="427" r={19 + 22 * ripple} fill="none" stroke={LIME} strokeWidth="2.5" strokeOpacity={1 - ripple} />}
    <circle cx="23" cy="463" r="4.5" fill="none" stroke={PAPER} strokeOpacity=".68" /><Muted x={33} y={467} s={9.5}>Opens YouTube results · may leave playback.</Muted>
  </g>;
}
// Phone in a bezel: outer 376 x 796, screen 360 x 780 at (8, 8). Transparent outside the bezel.
export function Phone({ children, label, x = 0, y = 0, width, height }) {
  return <svg x={x} y={y} width={width} height={height} viewBox="0 0 376 796" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
    <rect x="1" y="1" width="374" height="794" rx="40" fill={INK} stroke={LINE} strokeWidth="2" />
    <svg x="8" y="8" width={W} height={H} viewBox={`0 0 ${W} ${H}`}><defs><clipPath id="pcScr"><rect width={W} height={H} rx="32" /></clipPath></defs>
      <g clipPath="url(#pcScr)"><rect width={W} height={H} fill={INK} />{children}</g></svg>
  </svg>;
}
// Same press as PressLime (typing's Search pill) for round keys: outer lime ring 3 px out + a wash on the key itself
// (paper wash on the lime OK disc; lime wash on the dark d-pad arrows, whose icon also turns lime).
export const PressDisc = ({ k = 0, x, y, r, wash = PAPER, washK = .28 }) => k > 0 ? <><circle cx={x} cy={y} r={r} fill={wash} fillOpacity={washK * k} /><circle cx={x} cy={y} r={r + 3 * k} fill="none" stroke={LIME} strokeOpacity={k} strokeWidth="2.5" /></> : null;
// press on a lime pill/button: soft outer ring + a light wash on the button itself
export const PressLime = ({ k = 0, x, y, w, h }) => k > 0 ? <><rect x={x - 3 * k} y={y - 3 * k} width={w + 6 * k} height={h + 6 * k} rx={h / 2 + 3 * k} fill="none" stroke={LIME} strokeOpacity={k} strokeWidth="2.5" /><rect x={x} y={y} width={w} height={h} rx={h / 2} fill={PAPER} fillOpacity={.28 * k} /></> : null;
