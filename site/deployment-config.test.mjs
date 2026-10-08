import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { assertPlayTestingReady, assertPublicationReady, candidateSiteUrl, groupUrlPlaceholder, loadConfig, maximumPagesAssetBytes, playOptInUrl, playTestingEnabled, siteUrl, verifyApkAsset } from './deployment-config.mjs';

test('canonical overrides accept HTTPS origins and reject unsafe or path-based URLs', () => {
  assert.equal(siteUrl(), candidateSiteUrl);
  assert.equal(siteUrl('https://remote.example'), 'https://remote.example/');
  for (const value of ['http://example.com/', 'https://user@example.com/', 'https://example.com:8443/', 'https://example.com/path/', 'https://example.com/?tracking=x', 'https://example.com/#x', 'https://example.com/<tag>', 'bad']) assert.throws(() => siteUrl(value));
});

test('production refuses inactive, invalid and unverified APK identities', () => {
  const release = { id: 'release-123', url: 'https://example.com/release-123.apk', version: '1.0', sha256: 'a'.repeat(64), bytes: 100 };
  for (const config of [{}, { apkRelease: null }, { apkRelease: { ...release, sha256: '' } }, { apkRelease: { ...release, url: 'https://example.com/app.aab' } }]) assert.throws(() => assertPublicationReady(config, release.sha256));
  assert.throws(() => assertPublicationReady({ apkRelease: release }, 'b'.repeat(64)));
  assert.throws(() => assertPublicationReady({ apkRelease: { ...release, url: release.url + '?secret=x' } }, release.sha256));
  assert.doesNotThrow(() => assertPublicationReady({ apkRelease: release }, release.sha256));
});

test('Pages only invokes private metrics endpoint; preview has no production database binding', () => {
  const routes = JSON.parse(fs.readFileSync(new URL('_routes.json', import.meta.url)));
  assert.deepEqual(routes, { version: 1, include: ['/api/metrics'], exclude: [] });
  const config = JSON.parse(fs.readFileSync(new URL('../wrangler.jsonc', import.meta.url)));
  assert.equal(config.d1_databases[0].binding, 'METRICS_DB');
  assert.equal(config.env.preview.vars.METRICS_ENABLED, 'false');
  assert.deepEqual(config.env.preview.d1_databases, []);
});

test('self-hosted APK staging verifies exact immutable path, source bytes, SHA and Pages size limit', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tvremote-apk-test-'));
  try {
    const sourceFile = path.join(directory, 'fixture.apk');
    const data = Buffer.from('Synthetic hash fixture; this is not a publishable APK.');
    fs.writeFileSync(sourceFile, data);
    const sha256 = createHash('sha256').update(data).digest('hex');
    const origin = 'https://remote.example/';
    const relativePath = `downloads/${sha256}/the-remote-release-123.apk`;
    const release = { id: 'release-123', version: '1.0 beta+1', sha256, bytes: data.length, url: origin + relativePath };
    const options = { sourceFile, verifiedSha: sha256, origin };
    assert.deepEqual(verifyApkAsset({ apkRelease: release }, options), { relativePath, data });
    assert.throws(() => verifyApkAsset({ apkRelease: release }, { ...options, sourceFile: '' }));
    assert.throws(() => verifyApkAsset({ apkRelease: release }, { ...options, sourceFile: directory }));
    assert.throws(() => verifyApkAsset({ apkRelease: release }, { ...options, sourceFile: path.join(directory, 'missing.apk') }));
    assert.throws(() => verifyApkAsset({ apkRelease: { ...release, bytes: data.length + 1 } }, options));
    for (const url of [origin + 'downloads/latest.apk', origin + relativePath + '?v=1', 'https://elsewhere.example/' + relativePath, origin + `downloads/${sha256}/the-remote-other.apk`]) assert.throws(() => verifyApkAsset({ apkRelease: { ...release, url } }, options));
    for (const bytes of [undefined, 0, -1, 1.5, maximumPagesAssetBytes + 1]) assert.throws(() => assertPublicationReady({ apkRelease: { ...release, bytes } }, sha256));
    fs.writeFileSync(sourceFile, Buffer.alloc(data.length, 42));
    assert.throws(() => verifyApkAsset({ apkRelease: release }, options), /checksum/);
    fs.truncateSync(sourceFile, maximumPagesAssetBytes + 1);
    assert.throws(() => verifyApkAsset({ apkRelease: release }, options), /bytes/);
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    fs.rmSync(directory, { recursive: true });
  }
});

test('GitHub publication is only a gated post-cutover transition', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  assert(workflow.includes("if: github.event_name != 'pull_request' && vars.CLOUDFLARE_CUTOVER == 'true'"));
  assert(workflow.includes('run: npm run build:github-transition'));
  assert(!workflow.includes('run: npm run build:production'));
});

test('playTesting switch: config has a boolean enabled flag and the exact Play opt-in URL', () => {
  const play = loadConfig().playTesting;
  assert.equal(typeof play.enabled, 'boolean');
  assert.equal(play.optInUrl, playOptInUrl);
  assert.equal(typeof play.groupUrl, 'string');
  assert(Object.isFrozen(play));
});

test('playTesting placeholder guard: enabled Play testing must not ship the __GROUP_URL__ placeholder', () => {
  // Fails on purpose if site/config.js has enabled: true while groupUrl is still the placeholder.
  const config = loadConfig();
  if (playTestingEnabled(config)) assert(!config.playTesting.groupUrl.includes(groupUrlPlaceholder), 'Set playTesting.groupUrl to the real Google Group address before enabling');
  assert.doesNotThrow(() => assertPlayTestingReady(config));
  const base = { optInUrl: playOptInUrl, groupUrl: groupUrlPlaceholder };
  assert.doesNotThrow(() => assertPlayTestingReady({ playTesting: { ...base, enabled: false } }));
  assert.doesNotThrow(() => assertPlayTestingReady({}));
  assert.throws(() => assertPlayTestingReady({ playTesting: { ...base, enabled: true } }), /placeholder/);
  assert.throws(() => assertPlayTestingReady({ playTesting: { ...base, enabled: 'yes' } }));
  for (const groupUrl of ['http://groups.google.com/g/x', 'not a url', 'https://user@groups.google.com/g/x']) assert.throws(() => assertPlayTestingReady({ playTesting: { ...base, enabled: true, groupUrl } }));
  assert.throws(() => assertPlayTestingReady({ playTesting: { enabled: true, optInUrl: 'https://example.com/', groupUrl: 'https://groups.google.com/g/x' } }));
  assert.doesNotThrow(() => assertPlayTestingReady({ playTesting: { ...base, enabled: true, groupUrl: 'https://groups.google.com/g/the-remote-testers' } }));
});
