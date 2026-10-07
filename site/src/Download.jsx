import { createContext, useContext } from 'react';
import { approvedRelease, recordDownloadClick } from './download-metrics.mjs';

const Release = createContext(null);
export function DownloadProvider({ config, children }) {
  return <Release.Provider value={approvedRelease(config)}>{children}</Release.Provider>;
}
export function DownloadLink({ button = 'download', className = 'download-cta', children = 'Download APK', fallback = '#download' }) {
  const release = useContext(Release);
  return <a className={className} href={release ? release.url : fallback}
    data-download-cta={release ? button : undefined} download={release ? '' : undefined}
    rel={release ? 'noreferrer' : undefined}
    onClick={release ? () => recordDownloadClick(release, button) : undefined}>
    <span>{release ? children : 'Download status'}</span><span className="cta-arrow" aria-hidden="true">↗</span>
  </a>;
}
export default function Download() {
  const release = useContext(Release);
  return <section className="download-section page-width" id="download" aria-labelledby="download-title">
    <div className="download-intro"><p className="eyebrow">Get The Remote</p><h2 id="download-title" tabIndex={-1}>Your next remote<br />could be your phone.</h2><p>A free Android phone app for compatible Android TV and Google TV. No app account, ads, or subscription.</p><div className="download-steps"><p><b>01</b> Download the APK to your Android phone.</p><p><b>02</b> Open the file and follow Android's installation prompts.</p><p><b>03</b> Pair with your TV on your home network.</p></div></div>
    <div className="download-panel">{release ? <><h3>Download for Android.</h3><p>Version {release.version}</p><DownloadLink /><p className="fine-print">This is an APK for your Android phone. Android may ask you to allow installation from your browser; you can turn that permission off after installing.</p><details className="download-integrity"><summary>Verify this APK</summary><p>SHA-256</p><code>{release.sha256}</code></details></> : <><h3>Download is being prepared.</h3><p>The verified Android APK will appear here when it is ready.</p><p className="fine-print">No signup or email is needed. Check the <a href="#compatibility">TV requirements</a> while you wait.</p></>}</div>
  </section>;
}
