// Shared Concept B constants (PM decisions 16 Oct: Kitchen chip on, 14px minimum eyebrows, 390 hero copy first are
// built in, not switchable). Loop and breakpoint values every section uses (QA loop limits, 19:23 IST).
export const LOOP_MS = 10000;          // every coded/CSS/GSAP loop: exactly 10.0 s, first frame = last frame
export const MIN_BEAT_MS = 1500;       // each beat holds >= 1.5 s
export const MAX_PRESSES = 3;          // <= 3 presses per loop, ~2 s apart
export const EASE_CSS = 'cubic-bezier(.45,0,.55,1)'; // soft sine in-out
export const MOBILE_MAX = 899;         // <= 899px: 390 layouts (matches media.js hero crop and living-room.css)
export const PIN_MIN = { width: 900, height: 640 }; // pinned scroll only at/above this viewport
export const ROOMS = [['living', 'Living room'], ['bedroom', 'Bedroom'], ['kitchen', 'Kitchen']];
