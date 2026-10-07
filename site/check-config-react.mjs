import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadConfig } from './deployment-config.mjs';
import { approvedRelease } from './src/download-metrics.mjs';
import articles from './src/guides.json' with { type: 'json' };
const config = loadConfig();
assert(Object.isFrozen(config));
const { render } = createRequire(import.meta.url)('../.build/render.cjs');
const fixture = { apkRelease: { id: 'test-release', url: 'https://example.com/test-release.apk', version: '1.0', sha256: 'a'.repeat(64) } };
for (const value of [{}, { apkRelease: null }, config, fixture]) {
  const markup = render('landing', value);
  assert(!/data-beta-request-form|turnstile|beta-enrollment/i.test(markup));
  if (approvedRelease(value)) {
    assert(markup.includes(`href="${value.apkRelease.url}"`), 'Prerendered APK must work without JavaScript');
    assert(markup.includes('data-download-cta="hero"'));
    assert(markup.includes(value.apkRelease.sha256));
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
