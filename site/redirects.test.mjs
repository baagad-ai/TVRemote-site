import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const rules = fs.readFileSync(path.join(root, '_redirects'), 'utf8').split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#')).map(line => line.split(/\s+/));

test('/privacy.html permanently redirects to the privacy page', () => {
  assert(rules.some(([from, to, status]) => from === '/privacy.html' && to === '/privacy/' && status === '301'));
  assert(fs.existsSync(path.join(root, 'privacy/index.html')));
});

test('redirects keep unknown paths on the 404 page and point at real pages', () => {
  for (const [from, to, status] of rules) {
    assert.notEqual(from, '/*', 'a catch-all rule would replace the 404 page');
    assert.notEqual(status, '200', 'rewrites (200) would serve a page for unknown paths');
    assert(['301', '302'].includes(status), 'unexpected status: ' + from);
    if (to.startsWith('/downloads/') || to.includes(':splat')) continue;
    assert(fs.existsSync(path.join(root, to, to.endsWith('/') ? 'index.html' : '')), 'redirect target missing: ' + to);
  }
});
