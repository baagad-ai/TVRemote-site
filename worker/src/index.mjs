import { normalizeEmail } from "../email.mjs";

const ORIGIN = "https://baagad-ai.github.io";
const MAX_BODY = 4096;
const DAILY_LIMIT = 200;
const saved = { ok: true, message: "Your request is saved. This does not enroll you in the Google Play beta." };

function reply(status, payload, cors = false, extra = {}) {
  return new Response(JSON.stringify(payload), { status, headers: {
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", "Vary": "Origin",
    ...(cors ? { "Access-Control-Allow-Origin": ORIGIN } : {}), ...extra
  } });
}
function failure(status, code, cors = true) {
  return reply(status, { ok: false, code }, cors, status === 429 ? { "Retry-After": "60" } : {});
}
async function readJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_body");
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) { await reader.cancel(); throw new Error("body_too_large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export default {
  async fetch(request, env) {
    // Never log request bodies, email addresses, tokens, IPs, or raw exceptions.
    const url = new URL(request.url);
    if (url.pathname !== "/beta-requests" || url.search) return failure(404, "not_found", false);
    const cors = request.headers.get("Origin") === ORIGIN;
    if (!cors) return failure(403, "origin_not_allowed", false);
    if (request.method === "OPTIONS") {
      if (request.headers.get("Access-Control-Request-Method") !== "POST") return failure(405, "method_not_allowed");
      const headers = (request.headers.get("Access-Control-Request-Headers") || "").split(",").filter(Boolean);
      if (headers.some((header) => header.trim().toLowerCase() !== "content-type")) return failure(403, "headers_not_allowed");
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": ORIGIN,
        "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "600", "Vary": "Origin", "Cache-Control": "no-store" } });
    }
    if (request.method !== "POST") return reply(405, { ok: false, code: "method_not_allowed" }, true, { Allow: "POST, OPTIONS" });
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("Content-Type") || "")) return failure(415, "json_required");
    if (Number(request.headers.get("Content-Length")) > MAX_BODY) return failure(413, "body_too_large");
    if (!env.DB || !env.BETA_RATE_LIMITER || !env.TURNSTILE_SECRET_KEY) return failure(503, "temporarily_unavailable");
    try {
      const ip = request.headers.get("CF-Connecting-IP");
      if (!ip) return failure(503, "temporarily_unavailable");
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.TURNSTILE_SECRET_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const hashed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
      const rateKey = Array.from(new Uint8Array(hashed), (byte) => byte.toString(16).padStart(2, "0")).join("");
      if (!(await env.BETA_RATE_LIMITER.limit({ key: rateKey })).success) return failure(429, "too_many_requests");
      let body;
      try { body = await readJson(request); }
      catch (error) { return failure(error.message === "body_too_large" ? 413 : 400, "invalid_body"); }
      if (!body || Array.isArray(body) || typeof body !== "object" || Object.keys(body).some((name) => !["email", "turnstileToken", "website", "consent"].includes(name))) return failure(400, "invalid_body");
      const email = normalizeEmail(body.email);
      if (!email) return failure(400, "invalid_email");
      if (body.consent !== true || body.website !== "") return failure(400, "invalid_request");
      if (typeof body.turnstileToken !== "string" || !body.turnstileToken.trim() || body.turnstileToken.length > 2048) return failure(400, "verification_required");
      // Workerd supports manual redirects; never forward the secret to another URL.
      const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST", redirect: "manual", body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: body.turnstileToken, remoteip: ip }),
        signal: AbortSignal.timeout(10000)
      });
      if (!verification.ok) return failure(503, "temporarily_unavailable");
      const verified = await verification.json();
      if (verified.success !== true || verified.hostname !== "baagad-ai.github.io" || verified.action !== "beta_request") return failure(400, "verification_failed");
      const cutoff = Math.floor(Date.now() / 86400000) * 86400;
      // Single SQLite statement makes the daily persisted-growth cap atomic.
      const result = await env.DB.prepare("INSERT INTO beta_requests (email, created_at) SELECT ?, unixepoch() WHERE (SELECT COUNT(*) FROM beta_requests WHERE created_at >= ?) < ? ON CONFLICT(email) DO NOTHING")
        .bind(email, cutoff, DAILY_LIMIT).run();
      if (result.success !== true) return failure(503, "temporarily_unavailable");
      if (result.meta?.changes !== 1) {
        const exists = await env.DB.prepare("SELECT 1 AS present FROM beta_requests WHERE email = ?").bind(email).first();
        if (!exists?.present) return failure(429, "daily_capacity");
      }
      return reply(200, saved, true);
    } catch { return failure(503, "temporarily_unavailable"); }
  }
};
