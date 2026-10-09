// Generates the landing-page QR code as a static SVG at authoring time (no runtime library or QR service).
// QR_URL is the single source of the encoded URL: changing the tracked source is a one-line edit here plus
// `npm run build:qr`. A source value not already allow-listed also needs the API/client allow-lists and a D1 migration.
// Run `npm run build:qr` after changing QR_URL; site/qr.test.mjs checks the committed file matches and decodes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

export const QR_URL = 'https://theremote-site.pages.dev/?utm_source=qr_site';
export const QR_QUIET_ZONE = 4;
export const QR_INK = '#0b0e0d';
// Transparent: modules sit directly on the hero background (#eeeee6); the quiet zone is empty space.
export const QR_PAPER = '#eeeee6';
export const QR_TILE_PX = 123;
export const QR_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets/qr-download.svg');

/** Ink modules on the paper tile colour, error correction M, a 4-module quiet zone baked into the viewBox. */
export function qrSvg(url = QR_URL) {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const size = modules.size, total = size + QR_QUIET_ZONE * 2;
  let d = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!modules.get(y, x)) continue;
      let run = 1;
      while (x + run < size && modules.get(y, x + run)) run++;
      d += `M${x + QR_QUIET_ZONE} ${y + QR_QUIET_ZONE}h${run}v1h-${run}z`;
      x += run - 1;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${QR_TILE_PX}" height="${QR_TILE_PX}" shape-rendering="crispEdges"><path fill="${QR_INK}" d="${d}"/></svg>\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(QR_FILE, qrSvg());
  console.log(`Wrote ${path.relative(process.cwd(), QR_FILE)} for ${QR_URL}`);
}
