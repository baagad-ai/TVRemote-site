import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createEventsHandler, RECORD_EVENT_SQL, allowedRef, allowedSource, allowedCampaign, parseBatch } from '../../functions/api/events.js';

const read = name => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
const earlier = ['0001_download_clicks.sql', '0002_download_click_source.sql', '0003_download_click_source_qr.sql', '0004_download_click_source_threads.sql'].map(read);
const eventsMigration = read('0005_page_events.sql');
const origin = 'https://theremote-site.pages.dev';
const initialTime = Date.parse('2026-10-16T12:34:56Z');
const batch = (events = [{ e: 'page_view' }], extra = {}) => ({ v: 1, src: 'x', ref: 'www.Google.com', dev: 'phone', events, ...extra });
const COLUMNS = ['day', 'event', 'key', 'bucket', 'source', 'ref', 'campaign', 'country', 'device'];

function database() {
  const db = new DatabaseSync(':memory:');
  for (const sql of earlier) db.exec(sql);
  db.exec(eventsMigration);
  return db;
}

// Mirrors the D1 API surface the handler uses: prepare().bind() and batch() as one transaction.
function d1(db, calls) {
  return {
    prepare(sql) { return { bind(...args) { return { sql, args }; } }; },
    async batch(statements) {
      calls.push(statements);
      db.exec('BEGIN');
      try {
        const results = statements.map(({ sql, args }) => ({ success: true, meta: { changes: Number(db.prepare(sql).run(...args).changes) } }));
        db.exec('COMMIT');
        return results;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
}

function fixture(overrides = {}) {
  const db = database();
  const calls = [];
  const env = { METRICS_ENABLED: 'true', METRICS_ALLOWED_ORIGINS: origin, METRICS_DB: d1(db, calls), ...overrides };
  let time = initialTime;
  const handle = createEventsHandler(() => time);
  const total = () => Number(db.prepare('SELECT COALESCE(SUM(count), 0) AS n FROM page_event_daily').get().n);
  const budget = (day = '2026-10-16') => db.prepare('SELECT accepted FROM page_event_budget WHERE day = ?').get(day)?.accepted;
  return { env, db, calls, handle, total, budget, setTime(value) { time = value; } };
}

function request(body = batch(), options = {}) {
  const headers = { Origin: options.origin ?? origin, 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin', ...options.headers };
  const req = new Request(options.url || `${options.origin ?? origin}/api/events`, {
    method: options.method || 'POST', headers,
    ...(options.method === 'GET' ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
  if (options.cf) Object.defineProperty(req, 'cf', { value: options.cf });
  return req;
}

async function status(f, req = request()) {
  const response = await f.handle({ request: req, env: f.env });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(await response.text(), '');
  return response.status;
}

const VALID = [
  { e: 'page_view' }, { e: 'install_steps_open' }, { e: 'js_error' }, { e: 'broken_link' },
  ...['hero', 'search', 'guests', 'trackpad', 'download'].map(k => ({ e: 'section_view', k })),
  ...['download', 'qr', 'faq', 'guide', 'article', 'header'].map(k => ({ e: 'click', k })),
  ...['hero', 'pin', 'rooms_living', 'rooms_bedroom'].map(k => ({ e: 'loop_play', k })),
  ...['lt5', '5_30', '30_120', 'gt120'].map(b => ({ e: 'time_on_page', b })),
  ...['lcp', 'inp', 'cls'].flatMap(k => ['good', 'ni', 'poor'].map(b => ({ e: 'vital', k, b }))),
];

test('0005 migration is additive, LF-only and keeps the remote trigger splitter happy', () => {
  assert.equal(eventsMigration.includes('\r'), false, 'D1 migration SQL must use LF');
  assert.match(eventsMigration, /CREATE TRIGGER[^;]+\nBEGIN\n/);
  assert.equal((eventsMigration.match(/\bEND\b/g) || []).length, 1, 'Avoid CASE END: the trigger splitter counts END');
  assert.equal(eventsMigration.split('\n').some(line => line.startsWith('--') && line.includes(';')), false);
  assert.doesNotMatch(eventsMigration, /\b(DROP|ALTER|DELETE|UPDATE\s+(?!SET))\b/i);
  assert.doesNotMatch(eventsMigration, /metrics_daily_budget\s*\(|INSERT INTO metrics_daily_budget|download_click_daily/);
});

test('0005 applies on top of 0004 without changing existing objects or rows', () => {
  const db = new DatabaseSync(':memory:');
  for (const sql of earlier) db.exec(sql);
  db.prepare("INSERT INTO download_click_daily_v2 VALUES ('2026-10-15','apk_download_click','r1','hero','android','threads',1)").run();
  const objects = () => db.prepare("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const before = JSON.stringify(objects());
  const rows = JSON.stringify(db.prepare('SELECT * FROM download_click_daily_v2').all());
  const budget = JSON.stringify(db.prepare('SELECT * FROM metrics_daily_budget').all());
  db.exec(eventsMigration);
  const after = objects();
  assert.equal(JSON.stringify(after.filter(o => !/^page_event/.test(o.name))), before);
  assert.deepEqual(after.filter(o => /^page_event/.test(o.name)).map(o => `${o.type}:${o.name}`).sort(),
    ['table:page_event_budget', 'table:page_event_daily', 'trigger:page_event_budget_guard']);
  assert.equal(JSON.stringify(db.prepare('SELECT * FROM download_click_daily_v2').all()), rows);
  assert.equal(JSON.stringify(db.prepare('SELECT * FROM metrics_daily_budget').all()), budget);
  const sql = after.find(o => o.name === 'page_event_daily').sql;
  assert.match(sql, /WITHOUT ROWID/);
  assert.match(sql, /PRIMARY KEY \(day, event, key, bucket, source, ref, campaign, country, device\)/);
  db.close();
});

test('valid batch is stored as daily aggregates with normalized dimensions, one D1 batch, 204', async () => {
  const f = fixture();
  const events = [{ e: 'page_view' }, { e: 'section_view', k: 'search' }, { e: 'section_view', k: 'search' }, { e: 'vital', k: 'lcp', b: 'good' }];
  assert.equal(await status(f, request(batch(events, { cmp: 'release' }), { cf: { country: 'IN' } })), 204);
  assert.equal(f.calls.length, 1, 'exactly one D1 batch per request');
  assert.equal(f.calls[0].length, 4);
  assert.equal(f.total(), 4);
  assert.equal(f.budget(), 4);
  assert.deepEqual(f.db.prepare(`SELECT ${COLUMNS.join(', ')}, count FROM page_event_daily ORDER BY event, key`).all().map(r => ({ ...r })), [
    { day: '2026-10-16', event: 'page_view', key: '', bucket: '', source: 'x', ref: 'google.com', campaign: 'release', country: 'IN', device: 'phone', count: 1 },
    { day: '2026-10-16', event: 'section_view', key: 'search', bucket: '', source: 'x', ref: 'google.com', campaign: 'release', country: 'IN', device: 'phone', count: 2 },
    { day: '2026-10-16', event: 'vital', key: 'lcp', bucket: 'good', source: 'x', ref: 'google.com', campaign: 'release', country: 'IN', device: 'phone', count: 1 },
  ]);
  f.db.close();
});

test('every allowed event combination is accepted and satisfies the SQL CHECKs', async () => {
  const f = fixture();
  for (let i = 0; i < VALID.length; i += 40) assert.equal(await status(f, request(batch(VALID.slice(i, i + 40)))), 204);
  assert.equal(f.total(), VALID.length);
  assert.equal(await status(f, request(batch(Array(40).fill({ e: 'page_view' })))), 204, '40 events is the maximum');
  f.db.close();
});

test('stored columns are aggregate dimensions only: no IP, user agent, cookie, URL or fine timestamp', async () => {
  const f = fixture();
  assert.equal(await status(f, request(batch(), { cf: { country: 'DE', city: 'Berlin', asn: 3320 }, headers: {
    Cookie: 'secret=raw-cookie', 'CF-Connecting-IP': '192.0.2.9', 'X-Forwarded-For': '192.0.2.9',
    'User-Agent': 'raw-user-agent/1.0', Referer: `${origin}/private?secret=raw-query`,
  } })), 204);
  assert.deepEqual(f.db.prepare('PRAGMA table_info(page_event_daily)').all().map(c => c.name), [...COLUMNS, 'count']);
  assert.deepEqual(f.db.prepare('PRAGMA table_info(page_event_budget)').all().map(c => c.name), ['day', 'accepted']);
  const dump = JSON.stringify([f.db.prepare('SELECT * FROM page_event_daily').all(), f.db.prepare('SELECT * FROM page_event_budget').all(), f.calls]);
  for (const secret of ['192.0.2.9', 'raw-user-agent', 'raw-cookie', 'raw-query', 'Berlin', '3320', '12:34', 'T12']) assert.equal(dump.includes(secret), false, secret);
  assert.equal(f.db.prepare('SELECT day FROM page_event_daily').get().day, '2026-10-16');
  f.db.close();
});

test('src, ref, cmp and country normalize to allowlists', async () => {
  for (const [value, expected] of [['x', 'x'], [' Threads ', 'threads'], ['reddit', 'reddit'], ['qr_site', 'qr_site'], ['guide', 'guide'],
    ['facebook', 'none'], ['', 'none'], ['X.com', 'none']]) assert.equal(allowedSource(value), expected, value);
  for (const [value, expected] of [['', 'direct'], ['  ', 'direct'], ['www.google.com', 'google.com'], ['T.CO', 't.co'],
    ['news.ycombinator.com', 'news.ycombinator.com'], ['www.producthunt.com', 'producthunt.com'], ['m.youtube.com', 'other'],
    ['evil.com', 'other'], ['https://google.com/search?q=1', 'other'], ['google.com.evil.com', 'other'], ['www.www.google.com', 'other'],
    ['theremote-site.pages.dev', 'other']]) assert.equal(allowedRef(value), expected, value);
  for (const [value, expected] of [[undefined, 'none'], ['release', 'release'], ['Launch', 'launch'], ['guide', 'guide'],
    ['none', 'none'], ['spring_sale', 'other'], ['', 'other']]) assert.equal(allowedCampaign(value), expected, String(value));
  const f = fixture();
  for (const cf of [undefined, {}, { country: 'in' }, { country: 'T1' }, { country: 'USA' }, { country: 7 }]) {
    assert.equal(await status(f, request(batch([{ e: 'page_view' }], { src: 'tiktok', ref: 'evil.example', cmp: 'x' }), { cf })), 204);
  }
  assert.deepEqual({ ...f.db.prepare('SELECT source, ref, campaign, country, count FROM page_event_daily').get() },
    { source: 'none', ref: 'other', campaign: 'other', country: 'XX', count: 6 });
  f.db.close();
});

test('rejects the whole batch with 400 for any contract violation, without touching D1', async () => {
  const f = fixture();
  const bad = [
    null, [], 'text', 1, {}, '{', '',
    batch([]), batch(Array(41).fill({ e: 'page_view' })), batch({ e: 'page_view' }),
    { ...batch(), v: 2 }, { ...batch(), v: '1' }, { ...batch(), extra: 1 }, { ...batch(), visitor: 'abc' },
    (({ src, ...rest }) => rest)(batch()), (({ ref, ...rest }) => rest)(batch()), (({ dev, ...rest }) => rest)(batch()),
    (({ events, ...rest }) => rest)(batch()), (({ v, ...rest }) => rest)(batch()),
    { ...batch(), dev: 'tv' }, { ...batch(), dev: 'Phone' }, { ...batch(), src: 5 }, { ...batch(), ref: null },
    { ...batch(), cmp: 3 }, { ...batch(), src: 'x'.repeat(257) },
    batch([{ e: 'page_view' }, { e: 'nope' }]), batch([{ e: 'page_view', k: 'hero' }]), batch([{ e: 'page_view', b: '' }]),
    batch([{ e: 'section_view' }]), batch([{ e: 'section_view', k: 'youtube' }]), batch([{ e: 'section_view', k: 'hero', b: 'lt5' }]),
    batch([{ e: 'click', k: 'pin' }]), batch([{ e: 'loop_play', k: 'search' }]), batch([{ e: 'time_on_page' }]),
    batch([{ e: 'time_on_page', b: 'gt5' }]), batch([{ e: 'time_on_page', k: 'hero', b: 'lt5' }]),
    batch([{ e: 'vital', k: 'lcp' }]), batch([{ e: 'vital', b: 'good' }]), batch([{ e: 'vital', k: 'fid', b: 'good' }]),
    batch([{ e: 'vital', k: 'cls', b: 'bad' }]), batch([{ e: 'js_error', k: '' }]), batch([{ e: 'broken_link', b: 'x' }]),
    batch([{ e: 'page_view', url: '/private' }]), batch([{}]), batch([null]), batch(['page_view']), batch([[]]),
    batch([{ e: ['page_view'] }]), batch([{ e: 'click', k: ['download'] }]), batch([{ e: 'toString' }]), batch([{ e: '__proto__' }]),
  ];
  for (const body of bad) assert.equal(await status(f, request(body)), 400, JSON.stringify(body));
  assert.equal(f.calls.length, 0);
  assert.equal(f.total(), 0);
  assert.equal(parseBatch(batch()).ref, 'google.com');
  f.db.close();
});

test('method, route, origin, fetch-site and content type gates do not touch D1', async () => {
  const f = fixture();
  for (const [options, expected] of [
    [{ method: 'GET' }, 405], [{ method: 'PUT' }, 405], [{ headers: { Origin: 'https://evil.example' } }, 403],
    [{ headers: { Origin: '' } }, 403], [{ headers: { Origin: 'null' } }, 403],
    [{ headers: { 'Sec-Fetch-Site': 'cross-site' } }, 403], [{ headers: { 'Sec-Fetch-Site': 'same-site' } }, 403],
    [{ url: `${origin}/api/events?utm_source=x` }, 403], [{ url: `${origin}/api/events/` }, 403], [{ url: `${origin}/api/metrics` }, 403],
    [{ origin: 'https://abc123.theremote-site.pages.dev' }, 403],
    [{ headers: { 'Content-Type': 'text/plain' } }, 415], [{ headers: { 'Content-Type': 'application/json; charset=latin1' } }, 415],
    [{ headers: { 'Content-Type': '' } }, 415],
  ]) assert.equal(await status(f, request(batch(), options)), expected, JSON.stringify(options));
  assert.equal(await status(f, request(batch(), { headers: { 'Content-Type': 'application/json;charset=UTF-8' } })), 204);
  assert.equal(await status(f, request(batch(), { headers: { 'Sec-Fetch-Site': '' } })), 204);
  assert.equal(f.calls.length, 2);
  f.db.close();
});

test('wildcard preview origins only work when explicitly enabled, and never for other hosts', async () => {
  const pattern = 'https://*.theremote-site.pages.dev';
  const strict = fixture({ METRICS_ALLOWED_ORIGINS: pattern });
  assert.equal(await status(strict, request(batch(), { origin: 'https://abc123.theremote-site.pages.dev' })), 503, 'wildcard is invalid config without the flag');
  strict.db.close();
  const f = fixture({ METRICS_ALLOWED_ORIGINS: pattern, EVENTS_ALLOW_ORIGIN_WILDCARD: 'true' });
  for (const host of ['abc123.theremote-site.pages.dev', 'build-events-endpoint.theremote-site.pages.dev']) {
    assert.equal(await status(f, request(batch(), { origin: `https://${host}` })), 204, host);
  }
  for (const host of ['theremote-site.pages.dev', 'a.b.theremote-site.pages.dev', 'evil-theremote-site.pages.dev', 'xtheremote-site.pages.dev', 'abc.theremote-siteXpages.dev']) {
    assert.equal(await status(f, request(batch(), { origin: `https://${host}` })), 403, host);
  }
  assert.equal(await status(f, new Request('https://abc.theremote-site.pages.dev/api/events', { method: 'POST',
    headers: { Origin: 'https://def.theremote-site.pages.dev', 'Content-Type': 'application/json' }, body: JSON.stringify(batch()) })), 403, 'must still be same-origin');
  f.db.close();
  for (const bad of ['https://*.dev', 'https://*.*.pages.dev', 'http://*.theremote-site.pages.dev', 'https://*theremote-site.pages.dev']) {
    const g = fixture({ METRICS_ALLOWED_ORIGINS: bad, EVENTS_ALLOW_ORIGIN_WILDCARD: 'true' });
    assert.equal(await status(g), 503, bad);
    g.db.close();
  }
});

test('fails closed with 503 when disabled, unbound or misconfigured', async () => {
  for (const overrides of [
    { METRICS_ENABLED: undefined }, { METRICS_ENABLED: 'false' }, { METRICS_DB: undefined }, { METRICS_DB: { prepare() {} } },
    { METRICS_ALLOWED_ORIGINS: '' }, { METRICS_ALLOWED_ORIGINS: `${origin}/` }, { METRICS_ALLOWED_ORIGINS: 'http://theremote-site.pages.dev' },
    { EVENTS_DAILY_CAP: '50001' }, { EVENTS_DAILY_CAP: '0' }, { EVENTS_DAILY_CAP: '1.5' },
    { EVENTS_PER_MINUTE: '601' }, { EVENTS_PER_MINUTE: '-1' },
  ]) {
    const f = fixture(overrides);
    assert.equal(await status(f), 503, JSON.stringify(Object.keys(overrides)));
    assert.equal(f.calls.length, 0);
    f.db.close();
  }
  const f = fixture({ EVENTS_DAILY_CAP: '50000', EVENTS_PER_MINUTE: '600' });
  assert.equal(await status(f), 204);
  f.db.close();
});

test('DNT and Sec-GPC reply 204 without parsing or storing', async () => {
  const f = fixture();
  for (const headers of [{ 'Sec-GPC': '1' }, { DNT: '1' }, { DNT: '1', 'Content-Type': 'text/plain' }]) {
    assert.equal(await status(f, request('{broken', { headers })), 204);
  }
  assert.equal(f.calls.length, 0);
  assert.equal(f.total(), 0);
  f.db.close();
});

test('bounds declared and streamed body bytes at 4096, malformed UTF-8, and stalled streams', async () => {
  const f = fixture();
  const padded = JSON.stringify(batch()).replace('"phone"', `"phone"${' '.repeat(4096)}`);
  assert.equal(await status(f, request(padded)), 400);
  assert.equal(await status(f, request(batch(), { headers: { 'Content-Length': '4097' } })), 400);
  const fits = JSON.stringify(batch(Array(40).fill({ e: 'vital', k: 'lcp', b: 'good' })));
  assert.ok(fits.length < 4096, 'a full 40-event batch fits the limit');
  assert.equal(await status(f, request(fits)), 204);
  for (const bytes of [new Uint8Array(4097).fill(32), new Uint8Array([0xff])]) {
    const req = new Request(`${origin}/api/events`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: bytes });
    assert.equal(await status(f, req), 400);
  }
  let cancelled = false;
  const stalled = new Request(`${origin}/api/events`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, duplex: 'half',
    body: new ReadableStream({ cancel() { cancelled = true; } }),
  });
  assert.equal(await status(f, stalled), 400);
  assert.equal(cancelled, true);
  assert.equal(f.calls.length, 1);
  f.db.close();
});

test('per-isolate throttle (default 120/min) happens before D1 and resets each minute', async () => {
  const f = fixture({ EVENTS_PER_MINUTE: '2' });
  assert.equal(await status(f), 204);
  assert.equal(await status(f), 204);
  assert.equal(await status(f), 429);
  assert.equal(f.calls.length, 2);
  f.setTime(initialTime + 60000);
  assert.equal(await status(f), 204);
  f.db.close();
  const g = fixture();
  const results = [];
  for (let i = 0; i < 121; i++) results.push(await status(g));
  assert.equal(results.filter(s => s === 204).length, 120);
  assert.equal(results.at(-1), 429);
  g.db.close();
});

test('daily cap stops writes at the cap, replies 429, remembers the saturated day, resets at UTC midnight', async () => {
  const f = fixture({ EVENTS_DAILY_CAP: '5' });
  assert.equal(await status(f, request(batch(Array(3).fill({ e: 'page_view' })))), 204);
  assert.equal(await status(f, request(batch(Array(3).fill({ e: 'js_error' })))), 429, 'batch meets the cap midway');
  assert.equal(f.total(), 5, 'never more than the cap');
  assert.equal(f.budget(), 5);
  assert.equal(Number(f.db.prepare("SELECT count FROM page_event_daily WHERE event = 'js_error'").get().count), 2, 'leading events kept');
  const calls = f.calls.length;
  assert.equal(await status(f), 429, 'saturated day is remembered in the isolate');
  assert.equal(f.calls.length, calls);
  const other = createEventsHandler(() => initialTime);
  assert.equal((await other({ request: request(), env: f.env })).status, 429, 'a fresh isolate learns the cap from D1');
  assert.equal(f.total(), 5);
  f.setTime(Date.parse('2026-10-17T00:00:00Z'));
  assert.equal(await status(f), 204);
  assert.equal(f.budget('2026-10-17'), 1);
  assert.equal(Number(f.db.prepare('SELECT COUNT(*) AS n FROM metrics_daily_budget').get().n), 0, 'download budget untouched');
  f.db.close();
});

test('default daily cap is 20000', async () => {
  const f = fixture();
  f.db.prepare("INSERT INTO page_event_budget VALUES ('2026-10-16', 19999)").run();
  assert.equal(await status(f, request(batch([{ e: 'page_view' }, { e: 'js_error' }]))), 429);
  assert.equal(f.budget(), 20000);
  assert.equal(f.total(), 1);
  f.db.close();
});

test('SQLite trigger is a hard 50000/day ceiling even if the handler cap is bypassed', () => {
  const db = database();
  const statement = db.prepare(RECORD_EVENT_SQL);
  const row = ['2026-10-16', 'page_view', '', '', 'none', 'direct', 'none', 'XX', 'desktop'];
  db.prepare("INSERT INTO page_event_budget VALUES ('2026-10-16', 49999)").run();
  assert.equal(Number(statement.run(...row, '2026-10-16', 999999).changes), 1);
  assert.equal(Number(statement.run(...row, '2026-10-16', 999999).changes), 0, 'trigger RAISE(IGNORE) at the ceiling');
  assert.equal(db.prepare('SELECT accepted FROM page_event_budget').get().accepted, 50000);
  assert.equal(Number(db.prepare('SELECT count FROM page_event_daily').get().count), 1);
  assert.throws(() => db.prepare("UPDATE page_event_budget SET accepted = 50001").run(), /CHECK/);
  db.close();
});

test('SQL CHECKs reject anything outside the allowlists and roll back the budget', () => {
  const db = database();
  const statement = db.prepare(RECORD_EVENT_SQL);
  const good = ['2026-10-16', 'section_view', 'search', '', 'x', 'google.com', 'release', 'IN', 'phone'];
  assert.equal(Number(statement.run(...good, '2026-10-16', 20000).changes), 1);
  for (const [index, value] of [[0, '2026-10-16T12'], [1, 'scroll'], [2, 'youtube'], [3, 'lt5'], [4, 'facebook'], [5, 'evil.com'],
    [6, 'spring'], [7, 'in'], [7, 'XXX'], [8, 'tv']]) {
    const row = [...good]; row[index] = value;
    assert.throws(() => statement.run(...row, '2026-10-16', 20000), /CHECK/, `${COLUMNS[index]}=${value}`);
  }
  for (const [event, key, bucket] of [['page_view', 'hero', ''], ['click', 'pin', ''], ['vital', 'lcp', ''], ['time_on_page', '', 'good'], ['loop_play', 'qr', '']]) {
    assert.throws(() => statement.run('2026-10-16', event, key, bucket, 'x', 'direct', 'none', 'IN', 'phone', '2026-10-16', 20000), /CHECK/, `${event}/${key}/${bucket}`);
  }
  assert.equal(db.prepare('SELECT accepted FROM page_event_budget').get().accepted, 1);
  db.close();
});

test('storage failures fail closed with 503 and back off for 60 s without leaking diagnostics', async () => {
  let attempts = 0;
  const failing = { prepare() { return { bind() { return {}; } }; }, async batch() { attempts++; throw new Error('secret backend diagnostic'); } };
  const f = fixture({ METRICS_DB: failing });
  assert.equal(await status(f), 503);
  assert.equal(await status(f), 429);
  assert.equal(attempts, 1);
  f.setTime(initialTime + 60000);
  assert.equal(await status(f), 503);
  assert.equal(attempts, 2);
  f.db.close();
  const partial = fixture({ METRICS_DB: { prepare() { return { bind() { return {}; } }; }, async batch() { return [{ success: false }]; } } });
  assert.equal(await status(partial), 503);
  partial.db.close();
});
