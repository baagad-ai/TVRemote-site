import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useEnvironment } from './environment';
import contract from '../assets/3d/runtime-contract.json';

const SceneContext = createContext(null);
export function SceneProvider({ children }) {
  const { gpu } = useEnvironment(), registry = useRef(new Map()), runtime = useRef(null);
  const [occupied, setOccupied] = useState(false), requested = useRef('');
  useEffect(() => {
    if (!gpu) { runtime.current?.dispose(); runtime.current = null; setOccupied(false); return; }
    let disposed = false, frame = 0, activeKey = '', importing = null;
    async function reconcile() {
      frame = 0;
      const candidates = [...registry.current.values()].filter(({ element }) => {
        const r = element.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight;
      });
      const exposed = entry => {
        const r = entry.element.getBoundingClientRect();
        const hit = document.elementFromPoint(Math.max(0, Math.min(innerWidth - 1, r.left + r.width / 2)), Math.max(0, Math.min(innerHeight - 1, r.top + r.height / 2)));
        return entry.element.contains(hit) || (entry.element.closest('.scroll-stack-card') && entry.element.closest('.scroll-stack-card') === hit?.closest('.scroll-stack-card'));
      };
      candidates.sort((a, b) => Number(b.key === requested.current) - Number(a.key === requested.current) || Number(exposed(b)) - Number(exposed(a)) || Math.abs(a.element.getBoundingClientRect().top + a.element.clientHeight / 2 - innerHeight / 2) - Math.abs(b.element.getBoundingClientRect().top + b.element.clientHeight / 2 - innerHeight / 2));
      if (!candidates.some(entry => entry.key === requested.current)) requested.current = '';
      const next = candidates[0]; setOccupied(Boolean(next));
      if (!next) { activeKey = ''; runtime.current?.dispose(); runtime.current = null; importing = null; return; }
      if (next.key === activeKey) return;
      activeKey = next.key;
      try {
        if (runtime.current?.disposed) runtime.current = null;
        if (!runtime.current) {
          importing ||= import('./scene-runtime.js');
          const module = await importing;
          if (disposed || activeKey !== next.key) return;
          const loaded = await module.createSceneRuntime();
          if (disposed) { loaded.dispose(); return; }
          runtime.current = loaded;
        }
        if (!disposed && activeKey === next.key) runtime.current.select(next.key, next.element, () => next.state.current);
      } catch { if (!disposed) next.element.dataset.sceneStatus = 'fallback'; }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(reconcile); };
    schedule(); window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule);
    window.addEventListener('remote-scene-update', schedule);
    return () => { disposed = true; cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); window.removeEventListener('remote-scene-update', schedule); runtime.current?.dispose(); runtime.current = null; };
  }, [gpu]);
  const value = { occupied, register(key, element, state) { registry.current.set(key, { key, element, state }); return () => registry.current.delete(key); },
    update(key, state) { if (registry.current.get(key)?.element.classList.contains('scene-live')) runtime.current?.update(key, state); requested.current = key; window.dispatchEvent(new Event('remote-scene-update')); },
    pointer(key, x, y) { if (registry.current.get(key)?.element.classList.contains('scene-live')) runtime.current?.pointer(x, y); } };
  return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>;
}
export const useSceneBudget = () => useContext(SceneContext)?.occupied || false;
export function SceneSlot({ name, state, label, children, className = '' }) {
  const context = useContext(SceneContext), ref = useRef(null), stateRef = useRef(state), touch = useRef(null);
  stateRef.current = state;
  useEffect(() => context.register(name, ref.current, stateRef), [name]);
  useEffect(() => context.update(name, state), [name, state]);
  const size = name === 'hero' ? 1600 : 1200;
  return <figure className={`scene-figure scene-${name} ${className}`}>
    <div ref={ref} className="scene-surface" data-scene={name} aria-hidden="true"
      onPointerDown={event => { if (event.pointerType !== 'mouse') touch.current = { x: event.clientX, y: event.clientY }; }}
      onPointerMove={event => { if (event.pointerType !== 'mouse' && (!touch.current || Math.abs(event.clientX - touch.current.x) < Math.abs(event.clientY - touch.current.y) + 8)) return; const r = event.currentTarget.getBoundingClientRect(); context.pointer(name, Math.max(-1, Math.min(1, (event.clientX - r.left) / r.width * 2 - 1)), Math.max(-1, Math.min(1, (event.clientY - r.top) / r.height * 2 - 1))); }}
      onPointerUp={() => { touch.current = null; context.pointer(name, 0, 0); }}
      onPointerCancel={() => { touch.current = null; context.pointer(name, 0, 0); }}
      onPointerLeave={() => { touch.current = null; context.pointer(name, 0, 0); }}>
      <picture className="scene-poster"><source media="(max-width: 600px)" srcSet={`assets/3d/remote-${name}-${name === 'hero' ? 640 : 720}.webp`} /><img src={`assets/3d/remote-${name}-${size}.webp`} alt="" width={size} height={size * .78} loading={name === 'hero' ? 'eager' : 'lazy'} decoding="async" /></picture>
      {(name === 'hero' || name === 'handoff') && <ScreenOverlay name={name} shot={state.shot} />}
    </div>
    <figcaption>{label}</figcaption>
    <div className="scene-controls">{children}</div>
  </figure>;
}
function ScreenOverlay({ name, shot }) {
  const data = contract.scenes[name], quad = data.screen_quads_normalized[name === 'hero' ? 'PhoneScreen' : 'ReviewPhoneScreen'];
  const [width, height] = data.size, [bottomLeft, , topRight, topLeft] = quad;
  const matrix = [(topRight[0] - topLeft[0]) * width / 1080, (topRight[1] - topLeft[1]) * height / 1080, (bottomLeft[0] - topLeft[0]) * width / 2340, (bottomLeft[1] - topLeft[1]) * height / 2340, topLeft[0] * width, topLeft[1] * height];
  const src = name === 'handoff' ? 'assets/showcase/youtube-share.png' : 'assets/showcase/remote-home.png';
  return <svg className="screen-overlay" viewBox={`0 0 ${width} ${height}`} aria-hidden="true"><image href={src} width="1080" height="2340" transform={`matrix(${matrix.join(' ')})`} /></svg>;
}
