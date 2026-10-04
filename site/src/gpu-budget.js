// Synchronous handoff: the old owner releases its context before the next creates one.
let active = null;
export function acquireGPU(owner, release) {
  active?.release();
  active = { owner, release };
  return () => { if (active?.owner === owner) active = null; };
}
