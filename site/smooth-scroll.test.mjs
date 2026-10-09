import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./src/SmoothScroll.jsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('./src/App.jsx', import.meta.url), 'utf8');

test('Lenis is desktop-only and never smooths touch', () => {
  assert.match(source, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(source, /syncTouch: false/);
  assert.match(source, /smoothWheel: true/);
});

test('Lenis is skipped and torn down under reduced motion', () => {
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /reduced\.addEventListener\('change', configure\)/);
  assert.match(source, /dead\.destroy\(\)/);
});

test('Lenis drives ScrollTrigger from the GSAP ticker', () => {
  assert.match(source, /lenis\.on\('scroll', ScrollTrigger\.update\)/);
  assert.match(source, /gsap\.ticker\.add\(tick\)/);
  assert.match(source, /gsap\.ticker\.lagSmoothing\(0\)/);
  assert.match(source, /autoRaf: false/);
});

test('same-page anchors land like a native jump from the live scroll position', () => {
  // Lenis' own element targeting adds its possibly stale animatedScroll; use a number from scrollY.
  assert.doesNotMatch(source, /scrollTo\(node/);
  assert.match(source, /getBoundingClientRect\(\)\.top \+ scrollY - px\(getComputedStyle\(node\)\.scrollMarginTop\)/);
  assert.match(source, /const sync = \(\) => \{ lenis\?\.reset\(\); lenis\?\.resize\(\); \}/);
  assert.match(source, /history\.pushState/);
  assert.match(source, /location\.replace\(hash\)/);
});

test('native keyboard, focus and scrollbar scrolling stop Lenis animation', () => {
  for (const key of ['Tab', 'Home', 'End', 'PageUp', 'PageDown']) assert.ok(source.includes(`'${key}'`), key);
  assert.match(source, /addEventListener\('keydown', onKey, true\)/);
  assert.match(source, /removeEventListener\('keydown', onKey, true\)/);
  // Not gated on lenis.isScrolling: Lenis' velocity timer can clear it for a frame mid-glide.
  assert.match(source, /if \(NATIVE_KEYS\.has\(event\.key\)\) lenis\?\.reset\(\)/);
});

test('reduced-motion teardown cannot be undone by Lenis timers', () => {
  assert.match(source, /clearTimeout\(dead\._resetVelocityTimeout\)/);
  assert.match(source, /dead\.updateClassName = \(\) => \{\}/);
  assert.match(source, /queries \?\?= /);
});

test('SmoothScroll is mounted once and licensed', () => {
  assert.equal(app.match(/<SmoothScroll \/>/g)?.length, 1);
  assert.ok(fs.existsSync(new URL('./licenses/Lenis-LICENSE.txt', import.meta.url)));
});
