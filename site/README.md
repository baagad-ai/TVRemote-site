# The Remote website

This public repository contains The Remote beta landing page and privacy policy. The Android app is maintained separately; this repository contains no app source, build outputs, signing files, or release credentials.

- Website: https://baagad-ai.github.io/TVRemote-site/
- Privacy policy: https://baagad-ai.github.io/TVRemote-site/privacy/

The Remote is a free Android phone remote for compatible Android TV and Google TV devices. Compatibility and available controls vary by TV and its Android TV Remote Service version.

Beta access remains unavailable from this page until the official Google Play opt-in is ready. The beta video stays a placeholder until its current cut is accepted for publication. The site has no signup form, account system, analytics, or developer-operated cloud relay.

## Static build

The source is in `site/`. The GitHub Pages workflow stages an explicit file allowlist, then runs `node site/build.mjs _site`. The build adds and verifies SHA-256 query versions for local stylesheets, scripts and module imports, fonts, images, and media in the staged output. Public page and privacy URLs remain stable.

The site is static HTML, CSS, and JavaScript; it has no framework or runtime package installation. GSAP and ScrollTrigger 3.15.0 are self-hosted for reduced-motion-aware entrances and scroll-linked benefit emphasis. The Three.js 0.186.1 distribution and its license are in `site/vendor/three/`; the hero retains a complete static poster, and no WebGL scene is started until its scene module is available.

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
