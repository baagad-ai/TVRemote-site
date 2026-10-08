import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './deployment-config.mjs';
import { approvedRelease } from './src/download-metrics.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('404 page exists, is noindex and static, and stays out of the sitemap', () => {
  assert(fs.existsSync(path.join(root, '404.html')), 'run npm run build to generate site/404.html');
  const html = read('404.html');
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /doesn’t exist/);
  assert(!/<script\b/i.test(html), '404 page loads no scripts (no runtime or analytics)');
  assert(!/rel="canonical"|data-download-cta/.test(html));
  assert(!read('sitemap.xml').includes('404'));
  assert.match(read('stage.mjs'), /'404\.html'/, 'stage.mjs must copy 404.html to the root of _site');
});

test('404 page links resolve from any depth and use the homepage download link', () => {
  const html = read('404.html');
  const refs = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map(m => m[1]);
  for (const href of ['/', '/guides/', '/privacy/']) assert(refs.includes(href), 'missing link to ' + href);
  for (const ref of refs) {
    if (/^(https?:|mailto:|#)/.test(ref)) continue;
    assert(ref.startsWith('/'), '404 links must be root-absolute: ' + ref);
    const clean = ref.split('#')[0].split('?')[0];
    const file = path.join(root, clean, clean.endsWith('/') ? 'index.html' : '');
    assert(fs.existsSync(file), '404.html link does not resolve: ' + ref);
  }
  const release = approvedRelease(loadConfig());
  if (release) {
    assert(refs.includes(release.url), '404 must use the same APK URL as the homepage');
    assert(read('index.html').includes(`href="${release.url}"`));
  } else assert(refs.includes('/#download'));
});
