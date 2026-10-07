# The Remote website

This public repository contains The Remote website and privacy policy. The Android app is maintained separately; this repository contains no app source, signing files, or release credentials.

- Website: https://baagad-ai.github.io/TVRemote-site/
- Privacy policy: https://baagad-ai.github.io/TVRemote-site/privacy/

The Remote is a free Android phone remote for compatible Android TV and Google TV devices. Compatibility and available controls vary by TV and its Android TV Remote Service version.

The migration candidate replaces beta signup with direct APK links. The release remains inactive until the final signed current-source APK identity is verified. Ordinary prerendered anchors work without JavaScript and click analytics never delays navigation. The existing beta service and private records remain intact; see [Worker management](../worker/README.md). Cloudflare Web Analytics supplies visit metrics; a separate D1 database stores private aggregate click totals. See [analytics](../docs/ANALYTICS.md) and [deployment](../docs/PAGES-DEPLOYMENT.md).

## Landing-page copy

- Lead with a viewer task or benefit: search YouTube from a phone, identify a TV by room, or reach a pinned control.
- Give each heading, label, and caption enough context to make the action or benefit clear. Avoid narrating how the page or its artwork was built.
- Describe screenshots and illustrations accurately. Name what is visible, and say when a TV result or other outcome is not shown.
- Limit claims to shipped features and compatible devices. Do not promise support for every TV or add invented results, testimonials, counts, or endorsements.
- Describe the approved direct APK and compatible devices accurately; do not invent download counts.

## Build and publication

React prerenders the landing page, privacy policy, guide index and six articles to readable HTML. site/src/ contains the UI and article metadata; site/content/guides/ holds matching article bodies. Generated HTML, CSS and runtime chunks are committed with their sources. Default motion includes sourced React Bits and Magic UI components plus original GLBs. Reduced motion, failed assets and JavaScript-disabled browsing retain static artwork and readable content.

npm ci --ignore-scripts --no-audit --no-fund installs exact locked dependencies. Node 24 is used in both workflow jobs.

npm run build regenerates the nine pages and runtime. Run node site/check.mjs, node site/check-config.mjs and npm test before publication. node site/stage.mjs _site stages only the public allowlist; node site/build.mjs _site versions head assets, fonts and module imports while preserving the React root for hydration. Old vanilla source and vendor files are retained for history but excluded from the deployed artifact.

See [SOURCE-PROVENANCE.md](SOURCE-PROVENANCE.md) for source pins, adaptations, full notices and original asset provenance, and [QA.md](QA.md) for verification and limitations. No emails, credentials, private research notes or authenticated exports belong in the public artifact.
