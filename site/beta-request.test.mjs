import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("beta-request.js", import.meta.url), "utf8");
function load({ ready = true, fetcher = async () => Response.json({ ok: true }), synchronousToken = false, renderError = false, config = {} } = {}) {
  const fieldset = { disabled: true }, submit = { disabled: true }, status = { textContent: "Requests are not open." }, target = {};
  const form = {
    attributes: { "data-beta-ready": String(ready) }, valid: true, handlers: {}, resetCount: 0,
    elements: { email: { value: " Tester@Example.com " }, consent: { checked: true }, website: { value: "" } },
    getAttribute(key) { return this.attributes[key]; }, setAttribute(key, value) { this.attributes[key] = value; },
    querySelector(selector) { return { fieldset, "[type=submit]": submit, "[data-request-status]": status, "[data-turnstile]": target }[selector]; },
    reportValidity() { return this.valid; }, addEventListener(name, fn) { this.handlers[name] = fn; },
    reset() { this.resetCount++; this.elements.email.value = ""; this.elements.consent.checked = false; }
  };
  let widgetOptions, requests = [], resetCount = 0, scripts = [];
  const context = {
    window: { remoteSiteConfig: { betaRequestUrl: "https://worker.account.workers.dev/beta-requests", turnstileSiteKey: "0x4AAAAAAAAAAAAAAAAAAAAAAAA", ...config },
      turnstile: { render(element, options) { assert.equal(element, target); widgetOptions = options; if (renderError) throw new Error("test-only error"); if (synchronousToken) options.callback("test-token"); return "widget"; }, reset() { resetCount++; } } },
    document: { querySelector: () => form, createElement: () => ({}), head: { append(script) { scripts.push(script); } } },
    fetch: async (...args) => { requests.push(args); return fetcher(...args); }, AbortSignal, Object
  };
  vm.runInNewContext(source, context);
  return { context, form, fieldset, submit, status, requests, scripts,
    initialize() { context.window.remoteBetaTurnstileReady?.(); },
    verified() { widgetOptions.callback("test-token"); },
    expire() { widgetOptions["expired-callback"](); }, error() { widgetOptions["error-callback"](); },
    async send() { await form.handlers.submit?.({ preventDefault() {} }); },
    resets() { return resetCount; }, rendered() { return widgetOptions; }
  };
}
test("unconfigured form stays disabled and loads no verification script", () => {
  const page = load({ ready: false }); assert.equal(page.scripts.length, 0); assert.equal(page.fieldset.disabled, true);
  assert.equal(page.form.handlers.submit, undefined);
});
test("verification gates submissions, expiry clears permission, and native validity is honored", async () => {
  const page = load(); page.initialize();
  assert.equal(page.scripts.length, 1); assert(page.scripts[0].src.startsWith("https://challenges.cloudflare.com/turnstile/"));
  assert.equal(page.fieldset.disabled, false); assert.equal(page.submit.disabled, true);
  await page.send(); assert.equal(page.requests.length, 0);
  page.verified(); assert.equal(page.submit.disabled, false);
  page.expire(); assert.equal(page.submit.disabled, true); await page.send(); assert.equal(page.requests.length, 0);
  page.verified(); page.form.valid = false; await page.send(); assert.equal(page.requests.length, 0);
});
test("submit is locked until persistence response, captures the Google Play email, and success is final", async () => {
  let resolve;
  const page = load({ fetcher: () => new Promise((done) => { resolve = done; }) }); page.initialize(); page.verified();
  const pending = page.send();
  assert.equal(page.fieldset.disabled, true); assert.equal(page.submit.disabled, true); assert.equal(page.form.attributes["aria-busy"], "true");
  assert(!page.status.textContent.includes("is saved"));
  await page.send(); assert.equal(page.requests.length, 1);
  const [url, options] = page.requests[0];
  assert.equal(url, page.context.window.remoteSiteConfig.betaRequestUrl); assert.equal(options.method, "POST");
  assert.equal(options.credentials, "omit"); assert.equal(options.redirect, "error");
  assert.deepEqual(JSON.parse(options.body), { email: "Tester@Example.com", consent: true, website: "", turnstileToken: "test-token" });
  resolve(Response.json({ ok: true })); await pending;
  assert.match(page.status.textContent, /request is saved/); assert.match(page.status.textContent, /does not enroll/);
  assert.equal(page.form.resetCount, 1); assert.equal(page.form.attributes["aria-busy"], "false"); assert.equal(page.fieldset.disabled, true);
  const savedStatus = page.status.textContent; page.expire(); page.error(); page.verified(); await page.send();
  assert.equal(page.status.textContent, savedStatus); assert.equal(page.requests.length, 1); assert.equal(page.submit.disabled, true);
});
test("API rejection preserves email and supports a newly verified retry", async () => {
  let count = 0;
  const page = load({ fetcher: async () => ++count === 1 ? Response.json({ ok: false, code: "temporarily_unavailable" }, { status: 503 }) : Response.json({ ok: true }) });
  page.initialize(); page.verified(); await page.send();
  assert(!page.status.textContent.includes("request is saved")); assert.match(page.status.textContent, /could not confirm/);
  assert.equal(page.fieldset.disabled, false); assert.equal(page.submit.disabled, true); assert.equal(page.form.elements.email.value, " Tester@Example.com ");
  await page.send(); assert.equal(count, 1); page.verified(); await page.send(); assert.equal(count, 2); assert.match(page.status.textContent, /request is saved/);
});
test("network, malformed response, and non-200 success claims never report persistence", async () => {
  for (const fetcher of [async () => { throw new Error("test-only network error"); }, async () => new Response("not JSON"), async () => Response.json({ ok: true }, { status: 202 }), async () => Response.json({ ok: false })]) {
    const page = load({ fetcher }); page.initialize(); page.verified(); await page.send();
    assert.match(page.status.textContent, /could not confirm/); assert(!page.status.textContent.includes("request is saved")); assert.equal(page.fieldset.disabled, false); assert.equal(page.submit.disabled, true);
    assert.equal(page.form.resetCount, 0); assert.equal(page.resets(), 1);
  }
});
test("throttle/challenge errors are actionable and verification startup failures stay closed", async () => {
  for (const code of ["too_many_requests", "daily_capacity", "invalid_email", "verification_failed"]) {
    const page = load({ fetcher: async () => Response.json({ ok: false, code }, { status: 400 }) }); page.initialize(); page.verified(); await page.send();
    assert(!page.status.textContent.includes("request is saved")); assert.equal(page.submit.disabled, true); assert(page.status.textContent.length > 20);
  }
  const failed = load({ renderError: true }); failed.initialize(); assert.equal(failed.fieldset.disabled, true); assert.equal(failed.submit.disabled, true);
  const scriptFailure = load(); scriptFailure.scripts[0].onerror(); assert.equal(scriptFailure.fieldset.disabled, true); assert.match(scriptFailure.status.textContent, /could not load/);
});
test("synchronous verification callback during widget initialization enables submission", () => {
  const page = load({ synchronousToken: true }); page.initialize(); assert.equal(page.submit.disabled, false);
});

test("verified configuration whitespace is normalized for both providers", async () => {
  const page = load({ config: { betaRequestUrl: " https://worker.account.workers.dev/beta-requests ", turnstileSiteKey: " 0x4AAAAAAAAAAAAAAAAAAAAAAAA " } });
  page.initialize(); assert.equal(page.rendered().sitekey, "0x4AAAAAAAAAAAAAAAAAAAAAAAA");
  page.verified(); await page.send(); assert.equal(page.requests[0][0], "https://worker.account.workers.dev/beta-requests");
});
