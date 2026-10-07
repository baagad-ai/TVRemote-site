import { createContext, useContext } from 'react';
import { approvedRelease, recordDownloadClick } from './download-metrics.mjs';

const Release = createContext(null);
export function DownloadProvider({ config, children }) {
  return <Release.Provider value={approvedRelease(config)}>{children}</Release.Provider>;
}
export function DownloadLink({ button = 'download', className = 'download-cta', children = 'Download Android APK', fallback = '#download' }) {
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
    <div className="download-intro"><p className="eyebrow">Get The Remote</p><h2 id="download-title" tabIndex={-1}>Your next remote<br />could be your phone.</h2><p>A free Android phone app for compatible Android TV and Google TV. No signup is needed to download.</p><div className="download-steps"><p><b>01</b> Download the APK to your Android phone.</p><p><b>02</b> Open the file and follow Android's installation prompts.</p><p><b>03</b> Choose your TV and pair using its on-screen code.</p></div><div className="download-requirements"><p className="eyebrow">Phone + TV requirements</p><p>{release?.minSdk === 26 ? "Phone: Android 8.0 or later." : "Phone: check the Android requirement shown with the verified APK."}</p><p>TV: compatible Android TV or Google TV with Android TV Remote Service v2. Keep both devices on the same home network.</p><p>D-pad controls are the default. <a href="#compatibility">Check requirements for optional features</a>; controls vary by TV and firmware.</p></div></div>
    <div className="download-panel"><p className="android-badge">Android phone APK</p>{release ? <><h3>Download for your phone.</h3><p>Version {release.version}{Number.isInteger(release.versionCode) && release.versionCode > 0 ? ` · build ${release.versionCode}` : ''}</p>{release.minSdk === 26 && <p className="download-requirement">Requires Android 8.0 or later on your phone.</p>}<DownloadLink />{Number.isSafeInteger(release.bytes) && release.bytes > 0 && <p className="fine-print">APK size: {(release.bytes / 1024 / 1024).toFixed(1)} MiB</p>}<p className="fine-print">Install this APK manually on your Android phone. Android may ask you to allow installation from the browser or file manager opening it. You can turn that permission off after installing.</p><details className="download-help"><summary>Installing or updating</summary><p>Open the downloaded APK and follow Android's prompts. An existing installation can only be updated with a compatible app version and signing identity.</p><p>If Android rejects an update, keep the installed app and check the APK version and source. Uninstalling removes locally saved TVs, pairings, and settings.</p><p>The phone remote and regular YouTube search do not need the TV companion's Accessibility service. The optional companion can be installed on Android TV 8.0 or later; companion search in other apps currently needs Android 14 or later on the TV. Supported apps and accessible fields vary.</p></details><details className="download-integrity"><summary>Check the APK checksum</summary><p>Compare the downloaded file's SHA-256 with this release checksum.</p><code>{release.sha256}</code><p className="fine-print">A matching checksum confirms these file bytes; it does not replace Android's installation and signature checks.</p></details></> : <><h3>Download is being prepared.</h3><p>The verified Android APK will appear here when it is ready.</p><p className="fine-print">No signup or email is needed. Check the <a href="#compatibility">TV requirements</a> while you wait.</p></>}</div>
  </section>;
}
