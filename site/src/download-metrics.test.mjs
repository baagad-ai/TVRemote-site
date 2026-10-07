import test from 'node:test';
import assert from 'node:assert/strict';
import { approvedRelease, broadPlatform, recordDownloadClick } from './download-metrics.mjs';

const release = { id: 'security-1', version: '1.0.1', url: 'https://example.com/remote.apk', sha256: 'a'.repeat(64) };
test('download stays inactive unless every release identity field is valid', () => {
  assert.equal(approvedRelease({ apkRelease: null }), null);
  assert.equal(approvedRelease({ apkRelease: release }), release);
  for (const id of ['.release', '_release', '-release']) assert.equal(approvedRelease({ apkRelease: { ...release, id } }), null);
  for (const patch of [{ id: '' }, { id: 123 }, { id: 'x'.repeat(65) }, { version: '' }, { sha256: 'missing' }, { sha256: ['a'.repeat(64)] }, { url: 'http://example.com/app.apk' }, { url: 'https://user:password@example.com/app.apk' }, { url: 'https://example.com/app.aab' }, { url: 'javascript:alert(1)' }]) {
    assert.equal(approvedRelease({ apkRelease: { ...release, ...patch } }), null);
  }
});
test('platform inference produces only broad categories, including Android and iPad', () => {
  const cases = [
    [{ userAgentData: { platform: 'Android' } }, 'android'],
    [{ platform: 'Linux armv8l', userAgent: 'Android 15' }, 'android'],
    [{ platform: 'MacIntel', maxTouchPoints: 5 }, 'ios'],
    [{ platform: 'iPhone' }, 'ios'], [{ platform: 'Win32' }, 'windows'],
    [{ platform: 'MacIntel', maxTouchPoints: 0 }, 'macos'],
    [{ platform: 'Linux x86_64' }, 'linux'], [{}, 'other']
  ];
  for (const [navigator, expected] of cases) assert.equal(broadPlatform(navigator), expected);
});
test('click submits exactly allowlisted aggregate fields without identifiers', () => {
  let actual;
  const environment = { navigator: { platform: 'Win32', userAgent: 'private full user agent' }, fetch: (...args) => { actual = args; return Promise.resolve(); } };
  assert.equal(recordDownloadClick(release, 'hero', environment), undefined);
  const [url, options] = actual;
  assert.equal(url, '/api/metrics');
  assert.deepEqual(JSON.parse(options.body), { event: 'apk_download_click', release: release.id, button: 'hero', platform: 'windows' });
  assert.equal(options.credentials, 'omit');
  assert.equal(options.referrerPolicy, 'no-referrer');
  assert.equal(options.keepalive, true);
  actual = undefined;
  recordDownloadClick(release, 'unknown', environment);
  recordDownloadClick({ ...release, id: '../invalid' }, 'hero', environment);
  assert.equal(actual, undefined);
});
test('telemetry never throws or returns a promise that could delay the anchor', async () => {
  assert.doesNotThrow(() => recordDownloadClick(release, 'download', { fetch() { throw new Error('offline'); } }));
  assert.equal(recordDownloadClick(release, 'download', { fetch: () => Promise.reject(new Error('offline')) }), undefined);
  assert.doesNotThrow(() => recordDownloadClick(release, 'download', {}));
  await new Promise(resolve => setImmediate(resolve));
});
test('privacy signals suppress click telemetry without affecting the download', () => {
  let calls = 0;
  const fetch = () => { calls++; };
  for (const navigator of [{ globalPrivacyControl: true }, { doNotTrack: '1' }]) {
    assert.equal(recordDownloadClick(release, 'download', { navigator, fetch }), undefined);
  }
  recordDownloadClick(release, 'download', { doNotTrack: '1', fetch });
  assert.equal(calls, 0);
});
