/**
 * Cloudflare Pages Function: /story/:id social-crawler prerender.
 * Thin runtime adapter only — all logic lives in the tested, edge-agnostic
 * src/seo/storyPrerenderHandler.ts, which this file wires to the real
 * Fetch API and Cloudflare's context.next() static asset passthrough.
 * Hard limit: <= 300 LOC.
 */

import { handleStoryPrerenderRequest } from '../../src/seo/storyPrerenderHandler.js';
import type { HtmlDocumentResponse, StoryNewsFeed } from '../../src/seo/storyPrerenderHandler.js';

interface PagesFunctionContext {
  request: Request;
  next: () => Promise<Response>;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const result = await handleStoryPrerenderRequest(
    {
      userAgent: context.request.headers.get('user-agent'),
      url: context.request.url
    },
    {
      fetchOriginHtml: async (): Promise<HtmlDocumentResponse> => {
        const originResponse = await context.next();
        return {
          status: originResponse.status,
          headers: headersToRecord(originResponse.headers),
          body: await originResponse.text()
        };
      },
      fetchNewsFeed: async (newsJsonUrl: string): Promise<StoryNewsFeed | null> => {
        const feedResponse = await fetch(newsJsonUrl);
        if (!feedResponse.ok) return null;
        return (await feedResponse.json()) as StoryNewsFeed;
      }
    }
  );

  const headers = new Headers(result.headers);
  headers.delete('content-length');

  return new Response(result.body, { status: result.status, headers });
}
