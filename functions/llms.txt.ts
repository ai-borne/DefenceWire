/**
 * Cloudflare Pages Function: /llms.txt AI Grounding Spec Endpoint
 * Generates llmstxt.org standard summary with Edge Cache-Tag & 304 revalidation.
 * Hard limit: <= 300 LOC. Target: < 60 LOC.
 */

import { generateLlmsTxt } from '../src/seo/llmsGenerator.js';
import {
  buildEdgeCacheHeaders,
  computeEtag,
  isEtagMatch,
  EDGE_CACHE_TAGS
} from '../src/seo/edgeCache.js';
import { StoryCluster } from '../src/types/news.js';

interface PagesFunctionContext {
  request: Request;
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  let stories: StoryCluster[] = [];

  try {
    const url = new URL(context.request.url);
    const feedRes = await fetch(`${url.origin}/data/news.json`);
    if (feedRes.ok) {
      const data = (await feedRes.json()) as { clusters?: StoryCluster[] };
      if (Array.isArray(data.clusters)) {
        stories = data.clusters;
      }
    }
  } catch {
    // Graceful fallback to static programs & suppliers without live clusters
  }

  const content = generateLlmsTxt({ stories });
  const etag = computeEtag(content);

  const ifNoneMatch = context.request.headers.get('if-none-match');
  const headers = buildEdgeCacheHeaders({
    cacheTags: [EDGE_CACHE_TAGS.LLMS_TXT, EDGE_CACHE_TAGS.AI_GROUNDING],
    etag,
    contentType: 'text/plain; charset=utf-8',
    maxAgeSeconds: 3600,
    sMaxAgeSeconds: 86400,
    staleWhileRevalidateSeconds: 3600
  });

  if (isEtagMatch(ifNoneMatch, etag)) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(content, { status: 200, headers });
}
