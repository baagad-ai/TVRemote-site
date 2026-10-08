// Compatibility export for older local render checks; no signup is mounted.
export { default } from './Download';
import { approvedRelease } from './download-metrics.mjs';
export const validConfig = config => Boolean(approvedRelease(config));
