// Drawn TV (same geometry as src/b/DrawnTV.jsx, 1600 x 900), driven by the loop's own timeline so it reacts on the
// same frame as the phone. The YouTube logo appears here, on the drawn TV, only.
import { YT_PATHS } from '../../youtube-logo.js';
import { INK, PANEL, LINE, LIME, PAPER, FONT } from './ui.jsx';
const GX = 96, GY = 236, GW = 440, GH = 232, GAP_X = 36, GAP_Y = 96, HX = 96, HY = 300, HW = 264, HH = 168, HGAP = 22;
export const tile = f => [GX + (f % 3) * (GW + GAP_X), GY + Math.floor(f / 3) * (GH + GAP_Y)]; // f may be fractional per axis
const Logo = ({ x, y, h }) => <g transform={`translate(${x} ${y}) scale(${h / 20})`}>{YT_PATHS.map(([d, fill], i) => <path key={i} d={d} fill={i < 2 ? fill : '#FFFFFF'} />)}</g>;
// results: 0..1 crossfade home -> results. fx, fy: focus column/row (fractional while gliding). pulse: 0..1 OK pulse.
export function TV({ results = 1, fx = 0, fy = 0, pulse = 0, query = 'lofi beats', homeFocus = 0 }) {
  const rx = GX + fx * (GW + GAP_X), ry = GY + fy * (GH + GAP_Y), g = 9 + 14 * pulse;
  return <g>
    {/* bezel = ink (site token; was an off-token near-black); it reads off the page by its LINE outer edge, and off the screen by a faint paper inner edge */}
    <rect x="-22" y="-22" width="1644" height="944" rx="26" fill={INK} stroke={LINE} strokeWidth="4" />
    <rect width="1600" height="900" fill={INK} stroke={PAPER} strokeOpacity=".12" strokeWidth="3" />
    {results < 1 && <g opacity={1 - results}>
      <rect x={HX} y="150" width="300" height="22" rx="11" fill={LINE} />
      {Array.from({ length: 5 }, (_, i) => <rect key={i} x={HX + i * (HW + HGAP)} y={HY} width={HW} height={HH} rx="16" fill={PANEL} stroke={LINE} strokeWidth="2" />)}
      {Array.from({ length: 4 }, (_, i) => <rect key={i} x={HX + i * 356} y={HY + HH + 110} width="330" height="186" rx="16" fill={PANEL} opacity=".8" />)}
      <rect x={HX + homeFocus * (HW + HGAP) - 9} y={HY - 9} width={HW + 18} height={HH + 18} rx="22" fill="none" stroke={LIME} strokeWidth="9" />
    </g>}
    {results > 0 && <g opacity={results}>
      <Logo x={96} y={74} h={52} />
      <rect x="400" y="68" width="760" height="64" rx="32" fill={PANEL} stroke={LINE} strokeWidth="3" /><circle cx="444" cy="98" r="13" fill="none" stroke={PAPER} strokeWidth="4" /><path d="M454 108l12 12" stroke={PAPER} strokeWidth="4" strokeLinecap="round" />
      <text x="484" y="111" fill={PAPER} fontFamily={FONT} fontSize="34">{query}</text>
      <rect x={GX} y="182" width="120" height="18" rx="9" fill={LINE} />
      {Array.from({ length: 6 }, (_, i) => { const [x, y] = tile(i); return <g key={i}><rect x={x} y={y} width={GW} height={GH} rx="16" fill={PANEL} /><rect x={x} y={y} width={GW} height={GH} rx="16" fill={LINE} opacity={.25 + (i % 3) * .12} />
        <circle cx={x + GW - 56} cy={y + 56} r="30" fill={LINE} /><rect x={x + 22} y={y + GH - 48} width={GW * .52} height="20" rx="10" fill={LINE} />
        <rect x={x} y={y + GH + 20} width={GW * .78} height="16" rx="8" fill={LINE} /><rect x={x} y={y + GH + 46} width={GW * .5} height="14" rx="7" fill={LINE} opacity=".7" /></g>; })}
      <rect x={rx - g} y={ry - g} width={GW + 2 * g} height={GH + 2 * g} rx="22" fill="none" stroke={LIME} strokeWidth="9" />
      {pulse > 0 && <rect x={rx} y={ry} width={GW} height={GH} rx="16" fill={LIME} opacity={.12 * pulse} />}
    </g>}
  </g>;
}
