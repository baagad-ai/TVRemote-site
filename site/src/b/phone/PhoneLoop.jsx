// <PhoneLoop name="typing|trackpad|invite" step? playing? tv? frame? />: code-drawn phone loops, one 10.00 s timeline each.
// Loop rule: seamless by construction (state at t=10 == t=0), ~1 s rest at both ends, <= 3 actions ~2 s apart, each beat
// held >= 1.5 s, sine/power2 in-out with a settle. A press lights the control itself (no finger dot, no cursor); the
// drawn TV (tv prop) reacts on the same frame. Reduced motion / playing={false}: one still. Runs only in view.
// step={0|1|2} (typing): no timeline; shows that pin step (same states as phoneScreenSvg).
import { useRef } from 'react';
import { useLoopClock, seg, bump, lerp, sine } from './clock.js';
import { INK, PANEL, LINE, LIME, PAPER, W, H, Tx, Muted, Card, I, StatusBar, NavBar, RemoteHome, Keyboard, SearchSheet, Phone } from './ui.jsx';
import { TV } from './tv.jsx';
import { InviteScreen, GuestList, ShareScreen } from './screens.jsx';

const Sent = ({ k = 1 }) => <g opacity={k} transform={`translate(0 ${(1 - k) * 8})`}><Card x={18} y={596} w={324} h={40} r={12} /><Muted x={30} y={621} s={10.5}>YouTube search action sent. Check the TV.</Muted></g>;
// typing: 1.0 tap Search YouTube (the bar lights) -> search sheet + keyboard ease up (1.03-1.73) | 3.3-4.6 type
// "lofi beats" as one beat (~7.7 chars/s, each key lights) | 6.1 Send: the send key lights + ripple; the TV crossfades to
// the results (6.13-6.73); the sheet eases away and the sent line shows | 8.4-9.1 settle back | 9.1-10 rest.
const Q = 'lofi beats', T_TAP = 1, T_TYPE = 3.3, DT = .13, T_SEND = 6.1, T_BACK = 8.4;
function typing(t) {
  const open = seg(t, T_TAP + .03, .7) * (1 - seg(t, T_SEND + .03, .7)), n = t < T_TYPE ? 0 : Math.min(Q.length, Math.floor((t - T_TYPE) / DT) + 1);
  const text = t >= T_SEND + .73 ? '' : Q.slice(0, n), keyLit = {};
  for (let i = 0; i < Q.length; i++) { const k = bump(t, T_TYPE + i * DT - .03, .05, .05, .2); if (k > 0) keyLit[Q[i]] = Math.max(keyLit[Q[i]] || 0, k); }
  const sent = seg(t, T_SEND + .3, .6) * (1 - seg(t, T_BACK, .7)), res = seg(t, T_SEND + .033, .6) * (1 - seg(t, T_BACK, .7));
  return { tv: <TV results={res} />, phone: <>
    <RemoteHome lit={{ search: bump(t, T_TAP, .15, .15, .4) }} />
    {open > 0 && <rect width={W} height={H} fill={INK} opacity={.55 * open} />}
    {open > 0 && <g opacity={Math.min(1, open * 1.6)}><SearchSheet y={(1 - open) * 440} text={text} send={bump(t, T_SEND, .12, .15, .4)} ripple={t >= T_SEND ? (t - T_SEND) / .9 : 0} /><Keyboard y={(1 - open) * 440} keyLit={keyLit} /></g>}
    {sent > 0 && <Sent k={sent} />}</> };
}
// Pin steps (Marketing's PinStory order): 0 search typed, 1 sent (results on the TV), 2 share sheet (link step).
export const typingStep = s => s === 1 ? <><RemoteHome /><Sent /></> : s === 2 ? <ShareScreen /> : <><RemoteHome /><rect width={W} height={H} fill={INK} opacity=".55" /><SearchSheet text={Q} /><Keyboard /></>;
// trackpad (board bento: right, OK, left): 1.0 swipe right (TV focus glides tile 1 -> 2, 1.03-1.83) | 3.4 tap = OK (OK
// pulse on tile 2, 3.43-4.13) | 5.8 swipe left (tile 2 -> 1, 5.83-6.63; this is the way home, no unpressed glide) | rest.
// Feedback = the app's own live feedback (trackpad/screens/02-live-feedback.png, DESIGN.md §02), scaled to the pad by the
// chip height: swipe = the finger ring at the head, a trail of 8 lime dots shrinking behind it, and chevrons ahead (grey,
// grey, lime); the finger lifts as the swipe ends (a + 0.8 s) and it all fades over 250 ms. Tap = a lime finger ring in an
// outline halo plus the finger-count dots (1 of 3 lit); lifts at 3.65 s and fades over 200 ms. No step bars (those are for
// swipe-and-hold), no "repeating" label, no hold timer, no cursor. Exit (X) top-left. Everything is gone by 7.8 s,
// so t = 10 renders the same as t = 0.
// Marketing 16 Oct (Design 22:23): three beats: 1.5 swipe right | 4.0 tap = OK (the video plays on the TV) | 6.5
// two-finger tap = Back (the results fade back in, the TV focus slides home to tile 1 over 0.4 s) | rest to 10.
const SWIPE_R = 1.5, TAP = 4.0, TAP_UP = 4.25, BACK = 6.5, BACK_UP = 6.75, SW_D = .8, TV_D = .25, PY = 400, MUTE = PAPER;
const CHIPS = [[SWIPE_R, 'Swipe → ', 'Right'], [TAP, 'Tap → ', 'OK'], [BACK, '2-finger tap → ', 'Back']];
const Pad = ({ children }) => <><StatusBar /><circle cx="37" cy="56" r="20" fill={PANEL} stroke={LINE} /><I n="close" x={37} y={56} s={.8} />
  <circle cx="80" cy="50" r="12" fill={PANEL} stroke={LINE} strokeWidth="1" /><I n="tv" x={80} y={51} s={.7} c={LIME} /><Tx x={100} y={54} s={12} w={600}>Living Room TV</Tx><circle cx="84" cy="69" r="2.6" fill={LIME} /><Muted x={92} y={72} s={9.5}>Connected</Muted>
  <rect x="14" y="89" width="332" height="640" rx="26" fill={INK} stroke={LINE} />
  <defs><pattern id="pcPadDots" x="16.3" y="91.4" width="23.4" height="25.2" patternUnits="userSpaceOnUse"><circle cx="11.7" cy="12.6" r="1.1" fill={PAPER} fillOpacity=".1" /></pattern></defs>
  <rect x="16" y="91" width="328" height="636" rx="25" fill="url(#pcPadDots)" />
  <rect x="170" y="712" width="20" height="5" rx="2.5" fill={LIME} />{children}<NavBar y={757} /></>;
