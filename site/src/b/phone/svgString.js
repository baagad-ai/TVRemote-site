// Tiny static renderer: turns the pure SVG screen components into a standalone SVG string (no react-dom/server).
// Only for hook-free components (everything in ui.jsx / screens.jsx / tv.jsx is).
import { Fragment } from 'react';
const KEEP = new Set(['viewBox', 'preserveAspectRatio', 'gradientUnits', 'gradientTransform', 'patternUnits', 'textLength', 'lengthAdjust']);
const attr = k => k === 'className' ? 'class' : KEEP.has(k) || k.startsWith('aria-') || k.startsWith('data-') ? k : k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function toSvg(n) {
  if (n == null || n === false || n === true) return '';
  if (Array.isArray(n)) return n.map(toSvg).join('');
  if (typeof n !== 'object') return esc(n);
  const { type, props } = n;
  if (type === Fragment) return toSvg(props.children);
  if (typeof type === 'function') return toSvg(type(props));
  let a = '';
  for (const [k, v] of Object.entries(props)) { if (k === 'children' || v == null || v === false) continue;
    a += ` ${attr(k)}="${esc(k === 'style' && typeof v === 'object' ? Object.entries(v).map(([p, x]) => `${attr(p)}:${x}`).join(';') : v)}"`; }
  return `<${type}${a}>${toSvg(props.children)}</${type}>`;
}
