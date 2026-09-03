/**
 * Cloudflare Edge Cache Tag & Revalidation Engine for DefenceWire.in
 * Manages Cache-Tag headers, deterministic ETags, conditional 304 responses,
 * and Cloudflare Edge Cache purge revalidations.
 * Hard limit: <= 300 LOC.
 */

export const EDGE_CACHE_TAGS = {
  LLMS_TXT: 'dw-llms-txt',
  LLMS_FULL: 'dw-llms-full',
  SITEMAP: 'dw-sitemap',
  NEWS_FEED: 'dw-news-feed',
  SUPPLIERS: 'dw-suppliers',
  PROGRAMS: 'dw-programs',
  AI_GROUNDING: 'dw-ai-grounding'
} as const;

export type EdgeCacheTag = (typeof EDGE_CACHE_TAGS)[keyof typeof EDGE_CACHE_TAGS];

export interface EdgeCacheHeaderOptions {
  cacheTags?: string | string[];
  maxAgeSeconds?: number;
  sMaxAgeSeconds?: number;
  staleWhileRevalidateSeconds?: number;
  etag?: string;
  contentType?: string;
  isPrivate?: boolean;
}

export interface CloudflareZoneConfig {
  zoneId: string;
  apiToken: string;
}

export interface EdgePurgeResult {
  success: boolean;
  purgedTags: string[];
  error?: string;
}

/**
 * Computes a deterministic 64-bit FNV-1a hash with length suffix for synchronous,
 * zero-dependency, cross-platform ETag generation.
 */
export function computeEtag(content: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;

  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ ((code >> 8) | (code << 8)), 0x5bd1e995);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const len = content.length.toString(16);

  return `"${hex1}${hex2}-${len}"`;
}

/**
 * Checks whether an incoming If-None-Match header matches the current ETag.
 * Handles weak validation prefixes (W/) and wildcard (*).
 */
export function isEtagMatch(
  ifNoneMatchHeader: string | null | undefined,
  currentEtag: string
): boolean {
  if (!ifNoneMatchHeader) return false;

  const trimmed = ifNoneMatchHeader.trim();
  if (trimmed === '*') return true;

  const normalize = (tag: string) => tag.trim().replace(/^W\//, '');
  const cleanCurrent = normalize(currentEtag);

  const candidates = trimmed.split(',');
  return candidates.some((candidate) => normalize(candidate) === cleanCurrent);
}

/**
 * Builds standard Cloudflare Edge Cache headers including Cache-Tag, Cache-Control,
 * ETag, and Content-Type.
 */
export function buildEdgeCacheHeaders(options: EdgeCacheHeaderOptions = {}): Record<string, string> {
  const maxAge = options.maxAgeSeconds ?? 3600;
  const sMaxAge = options.sMaxAgeSeconds ?? 86400;
  const swr = options.staleWhileRevalidateSeconds ?? 3600;
  const scope = options.isPrivate ? 'private' : 'public';

  const headers: Record<string, string> = {
    'Content-Type': options.contentType ?? 'text/plain; charset=utf-8',
    'Cache-Control': `${scope}, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
    'X-Robots-Tag': 'all'
  };

  if (options.etag) {
    headers['ETag'] = options.etag;
  }

  if (options.cacheTags) {
    const tags = Array.isArray(options.cacheTags) ? options.cacheTags : [options.cacheTags];
    if (tags.length > 0) {
      headers['Cache-Tag'] = tags.join(',');
    }
  }

  return headers;
}

/**
 * Resolves Cloudflare Zone Config from environment variables.
 */
export function buildZoneConfigFromEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>
): CloudflareZoneConfig | null {
  const zoneId = env.CLOUDFLARE_ZONE_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  if (!zoneId || !apiToken) return null;
  return { zoneId, apiToken };
}

/**
 * Dispatches a Cache-Tag purge request to the Cloudflare Zone Purge API.
 * Fails safely with diagnostic return when unconfigured or on network error.
 */
export async function purgeEdgeCacheByTags(
  tags: string[],
  config: CloudflareZoneConfig | null | undefined,
  deps: { fetchFn?: typeof fetch } = {}
): Promise<EdgePurgeResult> {
  if (!tags || tags.length === 0) {
    return { success: true, purgedTags: [] };
  }

  if (!config || !config.zoneId || !config.apiToken) {
    return {
      success: false,
      purgedTags: [],
      error: 'Cloudflare credentials (CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN) not configured'
    };
  }

  const fetchFn = deps.fetchFn ?? fetch;
  const endpoint = `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/purge_cache`;

  try {
    const res = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tags })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        purgedTags: [],
        error: `Cloudflare purge API returned HTTP ${res.status}: ${errText}`
      };
    }

    return {
      success: true,
      purgedTags: tags
    };
  } catch (err) {
    return {
      success: false,
      purgedTags: [],
      error: `Network error purging edge cache tags: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}
