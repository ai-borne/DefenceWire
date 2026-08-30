/**
 * Story Prerender Orchestration Handler for DefenceWire.in
 * Edge-agnostic core behind the Cloudflare Pages Function at
 * functions/story/[id].ts. Depends only on injected fetch-shaped callbacks
 * (Dependency Inversion), so it is fully unit-testable without a Workers
 * runtime, and the Pages Function itself stays a thin runtime adapter.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { buildStoryMetaDocument, parseStoryIdFromPath } from './storyMeta.js';
import { injectStoryMetaIntoHtml } from './htmlMetaInjector.js';
import { isSocialMediaCrawler } from './socialCrawlerDetection.js';

export interface HtmlDocumentResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface StoryNewsFeed {
  clusters?: StoryCluster[];
}

export interface StoryPrerenderRequest {
  userAgent: string | null;
  url: string;
}

export interface StoryPrerenderDependencies {
  fetchOriginHtml: () => Promise<HtmlDocumentResponse>;
  fetchNewsFeed: (newsJsonUrl: string) => Promise<StoryNewsFeed | null>;
}

export async function handleStoryPrerenderRequest(
  request: StoryPrerenderRequest,
  deps: StoryPrerenderDependencies
): Promise<HtmlDocumentResponse> {
  if (!isSocialMediaCrawler(request.userAgent)) {
    return deps.fetchOriginHtml();
  }

  const requestUrl = new URL(request.url);
  const clusterId = parseStoryIdFromPath(requestUrl.pathname);
  const originHtml = await deps.fetchOriginHtml();
  if (!clusterId) return originHtml;

  const feed = await deps.fetchNewsFeed(`${requestUrl.origin}/data/news.json`);
  const cluster = feed?.clusters?.find((c) => c.id === clusterId);
  if (!cluster) return originHtml;

  const meta = buildStoryMetaDocument(cluster);
  return {
    ...originHtml,
    body: injectStoryMetaIntoHtml(originHtml.body, meta)
  };
}
