import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('config.js', import.meta.url), 'utf8'), context);
assert(Object.isFrozen(context.window.remoteSiteConfig));
const { validConfig, render } = createRequire(import.meta.url)('../.build/render.cjs');
const config = context.window.remoteSiteConfig;
assert(validConfig(config)); assert(!validConfig({})); assert(!validConfig({ betaRequestUrl: config.betaRequestUrl }));
assert(!validConfig({ betaRequestUrl: 'https://example.com/beta-requests', turnstileSiteKey: config.turnstileSiteKey }));
assert(validConfig({ betaRequestUrl: ' ' + config.betaRequestUrl + ' ', turnstileSiteKey: ' ' + config.turnstileSiteKey + ' ' }));
for (const value of [{}, config]) {
  const markup = render('landing', value);
  assert(markup.includes('data-beta-ready="' + String(validConfig(value)) + '"')); assert(markup.includes('<fieldset disabled'));
}
console.log('PASS: public configuration validation, whitespace normalization and SSR capture stays disabled until mounted verification.');
