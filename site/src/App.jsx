import { useEffect, useRef, useState } from 'react';
import { EnvironmentProvider, useEnvironment } from './environment';
import PhoneStory, { ControlsProof } from './PhoneStory';
import Destination from './Destination';
import Beta from './Beta';
import Privacy from './Privacy';
import { GuidesPage, GuidesPreview } from './Guides';

export function Header({ privacy = false }) {
  return <header className="site-header page-width"><a className="brand" href={privacy ? '../' : '#top'} aria-label="The Remote, home"><img src={`${privacy ? '../' : ''}assets/focus-key.svg`} alt="" width="32" height="32" /><span>The Remote<span className="brand-period">.</span></span></a><nav aria-label="Main navigation">{privacy ? <a href="../">Home ↗</a> : <><a href="#search-proof">How it works</a><a href="#inside">Your rooms</a><a href="#compatibility">Will it work?</a><a href="guides/">Guides</a></>}</nav>{!privacy && <a className="header-cta text-link" href="#beta-enrollment" data-beta-cta>Request beta access</a>}</header>;
}
function Cta({ className = '', children = 'Request beta access' }) {
  return <a className={`beta-cta ${className}`} href="#beta-enrollment" data-beta-cta aria-controls="beta-enrollment"><span>{children}</span><span aria-hidden="true">↗</span></a>;
}
export function Footer({ privacy = false }) {
  return <footer className="site-footer page-width"><a className="brand" href={privacy ? '../' : '#top'}><img src={`${privacy ? '../' : ''}assets/focus-key.svg`} alt="" width="28" height="28" /><span>The Remote.</span></a><p>A free phone remote.<br />Compatible Android TV + Google TV.</p><a href={privacy ? '../' : 'privacy/'}>{privacy ? 'Back to home' : 'Privacy policy'} ↗</a><a href="#top">Back to top ↑</a></footer>;
}
function Compatibility() {
  return <section className="compatibility-section page-width" id="compatibility" aria-labelledby="compatibility-title"><div><p className="eyebrow">Before you pair</p><h2 id="compatibility-title">Pick your TV.<br /><em>Pair locally.</em></h2></div><div className="compatibility-copy"><p>The Remote pairs on your home network with compatible Android TV and Google TV devices. Android TV Remote Service v2 is required.</p><p>Controls vary by TV model. YouTube search also depends on the TV's YouTube version. Other supported app searches may need the optional TV companion.</p><div className="privacy-note"><span aria-hidden="true">⌁</span><p>No app account. No developer cloud relay for remote commands. Your search history isn't saved by The Remote.</p></div><a className="text-link" href="privacy/">How your data is handled ↗</a></div></section>;
}
function Questions() {
  return <section className="questions-section page-width" id="faq" aria-labelledby="faq-title"><div><p className="eyebrow">A few good questions</p><h2 id="faq-title">Before the<br />first click.</h2></div><div className="faq-list"><details><summary>Which TVs does it work with?</summary><p>Compatible Android TV and Google TV devices with Android TV Remote Service v2. Available controls vary by model.</p></details><details><summary>Do I need the TV companion?</summary><p>Not for YouTube search. The phone sends a search link directly to your selected TV over your home network. The TV and its YouTube version decide whether it works. Other supported app searches can use the optional TV companion.</p></details><details><summary>Where does my search go?</summary><p>To the TV you picked, over your local network. YouTube may process the search link under its own privacy policy. The Remote doesn't keep a search history.</p></details><details><summary>Is the app free?</summary><p>Yes. No ads, in-app purchases, or subscription. You don't need a The Remote app account.</p></details><details><summary>Does a beta request give me access?</summary><p>It sends your email for private review. If approved, you'll receive a manual Google Play invitation. Accept that invitation before installing. <a href="#beta-enrollment">Request beta access</a>.</p></details></div></section>;
}
function Closing() {
  return <section className="closing-section"><div className="page-width"><p className="eyebrow">Ready when you are</p><h2>A better remote.<br />Already in your pocket.</h2><Cta /><p className="fine-print">Free app. Private beta review. Manual Play invitations.</p></div></section>;
}
function MobileCta() {
  const ref = useRef(null), [visible, setVisible] = useState(false), { ready } = useEnvironment();
  useEffect(() => {
    if (!ready) return;
    const bar = ref.current, inline = [...document.querySelectorAll('[data-beta-cta]')].filter(node => !bar.contains(node));
    const evidence = [...document.querySelectorAll('.story-chapter,.controls-proof')];
    const panel = document.querySelector('#beta-enrollment'), narrow = matchMedia('(max-width: 740px)');
    const intersects = node => { const r = node.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < (visualViewport?.height || innerHeight); };
    const update = () => {
      const focused = panel.contains(document.activeElement), keyboard = visualViewport && visualViewport.height < innerHeight * .75;
      const next = narrow.matches && !focused && !keyboard && !intersects(panel) && !inline.some(intersects) && !evidence.some(intersects);
      if (!next && bar.contains(document.activeElement)) (inline.find(intersects) || panel.querySelector('[data-request-result]:not([hidden]) [data-register-another], form:not([hidden]) input[type=email]:not(:disabled)') || panel.querySelector('h2')).focus({ preventScroll: true });
      setVisible(next);
    };
    const observer = new IntersectionObserver(update); [...inline, panel, ...evidence].forEach(node => observer.observe(node));
    const resize = new ResizeObserver(update); resize.observe(panel);
    const reserve = new ResizeObserver(() => document.documentElement.style.setProperty('--mobile-cta-height', `${bar.offsetHeight}px`)); reserve.observe(bar);
    document.addEventListener('focusin', update); document.addEventListener('focusout', update); window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); visualViewport?.addEventListener('resize', update); narrow.addEventListener('change', update); update();
    return () => { observer.disconnect(); resize.disconnect(); reserve.disconnect(); document.removeEventListener('focusin', update); document.removeEventListener('focusout', update); window.removeEventListener('scroll', update); window.removeEventListener('resize', update); visualViewport?.removeEventListener('resize', update); narrow.removeEventListener('change', update); };
  }, [ready]);
  return <div ref={ref} className={`mobile-cta-bar ${visible ? 'is-visible' : ''}`} data-mobile-cta-bar aria-hidden={!visible} inert={!visible}><Cta /><span>Free app. Private beta review.</span></div>;
}
function Landing({ config }) { return <><Header /><main id="main" tabIndex={-1}><PhoneStory Destination={Destination} /><ControlsProof /><Compatibility /><Beta config={config} /><GuidesPreview /><Questions /><Closing /></main><Footer /><MobileCta /></>; }
export default function App({ route = 'landing', config }) { return <EnvironmentProvider><a className="skip-link" href="#main">Skip to content</a>{route === 'privacy' ? <Privacy /> : route.startsWith('guides') ? <GuidesPage slug={route.split('/')[1]} /> : <Landing config={config} />}</EnvironmentProvider>; }
