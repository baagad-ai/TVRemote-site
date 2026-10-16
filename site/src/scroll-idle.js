// Heavy lazy work (3D scene runtimes: chunk eval, GLB parse, WebGL setup) blocks the main
// thread for up to ~2 s on slow machines. Started mid-glide it freezes a section-link glide
// just short of its target. SmoothScroll marks link glides; scene loaders wait for them.
let pending = null, release = null, timer = 0;
export function glideStarted() {
  if (!pending) pending = new Promise(resolve => { release = resolve; });
  clearTimeout(timer); timer = setTimeout(glideEnded, 3000); // never hold scenes back for long
}
export function glideEnded() { release?.(); pending = release = null; }
export const scrollIdle = () => pending || Promise.resolve();
