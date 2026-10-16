// Design-owned motion slots (PM 16 Oct 19:30 IST). Remote Design delivers the three phone loops (typing, trackpad,
// invite) and the three guest cards as live SVG React components on one GSAP timeline (~20:45 IST). Until then these
// named, fixed-aspect slots render a still, board-matched SVG drawing of the app screen (drawn from the app's real
// screens as reference; no screenshots on the page). Drop-in contract for Design:
//   <PhoneLoop name="typing|trackpad|invite" step={0..2} playing={bool} />  -> 1080:2340 screen inside .b-frame
//   <GuestCard i={0|1|2} playing={bool} />                                  -> the phone in guest card i
//   phoneScreenSvg(name, step) -> standalone SVG string (also used as the live pin scene's PhoneScreen texture)
// Replace the bodies below (same names/props); `playing` is false under reduced motion and out of view.
const C = { ink: '#0b0e0d', panel: '#151b16', panel2: '#1c231e', line: '#2c352d', paper: '#eeeee6', muted: '#9aa494', lime: '#d4fa7b', key: '#e9ebe4' };
const F = "font-family:'Work Sans','Work Sans Fallback',Arial,sans-serif";
const t = (x, y, s, fill, txt, w = 400, a = 'start') => `<text x="${x}" y="${y}" font-size="${s}" font-weight="${w}" fill="${fill}" text-anchor="${a}" style="${F}">${txt}</text>`;
const r = (x, y, w, h, rx, fill, stroke = 'none', sw = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const status = () => t(34, 52, 24, C.paper, '10:41', 500);
const tvChip = (dim = 1) => `<g opacity="${dim}">${r(28, 88, 250, 76, 38, C.panel, C.line, 2)}${r(48, 106, 40, 40, 12, '#26301f')}${t(102, 122, 24, C.paper, 'Living …', 600)}<circle cx="108" cy="142" r="5" fill="${C.lime}"/>${t(120, 149, 18, C.muted, 'Living …')}</g>`;
function remote(dim = 1, sent = false) {
  const keys = ['Captions', 'Audio', 'More keys'].map((k, i) => r(40 + i * 158, 300, 146, 70, 18, C.panel2) + t(113 + i * 158, 352, 18, C.muted, k, 400, 'middle')).join('');
  const pad = `<circle cx="270" cy="590" r="160" fill="${C.panel2}"/><circle cx="270" cy="590" r="62" fill="${C.lime}" opacity="${dim < 1 ? .55 : 1}"/>${t(270, 603, 34, C.ink, 'OK', 700, 'middle')}`
    + ['M270 455l-14 14M270 455l14 14', 'M270 725l-14-14M270 725l14-14', 'M135 590l14-14M135 590l14 14', 'M405 590l-14-14M405 590l-14 14'].map(d => `<path d="${d}" stroke="${C.paper}" stroke-width="4" stroke-linecap="round"/>`).join('');
  const row = ['Back', 'Home', 'Play / pause'].map((k, i) => r(28 + i * 166, 800, 150, 92, 22, C.panel2) + t(103 + i * 166, 868, 18, C.paper, k, 400, 'middle')).join('');
  const vol = r(28, 914, 370, 90, 24, C.panel2) + t(213, 950, 18, C.paper, 'Volume 12', 500, 'middle') + r(110, 970, 210, 6, 3, C.line) + r(110, 970, 30, 6, 3, C.lime) + r(412, 914, 100, 90, 24, C.panel2);
  return `<g opacity="${dim}">${tvChip()}${r(28, 190, 484, 200, 28, C.panel, C.line, 2)}${t(110, 236, 24, C.paper, 'Any app', 600)}${t(110, 266, 18, C.muted, 'Controls for whatever is on Living Room TV')}${keys}${pad}${row}${vol}</g>`
    + (sent ? t(40, 1050, 19, C.paper, 'YouTube search action sent. Check the TV.') : '')
    + r(30, 1080, 480, 76, 38, C.lime) + t(270, 1128, 24, C.ink, '▶  Search YouTube', 600, 'middle');
}
function keyboard() {
  const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  let s = r(0, 820, 540, 350, 0, '#d9dcd3');
  rows.forEach((row, ri) => [...row].forEach((k, i) => { const w = 48, x = (540 - row.length * 52) / 2 + i * 52 + (ri === 2 ? 0 : 0); s += r(x, 840 + ri * 78, w, 64, 8, C.key) + t(x + w / 2, 882 + ri * 78, 28, '#20231f', k, 400, 'middle'); }));
  s += r(140, 1074, 260, 56, 10, C.key) + `<circle cx="490" cy="1102" r="32" fill="#3fa69a"/>`;
  return s;
}
function typing(step) {
  if (step === 1) return remote(1, true);
  if (step === 2) return `${remote(.35)}<rect x="0" y="0" width="540" height="1170" fill="${C.ink}" opacity=".55"/>${r(0, 760, 540, 410, 36, C.panel)}${r(240, 776, 60, 6, 3, C.line)}${t(40, 830, 20, C.muted, 'Shared to The Remote')}${t(40, 880, 34, C.paper, 'Open YouTube video?', 600)}${r(30, 910, 480, 92, 22, C.ink, C.line, 2)}${t(70, 950, 22, C.paper, 'youtube.com/watch?v=…', 600)}${t(70, 980, 18, C.muted, 'YouTube link')}${r(30, 1022, 480, 74, 22, '#1d2614', C.lime, 2)}<circle cx="64" cy="1059" r="11" fill="none" stroke="${C.lime}" stroke-width="4"/>${t(90, 1066, 22, C.lime, 'Living Room TV', 600)}${r(30, 1108, 160, 54, 27, 'none', C.line, 2)}${t(110, 1142, 20, C.paper, 'Discard', 500, 'middle')}${r(204, 1108, 306, 54, 27, C.lime)}${t(357, 1142, 20, C.ink, '▶ Open on Living room', 600, 'middle')}`;
  return `${remote(.4)}<rect x="0" y="0" width="540" height="1170" fill="${C.ink}" opacity=".5"/>${r(0, 690, 540, 480, 34, C.panel)}${r(240, 704, 60, 6, 3, C.line)}${t(30, 752, 22, C.paper, 'Search YouTube on Living Room TV', 600)}${r(26, 772, 488, 66, 33, C.ink, C.lime, 3)}${t(80, 815, 26, C.paper, 'lofi hip')}<rect x="178" y="790" width="2.5" height="32" fill="${C.paper}"/><circle cx="478" cy="805" r="26" fill="${C.lime}"/>${t(30, 868, 16, C.muted, 'Opens YouTube results · may leave playback.')}<g transform="translate(0,64)">${keyboard()}</g>`;
}
function trackpad(step) {
  const chip = step === 0 ? '' : r(52, 196, 436, 64, 18, '#1d2614', C.lime, 2) + t(270, 238, 24, C.paper, step === 1 ? 'Swipe → <tspan fill="#d4fa7b">Right</tspan>' : 'Tap → <tspan fill="#d4fa7b">OK</tspan>', 500, 'middle');
  let dots = ''; for (let y = 300; y < 1040; y += 34) for (let x = 70; x < 480; x += 34) dots += `<circle cx="${x}" cy="${y}" r="1.6" fill="#2a3229"/>`;
  return `${tvChip()}${r(34, 180, 472, 880, 36, 'none', '#3a4438', 2)}${dots}${chip}`;
}
function invite() {
  return `${tvChip()}${t(40, 230, 34, C.paper, 'Invite a guest', 600)}${t(40, 270, 20, C.muted, 'to Living Room TV')}${r(120, 320, 300, 300, 24, C.paper)}${t(270, 680, 20, C.muted, 'Scan with the phone camera, or type the code', 400, 'middle')}${r(90, 710, 360, 90, 22, C.panel, C.line, 2)}${t(270, 770, 44, C.paper, '••• •••', 600, 'middle')}${t(270, 850, 18, C.muted, 'Codes expire after 2 minutes.', 400, 'middle')}`;
}
export function phoneScreenSvg(name, step = 0) {
  const body = name === 'typing' ? typing(step) : name === 'trackpad' ? trackpad(step) : invite(step);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="1170" viewBox="0 0 540 1170"><rect width="540" height="1170" fill="${C.ink}"/>${status()}${body}</svg>`;
}
export const phoneScreenUrl = (name, step) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(phoneScreenSvg(name, step))}`;
export function PhoneLoop({ name, step = 0, playing = false, className = '' }) {
  return <div className={`b-frame b-phoneloop ${className}`.trim()} data-slot={`phone-loop:${name}`} data-step={step} data-playing={playing || undefined} aria-hidden="true">
    <div className="b-phoneloop-screen" dangerouslySetInnerHTML={{ __html: phoneScreenSvg(name, step) }} />
  </div>;
}
export function GuestCard({ i = 0, playing = false }) {
  const step = [0, 1, 2][i] ?? 0;
  return <div className="b-frame b-phoneloop b-guestcard" data-slot={`guest-card:${i}`} data-playing={playing || undefined} aria-hidden="true">
    <div className="b-phoneloop-screen" dangerouslySetInnerHTML={{ __html: phoneScreenSvg(i === 0 ? 'invite' : 'typing', i === 0 ? 0 : step === 1 ? 1 : 1) }} />
  </div>;
}
