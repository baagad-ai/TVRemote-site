import { useEffect, useRef, useState } from 'react';
import { EnvironmentProvider, useEnvironment } from './environment';
import PhoneStory, { ControlsProof } from './PhoneStory';
import Destination from './Destination';
import Download, { DownloadLink, DownloadProvider } from './Download';
import Privacy from './Privacy';
import { GuidesPage, GuidesPreview } from './Guides';

export function Header({ privacy = false }) {
  return <header className="site-header page-width"><a className="brand" href={privacy ? '../' : '#top'} aria-label="The Remote, home"><img src={`${privacy ? '../' : ''}assets/focus-key.svg`} alt="" width="32" height="32" /><span>The Remote<span className="brand-period">.</span></span></a><nav aria-label="Main navigation">{privacy ? <a href="../">Home ↗</a> : <><a href="#search-proof">How it works</a><a href="#inside">Your rooms</a><a href="#compatibility">Will it work?</a><a href="guides/">Guides</a></>}</nav>{!privacy && <DownloadLink button="nav" className="header-cta text-link" />}</header>;
}
export function Footer({ privacy = false }) {
  return <footer className="site-footer page-width"><a className="brand" href={privacy ? '../' : '#top'}><img src={`${privacy ? '../' : ''}assets/focus-key.svg`} alt="" width="28" height="28" /><span>The Remote.</span></a><p>A free phone remote.<br />Compatible Android TV + Google TV.</p><a href={privacy ? '../' : 'privacy/'}>{privacy ? 'Back to home' : 'Privacy policy'} ↗</a><a href="#top">Back to top ↑</a></footer>;
}
function Compatibility() {
  return <section className="compatibility-section page-width" id="compatibility" aria-labelledby="compatibility-title"><div><p className="eyebrow">Before you pair</p><h2 id="compatibility-title">Pick your TV.<br /><em>Pair locally.</em></h2></div><div className="compatibility-copy"><p>The Remote pairs on your home network with compatible Android TV and Google TV devices. Android TV Remote Service v2 is required.</p><p>D-pad controls are the default and use your home network. Controls vary by TV model and firmware; regular YouTube search also depends on the TV's YouTube version.</p><ul className="compatibility-requirements"><li><strong>Optional TV companion:</strong> installation needs Android TV 8.0 or later. Companion search in other apps currently needs Android 14 or later on the TV; supported apps and accessible fields vary.</li><li><strong>Optional Bluetooth mouse:</strong> needs an Android 9.0 or later phone with Bluetooth HID support, plus a TV that supports the connection.</li></ul><div className="privacy-note"><span aria-hidden="true">⌁</span><p>Remote commands go to your paired TV over the local network, without a developer cloud relay. The Remote doesn't keep a search history.</p></div><a className="text-link" href="privacy/">How your data is handled ↗</a></div></section>;
}
function Questions() {
  return <section className="questions-section page-width" id="faq" aria-labelledby="faq-title"><div><p className="eyebrow">A few good questions</p><h2 id="faq-title">Before the<br />first click.</h2></div><div className="faq-list"><details><summary>Which TVs does it work with?</summary><p>Compatible Android TV and Google TV devices with Android TV Remote Service v2. Available controls vary by model.</p></details><details><summary>Do I need the TV companion?</summary><p>Not for YouTube search. The phone sends a search link directly to your selected TV over your home network. The TV and its YouTube version decide whether it works. The optional TV companion can be installed on Android TV 8.0 or later. Companion search in other apps currently needs Android 14 or later on the TV; supported apps and accessible fields vary.</p></details><details><summary>Does the Bluetooth mouse work on every phone?</summary><p>No. D-pad controls are the default over your home network. The optional Bluetooth mouse needs Android 9.0 or later, Bluetooth HID support on your phone, and a TV that supports the connection.</p></details><details><summary>Where does my search go?</summary><p>To the TV you picked, over your local network. YouTube may process the search link under its own privacy policy. The Remote doesn't keep a search history.</p></details><details><summary>Is the app free?</summary><p>Yes. No ads, in-app purchases, or subscription. No signup is needed to download the APK.</p></details><details><summary>How do I get the app?</summary><p>Use the download section to get the available Android APK and check its version. Open the file on your Android phone and follow the installation prompts. Android may ask you to allow installation from your browser or file manager. <a href="#download">Download and update details</a>.</p></details><details><summary>Will the APK update my existing app?</summary><p>Android checks the app version and signing identity before accepting an update. If installation is rejected, keep the installed app and check the APK source. Uninstalling removes locally saved TVs, pairings, and settings.</p></details></div></section>;
}
function Closing() {
  return <section className="closing-section"><div className="page-width"><p className="eyebrow">Ready when you are</p><h2>A better remote.<br />Already in your pocket.</h2><DownloadLink button="footer" /><p className="fine-print">Free app. Direct Android APK. No signup.</p></div></section>;
}
function MobileCta() {
  const ref = useRef(null), [visible, setVisible] = useState(false), { ready } = useEnvironment();
  useEffect(() => {
    if (!ready) return;
    const bar = ref.current, inline = [...document.querySelectorAll('[data-download-cta]')].filter(node => !bar.contains(node));
    const evidence = [...document.querySelectorAll('.story-chapter,.controls-proof')];
    const panel = document.querySelector('#download'), narrow = matchMedia('(max-width: 740px)');
    const intersects = node => { const r = node.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < (visualViewport?.height || innerHeight); };
    const update = () => {
      const focused = panel.contains(document.activeElement), keyboard = visualViewport && visualViewport.height < innerHeight * .75;
      const next = narrow.matches && !focused && !keyboard && !intersects(panel) && !inline.some(intersects) && !evidence.some(intersects);
      if (!next && bar.contains(document.activeElement)) (inline.find(intersects) || panel.querySelector('h2')).focus({ preventScroll: true });
      setVisible(next);
    };
    const observer = new IntersectionObserver(update); [...inline, panel, ...evidence].forEach(node => observer.observe(node));
    const resize = new ResizeObserver(update); resize.observe(panel);
    const reserve = new ResizeObserver(() => document.documentElement.style.setProperty('--mobile-cta-height', `${bar.offsetHeight}px`)); reserve.observe(bar);
    document.addEventListener('focusin', update); document.addEventListener('focusout', update); window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); visualViewport?.addEventListener('resize', update); narrow.addEventListener('change', update); update();
    return () => { observer.disconnect(); resize.disconnect(); reserve.disconnect(); document.removeEventListener('focusin', update); document.removeEventListener('focusout', update); window.removeEventListener('scroll', update); window.removeEventListener('resize', update); visualViewport?.removeEventListener('resize', update); narrow.removeEventListener('change', update); };
  }, [ready]);
  return <div ref={ref} className={`mobile-cta-bar ${visible ? 'is-visible' : ''}`} data-mobile-cta-bar aria-hidden={!visible} inert={!visible}><DownloadLink button="footer" /><span>Free app. No signup.</span></div>;
}
function Landing({ config }) { return <><Header /><main id="main" tabIndex={-1}><PhoneStory Destination={Destination} /><ControlsProof /><Compatibility /><Download /><GuidesPreview /><Questions /><Closing /></main><Footer /><MobileCta /></>; }
export default function App({ route = 'landing', config }) { return <EnvironmentProvider><DownloadProvider config={config}><a className="skip-link" href="#main">Skip to content</a>{route === 'privacy' ? <Privacy /> : route.startsWith('guides') ? <GuidesPage slug={route.split('/')[1]} /> : <Landing config={config} />}</DownloadProvider></EnvironmentProvider>; }
