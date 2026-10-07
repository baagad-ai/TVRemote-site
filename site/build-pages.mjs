import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertPublicationReady, loadConfig, siteUrl } from './deployment-config.mjs';

siteUrl(process.env.SITE_URL);
const production = process.argv.includes('--production') || process.env.CF_PAGES_BRANCH === (process.env.PAGES_PRODUCTION_BRANCH || 'main');
if (production) assertPublicationReady(loadConfig());
const repo = fileURLToPath(new URL('..', import.meta.url));
for (const args of [['site/build-react.mjs'], ['site/check.mjs'], ['site/check-config.mjs'], ['site/stage.mjs', '_site'], ['site/build.mjs', '_site']]) {
  const result = spawnSync(process.execPath, args, { cwd: repo, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
