// Read-only public total for the live download indicator. Never writes.
export const COUNT_SQL = 'SELECT COALESCE(SUM(clicks), 0) AS count FROM download_click_daily_v2';

function json(status, body, cache) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' },
  });
}

export async function onRequest({ request, env }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return json(405, null, 'no-store');
  if (!env.METRICS_DB?.prepare) return json(503, null, 'no-store');
  try {
    const row = await env.METRICS_DB.prepare(COUNT_SQL).first();
    const count = Number(row?.count);
    if (!Number.isSafeInteger(count) || count < 0) return json(503, null, 'no-store');
    return json(200, { count }, 'public, max-age=5');
  } catch {
    return json(503, null, 'no-store');
  }
}
