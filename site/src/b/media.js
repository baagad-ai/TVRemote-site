// File slots for Remote Build's production 3D (Concept B). Build delivers into /workspace/site-fix-1016/3d-prod/;
// copy the files into site/assets/3d-prod/ under these names. build-react.mjs lists that folder at build time; a slot
// switches from its placeholder to Build's file only when the file exists AND the slot is in PROD_WHITELIST below.
// If Build's README uses a different name, change the ONE string here. See /workspace/site-fix-1016/build-B/BUILD-NOTES.md.
/* global __PROD_FILES__ */
const present = typeof __PROD_FILES__ === 'undefined' ? {} : __PROD_FILES__;
export const PROD_NAMES = {
  // Hero (Build's final reframe, 16 Oct 20:56 IST): 16:9 loop 1600x900 (framing baked in) + 390 4:5 loop 720x900,
  // posters = loop frame 0. The 9:16 files were retired (git rm) and are no longer slots.
  heroWebm: 'hero-loop.webm', heroMp4: 'hero-loop.mp4',                // seamless 10.0 s loop, <= 500 KB each
  hero1920: 'hero-1920.webp', hero1600: 'hero-1600.webp', hero960: 'hero-960.webp', hero640: 'hero-640.webp', // 1600 <= 120 KB (LCP)
  heroWebm4x5: 'hero-loop-390-4x5.webm', heroMp44x5: 'hero-loop-390-4x5.mp4', // 390 4:5 loop 720x900
  hero4x5: 'hero-390-4x5.webp',                                         // 390 poster for the 4:5 box
  pinModel: 'pin-tv-phone.glb', pinContract: 'pin-contract.json',      // <= 300 KB; PhoneScreen + TVScreen; cam_search/cam_results/cam_link
  // Pin stills, re-rendered by Build from our 3D with Design's code-drawn screens (due 20:35-22:00 IST 16 Oct, into
  // /workspace/site-fix-1016/loops-incoming/; copy here). The earlier pin-step-*.webp had real app captures on the phone
  // and were removed (PM 16 Oct). Until these land, PinStory draws an interim still in code (SVG TV + phoneScreenSvg).
  pinFallback: 'pin-fallback-step-1-1440.webp',                        // desktop: step 1 under the canvas (1600x1000, Build 21:11)
  pinStill1: 'pin-still-1-390.webp', pinStill2: 'pin-still-2-390.webp', pinStill3: 'pin-still-3-390.webp', // 390 / reduced motion, phone over TV
  // Rooms diorama (PM 16 Oct: the diorama replaces the rejected single-room renders): one 10 s loop per room
  // (webm + mp4), its 1440 poster and a 390 4:5 poster, plus the diorama still that stands in for any room without
  // its own poster yet.
  livingWebm: 'rooms-living.webm', livingMp4: 'rooms-living.mp4', living1440: 'rooms-living-1440.webp', living4x5: 'rooms-living-390-4x5.webp',
  bedroomWebm: 'rooms-bedroom.webm', bedroomMp4: 'rooms-bedroom.mp4', bedroom1440: 'rooms-bedroom-1440.webp', bedroom4x5: 'rooms-bedroom-390-4x5.webp',
  kitchenWebm: 'rooms-kitchen.webm', kitchenMp4: 'rooms-kitchen.mp4', kitchen1440: 'rooms-kitchen-1440.webp', kitchen4x5: 'rooms-kitchen-390-4x5.webp'
};
// A 3d-prod file is used ONLY when its slot key is listed here AND the file exists in site/assets/3d-prod/.
// Baagad 16 Oct 19:32 IST: the pin is our live 3D scene (Build's pin-tv-phone.glb). PM 19:44: the pin fallback / 390
// still slots point at Build's re-renders (code-drawn screens). PM 20:22: hero and rooms-diorama slots too, so each
// section switches to Build's final files as soon as they are copied in; until then the stand-ins below stay.
// Copy only files Build has marked final (never a partial encode, never the rejected single-room renders).
export const PROD_WHITELIST = Object.fromEntries(['pinModel', 'pinFallback', 'pinStill1', 'pinStill2', 'pinStill3',
  'heroWebm', 'heroMp4', 'heroWebm4x5', 'heroMp44x5', 'hero1920', 'hero1600', 'hero960', 'hero640', 'hero4x5',
  ...['living', 'bedroom', 'kitchen'].flatMap(k => [`${k}Webm`, `${k}Mp4`, `${k}1440`, `${k}4x5`])].map(k => [k, true]));
export const prod = key => PROD_WHITELIST[key] === true && present[PROD_NAMES[key]] ? `assets/3d-prod/${PROD_NAMES[key]}` : null;
// Design's approved board assets (assets/board/, exported from concepts/img and concepts/render) until a whitelisted
// Build file replaces a slot. Rooms: the board's one rooms render serves every chip until Build's matching room
// loops/posters pass their side-by-side (no off-board stand-ins).
export const HERO = {
  srcset: prod('hero1600') ? [[prod('hero1920'), 1920], [prod('hero1600'), 1600], [prod('hero960') || prod('hero1600'), 960], [prod('hero640') || prod('hero1600'), 640]].filter(([u]) => u).map(([u, w]) => `${u} ${w}w`).join(', ') : 'assets/board/hero-1920.webp 1920w, assets/board/hero-1600.webp 1600w, assets/board/hero-1280.webp 1280w, assets/board/hero-960.webp 960w, assets/board/hero-640.webp 640w',
  src: prod('hero1600') || 'assets/board/hero-1600.webp',
  // 390 (PM 20:29): a 4:5 box, poster hero-390-4x5.webp; the 4:5 loop plays over it once Build's hero-loop-390-4x5.*
  // files exist, until then the poster alone. The board's own 390 crop only while no Build poster is present.
  crop: prod('hero4x5') || 'assets/board/hero-390.webp',
  webm: prod('heroWebm'), mp4: prod('heroMp4'),
  webm4x5: prod('heroWebm4x5'), mp44x5: prod('hero4x5') && prod('heroMp44x5')
};
export const PIN = { model: prod('pinModel'), contract: prod('pinContract'), fallback: prod('pinFallback'), stills: [prod('pinStill1'), prod('pinStill2'), prod('pinStill3')] };
const BOARD_ROOMS = 'assets/board/remote-rooms-1200.webp';
// Per room: Build's room poster, else the diorama still, else the board's rooms render (all chips). A loop plays only
// over its own room poster.
// Build's FINAL room loops (16 Oct 21:05 IST): 1440x760 10 s loop + 1440 poster + 390 4:5 poster (780x975) per room.
const room = k => {
  const own = prod(`${k}1440`);
  return { poster: own || BOARD_ROOMS, crop: prod(`${k}4x5`) || own || BOARD_ROOMS, webm: own && prod(`${k}Webm`), mp4: own && prod(`${k}Mp4`), board: !own, own: Boolean(own) };
};
export const ROOMS = { living: room('living'), bedroom: room('bedroom'), kitchen: room('kitchen') };
