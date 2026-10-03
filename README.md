# The Remote website

This public repository contains The Remote beta landing page and privacy policy. The Android app is maintained separately; this repository contains no app source, build outputs, signing files, or release credentials.

- Website: https://baagad-ai.github.io/TVRemote-site/
- Privacy policy: https://baagad-ai.github.io/TVRemote-site/privacy/

The Remote is a free Android phone remote for compatible Android TV and Google TV devices. Compatibility and available controls vary by TV and its Android TV Remote Service version.

The Remote already has testers. The public Google Play beta sign-up link is being prepared and will be added here when it is ready. This page does not collect signup details or use analytics. The app does not require an account or route remote commands through a developer-operated cloud relay.

## Landing-page copy

- Lead with a viewer task or benefit: search YouTube from a phone, review a shared link, choose app controls, or identify a TV by room.
- Give each heading, label, and caption enough context to make the action or benefit clear. Avoid narrating how the page or its artwork was built.
- Describe screenshots and illustrations accurately. The showcase captures show local demo screens; name what is visible and never imply that a TV is connected, a command was sent, or playback was confirmed.
- Limit claims to shipped features and compatible devices. Do not promise support for every TV or add invented results, testimonials, counts, or endorsements.
- Keep beta copy honest: testers already use The Remote, but the public opt-in link is pending. Leave the Google Play CTA disabled until its official URL is ready; this page does not collect signup details.

## Showcase screenshot notes

The native PNGs in `site/assets/showcase/` are unaltered captures from the app's local demo. Sample TV entries are UI fixtures, and displayed app actions are not reports from a connected TV. The screenshots do not demonstrate a command being sent, playback, or a saved edit. Per-image source and capture-state details are in [`site/SHOWCASE-PROVENANCE.md`](site/SHOWCASE-PROVENANCE.md).

## Static build

The source is in `site/`. The GitHub Pages workflow stages an explicit file allowlist, then runs `node site/build.mjs _site`. The build adds and verifies SHA-256 query versions for local stylesheets, scripts and module imports, fonts, images, and media in the staged output. Public page and privacy URLs remain stable.

The site is static HTML, CSS, and JavaScript; it has no framework or runtime package installation. GSAP and ScrollTrigger 3.15.0 are self-hosted for reduced-motion-aware entrances and reversible, scroll-linked story movement. The Three.js 0.186.1 distribution and its license are in `site/vendor/three/`; the hero retains a complete static poster, and no WebGL scene is started until its scene module is available.

Third-party notices:

- GSAP and ScrollTrigger: `site/vendor/gsap/LICENSE-NOTICE.txt` and upstream license headers.
- Three.js: `site/vendor/three/LICENSE`.
- Work Sans and Outfit: `site/assets/licenses/`.

## Checks

Run the dependency-free checks from the repository root:

```sh
node --check site/site.js
node --check site/config.js
node --check site/build.mjs
node site/check.mjs
node site/check-config.mjs
```

GitHub Actions runs these checks before deploying the public Pages artifact. No deployment tokens or secrets are stored in this repository.
