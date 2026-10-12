const buttons = new Set(['nav', 'hero', 'footer', 'guide', 'download']);
// The only campaign sources sent with a click. Nothing else from the URL is read or kept.
export const SOURCES = ['linkedin', 'x', 'instagram', 'qr', 'qr_site', 'threads'];
const SOURCE_KEY = 'remote_source';

/** The allow-listed source for this value, or null. */
export function allowedSource(value) {
  if (typeof value !== 'string' || value.length > 32) return null;
  const source = value.trim().toLowerCase();
  return SOURCES.includes(source) ? source : null;
}

/** Keeps an allow-listed utm_source from the landing URL for this tab only (sessionStorage). */
export function rememberSource(environment = globalThis) {
  try {
    const source = allowedSource(new URLSearchParams(environment.location?.search || '').get('utm_source'));
    if (source) environment.sessionStorage?.setItem(SOURCE_KEY, source);
  } catch { /* Storage can be unavailable; clicks still work without a source. */ }
}

/** The source to send with a click: this page's utm_source, else the one kept for this tab. */
export function currentSource(environment = globalThis) {
  try {
    rememberSource(environment);
    return allowedSource(environment.sessionStorage?.getItem(SOURCE_KEY) ?? null);
  } catch { return null; }
}

// Obvious automated agents; their presses are never counted.
export const BOT_UA = /bot|crawl|spider|slurp|headless|preview|facebookexternalhit|lighthouse|puppeteer|playwright|phantom|selenium|wget|curl/i;
const COUNTED_KEY = 'remote_dl_counted';

/** True only for this browser's first counted press (localStorage flag); bots and storage failures never count. */
export function firstCountedPress(environment = globalThis) {
  try {
    if (BOT_UA.test(environment.navigator?.userAgent || '') || environment.navigator?.webdriver === true) return false;
    const storage = environment.localStorage;
    if (!storage || storage.getItem(COUNTED_KEY)) return false;
    storage.setItem(COUNTED_KEY, '1');
    return storage.getItem(COUNTED_KEY) === '1';
  } catch { return false; }
}

export function approvedRelease(config) {
  const release = config?.apkRelease;
  if (!release || typeof release.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(release.id) ||
      typeof release.version !== 'string' || !/^[a-zA-Z0-9.+ -]{1,40}$/.test(release.version) ||
      typeof release.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(release.sha256) || typeof release.url !== 'string') return null;
  try {
    const url = new URL(release.url);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash &&
      url.pathname.toLowerCase().endsWith('.apk') ? release : null;
  } catch { return null; }
}

export function broadPlatform(navigator = {}) {
  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  const agent = navigator.userAgent || '';
  if (/android/i.test(platform + ' ' + agent)) return 'android';
  if (/iphone|ipad|ipod/i.test(platform + ' ' + agent) || (/mac/i.test(platform) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/win/i.test(platform)) return 'windows';
  if (/mac/i.test(platform)) return 'macos';
  if (/linux/i.test(platform)) return 'linux';
  return 'other';
}

// A click is directional intent, not a completed download or a unique person.
// The native anchor is never intercepted; telemetry cannot block navigation.
export function recordDownloadClick(release, button, environment = globalThis) {
  try {
    if (!approvedRelease({ apkRelease: release }) || !buttons.has(button) || typeof environment.fetch !== 'function') return;
    if (environment.navigator?.globalPrivacyControl === true || environment.navigator?.doNotTrack === '1' || environment.doNotTrack === '1') return;
    const source = currentSource(environment);
    const event = { event: 'apk_download_click', release: release.id, button, platform: broadPlatform(environment.navigator) };
    if (source) event.source = source;
    const request = environment.fetch('/api/metrics', {
      method: 'POST', credentials: 'omit', cache: 'no-store', keepalive: true,
      referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    Promise.resolve(request).catch(() => {});
  } catch { /* Download navigation must work even when telemetry fails. */ }
}
