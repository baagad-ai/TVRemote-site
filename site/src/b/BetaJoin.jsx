// Join the beta: collects the Google account email a tester uses on their Android phone, for Google Play's closed
// test. POSTs to the same-origin Pages Function functions/api/beta-requests.js, which verifies the challenge
// server-side and stores the address. The challenge script loads only when the form nears the viewport.
import { useEffect, useRef, useState } from 'react';

const SITE_KEY = '0x4AAAAAAFNQLbByCk934BgF';
// Cloudflare's published always-pass test site key, used off the production host (preview deployments).
const TEST_KEY = '1x00000000000000000000AA';
const ERRORS = {
  invalid_email: 'Check your email address and try again.',
  verification_failed: 'Verification didn\u2019t finish. Please try again.',
  verification_required: 'Verification didn\u2019t finish. Please try again.',
  daily_capacity: 'We couldn\u2019t save that right now. Please try again tomorrow.'
};
let loading = null;
function loadChallenge() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true;
    s.onload = () => resolve(window.turnstile); s.onerror = () => { loading = null; s.remove(); reject(new Error('load')); };
    document.head.append(s);
  });
  return loading;
}
export default function BetaJoin() {
  const root = useRef(null), slot = useRef(null), widget = useRef(null), token = useRef('');
  const [state, setState] = useState('idle'), [error, setError] = useState(''), [near, setNear] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: '400px 0px' });
    io.observe(root.current); return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!near || state === 'done') return;
    let live = true;
    loadChallenge().then(ts => {
      if (!live || widget.current !== null || !slot.current) return;
      widget.current = ts.render(slot.current, {
        sitekey: location.hostname === 'theremote-site.pages.dev' ? SITE_KEY : TEST_KEY, action: 'beta_request', theme: 'dark', size: 'flexible',
        callback: v => { token.current = v; }, 'expired-callback': () => { token.current = ''; }, 'error-callback': () => { token.current = ''; return true; }
      });
    }).catch(() => live && setError('Verification couldn\u2019t load. Refresh the page and try again.'));
    return () => { live = false; if (widget.current !== null) { try { window.turnstile.remove(widget.current); } catch {} widget.current = null; token.current = ''; } };
  }, [near, state === 'done']);
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (state === 'sending' || !form.reportValidity()) return;
    if (!token.current) { setError('Please wait for verification to finish, then try again.'); return; }
    setState('sending'); setError('');
    try {
      const res = await fetch('/api/beta-requests', { method: 'POST', credentials: 'omit', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.elements.email.value.trim(), website: form.elements.website.value, turnstileToken: token.current }) });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) { setState('done'); return; }
      setError(ERRORS[data?.code] || 'We couldn\u2019t save that. Please try again.');
    } catch { setError('We couldn\u2019t save that. Check your connection and try again.'); }
    setState('idle'); token.current = '';
    try { window.turnstile?.reset(widget.current); } catch {}
  }
  return <section ref={root} className="b-section b-beta" id="join-beta" aria-labelledby="join-beta-title">
    <div className="b-wrap b-beta-grid">
      <div><h2 id="join-beta-title">Join the beta</h2><p className="b-lede">Free, no ads, no sign-up. Android 8.0+.</p></div>
      <div className="b-beta-card">{state === 'done'
        ? <p className="b-beta-done" role="status">You're on the list. We'll send your opt-in link soon.</p>
        : <form onSubmit={submit} noValidate={false}>
          <label htmlFor="beta-email">Your Gmail or Google Play email</label>
          <input id="beta-email" name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} aria-describedby="beta-email-help beta-error" disabled={state === 'sending'} />
          <p id="beta-email-help" className="b-beta-help">Use the Google account on your Android phone. We'll add you to the tester list and send you the opt-in link.</p>
          <input className="b-beta-hp" name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" defaultValue="" />
          <div ref={slot} className="b-beta-check" />
          <button type="submit" className="download-cta b-beta-submit" disabled={state === 'sending'}><span>{state === 'sending' ? 'Sending\u2026' : 'Join the beta'}</span></button>
          <p id="beta-error" className="b-beta-error" role="alert">{error}</p>
        </form>}</div>
    </div>
  </section>;
}
