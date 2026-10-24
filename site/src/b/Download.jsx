// 9 · Download finale (CONCEPT-B-GUIDE.md §9, board gen.py:250-262). Grid 1.1fr .9fr: h2 + lede left, the APK card
// right (Star Border CTA that loops only in view, the live counter in its fixed slot, the requirement, the QR for
// desktop visitors; PM 21:33: the checksum moved to the FAQ, 'How do I check the APK checksum?'). Under both, the board's
// full-width 4-step row (3px top rule, 40px Outfit number), staggering in once, each with a coded SVG phone UI
// (StepPhones.jsx) whose control presses once as the step lands. React Bits Stepper is a one-step-at-a-time wizard
// (Back / Next footer), so the board's static 4-column row is drawn here with the same stagger. Wording and counter unchanged.
// Baagad 16 Oct 21:28: no QR and no "Installing or updating" row in the card, so the card keeps the board's size and
// the 01-04 row sits in view below it at 1440.
import { useEffect, useRef, useState } from 'react';
import { DownloadLink, useRelease } from '../Download';
import { LiveCount } from './counter';
import StarBorder from '../components/rb/StarBorder';
import { useInView } from './lease';
import StepPhone from './StepPhones';

const STEPS = ['Download the app on your Android phone.', 'If Android asks, allow installs from your browser.', 'Open the file and tap Install.', 'Pick your TV and enter the code it shows.'];
export default function DownloadFinale() {
  const release = useRelease(), steps = useRef(null), inView = useInView(steps, { threshold: .3 }), [seen, setSeen] = useState(false);
  useEffect(() => { if (inView) setSeen(true); }, [inView]);
  return <section className="b-section b-download" id="download" data-track-section="download" aria-labelledby="download-title">
    <div className="b-wrap">
      <div className="b-download-grid">
        <div className="b-download-intro"><p className="b-eyebrow"><span className="b-dot" aria-hidden="true" />Get The Remote</p><h2 id="download-title" tabIndex={-1}>Free. No ads. <em>No sign-up.</em></h2><p className="b-lede">The Remote is free for Android phones and works with compatible Android TV and Google TV.</p></div>
        <div className="b-card">
          <span className="b-tag">Android phone APK</span>
          {release ? <><h3>The Remote for Android.</h3>
            <p className="b-small">Version {release.version}{Number.isInteger(release.versionCode) && release.versionCode > 0 ? ` · build ${release.versionCode}` : ''}{Number.isSafeInteger(release.bytes) && release.bytes > 0 ? ` · ${(release.bytes / 1024 / 1024).toFixed(1)} MiB` : ''}</p>
            <div className="b-card-cta"><StarBorder as="div" className="star-cta" color="#d4fa7b" duration={6} thickness={1} radius={999} hover="none" clickPulse={false} backgroundColor="transparent" borderColor="transparent" textColor="#0b0e0d"><DownloadLink /></StarBorder></div>
            <LiveCount className="is-card" />
            {release.minSdk === 26 && <p className="b-small">Requires Android 8.0 or later on your phone.</p>}
          </> : <><h3>Download is being prepared.</h3><p className="b-small">The verified Android APK will appear here when it is ready. No signup or email is needed. Check the <a href="#compatibility">TV requirements</a> while you wait.</p></>}
        </div>
      </div>
      <ol ref={steps} className={`b-stepper ${seen ? 'is-in' : ''}`} aria-label="How to install">{STEPS.map((s, i) => <li key={s} style={{ '--d': `${i * 90}ms` }}><div><b>0{i + 1}</b><span>{s}</span></div><StepPhone step={i} /></li>)}</ol>
    </div>
  </section>;
}
