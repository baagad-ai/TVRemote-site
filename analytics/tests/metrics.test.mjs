import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createMetricsHandler, RECORD_CLICK_SQL } from '../../functions/api/metrics.js';

const migration = readFileSync(new URL('../migrations/0001_download_clicks.sql', import.meta.url), 'utf8');
const sourceMigration = readFileSync(new URL('../migrations/0002_download_click_source.sql', import.meta.url), 'utf8');
const qrMigration = readFileSync(new URL('../migrations/0003_download_click_source_qr.sql', import.meta.url), 'utf8');
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
  db.exec(sourceMigration);
  db.exec(qrMigration);
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
  const count = () => Number(db.prepare('SELECT (SELECT COALESCE(SUM(clicks), 0) FROM download_click_daily) + (SELECT COALESCE(SUM(clicks), 0) FROM download_click_daily_v2) AS count').get().count);
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
  assert.deepEqual(f.calls[0].args, ['2026-10-07', click.release, 'hero', 'android', 'none', '2026-10-07', 1000]);
  assert.deepEqual(Object.keys(f.db.prepare('SELECT * FROM download_click_daily_v2').get()).sort(),
    ['button', 'clicks', 'day', 'event', 'platform', 'release', 'source']);
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
    statement.run('2026-10-07', click.release, 'hero', 'android', 'none', '2026-10-07', 999999);
  }
  assert.equal(f.count(), 5000);
  assert.equal(f.db.prepare('SELECT accepted FROM metrics_daily_budget').get().accepted, 5000);
  // Constraint failures roll back the trigger's budget update as well.
  assert.throws(() => statement.run('2026-10-08', click.release, 'invalid', 'android', 'none', '2026-10-08', 1000));
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

test('0002 migration is additive and keeps the remote trigger splitter happy', () => {
  assert.equal(sourceMigration.includes('\r'), false);
  assert.match(sourceMigration, /CREATE TRIGGER[^;]+\nBEGIN\n/);
  assert.equal((sourceMigration.match(/\bEND\b/g) || []).length, 1);
  assert.doesNotMatch(sourceMigration, /\b(DROP|ALTER|RENAME|DELETE|UPDATE\s+download_click_daily\b)/i);
});

test('source is allow-listed: linkedin, x, instagram, qr, qr_site (any case); everything else is none', async () => {
  const f = fixture({ METRICS_PER_MINUTE: '60' }); // more cases than the default 20-per-minute throttle
  const cases = [['linkedin', 'linkedin'], ['X', 'x'], ['Instagram', 'instagram'], [' LinkedIn ', 'linkedin'],
    ['qr', 'qr'], ['QR', 'qr'], ['qr_site', 'qr_site'], [' QR_SITE ', 'qr_site'], ['Qr_Site', 'qr_site'],
    ['qrcode', 'none'], ['q r', 'none'], ['qr-site', 'none'], ['qrsite', 'none'], ['qr_site2', 'none'], ['facebook', 'none'], ['', 'none'], ['x'.repeat(40), 'none'], [42, 'none'], [null, 'none'], [['x'], 'none'], [undefined, 'none']];
  for (const [value, expected] of cases) {
    const body = value === undefined ? click : { ...click, source: value };
    assert.equal(await status(f, request(body)), 204, String(value));
    assert.equal(f.calls.at(-1).args[4], expected, String(value));
  }
  const rows = f.db.prepare('SELECT source, SUM(clicks) AS clicks FROM download_click_daily_v2 GROUP BY source ORDER BY source').all()
    .map(row => [row.source, Number(row.clicks)]);
  assert.deepEqual(rows, [['instagram', 1], ['linkedin', 2], ['none', 12], ['qr', 2], ['qr_site', 3], ['x', 1]]);
  // Only source is new: other extra fields are still rejected without a write.
  const before = f.calls.length;
  assert.equal(await status(f, request({ ...click, source: 'x', utm_campaign: 'launch' })), 400);
  assert.equal(await status(f, request({ ...click, referrer: 'https://x.com/' })), 400);
  assert.equal(f.calls.length, before);
});

