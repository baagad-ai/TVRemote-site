import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

const Environment = createContext({ ready: false, motion: false, gpu: false });
export function EnvironmentProvider({ children }) {
  const [value, setValue] = useState({ ready: false, motion: false, gpu: false });
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setValue({ ready: true, motion: !reduced.matches && !document.hidden,
      gpu: !reduced.matches && !document.hidden && !navigator.connection?.saveData });
    update(); reduced.addEventListener('change', update); document.addEventListener('visibilitychange', update);
    const hide = () => flushSync(() => setValue({ ready: true, motion: false, gpu: false }));
    window.addEventListener('pagehide', hide); window.addEventListener('pageshow', update);
    navigator.connection?.addEventListener('change', update);
    return () => { reduced.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); navigator.connection?.removeEventListener('change', update); window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', update); };
  }, []);
  return <Environment.Provider value={value}>{children}</Environment.Provider>;
}
export const useEnvironment = () => useContext(Environment);
export function useVisible(threshold = 0.1) {
  const ref = useRef(null), [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, visible];
}
