# The Remote website

This public repository contains The Remote beta landing page and privacy policy. The Android app is maintained separately; this repository contains no app source, build outputs, signing files, or release credentials.

- Website: https://theremote-site.pages.dev/
- Privacy policy: https://theremote-site.pages.dev/privacy/

The Remote is a free Android phone remote for compatible Android TV and Google TV devices. Compatibility and available controls vary by TV and its Android TV Remote Service version.

The live public site is hosted on Cloudflare Pages at theremote-site.pages.dev. Email-only beta access requests use the existing Cloudflare Worker, private D1 database and hostname-restricted Turnstile widget. The validated GitHub Actions workflow still stages and checks the public form from main. A genuine browser submission through the public Pages-to-Worker-to-D1 path remains unverified. Requests are reviewed privately; approved Google Play accounts are invited manually and must accept the Play opt-in before installing. See [Worker setup and private CSV export](worker/README.md). The app has no account or developer-operated cloud relay; the website request service is separate.

## Landing-page copy

- Lead with a viewer task or benefit: search YouTube from a phone, review a shared link, choose app controls, or identify a TV by room.
- Give each heading, label, and caption enough context to make the action or benefit clear. Avoid narrating how the page or its artwork was built.
- Describe screenshots and illustrations accurately. The showcase captures show local demo screens; name what is visible and never imply that a TV is connected, a command was sent, or playback was confirmed.
- Limit claims to shipped features and compatible devices. Do not promise support for every TV or add invented results, testimonials, counts, or endorsements.
- Keep beta copy honest: a request is not enrollment. A developer reviews each request and manually invites approved Google Play accounts; testers must accept the Play invitation before installing.

## Showcase screenshot notes

The native PNGs in `site/assets/showcase/` are unaltered captures from the app's local demo. Sample TV entries are UI fixtures, and displayed app actions are not reports from a connected TV. The screenshots do not demonstrate a command being sent, playback, or a saved edit. Per-image source and capture-state details are in [`site/SHOWCASE-PROVENANCE.md`](site/SHOWCASE-PROVENANCE.md).

## Static build

The source is in `site/`. The GitHub Pages workflow stages an explicit file allowlist, then runs `node site/build.mjs _site`. The build adds and verifies SHA-256 query versions for local stylesheets, scripts and module imports, fonts, images, and media in the staged output. Public page and privacy URLs remain stable.

The site prerenders nine public React pages. Run `npm ci --ignore-scripts` and `npm run build` to generate their HTML and bundled runtime. GSAP supplies a single reduced-motion-aware headline entrance. Native app evidence stays in full-resolution HTML images; one lazily loaded Three.js destination scene uses exact authored cameras, matched poster fallbacks and a single GPU lease. The original app PNGs are preserved.

Third-party notices are retained in `site/licenses/` and `site/assets/licenses/`. See [source provenance](site/SOURCE-PROVENANCE.md), [reference adaptation](site/ONE-PAGE-LOVE-STORY.md) and [verification](site/QA.md).

## Checks

After installing the pinned dependencies, run the checks from the repository root:

```sh
npm run build
node --check site/config.js
node --check site/build.mjs
node site/check.mjs
node site/check-config.mjs
node --test site/beta-request.test.mjs worker/test/*.test.mjs
```

GitHub Actions runs these checks before deploying the public Pages artifact. No deployment tokens or secrets are stored in this repository.
