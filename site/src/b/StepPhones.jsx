// Download steps (§9): a small coded SVG phone UI per step. Solid site tokens only (no opacity, no gradients), no
// device names, no numbers, no captures. The pressed control (.b-sp-press) presses once as its step staggers in.
// There is no TV in these steps, so there is nothing to sync with.
const INK = '#0b0e0d', PANEL = '#151b16', LINE = '#354032', LIME = '#d4fa7b', PAPER = '#eeeee6', MUTED = '#b0b9a2';
const T = (x, y, s, c, w = 500) => ({ x, y, fill: c, fontSize: s, fontWeight: w, fontFamily: 'Work Sans, Work Sans Fallback, Arial, sans-serif' });
const Screen = {
  0: <><rect x="16" y="34" width="88" height="14" rx="7" fill={PANEL} stroke={LINE} strokeWidth="1.5" />
    <rect x="16" y="64" width="62" height="8" rx="4" fill={LINE} /><text {...T(16, 92, 11, PAPER, 600)}>The Remote.</text>
    <rect x="16" y="102" width="80" height="6" rx="3" fill={LINE} /><rect x="16" y="114" width="56" height="6" rx="3" fill={LINE} />
    <g className="b-sp-press"><rect x="16" y="134" width="88" height="26" rx="13" fill={LIME} /><text {...T(60, 151, 9.5, INK, 600)} textAnchor="middle">Download</text></g></>,
  1: <><rect x="12" y="78" width="96" height="92" rx="14" fill={PANEL} stroke={LINE} strokeWidth="1.5" />
    <text {...T(22, 100, 9.5, PAPER, 600)}>Install unknown</text><text {...T(22, 113, 9.5, PAPER, 600)}>apps</text>
    <text {...T(22, 140, 8.5, MUTED)}>Allow from this</text><text {...T(22, 151, 8.5, MUTED)}>source</text>
    <g className="b-sp-press"><rect x="76" y="136" width="24" height="14" rx="7" fill={LIME} /><circle cx="93" cy="143" r="5" fill={INK} /></g></>,
  2: <><rect x="44" y="52" width="32" height="32" rx="10" fill={PANEL} stroke={LINE} strokeWidth="1.5" /><circle cx="60" cy="68" r="6" fill={LIME} />
    <text {...T(60, 104, 10, PAPER, 600)} textAnchor="middle">The Remote</text>
    <text {...T(60, 120, 8.5, MUTED)} textAnchor="middle">Do you want to</text><text {...T(60, 131, 8.5, MUTED)} textAnchor="middle">install this app?</text>
    <g className="b-sp-press"><rect x="20" y="164" width="80" height="24" rx="12" fill={LIME} /><text {...T(60, 180, 9.5, INK, 600)} textAnchor="middle">Install</text></g></>,
  3: <><text {...T(16, 52, 10, PAPER, 600)}>Pick your TV</text>
    <g className="b-sp-press"><rect x="12" y="62" width="96" height="30" rx="10" fill={PANEL} stroke={LIME} strokeWidth="1.5" /><text {...T(22, 81, 9, PAPER)}>Living Room TV</text></g>
    <rect x="12" y="98" width="96" height="30" rx="10" fill={PANEL} stroke={LINE} strokeWidth="1.5" /><text {...T(22, 117, 9, MUTED)}>Bedroom TV</text>
    <text {...T(16, 150, 8.5, MUTED)}>Enter the code on the TV</text>
    {[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={14 + i * 16} y="158" width="12" height="18" rx="4" fill={PANEL} stroke={i === 0 ? LIME : LINE} strokeWidth="1.5" />)}</>
};
export default function StepPhone({ step }) {
  return <svg className="b-step-phone" viewBox="0 0 120 240" width="96" height="192" aria-hidden="true" focusable="false">
    <rect x="1" y="1" width="118" height="238" rx="20" fill={INK} stroke={LINE} strokeWidth="2" />
    <rect x="6" y="6" width="108" height="228" rx="16" fill={PANEL} />
    <rect x="48" y="14" width="24" height="5" rx="2.5" fill={INK} />
    {Screen[step]}
    <rect x="46" y="224" width="28" height="3" rx="1.5" fill={MUTED} />
  </svg>;
}
