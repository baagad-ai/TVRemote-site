import { useEffect, useState } from 'react';

// One shared total for every indicator on the page; hidden until a real number arrives.
let total = null;
const listeners = new Set();
const publish = value => { total = value; listeners.forEach(fn => fn(value)); };
let loading = null;
function load() {
  if (loading) return loading;
  loading = fetch('/api/download-count', { credentials: 'omit', cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(data => { if (Number.isSafeInteger(data?.count) && data.count > 0) publish(Math.max(data.count, total || 0)); })
    .catch(() => {});
  return loading;
}
export function bumpDownloadCount() { if (total !== null) publish(total + 1); }

export function DownloadCount({ className = '' }) {
  const [count, setCount] = useState(total);
  useEffect(() => { listeners.add(setCount); load(); return () => { listeners.delete(setCount); }; }, []);
  if (count === null) return null;
  return <p className={`download-count ${className}`.trim()} aria-live="polite"><span className="download-count-dot" aria-hidden="true" /><b>{count.toLocaleString('en-US')}</b> downloads already!</p>;
}
