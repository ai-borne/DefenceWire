/**
 * Curator Edge Cache Purge Request Handler for DefenceWire.in
 * Handles authenticated requests to purge Cloudflare Edge Cache by explicit
 * file URL. Purging by Cache-Tag was confirmed non-functional in production
 * (the Cache-Tag response header is stripped zone-wide, likely an
 * Enterprise-plan-only Cloudflare feature) — see EDGE_CACHE_URLS in
 * edgeCache.ts.
 * Hard limit: <= 300 LOC.
 */

import {
  purgeEdgeCacheByUrls,
  EDGE_CACHE_URLS
} from '../seo/edgeCache.js';

export const DEFAULT_PURGE_URLS: readonly string[] = Object.freeze([
  EDGE_CACHE_URLS.LLMS_TXT,
  EDGE_CACHE_URLS.LLMS_FULL,
  EDGE_CACHE_URLS.SITEMAP,
  EDGE_CACHE_URLS.NEWS_FEED
]);

export interface CuratorPurgeCacheRequest {
  urls?: string[];
}

export interface CuratorPurgeCacheResult {
  success: boolean;
  purgedUrls: string[];
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
        purgedUrls: [],
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
        purgedUrls: [],
        error: 'Cloudflare credentials (CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN) not configured'
      }
    };
  }

  let urlsToPurge = [...DEFAULT_PURGE_URLS];
  if (body && Array.isArray(body.urls) && body.urls.length > 0) {
    const customUrls = body.urls
      .map((u) => (typeof u === 'string' ? u.trim() : ''))
      .filter((u) => u.length > 0);
    if (customUrls.length > 0) {
      urlsToPurge = customUrls;
    }
  }

  const purgeResult = await purgeEdgeCacheByUrls(
    urlsToPurge,
    { zoneId, apiToken },
    { fetchFn: deps.fetchFn }
  );

  if (purgeResult.success) {
    return {
      status: 200,
      result: {
        success: true,
        purgedUrls: urlsToPurge,
        message: `Successfully purged ${urlsToPurge.length} edge cache URLs.`
      }
    };
  }

  return {
    status: 502,
    result: {
      success: false,
      purgedUrls: [],
      error: purgeResult.error ?? 'Edge cache purge failed'
    }
  };
}
