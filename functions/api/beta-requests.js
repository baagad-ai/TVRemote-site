// Join the beta: stores one Google Play tester email (trimmed, lowercased, validated) and its UTC timestamp in
// the existing beta D1 table (worker/migrations/0001_beta_requests.sql). Duplicates are a no-op (email is the
// primary key) and get the same reply, so the endpoint never reveals who is on the list. Turnstile is verified
// server-side before anything is written. Never log request bodies, addresses, tokens or IPs.
import { normalizeEmail } from '../../worker/email.mjs';

const SITE_HOST = 'theremote-site.pages.dev';
const MAX_BODY = 4096;
const DAILY_LIMIT = 200;
// Cloudflare's published always-pass Turnstile test secret. Accepted only where TURNSTILE_TEST_MODE=true (preview).
const TEST_SECRET = '1x0000000000000000000000000000000AA';

const reply = (status, payload) => new Response(JSON.stringify(payload), { status, headers: {
  'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const fail = (status, code) => reply(status, { ok: false, code });

function allowedOrigin(origin, env) {
  if (origin === `https://${SITE_HOST}`) return true;
  return env.BETA_ALLOW_PREVIEW_ORIGINS === 'true' && /^https:\/\/[a-z0-9-]+\.theremote-site\.pages\.dev$/.test(origin || '');
}

export async function onRequestPost({ request, env }) {
  if (!allowedOrigin(request.headers.get('Origin'), env)) return fail(403, 'origin_not_allowed');
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('Content-Type') || '')) return fail(415, 'json_required');
  if (!env.BETA_DB || !env.TURNSTILE_SECRET_KEY) return fail(503, 'temporarily_unavailable');
  const testMode = env.TURNSTILE_TEST_MODE === 'true' && env.TURNSTILE_SECRET_KEY === TEST_SECRET;
  if (env.TURNSTILE_SECRET_KEY === TEST_SECRET && !testMode) return fail(503, 'temporarily_unavailable');
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return fail(413, 'invalid_body');
    let body;
    try { body = JSON.parse(text); } catch { return fail(400, 'invalid_body'); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !['email', 'turnstileToken', 'website'].includes(k))) return fail(400, 'invalid_body');
    if (body.website !== '') return fail(400, 'invalid_request');
    const email = normalizeEmail(body.email);
    if (!email) return fail(400, 'invalid_email');
    if (typeof body.turnstileToken !== 'string' || !body.turnstileToken.trim() || body.turnstileToken.length > 2048) return fail(400, 'verification_required');
    const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: body.turnstileToken });
    const ip = request.headers.get('CF-Connecting-IP'); if (ip) form.set('remoteip', ip);
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form, redirect: 'manual', signal: AbortSignal.timeout(10000) });
    if (!verification.ok) return fail(503, 'temporarily_unavailable');
    const verified = await verification.json();
    if (verified.success !== true || (!testMode && (verified.hostname !== SITE_HOST || verified.action !== 'beta_request'))) return fail(400, 'verification_failed');
    const cutoff = Math.floor(Date.now() / 86400000) * 86400;
    const result = await env.BETA_DB.prepare('INSERT INTO beta_requests (email, created_at) SELECT ?, unixepoch() WHERE (SELECT COUNT(*) FROM beta_requests WHERE created_at >= ?) < ? ON CONFLICT(email) DO NOTHING')
      .bind(email, cutoff, DAILY_LIMIT).run();
    if (result.success !== true) return fail(503, 'temporarily_unavailable');
    if (result.meta?.changes !== 1) {
      const exists = await env.BETA_DB.prepare('SELECT 1 AS present FROM beta_requests WHERE email = ?').bind(email).first();
      if (!exists?.present) return fail(429, 'daily_capacity');
    }
    return reply(200, { ok: true });
  } catch { return fail(503, 'temporarily_unavailable'); }
}
