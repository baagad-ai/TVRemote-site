// The drawn (illustrative) TV for Concept B. Site tokens only, plus the real YouTube logo, which appears on this
// drawn TV and nowhere else. It shows only what the app really makes a TV do: a home row, YouTube results after a
// search is sent, a focus highlight that moves one tile per step, a shared link playing. No cursor, no pointer,
// no typing on the TV (the search pill shows the query the phone sent), no numbers. QA 16 Oct 21:00: solid tokens
// only (panel tiles with a line outline, as phone/tv.jsx), no gradients or opacity.
import { YT_PATHS } from '../youtube-logo';

export const TV_W = 1600, TV_H = 900;
const INK = '#0b0e0d', PANEL = '#151b16', LINE = '#354032', LIME = '#d4fa7b', PAPER = '#eeeee6';
// Results grid geometry (3 x 2), shared with the focus ring.
const GX = 96, GY = 236, GW = 440, GH = 232, GAP_X = 36, GAP_Y = 96;
export const tilePos = i => [GX + (i % 3) * (GW + GAP_X), GY + Math.floor(i / 3) * (GH + GAP_Y)];
// Home row geometry (one row of 5).
const HX = 96, HY = 300, HW = 264, HH = 168, HGAP = 22;

export function YouTubeLogo({ x, y, height }) {
  const s = height / 20;
  return <g transform={`translate(${x} ${y}) scale(${s})`} aria-hidden="true">{YT_PATHS.map(([d, fill], i) => <path key={i} d={d} fill={i < 2 ? fill : '#FFFFFF'} />)}</g>;
}
function Tile({ x, y, w, h, i, rise }) {
  return <g className={rise ? 'tv-rise' : undefined} style={rise ? { animationDelay: `${i * 50}ms` } : undefined}>
    <rect x={x} y={y} width={w} height={h} rx="16" fill={PANEL} stroke={LINE} strokeWidth="3" />
    <circle cx={x + w - 56} cy={y + 56} r="30" fill={LINE} />
    <rect x={x + 22} y={y + h - 48} width={w * .52} height="20" rx="10" fill={LINE} />
    <rect x={x} y={y + h + 20} width={w * .78} height="16" rx="8" fill={LINE} />
    <rect x={x} y={y + h + 46} width={w * .5} height="14" rx="7" fill={PANEL} stroke={LINE} strokeWidth="3" />
  </g>;
}
// state: 'home' | 'results' | 'playing'. focus: 0-5 (results) or 0-4 (home). pulse: a changing key replays the OK pulse.
export default function DrawnTV({ state = 'results', focus = 0, pulse = 0, nudge = '', rise = false, query = 'lofi beats', title, className = '', idPrefix = 'tv' }) {
  const [fx, fy] = state === 'home' ? [HX + focus * (HW + HGAP), HY] : tilePos(focus);
  const [fw, fh] = state === 'home' ? [HW, HH] : [GW, GH];
  return <svg className={`drawn-tv ${className}`} viewBox={`0 0 ${TV_W} ${TV_H}`} width={TV_W} height={TV_H} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : 'true'} xmlns="http://www.w3.org/2000/svg">
    <rect width={TV_W} height={TV_H} fill={INK} />
    {state === 'home' && <g>
      {Array.from({ length: 5 }, (_, i) => <rect key={i} x={HX + i * (HW + HGAP)} y={HY} width={HW} height={HH} rx="16" fill={PANEL} stroke={LINE} strokeWidth="3" />)}
      {Array.from({ length: 4 }, (_, i) => <rect key={i} x={HX + i * 356} y={HY + HH + 110} width="330" height="186" rx="16" fill={PANEL} stroke={LINE} strokeWidth="3" />)}
      <rect x={HX} y="150" width="300" height="22" rx="11" fill={LINE} />
    </g>}
    {state === 'results' && <g>
      <YouTubeLogo x={96} y={74} height={52} />
      <g><rect x="400" y="68" width="760" height="64" rx="32" fill={PANEL} stroke={LINE} strokeWidth="3" /><circle cx="444" cy="98" r="13" fill="none" stroke={PAPER} strokeWidth="4" /><path d="M454 108l12 12" stroke={PAPER} strokeWidth="4" strokeLinecap="round" /><text x="484" y="111" fill={PAPER} fontFamily="Work Sans, Arial, sans-serif" fontSize="34">{query}</text></g>
      <rect x={GX} y="182" width="120" height="18" rx="9" fill={LINE} />
      {Array.from({ length: 6 }, (_, i) => { const [x, y] = tilePos(i); return <Tile key={i} x={x} y={y} w={GW} h={GH} i={i} rise={rise} />; })}
    </g>}
    {state === 'playing' && <g>
      <rect width={TV_W} height={TV_H} fill={PANEL} />
      <circle cx="560" cy="560" r="300" fill={PANEL} stroke={LINE} strokeWidth="3" /><circle cx="1040" cy="380" r="210" fill={LINE} /><rect x="0" y="640" width={TV_W} height="260" fill={INK} />
      <YouTubeLogo x={96} y={74} height={44} />
      <rect x="96" y="806" width="1408" height="10" rx="5" fill={LINE} /><rect x="96" y="806" width="520" height="10" rx="5" fill={LIME} /><circle cx="616" cy="811" r="16" fill={LIME} />
      <path d="M100 742v40M118 742v40" stroke={PAPER} strokeWidth="9" strokeLinecap="round" />
    </g>}
    {state !== 'playing' && <g className={`tv-focus ${nudge ? `nudge-${nudge}` : ''}`} style={{ transform: `translate(${fx}px, ${fy}px)` }}>
      <rect key={pulse} className={pulse ? 'tv-focus-ring is-pulsing' : 'tv-focus-ring'} x="-9" y="-9" width={fw + 18} height={fh + 18} rx="22" fill="none" stroke={LIME} strokeWidth="9" />
    </g>}
  </svg>;
}
