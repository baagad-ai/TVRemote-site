# Cloudflare Pages migration

Status: Cloudflare project `tvremote-site` created on 7 October 2026. Its confirmed free production hostname is `https://tvremote-site.pages.dev/`; public cutover has not occurred. The inactive-release branch preview is https://analytics-preview.tvremote-site.pages.dev/ (deployment `27b7a34d-6039-403f-b407-f8dcf45b7166`). Its nine routes, metadata, signup removal, redirects and disabled metrics endpoint passed deployed smoke checks. No production deployment exists; collection remains disabled and the analytics tables contain no click or budget rows. Set `SITE_URL` to the production HTTPS origin; canonical tags, Open Graph URLs, sitemap and robots all use it. No domain purchase is required.

## Preview and production

Use existing authorized Cloudflare access and the existing GitHub connection. Do not create API tokens, change repository visibility or add paid services. The user approved OAuth renewal retaining user/account read, Workers scripts write, D1 write and Turnstile write, while adding only `pages:write`. The renewal completed on 7 October 2026; Pages, D1 and the existing beta Worker deployment access were verified read-only. No broader permissions or plan changes were requested.

The created project uses Direct Upload and production branch `main`. Build from the reviewed repository with `npm run build:pages`, output `_site`, Node 24; deploy using the existing authorized Wrangler. Direct Upload does not automatically build on GitHub pushes. If choosing Git integration later, Cloudflare requires a separate project; do not silently assume the existing project is connected. `CF_PAGES_BRANCH` selects production validation; direct production builds use `npm run build:pages:production` explicitly. Preview deployments retain the canonical production host.

The release remains `apkRelease: null` until the parent supplies the verified current-source final APK. To publish, populate `site/config.js` with immutable `id`, direct HTTPS `.apk` `url`, `version` and lowercase SHA-256. Set the build environment `VERIFIED_APK_SHA256` to that exact independently verified digest. A missing release, AAB URL or unmatched digest aborts production before build output is written. A local or branch preview can build without a release. This guard does not itself verify a signing certificate or download artifact bytes; those are release prerequisites.

For repeated local staging, remove only the verified repository `_site` build-output directory first. The stage script refuses a nonempty directory to prevent stale beta pages or private files from leaking into deployment. Keep all source, app checkouts and existing records intact.

## Metrics setup before production

`wrangler.jsonc` is nonsecret configuration. The separate metrics database `the-remote-download-metrics` was created with ID `0b9109ef-88b4-4521-9fcc-d043a09e9ef8`. Migration `0001_download_clicks.sql` applied successfully to remote D1 on 7 October 2026. Apply future `analytics/migrations` only to that database. Never substitute the beta intake database. Runtime variables are distinct from Pages build variables. Database identifiers are not authentication credentials; no public read endpoint exists.

Keep SQL migration files as LF via `.gitattributes`. Remote D1's trigger parser rejected a nested `CASE ... END` expression with error 7500 although local SQLite accepted it. The equivalent `SELECT RAISE(IGNORE) WHERE changes() = 0` trigger applied successfully, preserving the shared atomic cap. Failed attempts applied no partial analytics schema.

Set runtime `METRICS_ALLOWED_ORIGINS` to the confirmed exact site origin and `METRICS_ALLOWED_RELEASES` to the verified release ID; enable `METRICS_ENABLED=true` only after schema and endpoint validation. Keep preview metrics disabled with no production D1 binding. `METRICS_DAILY_CAP=1000` bounds accepted events; `METRICS_PER_MINUTE=20` is an isolate-local admission throttle. It does not guarantee a global request or D1 read-spend ceiling. Review usage in the existing account; do not change subscriptions.

Disable Pages Function persisted invocation logs/Workers Logs and Logpush in dashboard settings before enabling counters. No code logs request data, but the existing beta Worker's log setting does not govern the new Pages project. Pages' documented Wrangler subset does not list `observability`, so this file does not claim that an unsupported Worker field disables Pages logs.

Enable free Web Analytics under the Pages project, then verify the actual deployed beacon and dashboard visits/device/OS/browser/country/referrer/path/vitals. Do not add a duplicate manual beacon. Follow [ANALYTICS.md](ANALYTICS.md) for private D1 reports and click interpretation. `_routes.json` invokes Functions only for `/api/metrics`; static routes and assets stay static.

## Cutover and former GitHub URL

Before switching public traffic, test the confirmed Pages deployment's nine routes, download target/identity, mobile links, canonical metadata, privacy copy, metrics failure behavior and report. Keep existing beta Worker, D1 records and Turnstile service until intentional retirement.

The existing GitHub Pages workflow remains installed. Before cutover it validates source and skips publication entirely, keeping the current live site intact even if a release becomes active. After Cloudflare validation, set GitHub repository variables `SITE_URL` to the confirmed Pages origin, `VERIFIED_APK_SHA256` to the final APK digest, and `CLOUDFLARE_CUTOVER=true`. Its next deployment then publishes only transition pages with canonical links, meta refresh and visible navigation fallback. Six guide paths, privacy and guides index lead to matching new routes; the old archived comparison entry leads home. GitHub Pages cannot provide an HTTP 301 through these static files. Its 404 provides a new-home link. Cloudflare `_redirects` handles accidental `/TVRemote-site/*` URLs on the new host and removes archived preview URL access.

Do not set cutover variables before the Pages site and APK are verified. Do not disable GitHub Pages until the former-URL transition has been tested.

References: [Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [branch build commands](https://developers.cloudflare.com/pages/how-to/build-commands-branches/), [Functions Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/), [Function invocation routing](https://developers.cloudflare.com/pages/functions/routing/), [static headers](https://developers.cloudflare.com/pages/configuration/headers/), [static redirects](https://developers.cloudflare.com/pages/configuration/redirects/).
