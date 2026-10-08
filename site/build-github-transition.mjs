import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import articles from './src/guides.json' with { type: 'json' };
import { assertPublicationReady, loadConfig, siteUrl } from './deployment-config.mjs';

assertPublicationReady(loadConfig());
const canonical = siteUrl(process.env.SITE_URL);
const output = fileURLToPath(new URL('../_site/', import.meta.url));
await fs.mkdir(output, { recursive: true });
if ((await fs.readdir(output)).length) throw Error('Transition staging directory must be empty');
const routes = ['', 'privacy/', 'guides/', ...articles.map(article => `guides/${article.slug}/`), 'previews/centered-story-20261006/'];
for (const route of routes) {
  const destination = canonical + (route.startsWith('previews/') ? '' : route);
  const directory = path.join(output, route);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>The Remote has moved</title><link rel="canonical" href="${destination}"><meta http-equiv="refresh" content="0; url=${destination}"></head><body><main><h1>The Remote has moved</h1><p><a href="${destination}">Continue to The Remote</a></p></main></body></html>\n`);
}
await fs.writeFile(path.join(output, '404.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>The Remote has moved</title><link rel="canonical" href="${canonical}"></head><body><main><h1>The Remote has moved</h1><p><a href="${canonical}">Continue to The Remote</a></p></main></body></html>\n`);
console.log('Staged GitHub Pages transition with canonical links and refresh fallbacks; no analytics or signup code.');
