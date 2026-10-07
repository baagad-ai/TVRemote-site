import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createMetricsHandler, RECORD_CLICK_SQL } from '../../functions/api/metrics.js';

const migration = readFileSync(new URL('../migrations/0001_download_clicks.sql', import.meta.url), 'utf8');
const origin = 'https://tvremote.pages.dev';
const click = { event: 'apk_download_click', release: 'v1.2.3-security', button: 'hero', platform: 'android' };
const initialTime = Date.parse('2026-10-07T12:00:00Z');

test('migration bytes remain compatible with the remote D1 trigger splitter', () => {
  // https://github.com/cloudflare/workers-sdk/issues/15314: local SQLite accepts
  // CRLF/lowercase BEGIN, but the remote /query splitter rejects those forms.
  assert.equal(migration.includes('\r'), false, 'D1 migration SQL must use LF');
  assert.match(migration, /CREATE TRIGGER[^;]+\nBEGIN\n/);
  assert.equal((migration.match(/\bEND\b/g) || []).length, 1, 'Avoid nested CASE END in the trigger splitter');
  assert.equal(readFileSync(new URL('../../.gitattributes', import.meta.url), 'utf8')
    .split(/\r?\n/).includes('analytics/migrations/*.sql text eol=lf'), true);
});

function fixture(overrides = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(migration);
  const calls = [];
  const env = {
    METRICS_ENABLED: 'true', METRICS_ALLOWED_ORIGINS: origin,
    METRICS_ALLOWED_RELEASES: click.release, METRICS_DAILY_CAP: '1000',
    METRICS_DB: { prepare(sql) { return { bind(...args) { return { async run() {
      calls.push({ sql, args });
      const result = db.prepare(sql).run(...args);
      return { success: true, meta: { changes: Number(result.changes) } };
    } }; } }; } },
    ...overrides,
  };
  let time = initialTime;
  const handle = createMetricsHandler(() => time);
  const count = () => Number(db.prepare('SELECT COALESCE(SUM(clicks), 0) AS count FROM download_click_daily').get().count);
  return { env, db, calls, handle, count, setTime(value) { time = value; } };
}

