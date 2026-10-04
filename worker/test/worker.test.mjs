import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.mjs";
import { normalizeEmail } from "../email.mjs";

const ORIGIN = "https://baagad-ai.github.io";
function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(fs.readFileSync(new URL("../migrations/0001_beta_requests.sql", import.meta.url), "utf8"));
  return { sqlite, prepare(sql) { return { bind(...args) { return {
    async run() { const result = sqlite.prepare(sql).run(...args); return { success: true, meta: { changes: Number(result.changes) } }; },
    async first() { return sqlite.prepare(sql).get(...args) || null; }
  }; } }; } };
}
function env() { return { DB: database(), BETA_RATE_LIMITER: { async limit() { return { success: true }; } }, TURNSTILE_SECRET_KEY: "test-only-secret" }; }
function request(body = {}, options = {}) {
  return new Request("https://worker.example/beta-requests", { method: "POST", headers: { Origin: ORIGIN,
    "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1", ...options.headers },
    body: JSON.stringify({ email: "tester@example.com", consent: true, website: "", turnstileToken: "test-token", ...body }) });
}
function verification(t, result = { success: true, hostname: "baagad-ai.github.io", action: "beta_request" }) {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => { assert.equal(options.redirect, "manual"); calls++; return Response.json(result); });
  return () => calls;
}
test("practical email validation normalizes case and spaces but preserves aliases", () => {
  assert.equal(normalizeEmail(" Person.Name+beta@Gmail.com "), "person.name+beta@gmail.com");
  for (const email of [null, 7, "x", "a@@example.com", "a..b@example.com", "a.@example.com", ".a@example.com", "a@localhost", "a@-example.com", "a@example-.com", "a@exa_mple.com", "a@例.com", "=formula@example.com", "+formula@example.com", "a\nb@example.com", "a,b@example.com", '"a"@example.com', "a".repeat(65)+"@example.com"]) assert.equal(normalizeEmail(email), null);
});
test("new and concurrent normalized duplicate requests persist one row and have identical private success", async (t) => {
  verification(t); const bindings = env(); t.after(() => bindings.DB.sqlite.close());
  const responses = await Promise.all(Array.from({ length: 20 }, (_, i) => worker.fetch(request({ email: i % 2 ? " TESTER@EXAMPLE.COM " : "tester@example.com" }), bindings)));
  const messages = await Promise.all(responses.map(async (response) => { assert.equal(response.status, 200); assert.equal(response.headers.get("Cache-Control"), "no-store"); return response.text(); }));
  assert.equal(new Set(messages).size, 1); assert(!messages[0].includes("tester@example.com"));
  assert.equal(bindings.DB.sqlite.prepare("SELECT count(*) AS count FROM beta_requests").get().count, 1);
});
test("success awaits persistence and a failed write never succeeds", async (t) => {
  verification(t);
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  const bindings = env(); t.after(() => originalDb.sqlite.close());
  const originalDb = bindings.DB;
  bindings.DB = { prepare() { return { bind() { return { run: () => pending }; } }; } };
  let completed = false;
  const response = worker.fetch(request(), bindings).then((value) => { completed = true; return value; });
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(completed, false);
  finish({ success: false });
  assert.equal((await response).status, 503);
});
test("atomic daily cap gives existing and new addresses the same capacity response", async (t) => {
  const now = Date.now(); t.mock.method(Date, "now", () => now);
  verification(t); const bindings = env(); t.after(() => bindings.DB.sqlite.close());
  const insert = bindings.DB.sqlite.prepare("INSERT INTO beta_requests(email,created_at) VALUES (?, unixepoch())");
  for (let i = 0; i < 199; i++) insert.run(`seed${i}@example.com`);
  const responses = await Promise.all(Array.from({ length: 10 }, (_, i) => worker.fetch(request({ email: `new${i}@example.com` }), bindings)));
  assert.equal(responses.filter((r) => r.status === 200).length, 1);
  assert.equal(responses.filter((r) => r.status === 429).length, 9);
  assert.equal(bindings.DB.sqlite.prepare("SELECT count(*) AS count FROM beta_requests").get().count, 200);
  const timestamp = bindings.DB.sqlite.prepare("SELECT created_at FROM beta_requests WHERE email = ?").get("seed0@example.com").created_at;
  const stored = await worker.fetch(request({ email: "seed0@example.com" }), bindings);
  const absent = await worker.fetch(request({ email: "absent@example.com" }), bindings);
  assert.equal(stored.status, 429); assert.equal(absent.status, 429);
  assert.equal(await stored.text(), await absent.text());
  assert.equal(stored.headers.get("Retry-After"), absent.headers.get("Retry-After"));
  assert.equal(bindings.DB.sqlite.prepare("SELECT created_at FROM beta_requests WHERE email = ?").get("seed0@example.com").created_at, timestamp);
  assert.equal(bindings.DB.sqlite.prepare("SELECT count(*) AS count FROM beta_requests").get().count, 200);
});
test("forged, expired, wrong hostname and wrong action tokens never write", async (t) => {
  const bindings = env(); t.after(() => bindings.DB.sqlite.close());
  for (const result of [{ success: false }, { success: true, hostname: "evil.example", action: "beta_request" }, { success: true, hostname: "baagad-ai.github.io", action: "other" }]) {
    const mock = t.mock.method(globalThis, "fetch", async () => Response.json(result));
    assert.equal((await worker.fetch(request(), bindings)).status, 400); mock.mock.restore();
  }
  assert.equal(bindings.DB.sqlite.prepare("SELECT count(*) AS count FROM beta_requests").get().count, 0);
});
test("malformed input, honeypot, consent, body limits and foreign origin are rejected before verification", async (t) => {
  const calls = verification(t); const bindings = env(); t.after(() => bindings.DB.sqlite.close());
  for (const body of [{ email: "bad" }, { consent: false }, { website: "spam" }, { turnstileToken: "" }, { turnstileToken: "x".repeat(2049) }, { unexpected: true }]) assert.equal((await worker.fetch(request(body), bindings)).status, 400);
  assert.equal((await worker.fetch(request({}, { headers: { Origin: "https://evil.example" } }), bindings)).status, 403);
  assert.equal((await worker.fetch(request({}, { headers: { "Content-Type": "text/plain" } }), bindings)).status, 415);
  for (const body of ["null", "[]", "{broken"]) assert.equal((await worker.fetch(new Request("https://worker.example/beta-requests", { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1" }, body }), bindings)).status, 400);
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(3000)); controller.enqueue(new Uint8Array(3000)); controller.close(); } });
  const oversized = new Request("https://worker.example/beta-requests", { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1" }, body: stream, duplex: "half" });
  assert.equal((await worker.fetch(oversized, bindings)).status, 413);
  assert.equal(calls(), 0);
});
test("rate-limit and dependency failures fail closed without leaking errors", async (t) => {
  const calls = verification(t); const bindings = env(); t.after(() => bindings.DB.sqlite.close());
  bindings.BETA_RATE_LIMITER.limit = async () => ({ success: false });
  assert.equal((await worker.fetch(request(), bindings)).status, 429); assert.equal(calls(), 0);
  delete bindings.BETA_RATE_LIMITER;
  assert.equal((await worker.fetch(request(), bindings)).status, 503);
  bindings.BETA_RATE_LIMITER = { async limit() { throw new Error("private@example.com"); } };
  const failed = await worker.fetch(request(), bindings);
  assert.equal(failed.status, 503); assert(!(await failed.text()).includes("private@example.com"));
});
test("verification outage fails closed and public read/export routes do not exist", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("test-only outage"); });
  const bindings = env(); t.after(() => bindings.DB.sqlite.close());
  assert.equal((await worker.fetch(request(), bindings)).status, 503);
  assert.equal((await worker.fetch(new Request("https://worker.example/beta-requests", { headers: { Origin: ORIGIN } }), bindings)).status, 405);
  assert.equal((await worker.fetch(new Request("https://worker.example/export"), bindings)).status, 404);
  assert.equal((await worker.fetch(new Request("https://worker.example/beta-requests?email=x", { headers: { Origin: ORIGIN } }), bindings)).status, 404);
  const preflight = await worker.fetch(new Request("https://worker.example/beta-requests", { method: "OPTIONS", headers: { Origin: ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } }), bindings);
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), ORIGIN);
});


