import { useEffect, useRef } from 'react';
import { useEnvironment, useVisible } from './environment';
import { scrollIdle } from './scroll-idle';

export default function Destination({ room }) {
  const { gpu, motion } = useEnvironment(), [visibleRef, visible] = useVisible(.15), surface = useRef(null), runtime = useRef(null), roomRef = useRef(room);
  roomRef.current = room;
  useEffect(() => {
    if (!gpu || !visible) return;
    let canceled = false;
    const controller = new AbortController();
    (async () => {
      try {
        await scrollIdle();
        if (canceled) return;
        const module = await import('./destination-runtime');
        if (canceled) return;
        const scene = await module.createDestination(surface.current, () => roomRef.current, controller.signal);
        if (canceled) { scene.dispose(); return; }
        runtime.current = scene;
      } catch { if (!canceled && surface.current) surface.current.dataset.sceneStatus = 'fallback'; }
    })();
    return () => { canceled = true; controller.abort(); runtime.current?.dispose(); runtime.current = null; };
  }, [gpu, visible]);
  useEffect(() => runtime.current?.select(room, motion), [room, motion]);
  return <figure ref={visibleRef} className="destination-figure"><div ref={surface} className="destination-surface" data-destination={room} aria-hidden="true"><picture><source media="(max-width:740px)" srcSet={`assets/3d/room-${room}-mobile.webp`} /><img src={`assets/3d/room-destinations-${room}-1440.webp`} alt="" width="1440" height="960" loading="lazy" decoding="async" /></picture></div><figcaption>{room === 'living' ? 'Living room' : 'Bedroom'}.</figcaption></figure>;
}
