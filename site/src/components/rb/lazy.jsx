// Code-split React Bits components (keeps runtime/app.js under check-react's 240 KB gzip budget). Each renders
// `fallback` (pass the same static, SSR-safe markup you render before hydration) until its chunk has loaded.
// Usage: <Lazy.BlurText fallback={<h1 …>…</h1>} …props />
import { lazy, Suspense } from 'react';
const wrap = load => { const C = lazy(load); return ({ fallback = null, ...props }) => <Suspense fallback={fallback}><C {...props} /></Suspense>; };
export const BlurText = wrap(() => import('./BlurText'));
export const AnimatedList = wrap(() => import('./AnimatedList'));
export const ScrollReveal = wrap(() => import('./ScrollReveal'));
export const CircularGallery = wrap(() => import('./CircularGallery'));
export const PixelTransition = wrap(() => import('./PixelTransition'));
export const CountUp = wrap(() => import('./CountUp'));
export const Stepper = wrap(() => import('./Stepper'));
export { Step } from './Stepper';
