import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadConfig } from './deployment-config.mjs';
import { approvedRelease } from './src/download-metrics.mjs';
import articles from './src/guides.json' with { type: 'json' };
const config = loadConfig();
assert(Object.isFrozen(config));
const { render } = createRequire(import.meta.url)('../.build/render.cjs');
const fixture = { apkRelease: { id: 'test-release', url: `https://example.com/downloads/${'a'.repeat(64)}/test-release.apk`, version: '0.1.0-beta.7', versionCode: 7, minSdk: 26, bytes: 2097152, sha256: 'a'.repeat(64) } };
for (const value of [{}, { apkRelease: null }, config, fixture]) {
  const markup = render('landing', value);
  assert(!/data-beta-request-form|beta-enrollment/i.test(markup));
  if (approvedRelease(value)) {
    assert(markup.includes(`href="${value.apkRelease.url}"`), 'Prerendered APK must work without JavaScript');
    assert(markup.includes('data-download-cta="hero"'));
    assert(/^[0-9a-f]{64}$/.test(value.apkRelease.sha256) && value.apkRelease.url.includes(value.apkRelease.sha256), 'APK URL must carry the full SHA-256');
    assert(markup.includes(`href="${value.apkRelease.url}"`) && new RegExp(`href="[^"]*${value.apkRelease.sha256}[^"]*"`).test(markup), 'Full SHA-256 must be in the page download link'); // PM 23:39: the Concept B page has no checksum block; the sha lives in the download link
    if (value.apkRelease.minSdk === 26) assert(markup.includes('Android 8.0 or later'), 'Verified phone OS minimum must be visible');
    assert(markup.includes(value.apkRelease.version), 'Actual beta version label must be preserved');
    if (value.apkRelease.versionCode === 7) assert(markup.includes('build 7'));
    if (value.apkRelease.bytes === 2097152) assert(markup.replace(/<!--.*?-->/g, '').includes('2.0 MiB')); // Concept B shows the size in the version line
  } else {
    assert(markup.includes('Download is being prepared.'));
    assert(!markup.includes('data-download-cta='), 'Inactive release must not be counted');
  }
}
for (const article of articles) {
  const markup = render('guides/' + article.slug, fixture);
  assert(markup.includes(`href="${fixture.apkRelease.url}"`), article.slug + ' APK anchor must work without JavaScript');
  assert(markup.includes('data-download-cta="guide"'), article.slug + ' needs guide click classification');
}
console.log('PASS: verified release renders native download anchors on landing and all six guides; inactive release has no form or tracked download link.');
