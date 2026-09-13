import { describe, expect, it, vi } from 'vitest';
import {
  findSourceArticle, findStoryCluster, resolveClusterRedirect
} from '../../src/services/durableRegistryService.js';

describe('durable registry reads', () => {
  it('maps source articles without interpolating canonical URLs', async () => {
    const first = vi.fn().mockResolvedValue({
      id: 'article-a', canonical_url: 'https://example.com/a', original_url: 'https://example.com/a?utm_source=x',
      source_domain: 'example.com', source_owner_key: 'owner', title: 'Title',
      published_at: '2026-09-13', content_hash: 'hash'
    });
    const article = await findSourceArticle({ first }, 'https://example.com/a');
    expect(article).toMatchObject({ id: 'article-a', sourceOwnerKey: 'owner' });
    expect(first.mock.calls[0]![0]).not.toContain('https://example.com/a');
    expect(first.mock.calls[0]![1]).toEqual(['https://example.com/a']);
  });

  it('reads clusters and resolves redirects through bounded queries', async () => {
    const first = vi.fn()
      .mockResolvedValueOnce({
        id: 'cluster-a', event_fingerprint: 'v1:event', status: 'merged',
        primary_source_article_id: 'article-a', merged_into_cluster_id: 'cluster-b',
        first_observed_at: 'a', last_observed_at: 'b'
      })
      .mockResolvedValueOnce({ id: 'cluster-b' });
    expect(await findStoryCluster({ first }, 'cluster-a')).toMatchObject({ id: 'cluster-a', status: 'merged' });
    expect(await resolveClusterRedirect({ first }, 'cluster-a')).toBe('cluster-b');
    expect(first.mock.calls[1]![1]).toEqual(['cluster-a']);
  });
});
