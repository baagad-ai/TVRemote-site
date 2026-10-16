// Cookie-free page analytics. Stores only daily aggregate counters: no IP, user agent,
// visitor/session ID, URL, query string or timestamp finer than the UTC day.
// Hardening mirrors functions/api/metrics.js (which this file deliberately does not import or change).
export const SOURCES = new Set(['x', 'threads', 'reddit', 'instagram', 'linkedin', 'qr', 'qr_site', 'guide', 'none']);
export const REFS = new Set(['google.com', 'bing.com', 'duckduckgo.com', 'reddit.com', 'x.com', 't.co', 'threads.net',
  'instagram.com', 'linkedin.com', 'youtube.com', 'github.com', 'news.ycombinator.com', 'producthunt.com']);
export const CAMPAIGNS = new Set(['release', 'launch', 'guide', 'none']);
export const DEVICES = new Set(['phone', 'tablet', 'desktop']);
const set = (...values) => new Set(values);
// For each event: allowed k values (null = k must be absent) and allowed b values (null = b must be absent).
export const EVENTS = new Map([
  ['page_view', { k: null, b: null }],
  ['section_view', { k: set('hero', 'search', 'guests', 'trackpad', 'download'), b: null }],
  ['click', { k: set('download', 'qr', 'faq', 'guide', 'article', 'header'), b: null }],
  ['install_steps_open', { k: null, b: null }],
  ['loop_play', { k: set('hero', 'pin', 'rooms_living', 'rooms_bedroom'), b: null }],
  ['time_on_page', { k: null, b: set('lt5', '5_30', '30_120', 'gt120') }],
  ['vital', { k: set('lcp', 'inp', 'cls'), b: set('good', 'ni', 'poor') }],
  ['js_error', { k: null, b: null }],
  ['broken_link', { k: null, b: null }],
]);
const BODY_LIMIT = 4096;
const MAX_EVENTS = 40;
const HARD_DAILY_CAP = 50000;
const HOST = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/;
const LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';

export function allowedSource(value) {
  const source = value.trim().toLowerCase();
  return SOURCES.has(source) ? source : 'none';
}

export function allowedCampaign(value) {
  if (value === undefined) return 'none';
  const campaign = value.trim().toLowerCase();
  return CAMPAIGNS.has(campaign) ? campaign : 'other';
}

// ref is a bare host (the client sends document.referrer's hostname, or '' when there is none).
export function allowedRef(value) {
  let host = value.trim().toLowerCase();
  if (host === '') return 'direct';
  if (host.startsWith('www.')) host = host.slice(4);
  return HOST.test(host) && REFS.has(host) ? host : 'other';
}

export function country(cf) {
  const value = cf?.country;
  return typeof value === 'string' && /^[A-Z]{2}$/.test(value) ? value : 'XX';
}

// Every event is one bounded upsert, gated like RECORD_CLICK_SQL in metrics.js: a row is written only
// while the day's page_event_budget is below the configured cap. The budget only grows, so if a batch
// meets the cap midway its leading events are kept, the rest are dropped and the handler replies 429.
// The 0005 trigger keeps a hard 50000/day ceiling even if this guard is bypassed.
export const RECORD_EVENT_SQL = `
INSERT INTO page_event_daily (day, event, key, bucket, source, ref, campaign, country, device, count)
SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 1
WHERE COALESCE((SELECT accepted FROM page_event_budget WHERE day = ?), 0) < ?
ON CONFLICT (day, event, key, bucket, source, ref, campaign, country, device)
DO UPDATE SET count = count + 1`;

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

// Exact https origins, as in metrics.js. Only when EVENTS_ALLOW_ORIGIN_WILDCARD is 'true'
// (set in the preview env alone) may an entry be https://*.<host>, matching one subdomain label.
function originMatcher(entry, wildcards) {
  if (wildcards && entry.startsWith('https://*.')) {
    const host = entry.slice('https://*.'.length);
    if (!HOST.test(host) || !host.includes('.')) return null;
    const pattern = new RegExp(`^https://${LABEL}\\.${host.replace(/[.-]/g, '\\$&')}$`);
    return origin => pattern.test(origin);
  }
  try {
    const url = new URL(entry);
    if (url.protocol !== 'https:' || url.origin !== entry || entry.includes('*')) return null;
  } catch { return null; }
  return origin => origin === entry;
}

