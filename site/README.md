# The Remote website

This public repository contains The Remote beta landing page and privacy policy. The Android app is maintained separately; this repository contains no app source, build outputs, signing files, or release credentials.

- Website: https://baagad-ai.github.io/TVRemote-site/
- Privacy policy: https://baagad-ai.github.io/TVRemote-site/privacy/

The Remote is a free Android phone remote for compatible Android TV and Google TV devices. Compatibility and available controls vary by TV and its Android TV Remote Service version.

The email-only beta request form uses the existing Cloudflare Worker, private D1 database and hostname-restricted Turnstile widget. The validated GitHub Pages workflow deploys the public form from main. A genuine browser submission through the complete public Pages-to-Worker-to-D1 path remains unverified. Requests are reviewed privately; approved Google Play accounts are invited manually and must accept the Play opt-in before installing. See [Worker setup and private CSV export](../worker/README.md). The app has no account or developer-operated cloud relay; the website request service is separate.

## Landing-page copy

- Lead with a viewer task or benefit: search YouTube from a phone, identify a TV by room, or reach a pinned control.
- Give each heading, label, and caption enough context to make the action or benefit clear. Avoid narrating how the page or its artwork was built.
- Describe screenshots and illustrations accurately. Name what is visible, and say when a TV result or other outcome is not shown.
- Limit claims to shipped features and compatible devices. Do not promise support for every TV or add invented results, testimonials, counts, or endorsements.
- Keep beta copy honest: a request is not enrollment. A developer reviews each request and manually invites approved Google Play accounts; testers must accept the Play invitation before installing.

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
node --test site/beta-request.test.mjs worker/test/*.test.mjs
```

GitHub Actions runs these checks before deploying the public Pages artifact. No deployment tokens or secrets are stored in this repository.
