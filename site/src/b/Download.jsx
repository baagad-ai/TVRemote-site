// 9 · Download finale (CONCEPT-B-GUIDE.md §9, board gen.py:250-262). Grid 1.1fr .9fr: h2 + lede left, the APK card
// right (Star Border CTA that loops only in view, the live counter in its fixed slot, the requirement, the QR for
// desktop visitors, install and checksum details, all from the release config as before). Under both, the board's
// full-width 4-step row (3px top rule, 40px Outfit number), staggering in once. Wording and counter unchanged.
// The QR keeps QrHint's spot id "hero" (QR_VARIANTS / qr.test.mjs) but is placed here, out of the hero, per the board.
import { useEffect, useRef, useState } from 'react';
import { DownloadLink, useRelease } from '../Download';
import { LiveCount } from './counter';
import QrHint from '../QrHint';
import StarBorder from '../components/rb/StarBorder';
import { useInView } from './lease';

const STEPS = ['Download the app on your Android phone.', 'If Android asks, allow installs from your browser.', 'Open the file and tap Install.', 'Pick your TV and enter the code it shows.'];
export default function DownloadFinale() {
  const release = useRelease(), steps = useRef(null), inView = useInView(steps, { threshold: .3 }), [seen, setSeen] = useState(false);
  useEffect(() => { if (inView) setSeen(true); }, [inView]);
  return <section className="b-section b-download" id="download" data-track-section="download" aria-labelledby="download-title">
    <div className="b-wrap">
      <div className="b-download-grid">
        <div className="b-download-intro"><p className="b-eyebrow"><span className="b-dot" aria-hidden="true" />Get The Remote</p><h2 id="download-title" tabIndex={-1}>Free. No ads. <em>No account.</em></h2><p className="b-lede">The Remote is free for Android phones and works with compatible Android TV and Google TV.</p></div>
        <div className="b-card">
          <span className="b-tag">Android phone APK</span>
          {release ? <><h3>The Remote for Android.</h3>
            <p className="b-small">Version {release.version}{Number.isInteger(release.versionCode) && release.versionCode > 0 ? ` · build ${release.versionCode}` : ''}{Number.isSafeInteger(release.bytes) && release.bytes > 0 ? ` · ${(release.bytes / 1024 / 1024).toFixed(1)} MiB` : ''}</p>
            <div className="b-card-cta"><StarBorder as="div" className="star-cta" color="#d4fa7b" duration={6} thickness={1} radius={999} hover="none" clickPulse={false} backgroundColor="transparent" borderColor="rgba(238,238,230,0)" textColor="#0b0e0d"><DownloadLink /></StarBorder><QrHint spot="hero" /></div>
            <LiveCount className="is-card" />
            {release.minSdk === 26 && <p className="b-small">Requires Android 8.0 or later on your phone.</p>}
            <details className="b-details" data-track="install-steps"><summary>Installing or updating</summary><p>Open the downloaded file and tap Install. Android may ask you to allow installs from your browser or file manager; you can turn that off again after installing. To update, download the latest version from this page and open it. Android installs it over your current app when the app version and signing identity are compatible.</p><p>If Android rejects an update, keep the app you have and check that the file came from this page. Uninstalling removes locally saved TVs, pairings, and settings.</p></details>
            <details className="b-details"><summary>Check the APK checksum</summary><p>Compare the downloaded file's SHA-256 with this release checksum.</p><code>{release.sha256}</code><p>A matching checksum confirms these file bytes; it does not replace Android's installation and signature checks.</p></details>
          </> : <><h3>Download is being prepared.</h3><p className="b-small">The verified Android APK will appear here when it is ready. No signup or email is needed. Check the <a href="#compatibility">TV requirements</a> while you wait.</p></>}
        </div>
      </div>
      <ol ref={steps} className={`b-stepper ${seen ? 'is-in' : ''}`} aria-label="How to install">{STEPS.map((s, i) => <li key={s} style={{ '--d': `${i * 90}ms` }}><b>0{i + 1}</b><span>{s}</span></li>)}</ol>
    </div>
  </section>;
}