function settings(env) {
  if (env.METRICS_ENABLED !== 'true' || !env.METRICS_DB?.batch || !env.METRICS_DB?.prepare) return null;
  const wildcards = env.EVENTS_ALLOW_ORIGIN_WILDCARD === 'true';
  const entries = String(env.METRICS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  if (!entries.length || entries.length > 8) return null;
  const matchers = entries.map(entry => originMatcher(entry, wildcards));
  if (matchers.some(matcher => !matcher)) return null;
  const dailyCap = boundedInteger(env.EVENTS_DAILY_CAP, 20000, HARD_DAILY_CAP);
  const perMinute = boundedInteger(env.EVENTS_PER_MINUTE, 120, 600);
  return dailyCap && perMinute ? { allowed: origin => matchers.some(m => m(origin)), dailyCap, perMinute } : null;
}

async function readBody(request) {
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

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const shortString = value => typeof value === 'string' && value.length <= 256;

// Returns the normalized batch, or null if anything breaks the contract (the whole batch is rejected).
export function parseBatch(body) {
  if (!isObject(body)) return null;
  const keys = Object.keys(body).sort().join(',');
  if (keys !== 'dev,events,ref,src,v' && keys !== 'cmp,dev,events,ref,src,v') return null;
  if (body.v !== 1 || !shortString(body.src) || !shortString(body.ref) || !DEVICES.has(body.dev)) return null;
  if (body.cmp !== undefined && !shortString(body.cmp)) return null;
  if (!Array.isArray(body.events) || body.events.length < 1 || body.events.length > MAX_EVENTS) return null;
  const events = [];
  for (const event of body.events) {
    if (!isObject(event) || Object.keys(event).some(key => key !== 'e' && key !== 'k' && key !== 'b')) return null;
    const rule = typeof event.e === 'string' && EVENTS.get(event.e);
    if (!rule) return null;
    for (const field of ['k', 'b']) {
      const allowed = rule[field];
      if (allowed ? !allowed.has(event[field]) : field in event) return null;
    }
    events.push({ e: event.e, k: event.k ?? '', b: event.b ?? '' });
  }
  return {
    source: allowedSource(body.src), ref: allowedRef(body.ref),
    campaign: allowedCampaign(body.cmp), device: body.dev, events,
  };
}

export function createEventsHandler(now = () => Date.now()) {
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
    if (url.pathname !== '/api/events' || url.search || origin !== url.origin || !config.allowed(origin)) return reply(403);
    const site = request.headers.get('sec-fetch-site');
    if (site && site !== 'same-origin') return reply(403);
    if (request.headers.get('sec-gpc') === '1' || request.headers.get('dnt') === '1') return reply(204);
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '')) return reply(415);

    const time = now();
    const day = new Date(time).toISOString().slice(0, 10);
    if (saturatedDay === day || time < retryAfter) return reply(429);
    // Per-isolate burst throttle only; D1 supplies the authoritative daily write cap.
    const currentMinute = Math.floor(time / 60000);
    if (minute !== currentMinute) { minute = currentMinute; attempts = 0; }
    if (++attempts > config.perMinute) return reply(429);

    let batch;
    try { batch = parseBatch(await readBody(request)); }
    catch { return reply(400); }
    if (!batch) return reply(400);

    const where = country(request.cf);
    try {
      const statement = env.METRICS_DB.prepare(RECORD_EVENT_SQL);
      const results = await env.METRICS_DB.batch(batch.events.map(event => statement.bind(
        day, event.e, event.k, event.b, batch.source, batch.ref, batch.campaign, where, batch.device,
        day, config.dailyCap)));
      if (!Array.isArray(results) || results.length !== batch.events.length || results.some(result => !result?.success)) throw new Error('storage');
      if (results.some(result => result.meta?.changes === 0)) { saturatedDay = day; return reply(429); }
      return reply(204);
    } catch {
      // A broken binding/database must not cause a query storm or disclose diagnostics.
      retryAfter = time + 60000;
      return reply(503);
    }
  };
}

export const onRequest = createEventsHandler();
