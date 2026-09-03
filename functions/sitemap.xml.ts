/**
 * Cloudflare Pages Function: Dynamic XML Sitemap Endpoint (/sitemap.xml)
 * Returns a search-engine compliant XML sitemap covering all programs,
 * verified suppliers, and live stories with edge cache headers.
 * Hard limit: <= 300 LOC. Target: < 50 LOC.
 */

import { generateSitemapXml } from '../src/seo/sitemapGenerator.js';
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

  const xml = generateSitemapXml(stories);

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'all'
    }
  });
}
