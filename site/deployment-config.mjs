import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { approvedRelease, playTestingEnabled } from './src/download-metrics.mjs';
export { playTestingEnabled };

export const candidateSiteUrl = 'https://theremote-site.pages.dev/';
export const maximumPagesAssetBytes = 25 * 1024 * 1024;

export function siteUrl(value = candidateSiteUrl) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/' || !/^[a-z0-9.-]+$/i.test(url.hostname)) throw Error('SITE_URL must be an HTTPS origin with no credentials, port, path, query or fragment');
  return url.href;
}

export const playOptInUrl = 'https://play.google.com/apps/testing/com.theremote.app';
export const groupUrlPlaceholder = '__GROUP_URL__';

// The Play-first experience ships only when explicitly enabled AND its links are real.
export function assertPlayTestingReady(config) {
  const play = config?.playTesting;
  if (play === undefined || play === null) return;
  if (typeof play.enabled !== 'boolean') throw Error('playTesting.enabled must be true or false');
  if (!play.enabled) return;
  if (play.optInUrl !== playOptInUrl) throw Error(`playTesting.optInUrl must be ${playOptInUrl}`);
  if (typeof play.groupUrl !== 'string' || play.groupUrl.includes(groupUrlPlaceholder)) throw Error('playTesting.groupUrl still contains the __GROUP_URL__ placeholder; set the real Google Group address before enabling Play testing');
  let url;
  try { url = new URL(play.groupUrl); } catch { throw Error('playTesting.groupUrl must be an absolute HTTPS URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw Error('playTesting.groupUrl must be an absolute HTTPS URL');
}

export function loadConfig() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(new URL('config.js', import.meta.url), 'utf8'), context);
  return context.window.remoteSiteConfig;
}

export function assertPublicationReady(config, verifiedSha = process.env.VERIFIED_APK_SHA256) {
  assertPlayTestingReady(config);
  const apk = approvedRelease(config);
  if (!apk) throw Error('Production publication requires a verified APK release identity');
  if (!Number.isSafeInteger(apk.bytes) || apk.bytes <= 0 || apk.bytes > maximumPagesAssetBytes) throw Error('APK bytes must be a positive integer within the Cloudflare Pages 25 MiB asset limit');
  const url = new URL(apk.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('.apk')) throw Error('Production publication requires a direct HTTPS APK URL');
  if (verifiedSha !== apk.sha256) throw Error('Set VERIFIED_APK_SHA256 to the parent-verified final APK digest before production publication');
}

export function verifyApkAsset(config, { sourceFile = process.env.APK_SOURCE_FILE, verifiedSha = process.env.VERIFIED_APK_SHA256, origin = process.env.SITE_URL } = {}) {
  assertPublicationReady(config, verifiedSha);
  const apk = config.apkRelease;
  const relativePath = `downloads/${apk.sha256}/the-remote-${apk.id}.apk`;
  if (apk.url !== new URL(relativePath, siteUrl(origin)).href) throw Error('APK URL must match the production origin and immutable release asset path');
  if (typeof sourceFile !== 'string' || !sourceFile) throw Error('APK_SOURCE_FILE must point to the independently verified final APK');
  let stat;
  try { stat = fs.lstatSync(sourceFile); } catch { throw Error('Verified APK source file is unavailable'); }
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error('Verified APK source must be a regular file, not a symbolic link');
  if (stat.size !== apk.bytes || stat.size > maximumPagesAssetBytes) throw Error('APK source bytes do not match the verified release or exceed the Pages limit');
  let data;
  try { data = fs.readFileSync(sourceFile); } catch { throw Error('Verified APK source file cannot be read'); }
  if (data.length !== apk.bytes || createHash('sha256').update(data).digest('hex') !== apk.sha256) throw Error('APK source checksum or bytes do not match the verified release');
  return { relativePath, data };
}
