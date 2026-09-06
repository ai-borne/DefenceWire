/**
 * Cloudflare Pages Function: /data/news.json
 * Serves a curator publish's live snapshot from the NEWS_LIVE KV namespace
 * so a "Sync to Cloudflare D1" click is visible on the homepage within
 * seconds — but only while it is actually newer than the static
 * public/data/news.json asset the hourly crawl just redeployed. Freshness
 * is compared by generatedAt (see liveSnapshotFreshness.ts, the SSOT for
 * this rule) so a publish never permanently shadows every crawl after it.
 * Falls through to the static asset (context.next()) whenever NEWS_LIVE is
 * unbound, empty, or loses that comparison.
 * Hard limit: <= 300 LOC.
 */

import { EDGE_CACHE_TAGS } from '../../src/seo/edgeCache.js';
import { pickFresherSnapshot } from '../../src/services/liveSnapshotFreshness.js';

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
  const [kvSnapshot, staticResponse] = await Promise.all([
    kv ? kv.get('live_snapshot') : Promise.resolve(null),
    context.next()
  ]);

  if (!kvSnapshot) {
    return staticResponse;
  }

  const staticJson = staticResponse.ok ? await staticResponse.clone().text() : null;
  const winner = pickFresherSnapshot({ json: kvSnapshot }, { json: staticJson });

  if (!winner || winner.source === 'static') {
    return staticResponse;
  }

  return new Response(winner.json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=60',
      'Cache-Tag': EDGE_CACHE_TAGS.NEWS_FEED,
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
