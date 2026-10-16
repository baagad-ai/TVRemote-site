// Shared live-counter layer for Concept B sections (see /workspace/cb-par/CONTRACT.md).
// ONE request: Build's DownloadCount (src/DownloadCount.jsx, not edited) fetches /api/download-count once per page and
// shares the total with every instance; it renders nothing until a real number > 0 arrives and stays hidden on failure.
// <LiveCount className="is-hero|is-proof|is-card" /> = fixed .b-count-slot + DownloadCount + count-up from 0 (in view,
// motion only, ends on the exact value). useCountUpSlot(ref) adds the same count-up to any element that contains a
// <DownloadCount />.
export { default as LiveCount, useCountUpSlot } from './LiveCount.jsx';
export { DownloadCount, bumpDownloadCount } from '../DownloadCount.jsx';
