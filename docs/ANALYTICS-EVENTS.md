# Page events (`POST /api/events`)

Cookie-free, aggregate-only page analytics for Marketing's client code. Handler: `functions/api/events.js`. Schema: `analytics/migrations/0005_page_events.sql`. Tests: `analytics/tests/events.test.mjs`.

## What is stored

Only daily counters in `page_event_daily`: UTC day, event, key, bucket, source, ref, campaign, country and device, plus a count. There is no IP, user agent, cookie, URL, path, query, visitor or session ID, and no time finer than the UTC day. Country comes from Cloudflare's `request.cf.country` (two uppercase letters, otherwise `XX`). Nothing is stored on the device: no cookies, `localStorage`, `sessionStorage` or IndexedDB. Every value is recomputed on each page view.

The daily budget lives in `page_event_budget`, separate from the download counter's `metrics_daily_budget`. `EVENTS_DAILY_CAP` (default 20000, max 50000) caps accepted events per UTC day, and a SQL trigger enforces a hard ceiling of 50000. Near the cap a batch can be stored only in part: its leading events are kept, the rest are dropped, and the reply is 429. `EVENTS_PER_MINUTE` (default 120, max 600) is a per-isolate request throttle. The endpoint is enabled by `METRICS_ENABLED=true` plus the `METRICS_DB` binding, and it accepts only the same-origin hosts in `METRICS_ALLOWED_ORIGINS`. The preview env alone sets `EVENTS_ALLOW_ORIGIN_WILDCARD=true`, so `https://*.theremote-site.pages.dev` matches one preview subdomain label. Production stays an exact list.

## Sending

Send one beacon per page view on `pagehide`, and also when `visibilitychange` reaches `hidden`. Batch every event collected since the last send into it, then clear the queue so nothing is sent twice. Keep at most 40 events per body; a 40-event body is well under the 4096-byte limit.

```js
const queue = [{ e: 'page_view' }];
const track = (e, k, b) => { if (queue.length < 40) queue.push(Object.assign({ e }, k && { k }, b && { b })); };
const params = new URLSearchParams(location.search);
const ref = (() => { try { return document.referrer ? new URL(document.referrer).hostname : ''; } catch { return ''; } })();
const dev = matchMedia('(pointer: coarse)').matches ? (Math.min(screen.width, screen.height) >= 600 ? 'tablet' : 'phone') : 'desktop';
function flush() {
  if (!queue.length || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) { queue.length = 0; return; }
  const body = { v: 1, src: params.get('utm_source') || 'none', ref: ref === location.hostname ? '' : ref, dev,
    cmp: params.get('utm_campaign') || undefined, events: queue.splice(0, 40) };
  navigator.sendBeacon('/api/events', new Blob([JSON.stringify(body)], { type: 'application/json' }));
}
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
```

The server re-checks the DNT and GPC headers and replies 204 without storing anything. `sendBeacon` sends cookies by default, but the endpoint never reads them.

## Body contract

`{ "v": 1, "src": string, "ref": string, "dev": "phone"|"tablet"|"desktop", "cmp"?: string, "events": [ ...1 to 40 ] }`. No other keys are allowed. `src`, `ref` and `cmp` must be strings of up to 256 characters. The server normalizes their values:

- `src` (from `utm_source`): `x`, `threads`, `reddit`, `instagram`, `linkedin`, `qr`, `qr_site`, `guide` or `none`. Anything else becomes `none`.
- `ref`: the referrer's bare hostname, lowercased, with a leading `www.` stripped. It is kept only for `google.com`, `bing.com`, `duckduckgo.com`, `reddit.com`, `x.com`, `t.co`, `threads.net`, `instagram.com`, `linkedin.com`, `youtube.com`, `github.com`, `news.ycombinator.com` and `producthunt.com`. `''` is stored as `direct`, and anything else (including full URLs and other subdomains) as `other`.
- `cmp` (from `utm_campaign`): `release`, `launch`, `guide` or `none`. Any other value is stored as `other`, and a missing one as `none`. The held X post link uses `?utm_source=x&utm_medium=social&utm_campaign=release`. `utm_medium` is not sent.

Each event is `{ e, k?, b? }`, and only these combinations are valid:

| `e` | `k` | `b` |
| --- | --- | --- |
| `page_view` | none | none |
| `section_view` | `hero`, `search`, `guests`, `trackpad`, `download` | none |
| `click` | `download`, `qr`, `faq`, `guide`, `article`, `header` | none |
| `install_steps_open` | none | none |
| `loop_play` | `hero`, `pin`, `rooms_living`, `rooms_bedroom`, `rooms_kitchen` | none |
| `time_on_page` | none | `lt5`, `5_30`, `30_120`, `gt120` (seconds) |
| `vital` | `lcp`, `inp`, `cls` | `good`, `ni`, `poor` |
| `js_error` | none | none |
| `broken_link` | none | none |

"None" means the property must be omitted, not sent as `null` or `''`. A single invalid event rejects the whole batch with 400.

## Responses

All responses have an empty body and `Cache-Control: no-store`. `204` stored, or DNT/GPC. `400` bad body, over 4096 bytes, or not received within 2 s. `403` wrong path, query string, origin, or `Sec-Fetch-Site`. `405` not POST. `415` not `application/json`. `429` throttled or daily cap reached. `503` disabled, misconfigured, or storage error (followed by a 60 s back-off in that isolate).
