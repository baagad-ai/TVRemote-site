import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedSource, approvedRelease, broadPlatform, currentSource, recordDownloadClick } from './download-metrics.mjs';

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

function memoryStorage() { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)) }; }
test('client source allow-list: linkedin, x, instagram, qr in any case; junk and missing send nothing', () => {
  assert.equal(allowedSource('linkedin'), 'linkedin');
  assert.equal(allowedSource('X'), 'x');
  assert.equal(allowedSource('INSTAGRAM'), 'instagram');
  assert.equal(allowedSource('qr'), 'qr');
  assert.equal(allowedSource('QR'), 'qr');
  assert.equal(allowedSource(' Qr '), 'qr');
  for (const value of ['facebook', '', null, undefined, 42, 'linkedin.com', 'x'.repeat(40), 'qrcode', 'qr-code', 'q r']) assert.equal(allowedSource(value), null);
});
test('utm_source is kept for the tab and only an allow-listed value is sent', () => {
  const sessionStorage = memoryStorage();
  const sent = [];
  const env = (search) => ({ location: { search }, sessionStorage, navigator: { platform: 'Win32' }, fetch: (url, init) => { sent.push(JSON.parse(init.body)); return Promise.resolve(); } });
  recordDownloadClick(release, 'hero', env('?utm_source=junk&utm_medium=social'));
  assert.equal('source' in sent.at(-1), false);
  recordDownloadClick(release, 'hero', env('?utm_source=LinkedIn&utm_medium=social&utm_campaign=launch'));
  assert.equal(sent.at(-1).source, 'linkedin');
  // A later page in the same tab without the query still sends the kept source, and nothing else from the URL.
  recordDownloadClick(release, 'guide', env(''));
  assert.deepEqual(Object.keys(sent.at(-1)).sort(), ['button', 'event', 'platform', 'release', 'source']);
  assert.equal(sent.at(-1).source, 'linkedin');
  assert.equal(currentSource({ location: { search: '' }, sessionStorage: memoryStorage() }), null);
  // A QR code landing (utm_source=QR) is kept and sent as qr, like the social sources.
  const qrSent = [];
  const qrEnv = (search, sessionStorage) => ({ location: { search }, sessionStorage, navigator: { platform: 'Linux armv8l', userAgent: 'Android 15' }, fetch: (url, init) => { qrSent.push(JSON.parse(init.body)); return Promise.resolve(); } });
  const qrStorage = memoryStorage();
  recordDownloadClick(release, 'hero', qrEnv('?utm_source=QR&utm_medium=print', qrStorage));
  recordDownloadClick(release, 'download', qrEnv('', qrStorage));
  assert.deepEqual(qrSent.map(event => event.source), ['qr', 'qr']);
  // No storage or location at all: the click still goes out without a source.
  const bare = [];
  recordDownloadClick(release, 'hero', { navigator: {}, fetch: (u, init) => { bare.push(JSON.parse(init.body)); return Promise.resolve(); } });
  assert.equal('source' in bare[0], false);
});
