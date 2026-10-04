import { memo, useEffect, useRef } from 'react';
import { mountBetaRequest } from '../beta-request.js';
export const validConfig = config => /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\/beta-requests$/.test(config?.betaRequestUrl?.trim() || '') && /^0x4[A-Za-z0-9_-]{15,100}$/.test(config?.turnstileSiteKey?.trim() || '');
const Capture = memo(function Capture({ config }) {
  const ref = useRef(null), ready = validConfig(config);
  useEffect(() => mountBetaRequest(ref.current, config), [config]);
  return <div ref={ref} className="capture-island">
    <form data-beta-request-form data-beta-ready={String(ready)} aria-describedby="email-help enrollment-note" action="#beta-enrollment" method="post">
      <fieldset disabled>
        <legend className="visually-hidden">Request beta access</legend>
        <label htmlFor="beta-email">Google Play account email</label>
        <p id="email-help" className="field-help">Enter the email you use for Google Play.</p>
        <input id="beta-email" type="email" name="email" required autoComplete="email" inputMode="email" maxLength={254} aria-describedby="email-help request-status" placeholder="you@gmail.com" />
        <div className="honeypot" aria-hidden="true"><label htmlFor="beta-website">Leave this field empty</label><input id="beta-website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
        <label className="consent"><input name="consent" type="checkbox" required /><span>I agree to let you store my email privately to review my beta request. <a href="privacy/">Privacy policy</a></span></label>
        <div data-turnstile className="verification-widget" />
        <p data-verification-status role="status" aria-live="polite" aria-atomic="true" className="field-help">Verification loads when the form is ready.</p>
        <button data-verification-retry type="button" className="text-button" hidden>Retry verification</button>
        <button className="beta-cta request-submit" type="submit" disabled><span>Request beta access</span><span aria-hidden="true">↗</span></button>
      </fieldset>
    </form>
    <section data-request-result className="request-result" hidden aria-labelledby="request-result-heading">
      <span className="result-mark" aria-hidden="true">✓</span>
      <h3 data-result-heading id="request-result-heading" tabIndex={-1}>Request received.</h3>
      <p data-result-summary>We'll review your request privately.</p>
      <p data-result-email-row hidden><span className="result-label">Google Play email</span><strong data-result-email /></p>
      <p>Approval comes with a manual Google Play invitation. Accept it before installing.</p>
      <button data-register-another type="button" className="text-button">Register another email <span aria-hidden="true">↗</span></button>
    </section>
    <p data-request-status id="request-status" role="status" aria-live="polite" aria-atomic="true" className="request-status">{ready ? 'Enable JavaScript to verify and send your request.' : 'Requests are unavailable right now. No email has been submitted.'}</p>
    <noscript><p className="fine-print">Enable JavaScript to complete verification and send a beta request. Your email hasn't been submitted.</p></noscript>
  </div>;
});
export default function Beta({ config }) {
  return <section className="beta-section page-width" id="beta-enrollment" aria-labelledby="beta-title">
    <div className="beta-intro"><p className="eyebrow">Try it early</p><h2 id="beta-title" tabIndex={-1}>Your next remote<br />could be your phone.</h2><p>The Remote is free. Request beta access with your Google Play email.</p><div className="beta-steps"><p><b>01</b> Send your request.</p><p><b>02</b> We review it privately.</p><p><b>03</b> If approved, accept your Play invitation.</p></div><p id="enrollment-note" className="fine-print">A request doesn't enroll you or send an automatic invite. Invitations are sent manually through Google Play. Accept the invitation before installing. The public Play sign-up link is still pending.</p></div>
    <div className="beta-panel">
      <Capture config={config} />
    </div>
  </section>;
}
