import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest, COUNT_SQL } from '../../functions/api/download-count.js';

const db = row => ({ prepare: sql => ({ first: async () => { assert.equal(sql, COUNT_SQL); if (row instanceof Error) throw row; return row; } }) });
const get = (env, method = 'GET') => onRequest({ request: new Request('https://theremote-site.pages.dev/api/download-count', { method }), env });

test('download count returns the all-time total with a short cache', async () => {
  const res = await get({ METRICS_DB: db({ count: 1234 }) });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { count: 1234 });
  assert.equal(res.headers.get('Cache-Control'), 'public, max-age=5');
});
test('download count is read-only and fails closed', async () => {
  assert.match(COUNT_SQL, /^SELECT /);
  assert.equal((await get({ METRICS_DB: db({ count: 1 }) }, 'POST')).status, 405);
  assert.equal((await get({})).status, 503);
  assert.equal((await get({ METRICS_DB: db(new Error('x')) })).status, 503);
});