test("verification redirects are not followed and never save a request", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(options.redirect, "manual");
    return new Response(null, { status: 307, headers: { Location: "https://evil.example/collect" } });
  });
  const bindings = env(); t.after(() => bindings.DB.sqlite.close());
  const response = await worker.fetch(request(), bindings);
  assert.equal(response.status, 503);
  assert.equal(bindings.DB.sqlite.prepare("SELECT count(*) AS count FROM beta_requests").get().count, 0);
});


test("under-cap duplicate success preserves the first timestamp and reveals no membership", async (t) => {
  verification(t); const bindings = env(); t.after(() => bindings.DB.sqlite.close());
  bindings.DB.sqlite.prepare("INSERT INTO beta_requests(email, created_at) VALUES (?, ?)").run("tester@example.com", 1234567890);
  const duplicate = await worker.fetch(request({ email: " TESTER@EXAMPLE.COM " }), bindings);
  const fresh = await worker.fetch(request({ email: "new@example.com" }), bindings);
  assert.equal(duplicate.status, 200); assert.equal(fresh.status, 200);
  assert.equal(await duplicate.text(), await fresh.text());
  assert.equal(bindings.DB.sqlite.prepare("SELECT created_at FROM beta_requests WHERE email = ?").get("tester@example.com").created_at, 1234567890);
  assert.equal(bindings.DB.sqlite.prepare("SELECT count(*) AS count FROM beta_requests").get().count, 2);
});

test("daily capacity retry timing resets at midnight UTC, while IP throttling stays one minute", async (t) => {
  verification(t); const bindings = env(); t.after(() => bindings.DB.sqlite.close());
  const start = Math.floor(Date.now() / 86400000) * 86400000;
  const now = t.mock.method(Date, "now", () => start + 43200000);
  const insert = bindings.DB.sqlite.prepare("INSERT INTO beta_requests(email, created_at) VALUES (?, ?)");
  for (let i = 0; i < 200; i++) insert.run("seed" + i + "@example.com", start / 1000);
  const noon = await worker.fetch(request(), bindings);
  assert.equal(noon.status, 429); assert.equal(noon.headers.get("Retry-After"), "43200");
  now.mock.mockImplementation(() => start + 86399999);
  const midnight = await worker.fetch(request(), bindings);
  assert.equal(midnight.headers.get("Retry-After"), "1");
  bindings.BETA_RATE_LIMITER.limit = async () => ({ success: false });
  const throttled = await worker.fetch(request(), bindings);
  assert.equal(throttled.status, 429); assert.equal(throttled.headers.get("Retry-After"), "60");
});

test("a zero-change write without a verified existing row or trustworthy capacity never succeeds", async (t) => {
  verification(t); const bindings = env(); const original = bindings.DB; t.after(() => original.sqlite.close());
  for (const count of [0, undefined, "0", -1]) {
    bindings.DB = { prepare(sql) { return { bind() { return {
      async run() { return { success: true, meta: { changes: 0 } }; },
      async first() { return sql.includes("COUNT") ? { count } : null; }
    }; } }; } };
    const response = await worker.fetch(request(), bindings);
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), { ok: false, code: "temporarily_unavailable" });
  }
});
