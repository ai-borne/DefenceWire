import { describe, expect, it } from 'vitest';
import { hydratePublishedTopics } from '../../crawler/publicTopicProjection.js';
import { SourceTier } from '../../src/types/source.js';
import { StoryCluster } from '../../src/types/news.js';

const cluster: StoryCluster = { id: 'cluster-a', synthesizedHeadline: 'India watches LAC', primarySource: { id: 'article-a', title: 'India watches LAC', url: 'https://example.test/a', sourceName: 'Example', sourceDomain: 'example.test', tier: SourceTier.TIER_1_OFFICIAL, publishedAt: '2026-09-13T00:00:00Z' }, relatedCoverage: [], discussions: [], categories: ['strategic'], entities: [], primaryTag: '#Legacy', hashtags: ['#Legacy'], defenceScore: 1, isLeadStory: false, createdAt: '2026-09-13T00:00:00Z', updatedAt: '2026-09-13T00:00:00Z' };
const config = { accountId: 'account', databaseId: 'database', apiToken: 'token' };

describe('published topic feed projection', () => {
  it('uses only active published cluster_topics and deterministically derives compatibility hashtags', async () => {
    const fetchFn = async () => new Response(JSON.stringify({ success: true, result: [{ success: true, results: [
      { cluster_id: 'cluster-a', id: 'india', display_name: 'India', display_hashtag: '#India', topic_type: 'country', description: null, registry_version: 3, display_priority: 9 },
      { cluster_id: 'cluster-a', id: 'lac', display_name: 'LAC', display_hashtag: '#LAC', topic_type: 'location', description: null, registry_version: 3, display_priority: 4 }
    ] }] }));
    const [projected] = await hydratePublishedTopics([cluster], config, fetchFn as typeof fetch);
    expect(projected?.canonicalTopics?.map((topic) => topic.id)).toEqual(['india', 'lac']);
    expect(projected?.hashtags).toEqual(['#India', '#LAC']);
    expect(projected?.primaryTag).toBe('#India');
  });

  it('fails loud instead of publishing an unverified fallback when the registry read fails', async () => {
    await expect(hydratePublishedTopics([cluster], config, (async () => new Response('no', { status: 503 })) as typeof fetch))
      .rejects.toThrow('Published topic projection failed');
  });
});
