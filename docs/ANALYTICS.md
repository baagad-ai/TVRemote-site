# Private website analytics

## Visits and performance

In Cloudflare: **Workers & Pages → the Pages project → Metrics → Web Analytics → Enable**, then redeploy. Cloudflare injects the beacon on that deployment. Open **Web Analytics → the site's hostname** for visits, page views, device/OS/browser, country, referrer/path, page load time and Core Web Vitals. Use the same hostname and UTC date range when comparing click totals. Exclude preview hosts from the reporting population.

Web Analytics is free and does not offer custom events. Avoid injecting a second beacon manually. Verify the enabled beacon in deployed HTML and its requests before declaring visit analytics operational.

Official references: [Pages setup](https://developers.cloudflare.com/pages/how-to/web-analytics/), [Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/), [dimensions](https://developers.cloudflare.com/web-analytics/data-and-metrics/dimensions/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/).

## Private recorded clicks

`POST /api/metrics` is the only Function route. Its private `METRICS_DB` binding uses the separate D1 database `the-remote-download-metrics`, ID `0b9109ef-88b4-4521-9fcc-d043a09e9ef8`. Never reuse `the-remote-beta-requests`, database ID `361c5549-6046-4d2c-8a34-23bdcce72db0`. Keep preview counters disabled. The Function emits no request or diagnostic logs; Pages live logs are nonpersistent. No public report/read endpoint exists.

The browser sends exactly event, immutable release, button position and broad platform. The API accepts fixed allowlists and an explicitly configured same-origin HTTPS host. It rejects queries, extra fields, invalid types and bodies over 1024 bytes. It honors DNT and GPC. No cookies, local storage, persistent identifiers, raw IP, full user agent, referrer or query are stored. Hosting infrastructure still processes request metadata under Cloudflare's policy; absence of application logs does not mean the network host sees no requests.

The SQL stores UTC-day totals in `download_click_daily` and the aggregate cap in `metrics_daily_budget`. Production settings:

| Setting | Value |
| --- | --- |
| `METRICS_ENABLED` | `true` only after binding, schema, origins and release match are verified |
| `METRICS_ALLOWED_ORIGINS` | Exact HTTPS production origins, comma separated, at most 8; no trailing slash or wildcard |
| `METRICS_ALLOWED_RELEASES` | Approved immutable release IDs, comma separated, at most 8 |
| `METRICS_DAILY_CAP` | Start at `1000`; hard ceiling `5000` recorded clicks per UTC day |
| `METRICS_PER_MINUTE` | Start at `20`; maximum `60` attempts per isolate per minute |

The D1 statement and trigger atomically cap accepted daily clicks across all dimensions. Each accepted click changes at most two rows. After saturation an isolate stops SQL until the next day; database errors cause a one-minute cooldown. The burst limiter is per isolate and does not identify visitors. Origin and browser headers do not authenticate a human: bots can forge them. Counters are directional, not fraud-proof.

The hard cap bounds writes, **not all Workers requests or D1 reads**. Distributed abuse can hit multiple isolates. Pages Functions count against Workers quotas and D1 operations against D1 quotas. This adds no subscription, but a paid Workers account can incur usage charges beyond included quotas. Do not claim zero-cost or a hard spend cap. Monitor included usage and keep caps low; set `METRICS_ENABLED=false` to stop SQL, or remove the Function route/deployment to stop Function invocations. Do not enable new paid products or upgrade plans for this setup.

## Dashboard report

Open **Storage & databases → D1 → the-remote-download-metrics → Console**. These SELECT queries are private and read-only; use explicit UTC start/end dates (end excluded).

Daily recorded clicks:

```sql
SELECT day, SUM(clicks) AS recorded_clicks
FROM download_click_daily
WHERE day >= '2026-10-07' AND day < '2026-11-01'
GROUP BY day ORDER BY day;
```

Release, platform and button breakdown:

```sql
SELECT release, platform, button, SUM(clicks) AS recorded_clicks
FROM download_click_daily
WHERE day >= '2026-10-07' AND day < '2026-11-01'
GROUP BY release, platform, button
ORDER BY recorded_clicks DESC;
```

Cap visibility (a day at the configured cap is censored, not a complete count):

```sql
SELECT day, accepted AS recorded_clicks
FROM metrics_daily_budget
ORDER BY day DESC LIMIT 30;
```

For directional clicks/visits, take SUM(clicks) for the same production hostname, UTC date window and release population, divide by Cloudflare Web Analytics visits and multiply by 100. Label it **recorded clicks per 100 visits**. It can exceed 100 because repeats count. Beacon blocking, regional collection, sampling, rate limits and navigations make the ratio approximate. Never label it unique downloaders, completed downloads, installs or conversion.

Useful weekly checks: visits by platform, top entry/referring paths, recorded clicks by button/release/platform, capped days, API error/429 totals without payload logs, and Core Web Vitals. Download completion is not observable from this counter.

## Verification and retention

Use an isolated preview D1 database for deployed smoke tests; never use the beta database or silently pollute production totals. Check disabled/malformed requests write nothing; a valid synthetic event increments one bucket; the cap stops writes; other origins fail; and the APK anchor works with JavaScript disabled and API failure. SQL tests run against Node's actual SQLite engine. Keep aggregates private. Retention cleanup is an operator choice; no automatic deletion or export of existing beta records is part of this migration.
