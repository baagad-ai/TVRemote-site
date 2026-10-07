import { Fragment } from 'react';
import articles from './guides.json';
import { DownloadLink } from './Download';
const bySlug = Object.fromEntries(articles.map(article => [article.slug, article]));
function inline(text, key = '') {
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;
  const pieces = []; let position = 0;
  for (const match of text.matchAll(pattern)) {
    pieces.push(text.slice(position, match.index));
    if (match[2]) {
      let href = match[3];
      if (href.startsWith('https://baagad-ai.github.io/TVRemote-site/')) href = '../../' + href.slice('https://baagad-ai.github.io/TVRemote-site/'.length);
      pieces.push(href === '../../#download' ? <DownloadLink key={key + match.index} button="guide" className="article-download-link" fallback={href} /> : /^https:\/\//.test(href) || href.startsWith('../../') ? <a key={key + match.index} href={href}>{match[2]}</a> : match[2]);
    } else if (match[4]) pieces.push(<strong key={key + match.index}>{match[4]}</strong>);
    else pieces.push(<code key={key + match.index}>{match[5]}</code>);
    position = match.index + match[0].length;
  }
  pieces.push(text.slice(position)); return pieces;
}
function ArticleBody({ body }) {
  const blocks = body.trim().replace(/^# [^\r\n]+\r?\n/, '').trim().split(/\r?\n\s*\r?\n/);
  return blocks.map((block, index) => {
    const heading = block.match(/^(#{2,3})\s+(.+)$/), lines = block.split(/\r?\n/);
    if (heading) { const Tag = heading[1].length === 2 ? 'h2' : 'h3'; return <Tag key={index} id={`section-${index}`}>{inline(heading[2], String(index))}</Tag>; }
    if (lines.every(line => /^\d+\. /.test(line))) return <ol key={index}>{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\d+\. /, ''), `${index}-${i}`)}</li>)}</ol>;
    if (lines.every(line => /^- /.test(line))) return <ul key={index}>{lines.map((line, i) => <li key={i}>{inline(line.slice(2), `${index}-${i}`)}</li>)}</ul>;
    return <p key={index}>{inline(lines.join(' '), String(index))}</p>;
  });
}
function Card({ article, index, prefix = '' }) { return <a className="guide-card" href={`${prefix}${article.slug}/`}><span className="eyebrow">{String(index + 1).padStart(2, '0')} / {article.readMinutes} min read</span><h3>{article.title}</h3><p>{article.summary}</p><span className="guide-card-arrow" aria-hidden="true">↗</span></a>; }
export function GuidesPreview() { return <section className="guides-preview page-width" id="guides" aria-labelledby="guides-title"><div className="guides-heading"><div><p className="eyebrow">When the TV needs a hand</p><h2 id="guides-title">Less guesswork.<br /><em>More watching.</em></h2></div><a className="text-link" href="guides/">All six guides ↗</a></div><div className="guide-grid">{[articles[1], articles[2], articles[5]].map((article, i) => <Card key={article.slug} article={article} index={i} prefix="guides/" />)}</div></section>; }
export function GuidesPage({ slug }) {
  const article = bySlug[slug], prefix = article ? '../../' : '../';
  return <><header className="site-header page-width"><a className="brand" href={prefix}><img src={`${prefix}assets/focus-key.svg`} alt="" width="30" height="30" /><span>The Remote.</span></a><nav aria-label="Main navigation"><a href={prefix}>Home</a><a href={article ? '../' : '#main'}>Guides</a><DownloadLink button="nav" className="text-link" fallback={`${prefix}#download`} /></nav></header><main id="main" className={article ? 'article-main page-width' : 'guides-main page-width'} tabIndex={-1}>{article ? <><nav className="breadcrumbs" aria-label="Breadcrumb"><a href={prefix}>Home</a><span aria-hidden="true">/</span><a href="../">Guides</a></nav><article><header className="article-header"><p className="eyebrow">A practical guide / {article.readMinutes} min read</p><h1>{article.title}</h1><p className="article-meta">By The Remote · Sources reviewed 4 October 2026</p></header><div className="article-body"><ArticleBody body={article.body} /></div></article><aside className="related-guides" aria-labelledby="related-title"><p className="eyebrow">Keep going</p><h2 id="related-title">Next useful read.</h2><div className="guide-grid">{article.related.map((slug, i) => <Card key={slug} article={bySlug[slug]} index={i} prefix="../" />)}</div></aside></> : <><div className="section-heading"><p className="eyebrow">Setup, search, and the stuck bits</p><h1>Get back<br />to watching.</h1><p>Six practical guides for Android TV and Google TV. Start with the problem in front of you.</p></div><div className="guide-grid">{articles.map((article, i) => <Card key={article.slug} article={article} index={i} />)}</div><div className="guides-download"><h2>Want another remote option?</h2><p>The Remote is a free Android phone app for compatible TVs. Download the available Android APK directly and check its version before installing. No signup is needed.</p><DownloadLink button="guide" fallback="../#download" /><a className="text-link" href="../#compatibility">Check your TV ↗</a></div></>}</main><footer className="site-footer page-width"><a className="brand" href={prefix}>The Remote.</a><p>A free phone remote for compatible Android TV + Google TV.</p><a href={`${prefix}privacy/`}>Privacy policy ↗</a><a href="#top">Back to top ↑</a></footer></>;
}
