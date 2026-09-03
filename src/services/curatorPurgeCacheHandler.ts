/**
 * Curator Edge Cache Purge Request Handler for DefenceWire.in
 * Handles authenticated requests to purge Cloudflare Edge Cache by tags.
 * Hard limit: <= 300 LOC.
 */

import {
  purgeEdgeCacheByTags,
  EDGE_CACHE_TAGS
} from '../seo/edgeCache.js';

export const DEFAULT_PURGE_TAGS: readonly string[] = Object.freeze([
  EDGE_CACHE_TAGS.LLMS_TXT,
  EDGE_CACHE_TAGS.LLMS_FULL,
  EDGE_CACHE_TAGS.SITEMAP,
  EDGE_CACHE_TAGS.NEWS_FEED,
  EDGE_CACHE_TAGS.SUPPLIERS,
  EDGE_CACHE_TAGS.PROGRAMS,
  EDGE_CACHE_TAGS.AI_GROUNDING
]);

export interface CuratorPurgeCacheRequest {
  tags?: string[];
}

export interface CuratorPurgeCacheResult {
  success: boolean;
  purgedTags: string[];
  message?: string;
  error?: string;
}

export interface CuratorPurgeCacheEnv {
  CLOUDFLARE_ZONE_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
}

export interface CuratorPurgeCacheDeps {
  fetchFn?: typeof fetch;
}

export async function handleCuratorPurgeCache(
  body: CuratorPurgeCacheRequest | null | undefined,
  env: CuratorPurgeCacheEnv,
  isAuthorized: boolean,
  deps: CuratorPurgeCacheDeps = {}
): Promise<{ status: number; result: CuratorPurgeCacheResult }> {
  if (!isAuthorized) {
    return {
      status: 401,
      result: {
        success: false,
        purgedTags: [],
        error: 'Unauthorized: Valid curator session or Zero Trust identity required'
      }
    };
  }

  const zoneId = env.CLOUDFLARE_ZONE_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;

  if (!zoneId || !apiToken) {
    return {
      status: 503,
      result: {
        success: false,
        purgedTags: [],
        error: 'Cloudflare credentials (CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN) not configured'
      }
    };
  }

  let tagsToPurge = [...DEFAULT_PURGE_TAGS];
  if (body && Array.isArray(body.tags) && body.tags.length > 0) {
    const customTags = body.tags
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t) => t.length > 0);
    if (customTags.length > 0) {
      tagsToPurge = customTags;
    }
  }

  const purgeResult = await purgeEdgeCacheByTags(
    tagsToPurge,
    { zoneId, apiToken },
    { fetchFn: deps.fetchFn }
  );

  if (purgeResult.success) {
    return {
      status: 200,
      result: {
        success: true,
        purgedTags: tagsToPurge,
        message: `Successfully purged ${tagsToPurge.length} edge cache tags.`
      }
    };
  }

  return {
    status: 502,
    result: {
      success: false,
      purgedTags: [],
      error: purgeResult.error ?? 'Edge cache purge failed'
    }
  };
}
