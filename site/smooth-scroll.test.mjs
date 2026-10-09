import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createWatchdog } from './src/scroll-watchdog.mjs';

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
  assert.match(source, /if \(NATIVE_KEYS\.has\(event\.key\)\) takeOver\(\)/);
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

test('section-link glides end on time, follow the live target and are not stalled by scene loads', () => {
  const destination = fs.readFileSync(new URL('./src/Destination.jsx', import.meta.url), 'utf8');
  const idle = fs.readFileSync(new URL('./src/scroll-idle.js', import.meta.url), 'utf8');
  // Fixed-duration easing instead of the open-ended lerp tail.
  assert.match(source, /duration: seconds/);
  // Re-aimed every tick at the section's live position; a wheel or key takeover ends the glide.
  assert.match(source, /tick = time => \{ lenis\?\.raf\(time \* 1000\); follow\(\); watchdog\(\); \}/);
  assert.match(source, /lenis\.animate\.to !== glide\.to/);
  // The 3D destination scene waits for the glide (its setup blocks the main thread), with a cap.
  assert.match(source, /glideStarted\(\)/);
  assert.match(destination, /await scrollIdle\(\);\n\s+if \(canceled\) return;\n\s+const module = await import\('\.\/destination-runtime'\)/);
  assert.match(idle, /setTimeout\(glideEnded, 3000\)/);
});

test('native keys and scrollbar always stand Lenis down without blocking the key', () => {
  const takeOver = source.match(/const takeOver = [^\n]+/)[0], quiet = source.match(/const quiet = [^\n]+/)[0];
  assert.match(takeOver, /if \(glide\) finish\(\); quiet\(\);/); // cancels the link glide (and its scene hold)
  assert.match(quiet, /lenis\.reset\(\)/);
  assert.match(quiet, /classList\.remove\('lenis-scrolling', 'lenis-smooth'\)/);
  assert.doesNotMatch(quiet, /lenis\.stop\(\)/); // stays started: the next wheel is smoothed again
  const onKey = source.match(/const onKey = [^\n]+/)[0];
  assert.doesNotMatch(onKey, /preventDefault/);
  for (const key of ['Tab', 'Enter', ' ', 'Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown']) assert.ok(source.includes(`'${key}'`), key);
  assert.match(source, /const onPointer = event => \{ if \(event\.clientX >= document\.documentElement\.clientWidth\) takeOver\(\); \}/);
  // Lenis' zero-delta echo scroll must not leave isScrolling stuck at 'native'.
  assert.match(source, /instance\.isScrolling === 'native' && !instance\.velocity\) instance\.isScrolling = false/);
});

test('watchdog clears a scrolling state that has stopped moving, and only that', () => {
  const frames = (dog, from, n, step, y, a, end) => { let hit = false; for (let i = 0; i < n; i++) hit = dog(from + i * step, true, y, a, end) || hit; return hit; };
  // Stuck: "scrolling" but nothing moves for 150 ms of rendered frames.
  assert.equal(frames(createWatchdog(), 0, 12, 16, 2175, 2175), true);
  // Not yet: only 100 ms still.
  assert.equal(frames(createWatchdog(), 0, 7, 16, 2175, 2175), false);
  // Not scrolling: never trips.
  { const dog = createWatchdog(); let hit = false; for (let i = 0; i < 30; i++) hit = dog(i * 16, false, 2175, 2175) || hit; assert.equal(hit, false); }
  // A moving glide (window or Lenis' sub-pixel animated value) never trips.
  { const dog = createWatchdog(); let hit = false; for (let i = 0; i < 60; i++) hit = dog(i * 16, true, 2000 + Math.floor(i / 3), 2000 + i * 0.3) || hit; assert.equal(hit, false); }
  // A main-thread stall (one frame after 1.5 s, no frames between) is not "still".
  { const dog = createWatchdog(); dog(0, true, 900, 900); assert.equal(dog(1500, true, 900, 900), false); assert.equal(dog(1516, true, 900, 900), false); }
  // A section-link glide is left alone until 150 ms after its scheduled end, then caught if stuck.
  { const dog = createWatchdog(); let hit = false; for (let t = 0; t < 1000; t += 16) hit = dog(t, true, 1700, 1700, 900) || hit; assert.equal(hit, false); assert.equal(frames(dog, 1050, 12, 16, 1700, 1700, 900), true); }
  // After tripping it re-arms cleanly.
  { const dog = createWatchdog(); frames(dog, 0, 12, 16, 5, 5); assert.equal(dog(200, true, 5, 5), false); }
  // Wired into the existing ticker (no new interval) and resyncs + lands a stuck link glide natively.
  assert.doesNotMatch(source, /setInterval/);
  const watchdog = source.slice(source.indexOf('const watchdog = '), source.indexOf('const aim = '));
  assert.match(watchdog, /lenis\.isScrolling \|\| document\.documentElement\.classList\.contains\('lenis-scrolling'\)/);
  assert.match(watchdog, /quiet\(\);\n\s+if \(hash\) location\.replace\(hash\)/);
});