test('rollback safety: the beta.8 statement still writes to the untouched 0001 table after 0002', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(migration);
  db.prepare("INSERT INTO download_click_daily (day, event, release, button, platform, clicks) VALUES ('2026-10-07', 'apk_download_click', 'r1', 'hero', 'android', 3)").run();
  db.exec(sourceMigration);
  const legacy = `INSERT INTO download_click_daily (day, event, release, button, platform, clicks)
SELECT ?, 'apk_download_click', ?, ?, ?, 1
WHERE COALESCE((SELECT accepted FROM metrics_daily_budget WHERE day = ?), 0) < ?
ON CONFLICT (day, event, release, button, platform)
DO UPDATE SET clicks = clicks + 1`;
  db.prepare(legacy).run('2026-10-07', 'r1', 'hero', 'android', '2026-10-07', 1000);
  db.prepare(RECORD_CLICK_SQL).run('2026-10-07', 'r1', 'hero', 'android', 'x', '2026-10-07', 1000);
  assert.equal(Number(db.prepare('SELECT clicks FROM download_click_daily').get().clicks), 4);
  assert.equal(Number(db.prepare('SELECT clicks FROM download_click_daily_v2').get().clicks), 1);
  // Both tables draw on the one shared daily budget (seed row + legacy + v2).
  assert.equal(Number(db.prepare("SELECT accepted FROM metrics_daily_budget WHERE day = '2026-10-07'").get().accepted), 3);
});

test('0003 migration keeps the remote trigger splitter happy', () => {
  assert.equal(qrMigration.includes('\r'), false, 'D1 migration SQL must use LF');
  assert.match(qrMigration, /CREATE TRIGGER[^;]+\nBEGIN\n/);
  assert.equal((qrMigration.match(/\bEND\b/g) || []).length, 1, 'Avoid nested CASE END in the trigger splitter');
  assert.equal(qrMigration.split('\n').some(line => line.startsWith('--') && line.includes(';')), false,
    'No semicolons in comments: the remote splitter cuts statements on them');
  // Only the v2 table is rebuilt; the beta.8 table and the shared budget are never dropped or altered.
  assert.doesNotMatch(qrMigration, /\b(DROP|ALTER)\s+TABLE\s+(download_click_daily|metrics_daily_budget)\b(?!_v2)/i);
  assert.doesNotMatch(qrMigration, /\b(DELETE|UPDATE)\s+(FROM\s+)?download_click_daily/i);
});

