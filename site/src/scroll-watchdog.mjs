// Safety net for Lenis: a state that still reports "scrolling" but has not moved (window or
// Lenis' own animated position) for >= 150 ms across >= 6 rendered frames is stuck. Counting
// frames means a main-thread stall (no frames at all) never trips it; a section-link glide is
// left alone until 150 ms after its scheduled end, since its expo-out tail moves sub-pixel.
export function createWatchdog({ ms = 150, frames = 6 } = {}) {
  let key = null, since = 0, count = 0;
  return (now, scrolling, scrollY, animated, glideEnd = -Infinity) => {
    if (!scrolling) { key = null; return false; }
    const k = `${scrollY}|${Math.round(animated * 10)}`;
    if (k !== key) { key = k; since = now; count = 0; return false; }
    if (++count < frames || now - since < ms || now < glideEnd + ms) return false;
    key = null;
    return true;
  };
}
