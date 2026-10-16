// File slots for Remote Build's production 3D (Concept B). Build delivers into /workspace/site-fix-1016/3d-prod/;
// copy the files into site/assets/3d-prod/ under these names. build-react.mjs lists that folder at build time; a slot
// switches from its placeholder to Build's file only when the file exists AND the slot is in PROD_WHITELIST below.
// If Build's README uses a different name, change the ONE string here. See /workspace/site-fix-1016/build-B/BUILD-NOTES.md.
/* global __PROD_FILES__ */
const present = typeof __PROD_FILES__ === 'undefined' ? {} : __PROD_FILES__;
export const PROD_NAMES = {
  heroWebm: 'hero-loop.webm', heroMp4: 'hero-loop.mp4',                // seamless 8-10 s loop, 1600x900, <= 500 KB each (390: poster only)
  hero1600: 'hero-1600.webp', hero960: 'hero-960.webp', hero640: 'hero-640.webp', hero4x5: 'hero-390-4x5.webp', // 1600 <= 120 KB (LCP)
  pinModel: 'pin-tv-phone.glb', pinContract: 'pin-contract.json',      // <= 300 KB; PhoneScreen + TVScreen; cam_search/cam_results/cam_link
  // Pin stills (reduced motion / no WebGL / 390): Build's 16:10 renders on desktop, 4:5 phone-over-TV below 900px.
  pinSearch: 'pin-step-1-16x10.webp', pinResults: 'pin-step-2-16x10.webp', pinLink: 'pin-step-3-16x10.webp',
  pinSearch4x5: 'pin-step-1.webp', pinResults4x5: 'pin-step-2.webp', pinLink4x5: 'pin-step-3.webp',
  livingWebm: 'rooms-living.webm', livingMp4: 'rooms-living.mp4', living1440: 'rooms-living-1440.webp', living4x5: 'rooms-living-4x5.webp',
  bedroomWebm: 'rooms-bedroom.webm', bedroomMp4: 'rooms-bedroom.mp4', bedroom1440: 'rooms-bedroom-1440.webp', bedroom4x5: 'rooms-bedroom-4x5.webp',
  kitchenWebm: 'rooms-kitchen.webm', kitchenMp4: 'rooms-kitchen.mp4', kitchen1440: 'rooms-kitchen-1440.webp', kitchen4x5: 'rooms-kitchen-4x5.webp' // Build, due ~21:15 IST 16 Oct
};
// Build's current 3d-prod renders are off-board and being re-rendered (16 Oct). A 3d-prod file is used ONLY when its
// slot key is listed here AND the file exists. Add a key (e.g. hero1600: true) once Design has checked that file
// against the approved board. Empty = every slot uses Design's approved assets / placeholders.
// Baagad 16 Oct 19:32 IST: the pin is our live 3D scene (Build's pin-tv-phone.glb). Other slots stay off.
export const PROD_WHITELIST = { pinModel: true };
export const prod = key => PROD_WHITELIST[key] === true && present[PROD_NAMES[key]] ? `assets/3d-prod/${PROD_NAMES[key]}` : null;
// Design's approved board assets (assets/board/, exported from concepts/img and concepts/render) until a whitelisted
// Build file replaces a slot. Rooms: the board's one rooms render serves every chip until Build's matching room
// loops/posters pass their side-by-side (no off-board stand-ins).
export const HERO = {
  srcset: prod('hero1600') ? `${prod('hero1600')} 1600w, ${prod('hero960') || prod('hero1600')} 960w, ${prod('hero640') || prod('hero1600')} 640w` : 'assets/board/hero-1920.webp 1920w, assets/board/hero-1600.webp 1600w, assets/board/hero-1280.webp 1280w, assets/board/hero-960.webp 960w, assets/board/hero-640.webp 640w',
  src: prod('hero1600') || 'assets/board/hero-1600.webp',
  crop: prod('hero4x5') || 'assets/board/hero-390.webp',
  webm: prod('heroWebm'), mp4: prod('heroMp4')
};
export const PIN = { model: prod('pinModel'), contract: prod('pinContract') };
const BOARD_ROOMS = 'assets/board/remote-rooms-1200.webp';
const room = k => ({ poster: prod(`${k}1440`) || BOARD_ROOMS, crop: prod(`${k}4x5`) || BOARD_ROOMS, webm: prod(`${k}Webm`), mp4: prod(`${k}Mp4`), board: !prod(`${k}1440`) });
export const ROOMS = { living: room('living'), bedroom: room('bedroom'), kitchen: room('kitchen') };
