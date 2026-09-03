#!/usr/bin/env node
/**
 * DefenceWire Edge Cache Purge CLI Script
 * Purges Cloudflare Edge Cache by tags after deployment or on demand.
 * Hard limit: <= 300 LOC.
 */

import { purgeEdgeCacheByTags, buildZoneConfigFromEnv } from '../src/seo/edgeCache.js';
import { DEFAULT_PURGE_TAGS } from '../src/services/curatorPurgeCacheHandler.js';

async function runCachePurge() {
  const config = buildZoneConfigFromEnv(process.env);
  if (!config) {
    console.warn('[EDGE CACHE PURGE] Skipping purge: CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN are not set.');
    return;
  }

  // Parse optional --tags argument (e.g. --tags=dw-llms-txt,dw-sitemap)
  let tags = [...DEFAULT_PURGE_TAGS];
  const tagsArg = process.argv.find((arg) => arg.startsWith('--tags='));
  if (tagsArg) {
    const parsed = tagsArg
      .slice('--tags='.length)
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (parsed.length > 0) {
      tags = parsed;
    }
  }

  console.log(`[EDGE CACHE PURGE] Dispatching purge for ${tags.length} tags on zone ${config.zoneId}...`);
  const result = await purgeEdgeCacheByTags(tags, config);

  if (result.success) {
    console.log(`[EDGE CACHE PURGE SUCCESS] Purged tags: ${result.purgedTags.join(', ')}`);
  } else {
    console.error(`[EDGE CACHE PURGE ERROR] ${result.error || 'Unknown error'}`);
    process.exitCode = 1;
  }
}

runCachePurge().catch((err) => {
  console.error('[EDGE CACHE PURGE FATAL]', err);
  process.exitCode = 1;
});
