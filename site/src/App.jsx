import { useEffect, useRef, useState } from 'react';
import { EnvironmentProvider, useEnvironment } from './environment';
import { DownloadLink, DownloadProvider, useRelease } from './Download';
import DownloadFinale from './b/Download';
import Privacy from './Privacy';
import NotFound from './NotFound';
import { GuidesPage, GuidesPreview } from './Guides';
import faq from './faq.json';
import SmoothScroll from './SmoothScroll';
import Hero from './b/Hero';
import PinStory from './b/PinStory';
import BTrackpad from './b/Trackpad';
import BetaJoin from './b/BetaJoin';
import { Rooms, Guests as BGuests, Gallery, Proof, ProofMarquee, TypeSplit, Closing as BClosing, TRADEMARK } from './b/Sections';

export function Header({ privacy = false }) {
  return <header className="site-header page-width"><a className="brand" href={privacy ? '../' : '#top'} aria-label="The Remote, home"><img src={`${privacy ? '../' : ''}assets/focus-key.svg`} alt="" width="32" height="32" /><span>The Remote<span className="brand-period">.</span></span></a><nav aria-label="Main navigation">{privacy ? <a data-track="nav" href="../">Home ↗</a> : <><a data-track="nav" href="#search-proof">How it works</a><a data-track="nav" href="#inside">Your rooms</a><a data-track="nav" href="#guests">Guests</a><a data-track="nav" href="#trackpad">Trackpad</a><a data-track="nav" href="#compatibility">Will it work?</a><a data-track="nav" href="guides/">Guides</a></>}</nav>{!privacy && <DownloadLink button="nav" className="header-cta b-pill"><span className="b-hide-m">Download the app</span><span className="b-show-m">Download</span></DownloadLink>}</header>;
}
export function Footer({ privacy = false }) {
  const release = useRelease(); // PM 23:41 option 1: one footer line with the full APK SHA-256 (Design spec)
  return <footer className="site-footer page-width"><a className="brand" href={privacy ? '../' : '#top'}><img src={`${privacy ? '../' : ''}assets/focus-key.svg`} alt="" width="28" height="28" loading="lazy" decoding="async" /><span>The Remote.</span></a><a href={privacy ? '../' : 'privacy/'}>{privacy ? 'Back to home' : 'Privacy policy'} ↗</a><a href="#top">Back to top ↑</a><p className="footer-trademark">{TRADEMARK}</p>{!privacy && release?.sha256 && <p className="footer-sha">APK SHA-256 <code>{release.sha256}</code></p>}</footer>;
}
// FAQ (board 09b): the board's four questions first; every other answer stays on the page (and in the FAQPage schema)
// under one "More questions" toggle. Tracking ids keep each item's faq.json position.
const BOARD_FAQ = ['Is The Remote really free?', 'Which TVs does it work with?', 'Do guests need my phone?', 'Does it keep my searches?'];
const faqItem = item => { const i = faq.indexOf(item); return <details key={item.q} data-track="faq-open" data-track-item={`faq-${String(i + 1).padStart(2, '0')}`}><summary>{item.q}</summary><p>{item.a}</p></details>; };
function Questions() {
  const top = BOARD_FAQ.map(q => faq.find(item => item.q === q)), rest = faq.filter(item => !top.includes(item));
  return <section className="questions-section page-width" id="faq" aria-labelledby="faq-title"><div><p className="b-eyebrow"><span className="b-dot" aria-hidden="true" />Questions, answered</p><h2 id="faq-title">Free, no sign-up, installs from this site.</h2></div><div className="faq-list">{top.map(faqItem)}<details className="faq-more"><summary>More questions</summary><div className="faq-more-list">{rest.map(faqItem)}</div></details></div></section>;
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
  return <div ref={ref} className={`mobile-cta-bar ${visible ? 'is-visible' : ''}`} data-mobile-cta-bar aria-hidden={!visible} inert={!visible}><DownloadLink button="footer" /><span>Free Android APK. No ads. No sign-up.</span></div>;
}
// Concept B "Living Room" (approved 16 Oct 2026): hero -> the single pin -> trackpad bento -> rooms -> guests ->
// gallery -> proof band -> type split -> download, guides, FAQ, lime close. The earlier landing sections stay in
// the repo (PhoneStory, PinnedStory, Guests, Trackpad, ControlsProof) but are not rendered.
// Design 22:41 (mobile plan §8, under 900 px): every section heading gets a word-split reveal and every paragraph a
// ScrollReveal-style rise (opacity .2 -> 1), once on entry; the footer fades up. Headings that already animate (hero
// BlurText, "Will it work?" BlurText, the pin's SplitText titles) and copy inside ScrollReveal / the guest cards are
// skipped. Static text nodes only (React never re-renders them). Reduced motion / Save-Data: nothing changes.
function useEntryReveal() {
  const { ready, motion } = useEnvironment();
  useEffect(() => {
    const save = Boolean(navigator.connection?.saveData); document.documentElement.classList.toggle('is-save-data', save);
    if (!ready || !motion || save || !matchMedia('(max-width: 899px)').matches) return;
    const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { e.target.classList.add('is-rv-in'); io.unobserve(e.target); } }, { threshold: .2, rootMargin: '0px 0px -8% 0px' });
    for (const h of document.querySelectorAll('main h2:not([style]):not([data-rv])')) {
      h.dataset.rv = '1'; let i = 0;
      const walk = n => { for (const c of [...n.childNodes]) { if (c.nodeType === 3 && c.textContent.trim()) { const f = document.createDocumentFragment(); for (const part of c.textContent.split(/(\s+)/)) { if (!part) continue; if (/^\s+$/.test(part)) f.append(part); else { const w = document.createElement('span'); w.className = 'rv-w'; w.style.setProperty('--i', i++); w.textContent = part; f.append(w); } } c.replaceWith(f); } else if (c.nodeType === 1 && !c.classList.contains('sr-only')) walk(c); } };
      walk(h); io.observe(h);
    }
    for (const p of document.querySelectorAll('main .b-lede, main .b-small, main .b-closing-fine, main .questions-section > div > p:not(.b-eyebrow), main .download-intro p')) {
      if (p.closest('.b-reveal, .b-guest-card, .b-hero, .b-closing, details') || p.dataset.rv) continue; p.dataset.rv = '1'; p.classList.add('rv-p'); io.observe(p);
    }
    const f = document.querySelector('.site-footer'); if (f) { f.classList.add('rv-f'); io.observe(f); }
    return () => io.disconnect();
  }, [ready, motion]);
}
// PM 23:31: Will it work? and every grain parent get .is-off while off-screen, so their CSS loops pause (like the marquee).
function useOffscreenPause() {
  const { ready } = useEnvironment();
  useEffect(() => {
    if (!ready) return;
    const io = new IntersectionObserver(es => { for (const e of es) e.target.classList.toggle('is-off', !e.isIntersecting); });
    const nodes = new Set([...document.querySelectorAll('.b-split')]); document.querySelectorAll('.b-grain').forEach(g => g.parentElement && nodes.add(g.parentElement));
    nodes.forEach(n => io.observe(n)); return () => io.disconnect();
  }, [ready]);
}
function Landing({ config }) { useEntryReveal(); useOffscreenPause(); return <><Header /><main id="main" tabIndex={-1}><Hero /><BetaJoin /><ProofMarquee /><PinStory /><BTrackpad /><Rooms /><BGuests /><Gallery /><Proof /><TypeSplit /><DownloadFinale /><GuidesPreview /><Questions /><BClosing /></main><Footer /><MobileCta /></>; }
export default function App({ route = 'landing', config }) { return <EnvironmentProvider><SmoothScroll /><DownloadProvider config={config}><a className="skip-link" href="#main">Skip to content</a>{route === 'not-found' ? <NotFound config={config} /> : route === 'privacy' ? <Privacy /> : route.startsWith('guides') ? <GuidesPage slug={route.split('/')[1]} /> : <Landing config={config} />}</DownloadProvider></EnvironmentProvider>; }
