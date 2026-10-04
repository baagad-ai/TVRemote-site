export function mountBetaRequest(root, config) {
  "use strict";
  const form = root.querySelector("[data-beta-request-form]");
  const status = root.querySelector("[data-request-status]");
  if (!form || form.getAttribute("data-beta-ready") !== "true") {
    if (status) status.textContent = "Requests are unavailable right now. No email has been submitted.";
    return;
  }
  const listeners = [];
  const on = (target, event, callback) => { target.addEventListener(event, callback); listeners.push(() => target.removeEventListener(event, callback)); };
  const fieldset = form.querySelector("fieldset");
  const submit = form.querySelector("[type=submit]");
  const submitLabel = submit.querySelector("span");
  const verificationStatus = form.querySelector("[data-verification-status]");
  const retryVerification = form.querySelector("[data-verification-retry]");
  const panel = root.querySelector("[data-request-result]");
  const heading = panel.querySelector("[data-result-heading]");
  const summary = panel.querySelector("[data-result-summary]");
  const emailRow = panel.querySelector("[data-result-email-row]");
  const submittedEmail = panel.querySelector("[data-result-email]");
  const another = panel.querySelector("[data-register-another]");
  const confirmedEmails = new Set(); // Only this page's own confirmed submissions, never an email lookup.
  const markerKey = "the-remote:beta-request-state";
  let state = "editing", token = "", widget = null, challengeGeneration = 0, requestGeneration = 0;
  let requestTimeout = null, disposed = false;
  let pending = null, loadingScript = null, scriptTimeout = null, pageActive = true;
  const message = (text, kind = "") => { status.textContent = text; status.setAttribute("data-state", kind); status.classList.toggle("visually-hidden", kind === "success" || !text); };
  const marker = (value) => {
    try {
      if (value === undefined) return window.sessionStorage.getItem(markerKey);
      if (value) window.sessionStorage.setItem(markerKey, value);
      else window.sessionStorage.removeItem(markerKey);
    } catch { /* Storage restrictions leave the in-page/bfcache confirmation intact. */ }
  };
  const disposeChallenge = () => {
    challengeGeneration++; token = ""; submit.disabled = true;
    const previous = widget; widget = null;
    if (previous !== null) { try { window.turnstile.remove(previous); } catch { /* Old callbacks are still invalidated. */ } }
  };
  const showResult = (email = "", repeated = false, focus = false) => {
    state = "complete"; disposeChallenge(); fieldset.disabled = true; form.hidden = true; panel.hidden = false;
    heading.textContent = repeated ? "You already sent this request." : email ? "Request received." : "Your previous request was received.";
    summary.textContent = repeated ? "This page already confirmed your request. You can leave it here." : "We'll review your request privately.";
    submittedEmail.textContent = email; emailRow.hidden = !email;
    message(repeated ? "You already sent this request. A request does not enroll you in the Google Play beta." : "Request received. A request does not enroll you in the Google Play beta.", "success");
    if (focus) heading.focus();
  };
  const mountChallenge = () => {
    if (disposed || state !== "editing" || !pageActive) return;
    disposeChallenge();
    const generation = challengeGeneration;
    const current = () => generation === challengeGeneration && state === "editing" && pageActive;
    verificationStatus.textContent = "Complete verification before sending your request.";
    retryVerification.hidden = true;
    try {
      const rendered = window.turnstile.render(form.querySelector("[data-turnstile]"), {
        sitekey: config.turnstileSiteKey.trim(), action: "beta_request", theme: "dark", size: "flexible",
        callback: (value) => {
          if (!current()) return;
          token = typeof value === "string" ? value : ""; submit.disabled = !token;
          verificationStatus.textContent = token ? "Verification complete." : "Complete verification before sending your request.";
        },
        "expired-callback": () => {
          if (!current()) return;
          token = ""; submit.disabled = true; retryVerification.hidden = false;
          verificationStatus.textContent = "Verification expired. Choose Retry verification to continue.";
        },
        "error-callback": () => {
          if (!current()) return true;
          token = ""; submit.disabled = true; retryVerification.hidden = false;
          verificationStatus.textContent = "Verification could not finish. Choose Retry verification to continue.";
          return true;
        }
      });
      if (current()) widget = rendered;
      else { try { window.turnstile.remove(rendered); } catch { /* Generation checks protect the current view. */ } }
    } catch {
      disposeChallenge(); retryVerification.hidden = false; submit.disabled = true;
      verificationStatus.textContent = "Verification is unavailable. Choose Retry verification to try again.";
    }
  };
  const startVerification = () => {
    if (disposed || state !== "editing" || !pageActive) return;
    if (window.turnstile) { mountChallenge(); return; }
    if (loadingScript) return;
    verificationStatus.textContent = "Loading verification…"; retryVerification.hidden = true;
    const script = document.createElement("script");
    loadingScript = script;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=remoteBetaTurnstileReady";
    script.async = true;
    script.onerror = () => {
      if (loadingScript !== script) return;
      clearTimeout(scriptTimeout); scriptTimeout = null; loadingScript = null; script.remove();
      if (disposed || state !== "editing" || !pageActive) return;
      verificationStatus.textContent = "Verification could not load. Choose Retry verification to try again.";
      retryVerification.hidden = false;
    };
    scriptTimeout = setTimeout(script.onerror, 15000);
    document.head.append(script);
  };
  const ready = () => {
    if (disposed) return;
    clearTimeout(scriptTimeout); scriptTimeout = null; loadingScript = null;
    if (widget === null) mountChallenge();
  };
  window.remoteBetaTurnstileReady = ready;
  on(retryVerification, "click", () => {
    if (state === "editing") startVerification();
  });
  on(another, "click", () => {
    if (state !== "complete") return;
    requestGeneration++; marker(""); form.reset(); submittedEmail.textContent = "";
    form.elements.email.value = ""; form.elements.consent.checked = false; form.elements.website.value = "";
    form.elements.email.removeAttribute("aria-invalid");
    state = "editing"; panel.hidden = true; form.hidden = false; fieldset.disabled = false;
    message(""); startVerification(); form.elements.email.focus();
  });
  on(form.elements.email, "input", () => form.elements.email.removeAttribute("aria-invalid"));
  on(form, "submit", async (event) => {
    event.preventDefault();
    if (state !== "editing" || !pageActive || !form.reportValidity()) return;
    if (!token) { verificationStatus.textContent = "Complete verification before sending your request."; return; }
    const email = form.elements.email.value.trim();
    const consent = form.elements.consent.checked, website = form.elements.website.value, challenge = token;
    const generation = ++requestGeneration, controller = new AbortController();
    pending = controller; state = "submitting"; token = ""; marker("unconfirmed");
    fieldset.disabled = true; submit.disabled = true; retryVerification.disabled = true;
    submitLabel.textContent = "Saving…"; form.setAttribute("aria-busy", "true");
    message("Saving your request…", "pending");
    const timeout = requestTimeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(config.betaRequestUrl.trim(), {
        method: "POST", mode: "cors", credentials: "omit", cache: "no-store", redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, website, turnstileToken: challenge }), signal: controller.signal
      });
      const payload = await response.json();
      if (generation !== requestGeneration || !pageActive) return;
      if (response.status === 200 && payload?.ok === true) {
        const focus = form.contains(document.activeElement) || document.activeElement === document.body;
        const normalized = email.toLowerCase(), repeated = confirmedEmails.has(normalized);
        confirmedEmails.add(normalized); marker("confirmed"); form.reset();
        showResult(email, repeated, focus);
      } else {
        const errors = {
          invalid_email: "Check your Google Play account email and try again.",
          invalid_request: "Tick the consent checkbox, check your email, and try again.",
          invalid_body: "Your request could not be read. Please try again.",
          verification_required: "Complete fresh verification and retry.",
          verification_failed: "Verification expired or failed. Complete fresh verification and retry.",
          too_many_requests: "Too many attempts. Wait at least a minute, then complete fresh verification and retry.",
          daily_capacity: "The daily request limit has been reached. Retry after midnight UTC with the same email.",
          temporarily_unavailable: "We could not confirm your request was saved. Please retry with the same email."
        };
        message((Object.hasOwn(errors, payload?.code) ? errors[payload.code] : null) || "We could not confirm your request was saved. Please retry with the same email.", "error");
        if (payload?.code === "invalid_email") form.elements.email.setAttribute("aria-invalid", "true");
      }
    } catch {
      if (generation === requestGeneration && pageActive) message("We could not confirm your request was saved. Check your connection and retry with the same email.", "error");
    } finally {
      clearTimeout(timeout); requestTimeout = null;
      if (generation === requestGeneration) {
        pending = null; form.setAttribute("aria-busy", "false"); retryVerification.disabled = false;
        submitLabel.textContent = "Request beta access";
        if (state !== "complete") { state = "editing"; fieldset.disabled = false; startVerification(); }
      }
    }
  });
  on(window, "pagehide", () => {
    pageActive = false; requestGeneration++; pending?.abort(); pending = null;
    if (state === "submitting") message("We could not confirm your request was saved. Retry with the same email after returning.", "error");
    disposeChallenge();
    clearTimeout(scriptTimeout); scriptTimeout = null;
    if (loadingScript) { loadingScript.remove(); loadingScript = null; }
    form.setAttribute("aria-busy", "false"); submitLabel.textContent = "Request beta access"; retryVerification.disabled = false;
    if (state !== "complete") { state = "suspended"; fieldset.disabled = true; }
  });
  on(window, "pageshow", (event) => {
    if (!event.persisted) return;
    pageActive = true;
    if (state === "suspended") { state = "editing"; fieldset.disabled = false; startVerification(); }
  });
  if (marker() === "confirmed") showResult();
  else {
    fieldset.disabled = false;
    if (marker() === "unconfirmed") message("An earlier attempt was not confirmed. Retry with the same email after verification.", "error");
    else message("");
    startVerification();
  }
  return () => {
    disposed = true; pageActive = false; requestGeneration++; pending?.abort(); pending = null;
    disposeChallenge(); clearTimeout(scriptTimeout); clearTimeout(requestTimeout);
    if (loadingScript) { loadingScript.onerror = null; loadingScript.remove(); loadingScript = null; }
    listeners.forEach(remove => remove());
    if (window.remoteBetaTurnstileReady === ready) delete window.remoteBetaTurnstileReady;
    fieldset.disabled = true; submit.disabled = true; form.setAttribute("aria-busy", "false");
  };
}
