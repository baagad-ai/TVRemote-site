import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("beta-request.js", import.meta.url), "utf8");
const markerKey = "the-remote:beta-request-state";
function load({ ready = true, fetcher = async () => Response.json({ ok: true }), synchronousToken = false, renderError = false, config = {}, storage = new Map(), storageBlocked = false } = {}) {
  let document;
  function node(text = "") {
    const classes = new Set();
    return { textContent: text, hidden: false, disabled: false, attributes: {}, handlers: {},
      classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }, contains: (name) => classes.has(name) },
      setAttribute(key, value) { this.attributes[key] = value; }, removeAttribute(key) { delete this.attributes[key]; },
      addEventListener(name, fn) { this.handlers[name] = fn; }, focus() { document.activeElement = this; this.focused = true; }
    };
  }
  const fieldset = node(), submit = node(), submitLabel = node("Request beta access"), status = node(), target = node();
  const verificationStatus = node(), retry = node(), panel = node(), heading = node(), summary = node(), emailRow = node(), resultEmail = node(), another = node();
  fieldset.disabled = submit.disabled = true; retry.hidden = panel.hidden = true;
  const email = node(), consent = node(), website = node();
  email.value = " Tester@Example.com "; consent.checked = true; website.value = "";
  const form = { ...node(), valid: true, resetCount: 0, elements: { email, consent, website },
    getAttribute(key) { return this.attributes[key]; },
    querySelector(selector) { return { fieldset, "[type=submit]": submit, "[data-turnstile]": target, "[data-verification-status]": verificationStatus, "[data-verification-retry]": retry }[selector]; },
    reportValidity() { return this.valid; },
    contains(element) { return [email, consent, website, fieldset, submit, submitLabel, target, retry, verificationStatus].includes(element); },
    reset() { this.resetCount++; email.value = ""; consent.checked = false; website.value = ""; }
  };
  form.attributes["data-beta-ready"] = String(ready);
  submit.querySelector = () => submitLabel;
  panel.querySelector = (selector) => ({ "[data-result-heading]": heading, "[data-result-summary]": summary, "[data-result-email-row]": emailRow, "[data-result-email]": resultEmail, "[data-register-another]": another }[selector]);
  const body = node(), outside = node();
  document = { body, activeElement: body,
    querySelector: (selector) => ({ "[data-beta-request-form]": form, "[data-request-status]": status, "[data-request-result]": panel }[selector]),
    createElement: () => ({ remove() { this.removed = true; } }), head: { append(script) { scripts.push(script); } }
  };
  const callbacks = [], scripts = [], requests = [], removed = [], timers = new Map(), handlers = {};
  let timerId = 0;
  const provider = { render(element, options) { assert.equal(element, target); callbacks.push(options); if (synchronousToken) options.callback("test-token"); if (renderError) throw new Error("test-only render failure"); return "widget-" + callbacks.length; },
    remove(id) { removed.push(id); } };
  const context = { window: { remoteSiteConfig: { betaRequestUrl: "https://worker.account.workers.dev/beta-requests", turnstileSiteKey: "0x4AAAAAAAAAAAAAAAAAAAAAAAA", ...config },
      sessionStorage: { getItem(key) { if (storageBlocked) throw Error("blocked"); return storage.get(key) || null; }, setItem(key, value) { if (storageBlocked) throw Error("blocked"); storage.set(key, value); }, removeItem(key) { if (storageBlocked) throw Error("blocked"); storage.delete(key); } },
      addEventListener(name, fn) { handlers[name] = fn; } },
    document, fetch: async (...args) => { requests.push(args); return fetcher(...args); }, AbortController, Object,
    setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; }, clearTimeout(id) { timers.delete(id); }
  };
  vm.runInNewContext(source, context);
  return { context, document, form, fieldset, submit, submitLabel, status, verificationStatus, retry, panel, heading, summary, emailRow, resultEmail, another, outside, requests, callbacks, scripts, removed, storage, timers,
    initialize() { context.window.turnstile = provider; context.window.remoteBetaTurnstileReady?.(); },
    verified(index = callbacks.length - 1) { callbacks[index]?.callback("test-token"); },
    expire(index = callbacks.length - 1) { callbacks[index]?.["expired-callback"](); },
    error(index = callbacks.length - 1) { callbacks[index]?.["error-callback"](); },
    send() { return form.handlers.submit?.({ preventDefault() {} }); },
    reset() { another.handlers.click?.(); }, retryChallenge() { retry.handlers.click?.(); },
    hide() { handlers.pagehide?.(); }, show() { handlers.pageshow?.({ persisted: true }); },
    timeout() { [...timers.values()][0]?.(); },
    fill(value = "tester@example.com") { email.value = value; consent.checked = true; website.value = ""; }
  };
}

