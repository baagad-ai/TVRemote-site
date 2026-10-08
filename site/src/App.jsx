import { useEffect, useRef, useState } from 'react';
import { EnvironmentProvider, useEnvironment } from './environment';
import PhoneStory, { ControlsProof } from './PhoneStory';
import Destination from './Destination';
import Download, { CtaPair, DownloadLink, DownloadProvider, JoinPage, PlayLink, useDownload } from './Download';
import Privacy from './Privacy';
import { GuidesPage, GuidesPreview } from './Guides';
import { faqItems } from './faq-items.mjs';

export function Header({ privacy = false }) {
  const { play } = useDownload();
  return <header className="site-header page-width"><a className="brand" href={privacy ? '../' : '#top'} aria-label="The Remote, home"><img src={`${privacy ? '../' : ''}assets/focus-key.svg`} alt="" width="32" height="32" /><span>The Remote<span className="brand-period">.</span></span></a><nav aria-label="Main navigation">{privacy ? <a href="../">Home ↗</a> : <><a href="#search-proof">How it works</a><a href="#inside">Your rooms</a><a href="#compatibility">Will it work?</a><a href="guides/">Guides</a></>}</nav>{!privacy && (play ? <PlayLink className="header-cta text-link">Join the beta</PlayLink> : <DownloadLink button="nav" className="header-cta text-link" />)}</header>;
}
export function Footer({ privacy = false }) {
  const { play } = useDownload();
  return <footer className="site-footer page-width"><a className="brand" href={privacy ? '../' : '#top'}><img src={`${privacy ? '../' : ''}assets/focus-key.svg`} alt="" width="28" height="28" /><span>The Remote.</span></a><p>A free phone remote for Android.<br />For compatible Android TV + Google TV.</p><a href={privacy ? '../' : 'privacy/'}>{privacy ? 'Back to home' : 'Privacy policy'} ↗</a><a href="#top">Back to top ↑</a>{play && <p className="footer-legal">Google Play is a trademark of Google LLC.</p>}</footer>;
}
function Compatibility() {
  return <section className="compatibility-section page-width" id="compatibility" aria-labelledby="compatibility-title"><div><p className="eyebrow">Will it work?</p><h2 id="compatibility-title">Pick your TV.<br /><em>Pair locally.</em></h2></div><div className="compatibility-copy"><p>The Remote works with Android TV and Google TV devices that support Android TV Remote Service v2. Your phone needs Android 8.0 or later. There's no iPhone version.</p><p>Your phone and TV pair over your home Wi-Fi. D-pad controls are the default; available controls vary by TV model and firmware. YouTube search and links depend on the TV's YouTube version.</p><ul className="compatibility-requirements"><li><strong>Optional Bluetooth mouse:</strong> needs an Android 9.0 or later phone with Bluetooth HID support, plus a TV that supports the connection.</li></ul><div className="privacy-note"><span aria-hidden="true">⌁</span><p>Remote commands go to your paired TV over the local network, without a developer cloud relay. The Remote doesn't keep a search history.</p></div><a className="text-link" href="privacy/">How your data is handled ↗</a></div></section>;
}
function Questions() {
  const { play } = useDownload(), faq = faqItems(Boolean(play));
  return <section className="questions-section page-width" id="faq" aria-labelledby="faq-title"><div><p className="eyebrow">Questions, answered</p><h2 id="faq-title">Before the<br />first click.</h2></div><div className="faq-list">{faq.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div></section>;
}
function Closing() {
  return <section className="closing-section"><div className="page-width"><p className="eyebrow">Ready when you are</p><h2>A better remote.<br />Already in your pocket.</h2><CtaPair button="footer" /></div></section>;
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
  return <div ref={ref} className={`mobile-cta-bar ${visible ? 'is-visible' : ''}`} data-mobile-cta-bar aria-hidden={!visible} inert={!visible}><CtaPair button="footer" compact /></div>;
}
function Landing({ config }) { return <><Header /><main id="main" tabIndex={-1}><PhoneStory Destination={Destination} /><ControlsProof /><Compatibility /><Download /><GuidesPreview /><Questions /><Closing /></main><Footer /><MobileCta /></>; }
export default function App({ route = 'landing', config }) { return <EnvironmentProvider><DownloadProvider config={config} route={route}><a className="skip-link" href="#main">Skip to content</a>{route === 'join' ? <JoinPage Header={Header} Footer={Footer} /> : route === 'privacy' ? <Privacy /> : route.startsWith('guides') ? <GuidesPage slug={route.split('/')[1]} /> : <Landing config={config} />}</DownloadProvider></EnvironmentProvider>; }
