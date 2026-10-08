import { approvedRelease } from './download-metrics.mjs';

// Served by Cloudflare Pages for any unknown path, at any depth, so every URL here is root-absolute.
// Static page: no runtime, no config script and no download-click counting.
function DownloadAnchor({ release, className }) {
  return <a className={className} href={release ? release.url : '/#download'} download={release ? '' : undefined} rel={release ? 'noreferrer' : undefined}><span>Download the app</span><span className="cta-arrow" aria-hidden="true">↗</span></a>;
}
export default function NotFound({ config }) {
  const release = approvedRelease(config);
  return <><header className="site-header page-width"><a className="brand" href="/"><img src="/assets/focus-key.svg" alt="" width="30" height="30" /><span>The Remote.</span></a><nav aria-label="Main navigation"><a href="/">Home</a><a href="/guides/">Guides</a><DownloadAnchor release={release} className="text-link" /></nav></header>
    <main id="main" className="guides-main not-found-main page-width" tabIndex={-1}><div className="section-heading"><p className="eyebrow">Error 404</p><h1>Nothing on<br />this channel.</h1><p>The page you’re looking for doesn’t exist.</p></div><div className="guides-download-actions not-found-actions"><DownloadAnchor release={release} className="download-cta" /><a className="text-link" href="/">Home ↗</a><a className="text-link" href="/guides/">Guides ↗</a></div></main>
    <footer className="site-footer page-width"><a className="brand" href="/">The Remote.</a><a href="/privacy/">Privacy policy ↗</a><a href="#top">Back to top ↑</a></footer></>;
}
