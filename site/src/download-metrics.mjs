const buttons = new Set(['nav', 'hero', 'footer', 'guide', 'download']);

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
    const request = environment.fetch('/api/metrics', {
      method: 'POST', credentials: 'omit', cache: 'no-store', keepalive: true,
      referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'apk_download_click', release: release.id, button, platform: broadPlatform(environment.navigator) })
    });
    Promise.resolve(request).catch(() => {});
  } catch { /* Download navigation must work even when telemetry fails. */ }
}
