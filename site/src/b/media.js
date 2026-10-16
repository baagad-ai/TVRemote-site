// File slots for Remote Build's production 3D (Concept B). Build delivers into /workspace/site-fix-1016/3d-prod/;
// copy the files into site/assets/3d-prod/ under these names. build-react.mjs lists that folder at build time and a
// slot switches from its placeholder to Build's file as soon as the file exists, so the swap needs no code change.
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
  bedroomWebm: 'rooms-bedroom.webm', bedroomMp4: 'rooms-bedroom.mp4', bedroom1440: 'rooms-bedroom-1440.webp', bedroom4x5: 'rooms-bedroom-4x5.webp'
};
export const prod = key => present[PROD_NAMES[key]] ? `assets/3d-prod/${PROD_NAMES[key]}` : null;
// Placeholders used until Build's files land (existing site assets and Design's approved concept render).
export const HERO = {
  srcset: prod('hero1600') ? `${prod('hero1600')} 1600w, ${prod('hero960') || prod('hero1600')} 960w, ${prod('hero640') || prod('hero1600')} 640w` : 'assets/b/hero-placeholder-1600.webp 1600w, assets/b/hero-placeholder-960.webp 960w, assets/b/hero-placeholder-640.webp 640w',
  src: prod('hero1600') || 'assets/b/hero-placeholder-1600.webp',
  crop: prod('hero4x5') || 'assets/b/hero-placeholder-4x5.webp',
  webm: prod('heroWebm'), mp4: prod('heroMp4')
};
export const PIN = { model: prod('pinModel'), contract: prod('pinContract'), stills: [prod('pinSearch'), prod('pinResults'), prod('pinLink')], stills4x5: [prod('pinSearch4x5'), prod('pinResults4x5'), prod('pinLink4x5')] };
export const ROOMS = {
  living: { poster: prod('living1440') || 'assets/b/rooms-placeholder-living-1440.webp', crop: prod('living4x5') || 'assets/b/rooms-placeholder-living-4x5.webp', webm: prod('livingWebm'), mp4: prod('livingMp4') },
  bedroom: { poster: prod('bedroom1440') || 'assets/b/rooms-placeholder-bedroom-1440.webp', crop: prod('bedroom4x5') || 'assets/b/rooms-placeholder-bedroom-4x5.webp', webm: prod('bedroomWebm'), mp4: prod('bedroomMp4') }
};
