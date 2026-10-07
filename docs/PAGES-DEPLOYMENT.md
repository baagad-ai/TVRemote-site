# Cloudflare Pages migration

Status: source prepared; deployment has not occurred. The free `tvremote-site.pages.dev` name is a candidate until Cloudflare confirms availability. Set `SITE_URL` to the confirmed HTTPS origin (a trailing slash is normalized); canonical tags, Open Graph URLs, sitemap and robots all use it. No domain purchase is required.

## Preview and production

Use existing authorized Cloudflare access and the existing GitHub connection. Do not create tokens, change repository visibility or add paid services. The current CLI OAuth can read D1 but lacks `pages:write`; Pages list/deploy currently returns authentication error 10000. A user-authorized account login or supported connected route with Pages access is required. No scope refresh was performed. If the user later authorizes login, inspect the installed CLI with `wrangler login --help` and `wrangler login --scopes-list` before selecting minimum existing account/D1 and Pages scopes; do not execute a login automatically.

Connect repository `baagad-ai/TVRemote-site` to a Pages project. Use repository root, build command `npm run build:pages`, output `_site`, Node 24, and production branch `main`. Set `PAGES_PRODUCTION_BRANCH` if the actual production branch differs. `CF_PAGES_BRANCH` selects production validation; direct production builds use `npm run build:pages:production` explicitly. Preview deployments retain the canonical production host.

The release remains `apkRelease: null` until the parent supplies the verified current-source final APK. To publish, populate `site/config.js` with immutable `id`, direct HTTPS `.apk` `url`, `version` and lowercase SHA-256. Set the build environment `VERIFIED_APK_SHA256` to that exact independently verified digest. A missing release, AAB URL or unmatched digest aborts production before build output is written. A local or branch preview can build without a release. This guard does not itself verify a signing certificate or download artifact bytes; those are release prerequisites.

For repeated local staging, remove only the verified repository `_site` build-output directory first. The stage script refuses a nonempty directory to prevent stale beta pages or private files from leaking into deployment. Keep all source, app checkouts and existing records intact.

## Metrics setup before production

`wrangler.jsonc` is a nonsecret configuration template. Replace the separate metrics database ID placeholder after creating `the-remote-download-metrics` with existing authorized access. Apply `analytics/migrations` only to that new database. Never substitute the beta intake database. Runtime variables are distinct from Pages build variables.

Set runtime `METRICS_ALLOWED_ORIGINS` to the confirmed exact site origin and `METRICS_ALLOWED_RELEASES` to the verified release ID; enable `METRICS_ENABLED=true` only after schema and endpoint validation. Keep preview metrics disabled with no production D1 binding. `METRICS_DAILY_CAP=1000` bounds accepted events; `METRICS_PER_MINUTE=20` is an isolate-local admission throttle. It does not guarantee a global request or D1 read-spend ceiling. Review usage in the existing account; do not change subscriptions.

Disable Pages Function persisted invocation logs/Workers Logs and Logpush in dashboard settings before enabling counters. No code logs request data, but the existing beta Worker's log setting does not govern the new Pages project. Pages' documented Wrangler subset does not list `observability`, so this file does not claim that an unsupported Worker field disables Pages logs.

Enable free Web Analytics under the Pages project, then verify the actual deployed beacon and dashboard visits/device/OS/browser/country/referrer/path/vitals. Do not add a duplicate manual beacon. Follow [ANALYTICS.md](ANALYTICS.md) for private D1 reports and click interpretation. `_routes.json` invokes Functions only for `/api/metrics`; static routes and assets stay static.

## Cutover and former GitHub URL

Before switching public traffic, test the confirmed Pages deployment's nine routes, download target/identity, mobile links, canonical metadata, privacy copy, metrics failure behavior and report. Keep existing beta Worker, D1 records and Turnstile service until intentional retirement.

The existing GitHub Pages workflow remains installed. Before cutover it validates source and skips publication entirely, keeping the current live site intact even if a release becomes active. After Cloudflare validation, set GitHub repository variables `SITE_URL` to the confirmed Pages origin, `VERIFIED_APK_SHA256` to the final APK digest, and `CLOUDFLARE_CUTOVER=true`. Its next deployment then publishes only transition pages with canonical links, meta refresh and visible navigation fallback. Six guide paths, privacy and guides index lead to matching new routes; the old archived comparison entry leads home. GitHub Pages cannot provide an HTTP 301 through these static files. Its 404 provides a new-home link. Cloudflare `_redirects` handles accidental `/TVRemote-site/*` URLs on the new host and removes archived preview URL access.

Do not set cutover variables before the Pages site and APK are verified. Do not disable GitHub Pages until the former-URL transition has been tested.

References: [Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [branch build commands](https://developers.cloudflare.com/pages/how-to/build-commands-branches/), [Functions Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/), [Function invocation routing](https://developers.cloudflare.com/pages/functions/routing/), [static headers](https://developers.cloudflare.com/pages/configuration/headers/), [static redirects](https://developers.cloudflare.com/pages/configuration/redirects/).