test("missing configuration stays closed and loads no verification or requests", () => {
  const page = load({ ready: false });
  assert.equal(page.fieldset.disabled, true); assert.equal(page.form.handlers.submit, undefined); assert.equal(page.scripts.length, 0);
  assert.match(page.status.textContent, /unavailable/); assert.equal(page.panel.hidden, true);
});

test("native validation and fresh verification gate submissions", async () => {
  const page = load(); page.initialize();
  assert.equal(page.submit.disabled, true); await page.send(); assert.equal(page.requests.length, 0);
  page.verified(); page.form.valid = false; await page.send(); assert.equal(page.requests.length, 0);
  page.form.valid = true; page.expire(); await page.send(); assert.equal(page.requests.length, 0);
  assert.equal(page.retry.hidden, false); page.retryChallenge(); page.verified(); assert.equal(page.submit.disabled, false);
});

test("double taps and Enter submit once while saving, then replace the form with focused confirmation", async () => {
  let resolve;
  const page = load({ fetcher: () => new Promise((done) => { resolve = done; }) }); page.initialize(); page.verified();
  const pending = page.send();
  await page.send(); await page.send();
  assert.equal(page.requests.length, 1); assert.equal(page.fieldset.disabled, true); assert.equal(page.submit.disabled, true);
  assert.equal(page.submitLabel.textContent, "Saving…"); assert.equal(page.form.attributes["aria-busy"], "true"); assert.equal(page.panel.hidden, true);
  const [url, options] = page.requests[0]; assert.equal(url, page.context.window.remoteSiteConfig.betaRequestUrl);
  assert.equal(options.method, "POST"); assert.equal(options.credentials, "omit"); assert.equal(options.redirect, "error");
  assert.deepEqual(JSON.parse(options.body), { email: "Tester@Example.com", consent: true, website: "", turnstileToken: "test-token" });
  resolve(Response.json({ ok: true })); await pending;
  assert.equal(page.form.hidden, true); assert.equal(page.panel.hidden, false); assert.match(page.heading.textContent, /on the list/);
  assert.equal(page.resultEmail.textContent, "Tester@Example.com"); assert.equal(page.document.activeElement, page.heading);
  assert.equal(page.fieldset.disabled, true); assert.equal(page.form.attributes["aria-busy"], "false");
  assert.match(page.status.textContent, /does not enroll/); assert.equal(page.storage.get(markerKey), "confirmed");
  assert(!JSON.stringify([...page.storage]).includes("Example.com"));
});

test("success survives late callbacks and page return; only explicit reset reopens capture", async () => {
  const page = load(); page.initialize(); page.verified(); await page.send();
  const title = page.heading.textContent, acknowledgement = page.status.textContent;
  page.verified(0); page.expire(0); page.error(0); page.initialize(); await page.send();
  page.hide(); page.show();
  assert.equal(page.form.hidden, true); assert.equal(page.panel.hidden, false); assert.equal(page.submit.disabled, true);
  assert.equal(page.heading.textContent, title); assert.equal(page.status.textContent, acknowledgement); assert.equal(page.requests.length, 1);
  page.reset();
  assert.equal(page.form.hidden, false); assert.equal(page.panel.hidden, true); assert.equal(page.fieldset.disabled, false);
  assert.equal(page.form.elements.email.value, ""); assert.equal(page.form.elements.consent.checked, false); assert.equal(page.form.elements.website.value, "");
  assert.equal(page.document.activeElement, page.form.elements.email); assert.equal(page.submit.disabled, true); assert.equal(page.storage.has(markerKey), false);
  page.verified(0); await page.send(); assert.equal(page.requests.length, 1); assert.equal(page.submit.disabled, true);
  page.fill("another@example.com"); page.verified(); await page.send(); assert.equal(page.requests.length, 2);
});

test("only this page's own normalized confirmed email gets exact repeat feedback", async () => {
  const page = load({ fetcher: async () => Response.json({ ok: true, status: "already_registered" }) });
  page.initialize(); page.verified(); await page.send();
  assert.match(page.heading.textContent, /on the list/); assert(!/already/.test(page.heading.textContent));
  page.reset(); page.fill("  TESTER@example.COM "); page.verified(); await page.send();
  assert.match(page.heading.textContent, /already submitted/); assert.equal(page.requests.length, 2);
  assert.equal(page.resultEmail.textContent, "TESTER@example.COM");
  page.reset(); page.fill("unknown@example.com"); page.verified(); await page.send(); assert.match(page.heading.textContent, /on the list/);
});

