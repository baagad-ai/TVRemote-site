# Source provenance

The redesigned site uses React components adapted from upstream source, rather than visual approximations. Retrieved 4 October 2026. Full third-party notices ship in `licenses/`; font notices remain in `assets/licenses/`.

## React Bits

Pinned revision: `ca44b3f9ee180676a06d7de8ec6bea84cddff85b`. React Bits uses its MIT + Commons Clause license; the full upstream notice is retained, including its redistribution restrictions.

- [LightRays.jsx](https://raw.githubusercontent.com/DavidHDev/react-bits/ca44b3f9ee180676a06d7de8ec6bea84cddff85b/src/content/Backgrounds/LightRays/LightRays.jsx), original SHA-256 `41e721f90473705cb8a94ed2475e844cf07f01540d4e1f48cfeb548940a879dd`.
- [SplitText.jsx](https://raw.githubusercontent.com/DavidHDev/react-bits/ca44b3f9ee180676a06d7de8ec6bea84cddff85b/src/content/TextAnimations/SplitText/SplitText.jsx), original SHA-256 `b772eacd09785760df08b9132414f7819a6aae2aa2a05c9e6c6df83491fd9e4c`.
- [ScrollStack.jsx](https://raw.githubusercontent.com/DavidHDev/react-bits/ca44b3f9ee180676a06d7de8ec6bea84cddff85b/src/content/Components/ScrollStack/ScrollStack.jsx), original SHA-256 `400d3d98f5d09e118b1e24939924655a6ed2a9894a92b6deace3d3398d891933`.

LightRays keeps the upstream shader and OGL renderer, with a shared GPU lease, visibility gates, owned cleanup and failure fallback. SplitText uses the upstream GSAP splitting and entrance, preserves the semantic H1, and restores unsplit text for reduced motion. ScrollStack retains upstream progress, scaling and pin-release behavior, uses native scrolling instead of Lenis, and switches to ordinary document flow on narrow or short viewports and keyboard focus.

## Magic UI

MIT-licensed registry components, with the full upstream notice retained:

- [Animated Beam](https://magicui.design/r/animated-beam.json), extracted TSX SHA-256 `6afa2ee1d01694a428eb8517d48deebe5c6b532dc0ee871800bb9d92aae43e79`.
- [Border Beam](https://magicui.design/r/border-beam.json), extracted TSX SHA-256 `ccdfb52cb8f2089e7823a9edfe9c3a52e52ab6759ed5b91d184b1e2bb80cf414`.

Their geometry, SVG gradients and CSS offset-path motion are preserved; dependencies are scoped locally. Animations play a finite pass and stop when inactive or reduced motion is requested. Aceternity ContainerScroll was excluded because public redistribution was not established.

## Original 3D scenes

The Remote Focus Series kit supplies four original embedded GLBs and nine transparent WebP posters. The imported kit SHA-256 is `e52517f5d2636bc1b5b267307f77661fe7fab3ce470fcb5626dde998184b0c7b`. `assets/3d/runtime-contract.json` records cameras, node names, screen UVs, poster screen quads and interaction limits. Blender source and private QA notes are retained outside the public artifact.

Three.js loads the same-origin GLBs lazily, with an official RoomEnvironment/PMREM light rig and no network HDRI. One shared WebGL lease allows at most one live context. Pointer and horizontal touch movement are bounded; room buttons, key previews and explicit handoff preview work with keyboard and touch. Native screenshots use the full original image as a texture or fallback SVG image, with no synthesized playback evidence.

## Screenshots and articles

The six native PNGs are unchanged from the published baseline; see [SHOWCASE-PROVENANCE.md](SHOWCASE-PROVENANCE.md). Six public article bodies and primary-source links came from The Remote Blog and Search Launch Kit. Internal keyword plans, editorial reviews and launch notes are excluded. Source-review dates are identified as such; the site does not invent a personal author, test date or TV playback result.
