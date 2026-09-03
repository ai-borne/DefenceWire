/**
 * Cloudflare Pages Function: /api/curator/purge-cache
 * Authenticated endpoint for on-demand Edge Cache-Tag invalidation.
 * Hard limit: <= 300 LOC. Target: < 60 LOC.
 */

import { handleCuratorPurgeCache, CuratorPurgeCacheRequest } from '../../../src/services/curatorPurgeCacheHandler.js';
import { verifyCuratorAuthorization } from '../../../src/services/curatorAuthHandler.js';

interface PagesFunctionContext {
  request: Request;
  env: {
    CLOUDFLARE_ZONE_ID?: string;
    CLOUDFLARE_API_TOKEN?: string;
    CURATOR_SESSION_SECRET?: string;
    CURATOR_SESSION_EPOCH?: string;
  };
}

export async function onRequestPost(context: PagesFunctionContext): Promise<Response> {
  const cookieHeader = context.request.headers.get('cookie');
  const secret = context.env.CURATOR_SESSION_SECRET;
  const epoch = context.env.CURATOR_SESSION_EPOCH;

  const authContext = await verifyCuratorAuthorization(
    context.request.headers,
    cookieHeader,
    secret,
    undefined,
    globalThis.fetch,
    epoch
  );

  let body: CuratorPurgeCacheRequest | null = null;
  try {
    const text = await context.request.text();
    if (text.trim().length > 0) {
      body = JSON.parse(text) as CuratorPurgeCacheRequest;
    }
  } catch {
    // Malformed body falls back to default tags
  }

  const zoneId = context.env.CLOUDFLARE_ZONE_ID ?? (typeof process !== 'undefined' ? process.env?.CLOUDFLARE_ZONE_ID : undefined);
  const apiToken = context.env.CLOUDFLARE_API_TOKEN ?? (typeof process !== 'undefined' ? process.env?.CLOUDFLARE_API_TOKEN : undefined);

  const { status, result } = await handleCuratorPurgeCache(
    body,
    { CLOUDFLARE_ZONE_ID: zoneId, CLOUDFLARE_API_TOKEN: apiToken },
    authContext.authorized,
    { fetchFn: globalThis.fetch }
  );

  return Response.json(result, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
