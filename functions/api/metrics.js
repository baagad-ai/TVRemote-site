const BUTTONS = new Set(['nav', 'hero', 'footer', 'guide', 'download']);
const PLATFORMS = new Set(['android', 'ios', 'windows', 'macos', 'linux', 'other']);
const RELEASE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
// Only these campaign sources are kept; anything else (missing, other, junk) is stored as 'none'.
export const SOURCES = new Set(['linkedin', 'x', 'instagram', 'qr', 'qr_site', 'threads']);
export function allowedSource(value) {
  if (typeof value !== 'string' || value.length > 32) return 'none';
  const source = value.trim().toLowerCase();
  return SOURCES.has(source) ? source : 'none';
}
const BODY_LIMIT = 1024;

// A single SQLite statement and trigger atomically enforce the shared UTC-day budget.
// download_click_daily_v2 (migration 0002, rebuilt by 0003 to allow 'qr' and 'qr_site' and by 0004 to allow 'threads') adds the source tag; the beta.8 table is left untouched.
export const RECORD_CLICK_SQL = `
INSERT INTO download_click_daily_v2 (day, event, release, button, platform, source, clicks)
SELECT ?, 'apk_download_click', ?, ?, ?, ?, 1
WHERE COALESCE((SELECT accepted FROM metrics_daily_budget WHERE day = ?), 0) < ?
ON CONFLICT (day, event, release, button, platform, source)
DO UPDATE SET clicks = clicks + 1`;

function reply(status) {
  return new Response(null, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

function boundedInteger(value, fallback, maximum) {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(String(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= maximum ? number : null;
}

function settings(env) {
  if (env.METRICS_ENABLED !== 'true' || !env.METRICS_DB?.prepare) return null;
  const origins = String(env.METRICS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  const releases = String(env.METRICS_ALLOWED_RELEASES || '').split(',').map(s => s.trim());
  if (!origins.length || origins.length > 8 || origins.some(origin => {
    try { const url = new URL(origin); return url.protocol !== 'https:' || url.origin !== origin; }
    catch { return true; }
  })) return null;
  if (!releases.length || releases.length > 8 || releases.some(value => !RELEASE.test(value))) return null;
  const dailyCap = boundedInteger(env.METRICS_DAILY_CAP, 1000, 5000);
  const perMinute = boundedInteger(env.METRICS_PER_MINUTE, 20, 60);
  return dailyCap && perMinute ? { origins, releases, dailyCap, perMinute } : null;
}

async function readEvent(request) {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > BODY_LIMIT)) throw new Error('body');
  if (!request.body) throw new Error('body');
  const reader = request.body.getReader();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), 2000);
  });
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let bytes = 0;
    let body = '';
    for (;;) {
      const chunk = await Promise.race([reader.read(), timeout]);
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > BODY_LIMIT) throw new Error('body');
      body += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(body + decoder.decode());
  } finally {
    clearTimeout(timer);
    // Do not await an untrusted stream's cancellation callback.
    reader.cancel().catch(() => {});
  }
}

export function createMetricsHandler(now = () => Date.now()) {
  let minute = -1;
  let attempts = 0;
  let saturatedDay = '';
  let retryAfter = 0;
  return async function handle({ request, env }) {
    if (request.method !== 'POST') return reply(405);
    const config = settings(env);
    if (!config) return reply(503);
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    if (url.pathname !== '/api/metrics' || url.search || origin !== url.origin || !config.origins.includes(origin)) return reply(403);
    const site = request.headers.get('sec-fetch-site');
    if (site && site !== 'same-origin') return reply(403);
    if (request.headers.get('sec-gpc') === '1' || request.headers.get('dnt') === '1') return reply(204);
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '')) return reply(415);

    const time = now();
    const day = new Date(time).toISOString().slice(0, 10);
    if (saturatedDay === day || time < retryAfter) return reply(429);
    // ponytail: per-isolate burst throttle only; D1 supplies the authoritative daily write cap.
    const currentMinute = Math.floor(time / 60000);
    if (minute !== currentMinute) { minute = currentMinute; attempts = 0; }
    if (++attempts > config.perMinute) return reply(429);

    let event;
    try { event = await readEvent(request); }
    catch { return reply(400); }
    const keys = event && typeof event === 'object' && !Array.isArray(event) ? Object.keys(event).sort().join(',') : '';
    if (!event || Array.isArray(event) || typeof event !== 'object' ||
        (keys !== 'button,event,platform,release' && keys !== 'button,event,platform,release,source') ||
        event.event !== 'apk_download_click' || !config.releases.includes(event.release) ||
        !BUTTONS.has(event.button) || !PLATFORMS.has(event.platform)) return reply(400);

    try {
      const result = await env.METRICS_DB.prepare(RECORD_CLICK_SQL)
        .bind(day, event.release, event.button, event.platform, allowedSource(event.source), day, config.dailyCap).run();
      if (!result.success) throw new Error('storage');
      if (result.meta?.changes === 0) { saturatedDay = day; return reply(429); }
      return reply(204);
    } catch {
      // A broken binding/database must not cause a query storm or disclose diagnostics.
      retryAfter = time + 60000;
      return reply(503);
    }
  };
}

export const onRequest = createMetricsHandler();
