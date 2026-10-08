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
  assert.match(source, /lenis\.destroy\(\)/);
});

test('Lenis drives ScrollTrigger from the GSAP ticker', () => {
  assert.match(source, /lenis\.on\('scroll', ScrollTrigger\.update\)/);
  assert.match(source, /gsap\.ticker\.add\(tick\)/);
  assert.match(source, /gsap\.ticker\.lagSmoothing\(0\)/);
  assert.match(source, /autoRaf: false/);
});

test('same-page anchors keep URL and focus behaviour', () => {
  assert.match(source, /history\.pushState/);
  assert.match(source, /preventScroll: true/);
});

test('SmoothScroll is mounted once and licensed', () => {
  assert.equal(app.match(/<SmoothScroll \/>/g)?.length, 1);
  assert.ok(fs.existsSync(new URL('./licenses/Lenis-LICENSE.txt', import.meta.url)));
});
