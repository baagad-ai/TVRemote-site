# Redesign verification

Reviewed on 4 October 2026 in Brave on Windows, using isolated browser profiles with the browser sandbox enabled. All API responses and verification callbacks in browser QA were fixtures. No production signup POSTs or tester invitations were sent.

## Full-page review cycles

1. Built and captured the complete page at 320, 390, 768 and 1280 pixels. Review found the decorative border beam expanding the document horizontally. Constrained its paint containment, then rebuilt and retested all sections; only a one-pixel tablet hero overflow remained.
2. Reviewed the second captures, removed the tablet hero overhang, rebuilt and retested the entire page. All 44 cases passed without page errors, missing files or horizontal overflow.
3. Independent visual review of the third captures identified competing primary CTAs, the mobile dock covering screenshot content, unclear legacy screenshot provenance, and absent touch dragging. Made the header CTA secondary, suppressed the dock through screenshot sections, labeled the native sample screen and documented its limits, added horizontal touch movement, then rebuilt and retested the entire page. All 44 cases passed. The share copy describes phone-side review and does not require a TV approval dialog.

A fifth full-page run after the independent flow review's JavaScript-disabled control fix also passed all 44 cases. It is a verification rerun, not an additional full visual critique cycle.

## Final gates

- 35 frontend and Worker tests passed, including save-before-success, concurrent deduplication, uniform membership responses, daily capacity, challenge validation, failure cleanup, private export and overwrite protection.
- Nine static routes passed single-H1, title/description/canonical, link, screenshot dimensions, embedded GLB contract, notice and sitemap checks. Article Markdown bodies match their metadata exactly.
- The staged public allowlist contains 48 files. Its 50 versioned stylesheet, module, font and image references passed build verification. Brave ran the same interaction/lifecycle checks against these hashed files without hydration errors.
- 200% text enlargement passed without horizontal document overflow at all four widths. All nine pages remained readable without JavaScript; preview controls and signup capture stayed disabled until their runtime was ready.
- Scene controls worked with keyboard and touch. Native Brave touch gestures changed the artwork horizontally and preserved vertical page scrolling. Repeated scene/rays handoffs never exceeded one live WebGL context. Reduced motion and persisted page-hide events released the context and restored ordinary text; page return restored effects.
- Failed GLB requests retained the complete poster and native-screen overlay. Expected 503 console entries came from explicitly injected failure fixtures.
- Signup uncertain-save responses preserved inputs, required fresh verification, and showed a persistent error. Confirmed responses focused the terminal result, suppressed repeat capture and the sticky CTA, and reopened only on explicit reset.
- All six original native PNGs remain byte-identical to the published baseline. Four GLBs total 998,008 bytes; each is below 35,000 triangles. The initial app bundle is approximately 202 KB gzip, with the lazy Three.js chunk approximately 159 KB gzip; both are below the checked 240 KB ceiling.

## Practical limits

Real Google Play enrollment, actual TV command execution and playback were not tested by this website QA. The complete live Pages → Turnstile → Worker → D1 path with a genuine browser submission remains unverified. The backend configuration and data were not changed during the redesign. Screenshot fixtures and illustrated previews must not be treated as proof of a connected TV or playback.