// one swipe: finger from x0 to x1 (dir +1 right / -1 left) over SW_D, eased like the TV focus
const DOT_R = [10, 9, 8, 7, 6, 4.8, 3.7, 2.6];
function swipe(t, a, x0, x1) {
  if (t < a) return null; const up = a + SW_D, o = (t < up ? Math.min(1, (t - a) / .06) : 1 - seg(t, up, .25, sine)); if (o <= 0) return null;
  const k = seg(t, a, SW_D), dir = Math.sign(x1 - x0), hx = lerp(x0, x1, k), sp = Math.min(14, Math.abs(hx - x0) / 8);
  return <g key={'sw' + a} opacity={o}>
    {DOT_R.map((r, i) => <circle key={i} cx={hx - dir * (i + 1) * sp} cy={PY} r={r} fill={LIME} />).reverse()}
    <circle cx={hx} cy={PY} r="19" fill="none" stroke={LIME} strokeWidth="2" />
    {[15, 26, 37].map((d, i) => <path key={d} d={`M${hx + dir * d} ${PY - 8.5}l${dir * 6} 8.5l${-dir * 6} 8.5`} fill="none" stroke={i < 2 ? MUTE : LIME} strokeOpacity={i < 2 ? .5 : 1} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />)}
  </g>;
}
function tap(t) {
  if (t < TAP) return null; const o = t < TAP_UP ? Math.min(1, (t - TAP) / .06) : 1 - seg(t, TAP_UP, .2, sine); if (o <= 0) return null;
  return <g opacity={o}><circle cx="180" cy={PY} r="28" fill="none" stroke={MUTE} strokeOpacity=".5" strokeWidth="1.6" /><circle cx="180" cy={PY} r="17" fill="none" stroke={LIME} strokeWidth="2.2" />
    {[0, 1, 2].map(i => <circle key={i} cx={163 + i * 17} cy={PY + 52} r="5" fill={i ? LINE : LIME} />)}</g>;
}
// Back = a two-finger tap: two lime finger rings side by side, each in an outline halo, plus the finger-count dots (2 of 3 lit).
function twoTap(t) {
  if (t < BACK) return null; const o = t < BACK_UP ? Math.min(1, (t - BACK) / .06) : 1 - seg(t, BACK_UP, .2, sine); if (o <= 0) return null;
  return <g opacity={o}>{[145, 215].map(cx => <g key={cx}><circle cx={cx} cy={PY} r="28" fill="none" stroke={MUTE} strokeOpacity=".5" strokeWidth="1.6" /><circle cx={cx} cy={PY} r="17" fill="none" stroke={LIME} strokeWidth="2.2" /></g>)}
    {[0, 1, 2].map(i => <circle key={i} cx={163 + i * 17} cy={PY + 52} r="5" fill={i < 2 ? LIME : LINE} />)}</g>;
}
function trackpad(t) {
  // TV focus moves 2 frames after the finger lifts (swipe end), over the board's 0.25 s.
  const fx = seg(t, SWIPE_R + SW_D + .067, TV_D) - seg(t, BACK + .067, .4);
  const chips = CHIPS.map(([a, l, b], i) => { const next = CHIPS[i + 1]?.[0] ?? 99, k = seg(t, a, .25, sine) * (1 - seg(t, Math.min(a + 1.6, next - .05), .4, sine)); if (k <= 0) return null;
    return <g key={b} opacity={k} transform={`translate(0 ${(1 - k) * -6})`}><rect x={b === 'Back' ? 100 : 120} y="100" width={b === 'Back' ? 160 : 120} height="30" rx="15" fill={LIME} fillOpacity=".14" stroke={LIME} strokeWidth="1.4" /><Tx x={180} y={119.5} s={11.5} w={600} a="middle">{l}<tspan fill={LIME}>{b}</tspan></Tx></g>; });
  return { tv: <TV results={1} fx={fx} fy={0} pulse={bump(t, TAP + .033, .25, .1, .35)} />, phone: <Pad>{chips}{swipe(t, SWIPE_R, 110, 250)}{tap(t)}{twoTap(t)}</Pad> };
}
// Gallery still: mid swipe right (dot trail, finger ring, chevrons + "Swipe → Right" chip).
export const TrackpadStill = () => trackpad(2.05).phone;
// invite (Build's flow): rest on the guest list | 1.5 tap "Invite a guest" (button lights) -> the invite screen eases in
// (1.53-2.23) with the QR + code, "Waiting for guest…" | 3.9 Copy code lights, "Code copied" | 6.2 Done lights -> eases
// back to the list (6.23-6.93), sliding like the app's own navigation | rest. The spinner turns 8 whole turns per loop.
function invite(t) {
  const k = seg(t, 1.53, .7) * (1 - seg(t, 6.23, .7));
  return { phone: <>
    {k < 1 && <g transform={`translate(${-90 * k} 0)`}><GuestList inviteLit={bump(t, 1.5, .15, .15, .4)} />{k > 0 && <rect width={W} height={H} fill={INK} opacity={.6 * k} />}</g>}
    {k > 0 && <g transform={`translate(${W * (1 - k)} 0)`}><rect width={W} height={H} fill={INK} /><InviteScreen copyLit={bump(t, 3.9, .15, .15, .4)} copied={seg(t, 3.95, .4) * (1 - seg(t, 5.5, .5))} doneLit={bump(t, 6.2, .15, .15, .4)} spin={(t * 288) % 360} /></g>}</> };
}
const SCENES = { typing: [typing, 7.2, 'Type a YouTube search on your phone and send it; the results open on the TV.'], trackpad: [trackpad, 4.15, 'The trackpad: swipe to move the TV focus, tap for OK.'], invite: [invite, 3, 'Invite a guest: a QR code and a short code for their phone.'] };
// Marketing patch (16 Oct, §3 bento): optional `t` = an external clock (seconds in [0, 10)), so the bento's TV focus and
// this phone render from ONE timeline in the same frame. Without `t` the component runs its own clock, as Design shipped it.
export default function PhoneLoop({ name = 'typing', step, playing, tv = false, frame = false, className = '', t: tExt }) {
  const ref = useRef(null), [scene, still, label] = SCENES[name] || SCENES.typing;
  const fixed = name === 'typing' && step != null, tc = useLoopClock(ref, still, !fixed && playing !== false && tExt == null), t = tExt ?? tc;
  const s = fixed ? { phone: typingStep(step), tv: <TV results={step === 0 ? 0 : 1} /> } : scene(t);
  const screen = frame ? <Phone x={tv ? 728 : 0} width={376} height={796}>{s.phone}</Phone> : <svg x={tv ? 736 : 0} y={tv ? 8 : 0} width={W} height={H} viewBox={`0 0 ${W} ${H}`}><rect width={W} height={H} fill={INK} />{s.phone}</svg>;
  const vw = tv ? 1104 : frame ? 376 : W, vh = tv || frame ? 796 : H;
  return <div ref={ref} className={`phone-loop phone-loop-${name} ${className}`.trim()} data-loop={name} style={{ aspectRatio: `${vw} / ${vh}` }}>
    <svg viewBox={`0 0 ${vw} ${vh}`} width="100%" height="100%" role="img" aria-label={label} style={{ display: 'block' }}>
      {tv && s.tv && <g transform="translate(22 250) scale(.42)">{s.tv}</g>}{screen}</svg></div>;
}
// Standalone SVG string of a still screen (540 x 1170, the 1080:2340 screen), e.g. for the pin's PhoneScreen texture.
// typing: step 0 search typed, 1 sent line (results on the TV), 2 share sheet. trackpad: 0 rest, 1 mid swipe right (dot trail +
// chip), 2 tap OK (finger ring + chip, focus on tile 2). invite: 0 guest list, 1 invite screen. Fonts: an SVG used as an <img>/texture can't load web fonts, so text falls
// back to the system sans there (the live component uses the page's Work Sans / Outfit).
import { toSvg } from './svgString.js';
const STILL = { trackpad: [0, 2.05, 4.15], invite: [0, 3] };
// remote (hero phone): 0 rest, 1 d-pad RIGHT pressed + lit, 2 OK pressed + lit, 3 d-pad LEFT pressed + lit (same press style as typing's Search).
export const REMOTE_LIT = [{}, { right: 1 }, { ok: 1 }, { left: 1 }];
export const remoteStep = s => <RemoteHome lit={REMOTE_LIT[s] || {}} />;
export function phoneScreenSvg(name, step = 0) {
  const body = name === 'remote' ? remoteStep(step) : name === 'typing' ? typingStep(step) : (name === 'trackpad' ? trackpad : invite)(STILL[name]?.[step] ?? 0).phone;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="1170" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${INK}"/>${toSvg(body)}</svg>`;
}
export const phoneScreenUrl = (name, step) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(phoneScreenSvg(name, step))}`;
