/**
 * Unit Tests for the Story Prerender Orchestration Handler
 * Exercises the edge-agnostic core behind the Cloudflare Pages Function at
 * functions/story/[id].ts via dependency injection, without any Workers runtime.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { handleStoryPrerenderRequest, HtmlDocumentResponse } from '../../src/seo/storyPrerenderHandler.js';

const mockCluster: StoryCluster = {
  id: 'cluster-tejas-mk1a-delivery-2026',
  synthesizedHeadline: 'HAL delivers first batch of upgraded Tejas Mk1A fighters',
  primarySource: {
    id: 'src-pib-tejas-01',
    title: 'HAL Tejas Mk1A Delivery',
    url: 'https://pib.gov.in/news/tejas',
    sourceName: 'PIB MoD',
    sourceDomain: 'pib.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-30T10:00:00Z',
    snippet: 'Equipped with Uttam AESA radar.'
  },
  relatedCoverage: [],
  discussions: [],
  categories: ['airforce'],
  entities: ['Tejas Mk1A'],
  defenceScore: 95,
  isLeadStory: true,
  createdAt: '2026-08-30T10:00:00Z',
  updatedAt: '2026-08-30T10:00:00Z'
};

const originHtml: HtmlDocumentResponse = {
  status: 200,
  headers: { 'content-type': 'text/html' },
  body: '<html><head><title>DefenceWire.in</title></head><body><div id="app"></div></body></html>'
};

function makeDeps(feed: { clusters?: StoryCluster[] } | null = { clusters: [mockCluster] }) {
  return {
    fetchOriginHtml: vi.fn().mockResolvedValue({ ...originHtml }),
    fetchNewsFeed: vi.fn().mockResolvedValue(feed)
  };
}

describe('handleStoryPrerenderRequest', () => {
  it('passes through untouched for ordinary browser user agents', async () => {
    const deps = makeDeps();
    const result = await handleStoryPrerenderRequest(
      { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', url: 'https://www.defencewire.in/story/cluster-tejas-mk1a-delivery-2026' },
      deps
    );

    expect(result.body).toBe(originHtml.body);
    expect(deps.fetchNewsFeed).not.toHaveBeenCalled();
  });

  it('injects story meta tags for a social crawler on a known story', async () => {
    const deps = makeDeps();
    const result = await handleStoryPrerenderRequest(
      { userAgent: 'Twitterbot/1.0', url: 'https://www.defencewire.in/story/cluster-tejas-mk1a-delivery-2026' },
      deps
    );

    expect(result.body).toContain('HAL delivers first batch of upgraded Tejas Mk1A fighters — DefenceWire.in');
    expect(deps.fetchNewsFeed).toHaveBeenCalledWith('https://www.defencewire.in/data/news.json');
  });

  it('injects JSON-LD and semantic article body for AI search crawlers', async () => {
    const deps = makeDeps();
    const result = await handleStoryPrerenderRequest(
      { userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)', url: 'https://www.defencewire.in/story/cluster-tejas-mk1a-delivery-2026' },
      deps
    );

    expect(result.body).toContain('<script type="application/ld+json">');
    expect(result.body).toContain('"@type":"NewsArticle"');
    expect(result.body).toContain('<article class="dw-prerender-story"');
    expect(result.body).toContain('Equipped with Uttam AESA radar.');
    expect(result.body).not.toContain('<div id="app"></div>');
  });

  it('falls back to the original HTML for a crawler on a non-story path', async () => {
    const deps = makeDeps();
    const result = await handleStoryPrerenderRequest(
      { userAgent: 'facebookexternalhit/1.1', url: 'https://www.defencewire.in/' },
      deps
    );

    expect(result.body).toBe(originHtml.body);
    expect(deps.fetchNewsFeed).not.toHaveBeenCalled();
  });

  it('falls back to the original HTML when the crawled story id is unknown', async () => {
    const deps = makeDeps({ clusters: [mockCluster] });
    const result = await handleStoryPrerenderRequest(
      { userAgent: 'Twitterbot/1.0', url: 'https://www.defencewire.in/story/does-not-exist' },
      deps
    );

    expect(result.body).toBe(originHtml.body);
  });

  it('falls back to the original HTML when the news feed is unavailable', async () => {
    const deps = makeDeps(null);
    const result = await handleStoryPrerenderRequest(
      { userAgent: 'Twitterbot/1.0', url: 'https://www.defencewire.in/story/cluster-tejas-mk1a-delivery-2026' },
      deps
    );

    expect(result.body).toBe(originHtml.body);
  });

  it('preserves the origin response status and headers', async () => {
    const deps = makeDeps();
    deps.fetchOriginHtml.mockResolvedValue({ status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: originHtml.body });
    const result = await handleStoryPrerenderRequest(
      { userAgent: 'Twitterbot/1.0', url: 'https://www.defencewire.in/story/cluster-tejas-mk1a-delivery-2026' },
      deps
    );

    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('text/html; charset=utf-8');
  });
});
