# Concept B "Living Room": 3D file slots (Remote Build)

Copy Build's files from `/workspace/site-fix-1016/3d-prod/` into `site/assets/3d-prod/` (pin screen textures into
`site/assets/3d-prod/textures/`), then rebuild. `build-react.mjs` lists that folder; each slot in `src/b/media.js`
(`PROD_NAMES`) switches from its placeholder to Build's file when the file exists. A rename means changing one string there.
Budgets: each GLB 300 KB or less, each video loop 500 KB or less, hero-1600 poster 120 KB or less.

| Slot | Expected file in `site/assets/3d-prod/` | Status (16 Oct, 18:50 IST) | Placeholder until then |
|---|---|---|---|
| Hero loop | `hero-loop.webm`, `hero-loop.mp4` (seamless 8-10 s loop, 1600x900) | not delivered | poster only |
| Hero posters | `hero-1600.webp`, `hero-960.webp`, `hero-640.webp`, `hero-390-4x5.webp` | wired (17 KB / 9 KB / 6 KB / 9 KB) | `assets/b/hero-placeholder-*` |
| Pin scene | `pin-tv-phone.glb` (91 KB, meshopt) + `pin-contract.json` v1 + `textures/*.webp` | wired, live | `assets/3d/remote-hero.glb` + drawn TV textures |
| Pin stills | `pin-step-{1,2,3}-16x10.webp` (desktop), `pin-step-{1,2,3}.webp` (4:5, 390) | wired (checked by eye: 1 search, 2 results, 3 link) | drawn TV + real phone captures |
| Rooms loops | `rooms-living.webm/.mp4`, `rooms-bedroom.webm/.mp4` (seamless 8-10 s loops) | not delivered | posters only |
| Rooms posters | `rooms-living-1440.webp`, `rooms-living-4x5.webp`, `rooms-bedroom-1440.webp`, `rooms-bedroom-4x5.webp` | not delivered | `assets/b/rooms-placeholder-*` (rendered from `remote-rooms.glb`) |

Pin runtime (`src/b/pin-runtime.js`) reads Build's contract as delivered: `nodes.phone_screen` / `nodes.tv_screen`,
cameras `cam_search` / `cam_results` / `cam_link` (position + target + vertical fov), `timeline.camera_moves[].progress`,
and `timeline.texture_swaps[]` (one screen per swap, 0.2 s crossfade, never inside a camera move), `flipY:false`,
Build's lighting (environment 0.45, one key light, exposure 1). The GLB needs `EXT_meshopt_compression`, so the lazy
pin chunk includes three's meshopt decoder.

Video loops get `data-track-loop` = `hero`, `rooms-living`, `rooms-bedroom` (analytics `loop_play`); the pin sends
`remote:loop` with `k:'pin'` when its ScrollTrigger becomes active.
