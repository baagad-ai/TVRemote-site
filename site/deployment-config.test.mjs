import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertPublicationReady, candidateSiteUrl, siteUrl } from './deployment-config.mjs';

test('canonical overrides accept HTTPS origins and reject unsafe or path-based URLs', () => {
  assert.equal(siteUrl(), candidateSiteUrl);
  assert.equal(siteUrl('https://remote.example'), 'https://remote.example/');
  for (const value of ['http://example.com/', 'https://user@example.com/', 'https://example.com:8443/', 'https://example.com/path/', 'https://example.com/?tracking=x', 'https://example.com/#x', 'https://example.com/<tag>', 'bad']) assert.throws(() => siteUrl(value));
});

test('production refuses inactive, invalid and unverified APK identities', () => {
  const release = { id: 'release-123', url: 'https://example.com/release-123.apk', version: '1.0', sha256: 'a'.repeat(64) };
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
  assert.equal(config.vars.METRICS_ENABLED, 'false');
  assert.equal(config.env.preview.vars.METRICS_ENABLED, 'false');
  assert.deepEqual(config.env.preview.d1_databases, []);
});

test('GitHub publication is only a gated post-cutover transition', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  assert(workflow.includes("if: github.event_name != 'pull_request' && vars.CLOUDFLARE_CUTOVER == 'true'"));
  assert(workflow.includes('run: npm run build:github-transition'));
  assert(!workflow.includes('run: npm run build:production'));
});