test('0003 rebuild keeps every row, the key, the trigger and the budget, and only widens source to qr and qr_site', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(migration);
  db.exec(sourceMigration);
  const schemaOf = () => db.prepare("SELECT type, name, tbl_name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name").all()
    .map(row => `${row.type}:${row.name}:${row.tbl_name}`);
  const before = schemaOf();
  const record = db.prepare(RECORD_CLICK_SQL);
  for (const source of ['linkedin', 'x', 'instagram', 'none']) {
    for (let i = 0; i < 3; i++) record.run('2026-10-08', 'r1', 'hero', 'android', source, '2026-10-08', 1000);
    record.run('2026-10-09', 'r1', 'nav', 'ios', source, '2026-10-09', 1000);
  }
  // Before 0003 the database rejects qr and qr_site.
  assert.throws(() => record.run('2026-10-09', 'r1', 'hero', 'android', 'qr', '2026-10-09', 1000), /CHECK/);
  assert.throws(() => record.run('2026-10-09', 'r1', 'hero', 'android', 'qr_site', '2026-10-09', 1000), /CHECK/);
  const rowsSql = 'SELECT day, event, release, button, platform, source, clicks FROM download_click_daily_v2 ORDER BY day, event, release, button, platform, source';
  const rows = JSON.stringify(db.prepare(rowsSql).all());
  const budget = JSON.stringify(db.prepare('SELECT day, accepted FROM metrics_daily_budget ORDER BY day').all());
  db.exec(qrMigration);
  assert.equal(JSON.stringify(db.prepare(rowsSql).all()), rows, 'every row and count survives the rebuild');
  assert.equal(JSON.stringify(db.prepare('SELECT day, accepted FROM metrics_daily_budget ORDER BY day').all()), budget,
    'copying rows does not touch the daily budget');
  assert.deepEqual(schemaOf(), before, 'same tables, triggers and indexes; no leftover _new table');
  const sql = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'download_click_daily_v2'").get().sql;
  assert.match(sql, /WITHOUT ROWID/);
  assert.match(sql, /PRIMARY KEY \(day, event, release, button, platform, source\)/);
  assert.match(db.prepare("SELECT sql FROM sqlite_master WHERE name = 'download_click_v2_budget'").get().sql,
    /BEFORE INSERT ON download_click_daily_v2/);
  // qr is now stored; junk is still rejected by the database itself.
  record.run('2026-10-09', 'r1', 'hero', 'android', 'qr', '2026-10-09', 1000);
  record.run('2026-10-09', 'r1', 'hero', 'android', 'qr', '2026-10-09', 1000);
  record.run('2026-10-09', 'r1', 'hero', 'android', 'qr_site', '2026-10-09', 1000);
  assert.equal(Number(db.prepare("SELECT clicks FROM download_click_daily_v2 WHERE source = 'qr'").get().clicks), 2);
  assert.equal(Number(db.prepare("SELECT clicks FROM download_click_daily_v2 WHERE source = 'qr_site'").get().clicks), 1);
  for (const junk of ['facebook', 'qr-site', 'qrsite', 'qr_site2']) {
    assert.throws(() => record.run('2026-10-09', 'r1', 'hero', 'android', junk, '2026-10-09', 1000), /CHECK/, junk);
  }
  // The recreated trigger still draws on the shared budget and the 5000 hard ceiling.
  assert.equal(Number(db.prepare("SELECT accepted FROM metrics_daily_budget WHERE day = '2026-10-09'").get().accepted), 7);
  db.prepare("UPDATE metrics_daily_budget SET accepted = 5000 WHERE day = '2026-10-09'").run();
  const result = record.run('2026-10-09', 'r1', 'hero', 'android', 'qr', '2026-10-09', 999999);
  assert.equal(Number(result.changes), 0);
  assert.equal(Number(db.prepare("SELECT clicks FROM download_click_daily_v2 WHERE source = 'qr'").get().clicks), 2);
  db.close();
});

test('rollback safety after 0003: beta.8 and pre-qr statements still write', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(migration);
  db.exec(sourceMigration);
  db.exec(qrMigration);
  const legacy = `INSERT INTO download_click_daily (day, event, release, button, platform, clicks)
SELECT ?, 'apk_download_click', ?, ?, ?, 1
WHERE COALESCE((SELECT accepted FROM metrics_daily_budget WHERE day = ?), 0) < ?
ON CONFLICT (day, event, release, button, platform)
DO UPDATE SET clicks = clicks + 1`;
  db.prepare(legacy).run('2026-10-09', 'r1', 'hero', 'android', '2026-10-09', 1000);
  // The previous deployment's statement is byte-identical to RECORD_CLICK_SQL (same table name and conflict target).
  db.prepare(RECORD_CLICK_SQL).run('2026-10-09', 'r1', 'hero', 'android', 'instagram', '2026-10-09', 1000);
  assert.equal(Number(db.prepare('SELECT clicks FROM download_click_daily').get().clicks), 1);
  assert.equal(Number(db.prepare('SELECT clicks FROM download_click_daily_v2').get().clicks), 1);
  assert.equal(Number(db.prepare("SELECT accepted FROM metrics_daily_budget WHERE day = '2026-10-09'").get().accepted), 2);
  db.close();
});
