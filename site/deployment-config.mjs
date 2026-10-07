import fs from 'node:fs';
import vm from 'node:vm';
import { approvedRelease } from './src/download-metrics.mjs';

export const candidateSiteUrl = 'https://tvremote-site.pages.dev/';

export function siteUrl(value = candidateSiteUrl) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/' || !/^[a-z0-9.-]+$/i.test(url.hostname)) throw Error('SITE_URL must be an HTTPS origin with no credentials, port, path, query or fragment');
  return url.href;
}

export function loadConfig() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(new URL('config.js', import.meta.url), 'utf8'), context);
  return context.window.remoteSiteConfig;
}

export function assertPublicationReady(config, verifiedSha = process.env.VERIFIED_APK_SHA256) {
  const apk = approvedRelease(config);
  if (!apk) throw Error('Production publication requires a verified APK release identity');
  const url = new URL(apk.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('.apk')) throw Error('Production publication requires a direct HTTPS APK URL');
  if (verifiedSha !== apk.sha256) throw Error('Set VERIFIED_APK_SHA256 to the parent-verified final APK digest before production publication');
}
