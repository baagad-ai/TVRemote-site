(() => {
  "use strict";
  const form = document.querySelector("[data-beta-request-form]");
  if (!form || form.getAttribute("data-beta-ready") !== "true") return;
  const config = window.remoteSiteConfig;
  const fieldset = form.querySelector("fieldset");
  const submit = form.querySelector("[type=submit]");
  const status = form.querySelector("[data-request-status]");
  let token = "", widget = null, busy = false, saved = false;
  const message = (text) => { status.textContent = text; };
  const clearToken = (text) => { token = ""; submit.disabled = true; if (text && !busy && !saved) message(text); };
  window.remoteBetaTurnstileReady = () => {
    try {
      fieldset.disabled = false;
      submit.disabled = true;
      message("Enter the email you use on Google Play and complete verification.");
      widget = window.turnstile.render(form.querySelector("[data-turnstile]"), {
        sitekey: config.turnstileSiteKey.trim(), action: "beta_request", theme: "dark", size: "flexible",
        callback: (value) => { token = value; submit.disabled = busy || saved; if (!busy && !saved) message("Verification complete. You can send your request."); },
        "expired-callback": () => clearToken("Verification expired. Complete it again before submitting."),
        "error-callback": () => { clearToken("Verification could not load. Reload this page to try again."); return true; }
      });
    } catch { fieldset.disabled = true; clearToken("Verification is unavailable. Reload this page to try again."); }
  };
  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=remoteBetaTurnstileReady";
  script.async = true;
  script.onerror = () => clearToken("Verification could not load. Reload this page to try again.");
  document.head.append(script);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || saved) return;
    if (!form.reportValidity()) return;
    if (!token) { message("Complete verification before sending your request."); return; }
    const email = form.elements.email.value.trim();
    const consent = form.elements.consent.checked;
    const website = form.elements.website.value;
    busy = true; fieldset.disabled = true; submit.disabled = true;
    form.setAttribute("aria-busy", "true");
    message("Saving your request…");
    try {
      const response = await fetch(config.betaRequestUrl.trim(), {
        method: "POST", mode: "cors", credentials: "omit", cache: "no-store", redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, website, turnstileToken: token }),
        signal: AbortSignal.timeout(15000)
      });
      const payload = await response.json();
      if (response.status === 200 && payload?.ok === true) {
        saved = true;
        form.reset();
        message("Your request is saved for private review. This does not enroll you in the Google Play beta. If approved, we will invite your account to the test manually through Google Play; you must accept the invitation before installing.");
      } else {
        const errors = {
          invalid_email: "Check your Google Play account email and try again.",
          verification_required: "Complete verification again and retry.",
          verification_failed: "Verification expired or failed. Complete it again and retry.",
          too_many_requests: "Too many attempts. Wait a minute, then complete verification and try again.",
          daily_capacity: "Requests have reached today's capacity. Please try again tomorrow."
        };
        message((Object.hasOwn(errors, payload?.code) ? errors[payload.code] : null) || "We could not confirm your request was saved. Please retry with the same email.");
      }
    } catch { message("We could not confirm your request was saved. Check your connection and retry with the same email."); }
    finally {
      busy = false; token = ""; fieldset.disabled = saved; submit.disabled = true;
      form.setAttribute("aria-busy", "false");
      if (widget !== null && !saved) { try { window.turnstile.reset(widget); } catch { /* Retry after reload if verification is unavailable. */ } }
    }
  });
})();
