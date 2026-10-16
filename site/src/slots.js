// Image slots for landing sections. A slot shows a real app capture only when its file exists in
// site/assets/showcase/ at build time; otherwise it renders nothing. build-react.mjs injects
// __SHOWCASE_FILES__ ({ fileName: pixelHeight } for PNGs, { fileName: { width, height } } from the
// viewBox for SVGs). PNG slots take real phone captures only, 1080 px wide; never mockups or
// generated images. The one SVG slot is Design's drawn gesture illustration (no app UI).
/* global __SHOWCASE_FILES__ */
const present = typeof __SHOWCASE_FILES__ === 'undefined' ? {} : __SHOWCASE_FILES__;
export const SLOTS = {
  guestsInvite: 'guests-invite.png', // Guests step 1: a Primary remote inviting a guest (an expired invite code only)
  guestsPrimary: 'guests-primary-guest-list.png', // G3: a Primary remote's Guest access list for one TV, with Invite
  guestsGuest: 'guests-guest-remote.png', // G7: a guest's phone with the remote connected
  trackpad: 'trackpad-pad.png', // the trackpad pad, idle, connected. Shown next to trackpadIllustration when both exist; when absent, SVG alone is the fallback. Text gesture grid stays visually-hidden whenever pad or SVG shows
  trackpadIllustration: 'trackpad-gestures-mobile.svg', // Design's 2×4 gesture art (~420 px slot), shown beside the pad (or alone if pad missing). The 4×2 trackpad-gestures.svg is only for a ≥900 px slot; none exists yet
  typing: 'typing.png', // Everyday controls, Typing panel: The keyboard sheet in The Remote, opened from the remote's keyboard button, with a YouTube search typed for Living Room TV.
  reconnect: 'reconnect-pair-again.png', // Everyday controls, Reconnects panel: a reset/updated TV asking for its code again
  yourTvs: 'your-tvs-g1.png' // G1: a fresh Your TVs capture (no old Guest mode card); replaces the cropped your-tvs.png
};
export function slot(file) { return present[file] ? { src: `assets/showcase/${file}`, height: present[file] } : null; }