test("reload restores only a non-email confirmation, without loading capture or verification", async () => {
  const storage = new Map(), first = load({ storage }); first.initialize(); first.verified(); await first.send();
  const reloaded = load({ storage });
  assert.equal(reloaded.form.hidden, true); assert.equal(reloaded.panel.hidden, false); assert.equal(reloaded.emailRow.hidden, true);
  assert.match(reloaded.heading.textContent, /previous request/); assert.equal(reloaded.scripts.length, 0); assert.equal(reloaded.requests.length, 0);
  reloaded.reset(); assert.equal(reloaded.form.hidden, false); assert.equal(reloaded.scripts.length, 1);
  assert.equal(reloaded.form.elements.email.value, ""); assert.equal(reloaded.form.elements.consent.checked, false);
});

test("blocked storage does not prevent confirmation or explicit reset", async () => {
  const page = load({ storageBlocked: true }); page.initialize(); page.verified(); await page.send();
  assert.equal(page.panel.hidden, false); page.reset(); assert.equal(page.form.hidden, false); assert.equal(page.submit.disabled, true);
});

test("retryable server errors preserve input and stay visible through fresh verification", async () => {
  let count = 0;
  const page = load({ fetcher: async () => ++count === 1 ? Response.json({ ok: false, code: "temporarily_unavailable" }, { status: 503 }) : Response.json({ ok: true }) });
  page.initialize(); page.verified(); await page.send();
  const error = page.status.textContent;
  assert.match(error, /could not confirm/); assert.equal(page.form.elements.email.value, " Tester@Example.com ");
  assert.equal(page.form.elements.consent.checked, true); assert.equal(page.submit.disabled, true); assert.equal(page.panel.hidden, true);
  page.verified(); assert.equal(page.status.textContent, error); assert.match(page.verificationStatus.textContent, /complete/);
  await page.send(); assert.equal(count, 2); assert.equal(page.panel.hidden, false);
});

test("malformed JSON, non-200 success claims and unknown responses remain unconfirmed", async () => {
  for (const fetcher of [async () => new Response("not JSON"), async () => Response.json({ ok: true }, { status: 202 }), async () => Response.json({ ok: false }), async () => Response.json({ ok: false, code: "toString" }, { status: 500 })]) {
    const page = load({ fetcher }); page.initialize(); page.verified(); await page.send();
    assert.match(page.status.textContent, /could not confirm/); assert.equal(page.panel.hidden, true);
    assert.equal(page.form.elements.email.value, " Tester@Example.com "); assert.equal(page.fieldset.disabled, false); assert.equal(page.submit.disabled, true);
    assert.equal(page.form.resetCount, 0); page.verified(); assert.match(page.status.textContent, /could not confirm/);
  }
});

test("network and timed-out submissions preserve inputs and explain persistence ambiguity", async () => {
  for (const timeout of [false, true]) {
    const page = load({ fetcher: async (url, { signal }) => {
      if (!timeout) throw new Error("test-only network failure");
      return new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(new Error("test-only timeout"))));
    } });
    page.initialize(); page.verified(); const pending = page.send(); if (timeout) page.timeout(); await pending;
    assert.match(page.status.textContent, /could not confirm/); assert.match(page.status.textContent, /same email/);
    assert.equal(page.form.elements.email.value, " Tester@Example.com "); assert.equal(page.storage.get(markerKey), "unconfirmed");
    assert.equal(page.submit.disabled, true); assert.equal(page.panel.hidden, true); assert.equal(page.timers.size, 0);
  }
});

test("rate, daily-capacity, validation and challenge errors survive provider callbacks", async () => {
  for (const [code, expression] of [["too_many_requests", /minute/], ["daily_capacity", /midnight UTC/], ["invalid_email", /Google Play account email/], ["invalid_request", /consent/], ["verification_failed", /fresh verification/]]) {
    const page = load({ fetcher: async () => Response.json({ ok: false, code }, { status: code.includes("capacity") || code.includes("many") ? 429 : 400 }) });
    page.initialize(); page.verified(); await page.send();
    const text = page.status.textContent; assert.match(text, expression);
    page.verified(); page.expire(); page.error(); assert.equal(page.status.textContent, text);
    assert.equal(page.form.elements.email.value, " Tester@Example.com ");
    if (code === "invalid_email") { assert.equal(page.form.elements.email.attributes["aria-invalid"], "true"); page.form.elements.email.handlers.input(); assert.equal(page.form.elements.email.attributes["aria-invalid"], undefined); }
  }
});

