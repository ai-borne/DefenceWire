/**
 * Cloudflare Pages Function: /data/news.json
 * Overrides the static public/data/news.json asset once a curator publish
 * has written a live snapshot to the NEWS_LIVE KV namespace, so a "Sync to
 * Cloudflare D1" click is visible on the homepage within seconds instead of
 * waiting for the next hourly crawl to redeploy the static file. Falls
 * through to the static asset (context.next()) when NEWS_LIVE is unbound or
 * no snapshot has ever been published, so nothing regresses before the
 * first publish under this system.
 * Hard limit: <= 300 LOC.
 */

import { EDGE_CACHE_TAGS } from '../../src/seo/edgeCache.js';

interface KVNamespace {
  get: (key: string) => Promise<string | null>;
}

interface PagesFunctionContext {
  env: {
    NEWS_LIVE?: KVNamespace;
  };
  next: () => Promise<Response>;
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const kv = context.env.NEWS_LIVE;
  if (kv) {
    const snapshot = await kv.get('live_snapshot');
    if (snapshot) {
      return new Response(snapshot, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=60',
          'Cache-Tag': EDGE_CACHE_TAGS.NEWS_FEED,
          'X-Content-Type-Options': 'nosniff'
        }
      });
    }
  }

  return context.next();
}
