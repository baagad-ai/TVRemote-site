import { createContext, useContext, useEffect } from 'react';
import { approvedRelease, recordDownloadClick, rememberSource } from './download-metrics.mjs';

const Release = createContext(null);
export function useRelease() { return useContext(Release); }
export function DownloadProvider({ config, children }) {
  // Keep an allow-listed utm_source from the landing page so a later page in this tab can send it.
  useEffect(() => { rememberSource(); }, []);
  return <Release.Provider value={approvedRelease(config)}>{children}</Release.Provider>;
}
export function DownloadLink({ button = 'download', className = 'download-cta', children = 'Download the app', fallback = '#download' }) {
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
    <div className="download-intro"><p className="eyebrow">Get The Remote</p><h2 id="download-title" tabIndex={-1}>Free. No ads. <br />No account.</h2><p>The Remote is free for Android phones and works with compatible Android TV and Google TV. No ads, no account, no signup.</p><div className="download-steps"><p><b>01</b> Download the app on your Android phone.</p><p><b>02</b> If Android asks, allow installs from your browser.</p><p><b>03</b> Open the file and tap Install.</p><p><b>04</b> Pick your TV and enter the code it shows.</p></div><div className="download-requirements"><p className="eyebrow">What you need</p><p>{release?.minSdk === 26 ? "Phone: Android 8.0 or later. There's no iPhone version." : "Phone: an Android phone that meets the requirement shown with the download. There's no iPhone version."}</p><p>TV: Android TV or Google TV with Android TV Remote Service v2, on the same home Wi-Fi as your phone.</p><p>Controls vary by TV and firmware. <a href="#compatibility">Check your TV and optional extras</a>.</p></div></div>
    <div className="download-panel"><p className="android-badge">Android phone APK</p>{release ? <><h3>The Remote for Android.</h3><p>Version {release.version}{Number.isInteger(release.versionCode) && release.versionCode > 0 ? ` · build ${release.versionCode}` : ''}</p>{release.minSdk === 26 && <p className="download-requirement">Requires Android 8.0 or later on your phone.</p>}<DownloadLink />{Number.isSafeInteger(release.bytes) && release.bytes > 0 && <p className="fine-print">APK size: {(release.bytes / 1024 / 1024).toFixed(1)} MiB</p>}<p className="fine-print">Android may ask you to allow installs from your browser or file manager. You can turn that off again after installing.</p><details className="download-help"><summary>Installing or updating</summary><p>Open the downloaded file and tap Install. To update, download the latest version from this page and open it. Android installs it over your current app when the app version and signing identity are compatible.</p><p>If Android rejects an update, keep the app you have and check that the file came from this page. Uninstalling removes locally saved TVs, pairings, and settings.</p></details><details className="download-integrity"><summary>Check the APK checksum</summary><p>Compare the downloaded file's SHA-256 with this release checksum.</p><code>{release.sha256}</code><p className="fine-print">A matching checksum confirms these file bytes; it does not replace Android's installation and signature checks.</p></details></> : <><h3>Download is being prepared.</h3><p>The verified Android APK will appear here when it is ready.</p><p className="fine-print">No signup or email is needed. Check the <a href="#compatibility">TV requirements</a> while you wait.</p></>}</div>
  </section>;
}