test("script error and a bounded load timeout expose retry without losing input", () => {
  for (const timeout of [false, true]) {
    const page = load();
    if (timeout) page.timeout(); else page.scripts[0].onerror();
    assert.equal(page.retry.hidden, false); assert.equal(page.submit.disabled, true); assert.equal(page.timers.size, 0);
    assert.equal(page.form.elements.email.value, " Tester@Example.com ");
    const original = page.scripts[0]; page.retryChallenge(); assert.equal(page.scripts.length, 2);
    original.onerror(); assert.equal(page.retry.hidden, true); // A stale failure cannot cancel the current load.
    page.initialize(); page.verified(); assert.equal(page.submit.disabled, false); assert.equal(page.timers.size, 0);
  }
});

test("failed renders invalidate their callbacks; a synchronous valid render can enable submission", async () => {
  const failed = load({ renderError: true }); failed.initialize(); failed.verified(0); await failed.send();
  assert.equal(failed.submit.disabled, true); assert.equal(failed.requests.length, 0); assert.equal(failed.retry.hidden, false);
  const good = load({ synchronousToken: true }); good.initialize(); assert.equal(good.submit.disabled, false);
});

test("page return renews verification and ignores a late interrupted request after a newer success", async () => {
  const completions = [];
  const page = load({ fetcher: () => new Promise((resolve) => completions.push(resolve)) });
  page.initialize(); page.verified(); const old = page.send(); page.hide();
  assert.equal(page.requests[0][1].signal.aborted, true);
  page.show(); assert.equal(page.submit.disabled, true); assert.match(page.status.textContent, /could not confirm/);
  page.verified(0); assert.equal(page.submit.disabled, true);
  page.fill("second@example.com"); page.verified(); const current = page.send();
  completions[1](Response.json({ ok: true })); await current;
  completions[0](Response.json({ ok: true })); await old;
  assert.equal(page.resultEmail.textContent, "second@example.com"); assert.equal(page.panel.hidden, false); assert.equal(page.form.hidden, true);
  assert.equal(page.timers.size, 0); assert.equal(page.storage.get(markerKey), "confirmed");
});

test("an interrupted reload warns without automatically resubmitting or storing an address", () => {
  const page = load({ storage: new Map([[markerKey, "unconfirmed"]]) });
  assert.equal(page.form.hidden, false); assert.equal(page.requests.length, 0); assert.match(page.status.textContent, /same email/);
  page.initialize(); page.verified(); assert.match(page.status.textContent, /same email/);
});

test("async confirmation does not steal focus after the user moves elsewhere", async () => {
  let resolve;
  const page = load({ fetcher: () => new Promise((done) => { resolve = done; }) }); page.initialize(); page.verified();
  const pending = page.send(); page.document.activeElement = page.outside; resolve(Response.json({ ok: true })); await pending;
  assert.equal(page.document.activeElement, page.outside); assert.equal(page.panel.hidden, false);
});

test("provider whitespace and submitted email text are handled without HTML or URL insertion", async () => {
  const page = load({ config: { betaRequestUrl: " https://worker.account.workers.dev/beta-requests ", turnstileSiteKey: " 0x4AAAAAAAAAAAAAAAAAAAAAAAA " } });
  page.initialize(); assert.equal(page.callbacks[0].sitekey, "0x4AAAAAAAAAAAAAAAAAAAAAAAA");
  page.form.elements.email.value = "x".repeat(64) + "@" + "domain".repeat(30) + ".example"; page.verified(); await page.send();
  assert.equal(page.requests[0][0], "https://worker.account.workers.dev/beta-requests"); assert.equal(page.resultEmail.textContent, page.requests[0] && JSON.parse(page.requests[0][1].body).email);
  assert(!source.includes("innerHTML")); assert(!source.includes("localStorage"));
});

test("result is outside the form, reset is a real button, and live status remains mounted", () => {
  const html = fs.readFileSync(new URL("index.html", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("styles.css", import.meta.url), "utf8");
  const form = html.slice(html.indexOf("<form data-beta-request-form"), html.indexOf("</form>", html.indexOf("<form data-beta-request-form")));
  assert(!form.includes("data-request-result")); assert(!form.includes("data-request-status"));
  assert.match(html, /<section[^>]*data-request-result hidden aria-labelledby="beta-result-title"/);
  assert.match(html, /data-result-heading tabindex="-1"/); assert.match(html, /type="button" data-register-another/);
  assert.match(html, /data-request-status role="status" aria-live="polite"/); assert.match(html, /<noscript>/);
  assert.match(css, /\[hidden\].*display:\s*none\s*!important/);
  assert.match(css, /\.beta-result-email strong\{[^}]*overflow-wrap:anywhere/);
  assert.match(css, /\.beta-result h3:focus/); assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