function request(body = click, options = {}) {
  const headers = { Origin: origin, 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin', ...options.headers };
  return new Request(options.url || `${origin}/api/metrics`, {
    method: options.method || 'POST', headers,
    ...(options.method === 'GET' ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
}

async function status(f, req = request()) {
  const response = await f.handle({ request: req, env: f.env });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(await response.text(), '');
  return response.status;
}

test('records only allowed aggregate dimensions, ignoring private request headers', async () => {
  const f = fixture();
  assert.equal(await status(f, request(click, { headers: {
    Cookie: 'secret=raw-cookie', 'CF-Connecting-IP': '192.0.2.9',
    'User-Agent': 'raw-user-agent', Referer: `${origin}/private?secret=raw-query`,
  } })), 204);
  assert.equal(await status(f), 204);
  assert.equal(f.count(), 2);
  assert.deepEqual(f.calls[0].args, ['2026-10-07', click.release, 'hero', 'android', '2026-10-07', 1000]);
  assert.deepEqual(Object.keys(f.db.prepare('SELECT * FROM download_click_daily').get()).sort(),
    ['button', 'clicks', 'day', 'event', 'platform', 'release']);
  assert.equal(f.db.prepare('SELECT accepted FROM metrics_daily_budget').get().accepted, 2);
  f.db.close();
});

test('strict origin, route, content type, and method gates do not query D1', async () => {
  const f = fixture();
  for (const [options, expected] of [
    [{ method: 'GET' }, 405], [{ headers: { Origin: 'https://evil.example' } }, 403],
    [{ headers: { Origin: '' } }, 403], [{ headers: { 'Sec-Fetch-Site': 'cross-site' } }, 403],
    [{ url: `${origin}/api/metrics?secret=1` }, 403],
    [{ url: 'https://preview.tvremote.pages.dev/api/metrics' }, 403],
    [{ headers: { 'Content-Type': 'text/plain' } }, 415],
  ]) assert.equal(await status(f, request(click, options)), expected);
  assert.equal(f.calls.length, 0);
  f.db.close();
});

test('rejects unknown fields and all non-allowlisted or malformed input', async () => {
  const f = fixture();
  for (const body of [null, [], {}, '{', { ...click, event: 'install' },
    { ...click, release: 'old-beta7' }, { ...click, platform: 'Android 15' },
    { ...click, button: 'anywhere' }, { ...click, userId: 'private' },
    { ...click, release: { value: click.release } }, { ...click, platform: null },
  ]) assert.equal(await status(f, request(body)), 400);
  assert.equal(f.calls.length, 0);
  f.db.close();
});

test('fails closed when disabled, missing bindings, or invalid configuration', async () => {
  for (const overrides of [
    { METRICS_ENABLED: undefined }, { METRICS_ENABLED: 'false' }, { METRICS_DB: undefined },
    { METRICS_ALLOWED_ORIGINS: '' }, { METRICS_ALLOWED_ORIGINS: `${origin}/` },
    { METRICS_ALLOWED_ORIGINS: 'http://tvremote.pages.dev' }, { METRICS_ALLOWED_RELEASES: '' },
    { METRICS_ALLOWED_RELEASES: 'bad/release' }, { METRICS_DAILY_CAP: '5001' },
    { METRICS_DAILY_CAP: '1.5' }, { METRICS_PER_MINUTE: '61' },
  ]) {
    const f = fixture(overrides);
    assert.equal(await status(f), 503);
    assert.equal(f.calls.length, 0);
    f.db.close();
  }
});

test('honors browser privacy signals without writing or parsing an event', async () => {
  const f = fixture();
  for (const headers of [{ 'Sec-GPC': '1' }, { DNT: '1' }]) {
    assert.equal(await status(f, request('{broken', { headers })), 204);
  }
  assert.equal(f.calls.length, 0);
  f.db.close();
});

test('bounds declared and streamed body bytes, malformed UTF-8, and stalled streams', async () => {
  const f = fixture();
  assert.equal(await status(f, request(' '.repeat(1025))), 400);
  assert.equal(await status(f, request(click, { headers: { 'Content-Length': '1025' } })), 400);
  for (const bytes of [new Uint8Array(1025), new Uint8Array([0xff])]) {
    const req = new Request(`${origin}/api/metrics`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: bytes,
    });
    assert.equal(await status(f, req), 400);
  }
  let cancelled = false;
  const req = new Request(`${origin}/api/metrics`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, duplex: 'half',
    body: new ReadableStream({ cancel() { cancelled = true; } }),
  });
  assert.equal(await status(f, req), 400);
  assert.equal(cancelled, true);
  assert.equal(f.calls.length, 0);
  f.db.close();
});

test('per-isolate throttling happens before D1 and resets at the minute boundary', async () => {
  const f = fixture({ METRICS_PER_MINUTE: '2' });
  assert.equal(await status(f), 204);
  assert.equal(await status(f), 204);
  assert.equal(await status(f), 429);
  assert.equal(f.calls.length, 2);
  f.setTime(initialTime + 60000);
  assert.equal(await status(f), 204);
  f.db.close();
});

test('shared daily cap applies across dimensions and handlers, resets on UTC rollover', async () => {
  const f = fixture({ METRICS_DAILY_CAP: '3' });
  const statuses = await Promise.all(['hero', 'nav', 'footer', 'guide', 'download'].map(button =>
    status(f, request({ ...click, button }))));
  assert.deepEqual(statuses.sort(), [204, 204, 204, 429, 429]);
  assert.equal(f.count(), 3);
  assert.equal(f.db.prepare('SELECT accepted FROM metrics_daily_budget').get().accepted, 3);
  const otherHandler = createMetricsHandler(() => initialTime);
  assert.equal((await otherHandler({ request: request(), env: f.env })).status, 429);
  const calls = f.calls.length;
  assert.equal(await status(f), 429);
  assert.equal(f.calls.length, calls);
  f.setTime(Date.parse('2026-10-08T00:00:00Z'));
  assert.equal(await status(f), 204);
  assert.equal(f.count(), 4);
  f.db.close();
});

test('SQLite hard ceiling survives attempts to bypass the configurable cap', () => {
  const f = fixture();
  const statement = f.db.prepare(RECORD_CLICK_SQL);
  for (let i = 0; i < 5001; i++) {
    statement.run('2026-10-07', click.release, 'hero', 'android', '2026-10-07', 999999);
  }
  assert.equal(f.count(), 5000);
  assert.equal(f.db.prepare('SELECT accepted FROM metrics_daily_budget').get().accepted, 5000);
  // Constraint failures roll back the trigger's budget update as well.
  assert.throws(() => statement.run('2026-10-08', click.release, 'invalid', 'android', '2026-10-08', 1000));
  assert.equal(f.db.prepare("SELECT accepted FROM metrics_daily_budget WHERE day='2026-10-08'").get(), undefined);
  f.db.close();
});

test('storage failures fail closed and cool down retries without exposing diagnostics', async () => {
  let attempts = 0;
  const f = fixture({ METRICS_DB: { prepare() { attempts++; throw new Error('secret backend diagnostic'); } } });
  assert.equal(await status(f), 503);
  assert.equal(await status(f), 429);
  assert.equal(attempts, 1);
  f.setTime(initialTime + 60000);
  assert.equal(await status(f), 503);
  assert.equal(attempts, 2);
  f.db.close();
});
