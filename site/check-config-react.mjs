import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadConfig } from './deployment-config.mjs';
import { approvedRelease } from './src/download-metrics.mjs';
import articles from './src/guides.json' with { type: 'json' };
const config = loadConfig();
assert(Object.isFrozen(config));
const { render } = createRequire(import.meta.url)('../.build/render.cjs');
const fixture = { apkRelease: { id: 'test-release', url: 'https://example.com/test-release.apk', version: '0.1.0-beta.7', versionCode: 7, minSdk: 26, bytes: 2097152, sha256: 'a'.repeat(64) } };
for (const value of [{}, { apkRelease: null }, config, fixture]) {
  const markup = render('landing', value);
  assert(!/data-beta-request-form|turnstile|beta-enrollment/i.test(markup));
  if (approvedRelease(value)) {
    assert(markup.includes(`href="${value.apkRelease.url}"`), 'Prerendered APK must work without JavaScript');
    assert(markup.includes('data-download-cta="hero"'));
    assert(markup.includes(value.apkRelease.sha256));
    if (value.apkRelease.minSdk === 26) assert(markup.includes('Android 8.0 or later'), 'Verified phone OS minimum must be visible');
    assert(markup.includes(value.apkRelease.version), 'Actual beta version label must be preserved');
    if (value.apkRelease.versionCode === 7) assert(markup.includes('build 7'));
    if (value.apkRelease.bytes === 2097152) assert(markup.replace(/<!--.*?-->/g, '').includes('APK size: 2.0 MiB'));
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
// Play-first switch: render both modes from the committed config, whatever it currently says.
if (approvedRelease(config) && config.playTesting) {
  const mode = enabled => ({ ...config, playTesting: { ...config.playTesting, enabled } });
  const url = `href="${config.apkRelease.url}"`;
  const off = render('landing', mode(false)), on = render('landing', mode(true));
  for (const markup of [off, on]) { assert(markup.includes(url)); assert(markup.includes('data-download-cta="hero"')); assert(markup.includes('data-download-cta="download"')); assert(markup.includes('Free · No ads · No account')); assert(markup.includes('Download APK')); }
  assert(!/data-play-cta|apk-sheet|href="join\/"|Join the beta/.test(off), 'Play testing off: direct APK only, no Play CTA or sheet');
  assert(off.includes('class="cta-pill cta-primary" href="' + config.apkRelease.url), 'Play testing off: Download APK is the primary pill');
  assert(on.includes('href="join/" data-play-cta=""') && on.includes('Join the beta on Google Play'), 'Play testing on: Play pill links to /join/');
  assert(on.includes('class="cta-pill cta-secondary" href="' + config.apkRelease.url), 'Play testing on: Download APK is the secondary real link');
  assert(/<dialog[^>]*class="apk-sheet"[^>]*aria-labelledby="apk-sheet-title"[^>]*aria-describedby="apk-sheet-benefits"/.test(on), 'APK sheet dialog markup');
  for (const text of ['Google Play is the easier way', 'Updates arrive on their own.', 'Download APK anyway', config.apkRelease.sha256, 'id="apk-sheet-title" tabindex="-1"']) assert(on.includes(text), text);
  assert(on.includes(`data-sheet-download="download" ${url}`) || on.includes('data-sheet-download="download"'), 'sheet download is the counted link');
  const join = render('join', mode(true));
  for (const text of ['Get The Remote on Google Play', `href="${config.playTesting.optInUrl}"`, `href="${config.playTesting.groupUrl}"`, 'target="_blank" rel="noopener"', url, 'Please stay opted in for at least 14 days']) assert(join.includes(text), '/join/ ' + text);
  assert(!join.includes('apk-sheet'), '/join/ links straight to the APK');
  const guideOn = render('guides/' + articles[0].slug, mode(true)), guideOff = render('guides/' + articles[0].slug, mode(false));
  assert(guideOn.includes('apk-sheet') && guideOn.includes('data-play-cta'), 'guides open the sheet when on');
  assert(!guideOff.includes('apk-sheet') && !guideOff.includes('data-play-cta'), 'guides unchanged when off');
}
console.log('PASS: verified release renders native download anchors on landing and all six guides; inactive release has no form or tracked download link; Play testing on/off modes render as specified.');
