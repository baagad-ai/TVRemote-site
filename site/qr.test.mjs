import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import jsQR from 'jsqr';
import { QR_FILE, QR_INK, QR_PAPER, QR_QUIET_ZONE, QR_URL, qrSvg } from './build-qr.mjs';

const svg = fs.readFileSync(QR_FILE, 'utf8');
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

// Rasterizes the committed SVG from its own markup (one paper rect, one path of axis-aligned module runs).
function rasterize(text, outputPx) {
  const units = Number(text.match(/viewBox="0 0 (\d+) \1"/)[1]);
  const paper = rgb((text.match(/<rect [^>]*fill="(#[0-9a-f]{6})"/) || [, QR_PAPER])[1]);
  const ink = rgb(text.match(/<path fill="(#[0-9a-f]{6})"/)[1]);
  const dark = Array.from({ length: units }, () => new Uint8Array(units));
  for (const [, x, y, run] of text.match(/ d="([^"]+)"/)[1].matchAll(/M(\d+) (\d+)h(\d+)v1h-\3z/g)) {
    for (let i = 0; i < Number(run); i++) dark[Number(y)][Number(x) + i] = 1;
  }
  const data = new Uint8ClampedArray(outputPx * outputPx * 4);
  for (let py = 0; py < outputPx; py++) for (let px = 0; px < outputPx; px++) {
    const colour = dark[Math.floor((py + .5) * units / outputPx)][Math.floor((px + .5) * units / outputPx)] ? ink : paper;
    data.set([...colour, 255], (py * outputPx + px) * 4);
  }
  return { units, dark, data };
}

test('committed QR SVG is exactly what the generator produces for QR_URL (error correction M)', () => {
  assert.equal(svg, qrSvg(QR_URL), 'Run `npm run build:qr` after changing QR_URL or the generator');
  assert.equal(QR_URL, 'https://theremote-site.pages.dev/?utm_source=qr_site');
  assert.doesNotMatch(svg, /<script|<image|href=|xlink|<text/i, 'static vector modules only');
  assert.equal(QR_INK, '#0b0e0d');
  assert.equal(QR_PAPER, '#eeeee6'); assert.ok(!svg.includes('<rect'), 'transparent: no background rect');
});

test('QR decodes to QR_URL at a large raster and at the 136 px tile size, with a 4-module quiet zone', () => {
  for (const size of [328, 123]) {
    const { units, dark, data } = rasterize(svg, size);
    const decoded = jsQR(data, size, size, { inversionAttempts: 'dontInvert' });
    assert.equal(decoded?.data, QR_URL, `decode at ${size}px`);
    assert.equal(units, 33 + 2 * QR_QUIET_ZONE);
    for (let i = 0; i < units; i++) for (let q = 0; q < QR_QUIET_ZONE; q++) {
      assert.equal(dark[q][i] + dark[units - 1 - q][i] + dark[i][q] + dark[i][units - 1 - q], 0, 'quiet zone must be empty');
    }
  }
});

test('landing page prerenders the desktop QR tile with an empty alt and a text label, hidden by CSS by default', () => {
  const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
  const hints = [...html.matchAll(/<div class="qr-hint qr-hint-(\w+)" data-qr-spot="\1"><img class="qr-hint-tile" src="assets\/qr-download\.svg" alt="" aria-hidden="true" width="123" height="123"[^>]*\/><p>Scan to get it on your phone\.<\/p><\/div>/g)].map(m => m[1]);
  assert.deepEqual(hints, ['hero'], 'Baagad picked A: hero only');
  assert.match(css, /\.qr-hint\{display:none;/);
  assert.match(css, /@media \(min-width:1024px\) and \(hover:hover\) and \(pointer:fine\)\{\n\.qr-hint\{display:flex\}/);
  for (const route of ['privacy/index.html', 'guides/index.html', '404.html']) {
    assert.doesNotMatch(fs.readFileSync(new URL('./' + route, import.meta.url), 'utf8'), /qr-hint/, route);
  }
});
