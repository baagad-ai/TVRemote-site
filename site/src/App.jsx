import { useEffect, useRef, useState } from 'react';
import { EnvironmentProvider, useEnvironment } from './environment';
import { DownloadLink, DownloadProvider } from './Download';
import DownloadFinale from './b/Download';
import Privacy from './Privacy';
import NotFound from './NotFound';
import { GuidesPage, GuidesPreview } from './Guides';
import faq from './faq.json';
import SmoothScroll from './SmoothScroll';
import Hero from './b/Hero';
import PinStory from './b/PinStory';
import BTrackpad from './b/Trackpad';
import { Rooms, Guests as BGuests, Gallery, Proof, TypeSplit, Closing as BClosing, TRADEMARK } from './b/Sections';

export function Header({ privacy = false }) {
  return <header className="site-header page-width"><a className="brand" href={privacy ? '../' : '#top'} aria-label="The Remote, home"><img src={`${privacy ? '../' : ''}assets/focus-key.svg`} alt="" width="32" height="32" /><span>The Remote<span className="brand-period">.</span></span></a><nav aria-label="Main navigation">{privacy ? <a data-track="nav" href="../">Home ↗</a> : <><a data-track="nav" href="#search-proof">How it works</a><a data-track="nav" href="#inside">Your rooms</a><a data-track="nav" href="#guests">Guests</a><a data-track="nav" href="#trackpad">Trackpad</a><a data-track="nav" href="#compatibility">Will it work?</a><a data-track="nav" href="guides/">Guides</a></>}</nav>{!privacy && <DownloadLink button="nav" className="header-cta b-pill"><span className="b-hide-m">Download the app</span><span className="b-show-m">Download</span></DownloadLink>}</header>;
}
export function Footer({ privacy = false }) {
  return <footer className="site-footer page-width"><a className="brand" href={privacy ? '../' : '#top'}><img src={`${privacy ? '../' : ''}assets/focus-key.svg`} alt="" width="28" height="28" loading="lazy" decoding="async" /><span>The Remote.</span></a><a href={privacy ? '../' : 'privacy/'}>{privacy ? 'Back to home' : 'Privacy policy'} ↗</a><a href="#top">Back to top ↑</a><p className="footer-trademark">{TRADEMARK}</p></footer>;
}
function Questions() {
  return <section className="questions-section page-width" id="faq" aria-labelledby="faq-title"><div><p className="b-eyebrow"><span className="b-dot" aria-hidden="true" />Questions, answered</p><h2 id="faq-title">Free, no account, <em>installs from this site.</em></h2></div><div className="faq-list">{faq.map((item, i) => <details key={item.q} data-track="faq-open" data-track-item={`faq-${String(i + 1).padStart(2, '0')}`}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div></section>;
}
function MobileCta() {
  const ref = useRef(null), [visible, setVisible] = useState(false), { ready } = useEnvironment();
  useEffect(() => {
    if (!ready) return;
    const bar = ref.current, inline = [...document.querySelectorAll('[data-download-cta]')].filter(node => !bar.contains(node));
    const evidence = [...document.querySelectorAll('.b-hero')];
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
  return <div ref={ref} className={`mobile-cta-bar ${visible ? 'is-visible' : ''}`} data-mobile-cta-bar aria-hidden={!visible} inert={!visible}><DownloadLink button="footer" /><span>Free Android APK. No ads. No account.</span></div>;
}
// Concept B "Living Room" (approved 16 Oct 2026): hero -> the single pin -> trackpad bento -> rooms -> guests ->
// gallery -> proof band -> type split -> download, guides, FAQ, lime close. The earlier landing sections stay in
// the repo (PhoneStory, PinnedStory, Guests, Trackpad, ControlsProof) but are not rendered.
function Landing({ config }) { return <><Header /><main id="main" tabIndex={-1}><Hero /><PinStory /><BTrackpad /><Rooms /><BGuests /><Gallery /><Proof /><TypeSplit /><DownloadFinale /><GuidesPreview /><Questions /><BClosing /></main><Footer /><MobileCta /></>; }
export default function App({ route = 'landing', config }) { return <EnvironmentProvider><SmoothScroll /><DownloadProvider config={config}><a className="skip-link" href="#main">Skip to content</a>{route === 'not-found' ? <NotFound config={config} /> : route === 'privacy' ? <Privacy /> : route.startsWith('guides') ? <GuidesPage slug={route.split('/')[1]} /> : <Landing config={config} />}</DownloadProvider></EnvironmentProvider>; }
