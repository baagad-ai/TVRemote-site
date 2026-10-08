# The Remote website

This public repository contains The Remote website and privacy policy. The Android app is maintained separately; this repository contains no app source, signing files, or release credentials.

- Former GitHub Pages URL: https://baagad-ai.github.io/TVRemote-site/ (legacy workflow is manually disabled)
- Cloudflare project hostname: https://theremote-site.pages.dev/ (`SITE_URL` sets canonical URLs and sitemap)

The Remote is a free Android phone remote for compatible Android TV and Google TV devices. Compatibility and available controls vary by TV and its Android TV Remote Service version.

Public beta-access CTAs are replaced with direct APK anchors. `site/config.js` identifies the approved, verified Play-signed beta.7 APK, with an immutable release ID, same-origin HTTPS URL, actual version and SHA-256. See [artifact evidence](docs/RELEASE-REQUIREMENTS.md#verified-beta7-artifact). Production publishing rejects an inactive release or any source-byte mismatch. Download anchors work without JavaScript; analytics never intercepts navigation.

Enable free Cloudflare Web Analytics for visits, platform and performance. A separate Pages Function records private daily download-click aggregates in a new D1 database. See [analytics setup and dashboard queries](docs/ANALYTICS.md) and [deployment/cutover](docs/PAGES-DEPLOYMENT.md). Recorded clicks are not unique people, installations or completed downloads; clicks/visits is directional only.

The existing beta Worker, private D1 database and earlier requests are preserved. Removing the form does not retire the API. See [existing beta service](worker/README.md) for established private management. Never apply analytics migrations to the beta database. The app has no account or developer-operated cloud relay; website analytics are separate.

## Landing-page copy

- Lead with a viewer task or benefit: search YouTube from a phone, review a shared link, choose app controls, or identify a TV by room.
- Give each heading, label, and caption enough context to make the action or benefit clear. Avoid narrating how the page or its artwork was built.
- Describe screenshots and illustrations accurately. The showcase captures show local demo screens; name what is visible and never imply that a TV is connected, a command was sent, or playback was confirmed.
- Limit claims to shipped features and compatible devices. Do not promise support for every TV or add invented results, testimonials, counts, or endorsements.
- Describe the approved APK accurately, without invented download counts or support for every TV.
- Distribution is the direct APK download on this site. Download buttons read "Download the app"; don't add Google Play, beta-access, invitation, waitlist, or request-access wording.
- Typing claims are YouTube-only. Say "search YouTube from your phone" or "share a YouTube link to the TV you pick". Don't claim typing into other TV apps or text fields, a general phone keyboard for the TV, password or login entry, or search in other apps (including through the optional TV companion).
- Home FAQ copy lives in `site/src/faq.json`; the build renders the visible FAQ and its FAQPage JSON-LD from that one file so they stay identical.

## Showcase screenshot notes

The native PNGs in `site/assets/showcase/` are unaltered captures from the app's local demo. Sample TV entries are UI fixtures, and displayed app actions are not reports from a connected TV. The screenshots do not demonstrate a command being sent, playback, or a saved edit. Per-image source and capture-state details are in [`site/SHOWCASE-PROVENANCE.md`](site/SHOWCASE-PROVENANCE.md).

## Static build

The source is in `site/`. Staging uses an explicit allowlist, then `node site/build.mjs _site` adds and verifies SHA-256 query versions for local stylesheets, scripts and module imports, fonts, images, and media. The Cloudflare output excludes source, tests, the beta service and earlier comparison preview trees. Keep the old GitHub Pages live until the Cloudflare deployment and verified APK are healthy; the transition artifact is separately gated.

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
npm test
```

The legacy GitHub Pages workflow is manually disabled and remains disabled. Current validation is the local production build, 56 tests and independent review; do not describe current-head GitHub CI as passed. No deployment tokens or secrets are stored in this repository.
