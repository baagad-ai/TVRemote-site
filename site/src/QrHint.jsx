import { useEffect, useState } from 'react';
import { useRelease } from './Download';

// Placement variants under review: A = hero only, B = hero + closing section, C = closing section only.
// Change this one constant to pick the production placement.
export const QR_DEFAULT_VARIANT = 'B';
export const QR_VARIANTS = { A: ['hero'], B: ['hero', 'closing'], C: ['closing'] };

// Preview/dev only: ?qrspot=A|B|C switches the variant after hydration on local or preview hosts.
// The production host always uses QR_DEFAULT_VARIANT, which is also what the prerendered HTML contains.
export function previewVariant(location) {
  try {
    const host = location?.hostname || '';
    if (!(host === 'localhost' || host === '127.0.0.1' || host.endsWith('.theremote-site.pages.dev'))) return null;
    const value = new URLSearchParams(location.search || '').get('qrspot')?.toUpperCase();
    return value && Object.hasOwn(QR_VARIANTS, value) ? value : null;
  } catch { return null; }
}

/** Desktop-only QR tile linking phones to this page; CSS hides it below 1024px and on touch devices. */
export default function QrHint({ spot }) {
  const release = useRelease();
  const [variant, setVariant] = useState(QR_DEFAULT_VARIANT);
  useEffect(() => { const preview = previewVariant(globalThis.location); if (preview) setVariant(preview); }, []);
  if (!release || !QR_VARIANTS[variant].includes(spot)) return null;
  return <div className={`qr-hint qr-hint-${spot}`} data-qr-spot={spot}>
    <img className="qr-hint-tile" src="assets/qr-download.svg" alt="" aria-hidden="true" width="123" height="123" loading="lazy" decoding="async" />
    <p>Scan to get it on your phone.</p>
  </div>;
}
