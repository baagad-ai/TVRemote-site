import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { approvedRelease, formatApkSize, playTestingEnabled, recordDownloadClick } from './download-metrics.mjs';
import Icon from './Icon';

const Release = createContext({ release: null, play: null, prefix: '', sheet: { current: null } });
const routePrefix = route => route === 'landing' ? '' : route.startsWith('guides/') ? '../../' : '../';
export const useDownload = () => useContext(Release);
export function DownloadProvider({ config, route = 'landing', children }) {
  const release = approvedRelease(config), play = playTestingEnabled(config) ? config.playTesting : null, sheet = useRef(null);
  return <Release.Provider value={{ release, play, prefix: routePrefix(route), sheet }}>{children}{release && play && route !== 'join' && <ApkSheet />}</Release.Provider>;
}
const plainClick = event => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
// A real <a href=APK>: works without JavaScript. With Play testing on, JS opens the sheet instead
// (not counted); the sheet's "Download APK anyway" is the counted click. Off: counted direct download.
export function DownloadLink({ button = 'download', className = 'download-cta', children = 'Download the app', fallback = '#download', icon = false, arrow = true, direct = false }) {
  const { release, sheet } = useDownload();
  const onClick = release ? event => {
    if (!direct && plainClick(event) && sheet.current?.open(button, event.currentTarget)) { event.preventDefault(); return; }
    recordDownloadClick(release, button);
  } : undefined;
  return <a className={className} href={release ? release.url : fallback}
    data-download-cta={release ? button : undefined} download={release ? '' : undefined}
    rel={release ? 'noreferrer' : undefined} onClick={onClick}>
    {icon && release && <Icon name="download-simple" />}<span>{release ? children : 'Download status'}</span>{arrow && <span className="cta-arrow" aria-hidden="true">↗</span>}
  </a>;
}
export function PlayLink({ className = 'cta-pill cta-primary', children = 'Join the beta on Google Play' }) {
  const { prefix } = useDownload();
  return <a className={className} href={`${prefix}join/`} data-play-cta="">{children}</a>;
}
// Primary/secondary pair. Off: Download APK is the single lime pill. On: Play pill first, APK outline second.
export function CtaPair({ button, compact = false }) {
  const { release, play } = useDownload();
  return <div className={`cta-group ${compact ? 'is-compact' : ''}`}><div className={`cta-pair ${play ? 'has-play' : ''}`}>
    {play && <PlayLink />}
    <DownloadLink button={button} className={play ? (compact ? 'cta-text-button' : 'cta-pill cta-secondary') : 'cta-pill cta-primary'} icon={!(play && compact)} arrow={false}>Download APK</DownloadLink>
  </div>{release && <p className="cta-note">Free · No ads · No account</p>}</div>;
}
export function FileDetails({ release, copy = true }) {
  const [copied, setCopied] = useState(false);
  const size = formatApkSize(release.bytes);
  const onCopy = () => navigator.clipboard?.writeText(release.sha256).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }, () => {});
  return <div className="file-card"><p>Version {release.version}{size ? ` · ${size}` : ''}</p>
    <div className="file-sha"><p>SHA-256 <code>{release.sha256}</code></p>{copy && <button type="button" className="copy-button" onClick={onCopy} aria-label={copied ? 'SHA-256 copied' : 'Copy SHA-256'}><Icon name={copied ? 'check' : 'copy'} size={18} /><span aria-hidden="true">{copied ? 'Copied' : 'Copy'}</span></button>}</div>
    <p className="visually-hidden" role="status">{copied ? 'SHA-256 copied to clipboard' : ''}</p></div>;
}
const benefits = [['arrows-clockwise', 'Updates arrive on their own.'], ['shield-check', 'Google Play checks the app before it installs.'], ['hand-tap', 'One tap to install.'], ['toggle-left', 'No ‘unknown sources’ setting to turn on.']];
function ApkSheet() {
  const { release, sheet } = useDownload();
  const dialog = useRef(null), title = useRef(null), trigger = useRef(null), timer = useRef(0), [button, setButton] = useState('download');
  const close = () => {
    const node = dialog.current; if (!node?.open || node.classList.contains('is-closing')) return;
    node.classList.add('is-closing'); clearTimeout(timer.current);
    timer.current = setTimeout(() => node.close(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 180);
  };
  useEffect(() => {
    sheet.current = { open(position, element) {
      const node = dialog.current; if (!node || typeof node.showModal !== 'function') return false;
      clearTimeout(timer.current); node.classList.remove('is-closing'); trigger.current = element; setButton(position);
      document.documentElement.classList.add('sheet-open'); node.showModal(); title.current.focus(); return true;
    } };
    return () => { sheet.current = null; clearTimeout(timer.current); document.documentElement.classList.remove('sheet-open'); };
  }, [sheet]);
  const onClose = () => { dialog.current.classList.remove('is-closing'); document.documentElement.classList.remove('sheet-open'); trigger.current?.focus({ preventScroll: true }); };
  const onKeyDown = event => {
    if (event.key !== 'Tab') return;
    const items = [...dialog.current.querySelectorAll('a[href],button:not([disabled])')], first = items[0], last = items[items.length - 1], active = document.activeElement;
    if (event.shiftKey && (active === first || active === title.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  };
  return <dialog ref={dialog} className="apk-sheet" role="dialog" aria-modal="true" aria-labelledby="apk-sheet-title" aria-describedby="apk-sheet-benefits"
    onCancel={event => { event.preventDefault(); close(); }} onClose={onClose} onKeyDown={onKeyDown} onClick={event => { if (event.target === dialog.current) close(); }}>
    <div className="sheet-body">
      <span className="sheet-handle" aria-hidden="true" />
      <button type="button" className="sheet-close" aria-label="Close" onClick={close}><Icon name="x" /></button>
      <span className="sheet-chip" aria-hidden="true"><Icon name="shield-check" /></span>
      <h2 id="apk-sheet-title" ref={title} tabIndex={-1}>Google Play is the easier way</h2>
      <ul className="sheet-benefits" id="apk-sheet-benefits">{benefits.map(([icon, text], i) => <li key={icon} style={{ '--i': i }}><Icon name={icon} /><span>{text}</span></li>)}</ul>
      <FileDetails release={release} />
      {release.versionCode >= 8 && <p className="sheet-upgrade">Already have beta.7? This installs over it and keeps your TVs.</p>}
      <div className="sheet-actions"><PlayLink /><a className="cta-text-button sheet-anyway" href={release.url} download="" rel="noreferrer" data-sheet-download={button}
        onClick={() => { recordDownloadClick(release, button); close(); }}>Download APK anyway</a></div>
    </div>
  </dialog>;
}
export default function Download() {
  const { release } = useDownload();
  return <section className="download-section page-width" id="download" aria-labelledby="download-title">
    <div className="download-intro"><p className="eyebrow">Get The Remote</p><h2 id="download-title" tabIndex={-1}>Download.<br />Pair. Watch.</h2><p>The Remote is free for Android phones and works with compatible Android TV and Google TV. No ads, no account, no signup.</p><div className="download-steps"><p><b>01</b> Download the app on your Android phone.</p><p><b>02</b> If Android asks, allow installs from your browser.</p><p><b>03</b> Open the file and tap Install.</p><p><b>04</b> Pick your TV and enter the code it shows.</p></div><div className="download-requirements"><p className="eyebrow">What you need</p><p>{release?.minSdk === 26 ? "Phone: Android 8.0 or later. There's no iPhone version." : "Phone: an Android phone that meets the requirement shown with the download. There's no iPhone version."}</p><p>TV: Android TV or Google TV with Android TV Remote Service v2, on the same home Wi-Fi as your phone.</p><p>Controls vary by TV and firmware. <a href="#compatibility">Check your TV and optional extras</a>.</p></div></div>
    <div className="download-panel"><p className="android-badge">Android phone APK</p>{release ? <><h3>The Remote for Android.</h3><p>Version {release.version}{Number.isInteger(release.versionCode) && release.versionCode > 0 ? ` · build ${release.versionCode}` : ''}</p>{release.minSdk === 26 && <p className="download-requirement">Requires Android 8.0 or later on your phone.</p>}<CtaPair button="download" />{formatApkSize(release.bytes) && <p className="fine-print">{`APK size: ${formatApkSize(release.bytes)}`}</p>}<p className="fine-print">Android may ask you to allow installs from your browser or file manager. You can turn that off again after installing.</p><details className="download-help"><summary>Installing or updating</summary><p>Open the downloaded file and tap Install. To update, download the latest version from this page and open it. Android installs it over your current app when the app version and signing identity are compatible.</p><p>If Android rejects an update, keep the app you have and check that the file came from this page. Uninstalling removes locally saved TVs, pairings, and settings.</p></details><details className="download-integrity"><summary>Check the APK checksum</summary><p>Compare the downloaded file's SHA-256 with this release checksum.</p><code>{release.sha256}</code><p className="fine-print">A matching checksum confirms these file bytes; it does not replace Android's installation and signature checks.</p></details></> : <><h3>Download is being prepared.</h3><p>The verified Android APK will appear here when it is ready.</p><p className="fine-print">No signup or email is needed. Check the <a href="#compatibility">TV requirements</a> while you wait.</p></>}</div>
  </section>;
}

export function JoinPage({ Header, Footer }) {
  const { release, play } = useDownload();
  const external = { target: '_blank', rel: 'noopener' };
  return <><Header privacy /><main id="main" className="join-main page-width" tabIndex={-1}>
    <p className="eyebrow">Google Play testing</p><h1>Get The Remote on Google Play</h1>
    <p className="join-lede">The Remote is in testing on Google Play right now. Joining takes about a minute, using the Google account on your Android phone.</p>
    <ol className="join-card">
      <li className="join-step"><span className="join-number" aria-hidden="true">1</span><div><h2>Join the tester group</h2><p>Sign in with the Google account you use on your phone, then tap Join group.</p><a className="cta-pill cta-primary" href={play.groupUrl} {...external}>Join the tester group<span className="visually-hidden"> (opens in a new tab)</span></a></div></li>
      <li className="join-step"><span className="join-number" aria-hidden="true">2</span><div><h2>Opt in on Google Play</h2><p>Open the testing page, tap Become a tester, then tap Download it on Google Play.</p><a className="cta-pill cta-primary" href={play.optInUrl} {...external}>Open the testing page<span className="visually-hidden"> (opens in a new tab)</span></a></div></li>
    </ol>
    <p className="join-note">If Play says the app isn't available yet, Google is still reviewing this release. That can take a day or two, and the install shows up on its own.</p>
    <p className="join-note">Please stay opted in for at least 14 days. It helps us bring The Remote to everyone on the Play Store.</p>
    <section className="join-fallback" aria-labelledby="join-fallback-title"><h2 id="join-fallback-title">Want it today?</h2><p>Download the APK from this site. It's the same app, signed with the same key as the Google Play version, so Google Play can update it later.</p>
      {release ? <><div className="cta-group"><div className="cta-pair"><DownloadLink button="download" direct className="cta-pill cta-secondary" icon arrow={false}>Download APK</DownloadLink></div><p className="cta-note">Free · No ads · No account</p></div><FileDetails release={release} /></> : <p className="fine-print">The APK download is being prepared.</p>}
    </section>
  </main><Footer privacy /></>;
}
