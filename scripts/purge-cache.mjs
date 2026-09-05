#!/usr/bin/env node
/**
 * DefenceWire Edge Cache Purge CLI Script
 * Purges Cloudflare Edge Cache by file URL after deployment or on demand.
 * Hard limit: <= 300 LOC.
 */

import { purgeEdgeCacheByUrls, buildZoneConfigFromEnv } from '../src/seo/edgeCache.js';
import { DEFAULT_PURGE_URLS } from '../src/services/curatorPurgeCacheHandler.js';

async function runCachePurge() {
  const config = buildZoneConfigFromEnv(process.env);
  if (!config) {
    console.warn('[EDGE CACHE PURGE] Skipping purge: CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN are not set.');
    return;
  }

  // Parse optional --urls argument (e.g. --urls=https://www.defencewire.in/llms.txt,https://www.defencewire.in/sitemap.xml)
  let urls = [...DEFAULT_PURGE_URLS];
  const urlsArg = process.argv.find((arg) => arg.startsWith('--urls='));
  if (urlsArg) {
    const parsed = urlsArg
      .slice('--urls='.length)
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (parsed.length > 0) {
      urls = parsed;
    }
  }

  console.log(`[EDGE CACHE PURGE] Dispatching purge for ${urls.length} URLs on zone ${config.zoneId}...`);
  const result = await purgeEdgeCacheByUrls(urls, config);

  if (result.success) {
    console.log(`[EDGE CACHE PURGE SUCCESS] Purged URLs: ${result.purgedTargets.join(', ')}`);
  } else {
    console.error(`[EDGE CACHE PURGE ERROR] ${result.error || 'Unknown error'}`);
    process.exitCode = 1;
  }
}

runCachePurge().catch((err) => {
  console.error('[EDGE CACHE PURGE FATAL]', err);
  process.exitCode = 1;
});
