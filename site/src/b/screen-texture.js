// Phone-screen SVG -> canvas for the live pin's PhoneScreen texture. phoneScreenSvg(name, step) (Design's slot) is loaded
// as an image, which can't reach the page's fonts, so its text fell back to Arial. We embed a Work Sans subset
// (screen-font.js) as an @font-face inside the SVG, wait for the page fonts and the image decode, then rasterize at 2x.
import { SCREEN_FONT_CSS } from './screen-font.js';

export const withScreenFont = svg => svg.replace(/<svg\b[^>]*>/, open => `${open}<defs><style>${SCREEN_FONT_CSS}</style></defs>`);
export async function rasterizeScreen(svg, scale = 2) {
  await document.fonts?.ready;
  const img = new Image(); img.decoding = 'async';
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(withScreenFont(svg))}`;
  await img.decode();
  const w = (img.naturalWidth || 540) * scale, h = (img.naturalHeight || 1170) * scale;
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return canvas;
}
