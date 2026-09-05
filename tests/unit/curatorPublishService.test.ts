/**
 * Unit Tests for CuratorPublishService (One-Push Publish & Rollback Client)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { CuratorPublishService } from '../../src/services/curatorPublishService.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const mockPayload: { clusters: StoryCluster[]; river: StorySourceItem[] } = {
  clusters: [
    {
      id: 'cluster-1',
      synthesizedHeadline: 'CCS Clears 5th-Gen AMCA Stealth Fighter Prototype Funding',
      primarySource: {
        id: 'src-1',
        title: 'CCS clears AMCA funding',
        url: 'https://pib.gov.in/news/1',
        sourceName: 'PIB India',
        sourceDomain: 'pib.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-08-30T10:00:00Z'
      },
      relatedCoverage: [],
      discussions: [],
      categories: ['airforce'],
      entities: ['AMCA'],
      defenceScore: 92,
      isLeadStory: true,
      isEditorPromoted: true,
      createdAt: '2026-08-30T10:00:00Z',
      updatedAt: '2026-08-30T10:00:00Z'
    }
  ],
  river: []
};

describe('CuratorPublishService', () => {
  it('publishes a curated snapshot to the bulk publish endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'Published 1 curated overrides live.' })
    } as Response);

    const service = new CuratorPublishService(mockFetch as unknown as typeof fetch);
    const result = await service.publish(mockPayload);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Published 1 curated overrides live.');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/curator/publish',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(mockPayload) })
    );
  });

  it('surfaces a friendly error when publish is unauthorized', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: 'Unauthorized' })
    } as Response);

    const service = new CuratorPublishService(mockFetch as unknown as typeof fetch);
    const result = await service.publish(mockPayload);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });

  it('handles network failure gracefully without throwing', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));

    const service = new CuratorPublishService(mockFetch as unknown as typeof fetch);
    const result = await service.publish(mockPayload);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network disconnected');
  });

  it('rolls back to the previous publish via the rollback endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'Rolled back to snapshot published 2026-09-01T00:00:00Z.' })
    } as Response);

    const service = new CuratorPublishService(mockFetch as unknown as typeof fetch);
    const result = await service.rollback();

    expect(result.success).toBe(true);
    expect(result.message).toContain('Rolled back');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/curator/rollback',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({}) })
    );
  });

  it('passes an explicit snapshotId to the rollback endpoint when supplied', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    } as Response);

    const service = new CuratorPublishService(mockFetch as unknown as typeof fetch);
    await service.rollback(42);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/curator/rollback',
      expect.objectContaining({ body: JSON.stringify({ snapshotId: 42 }) })
    );
  });

  it('surfaces a friendly error when rollback finds no prior snapshot', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: 'No prior published snapshot available to roll back to.' })
    } as Response);

    const service = new CuratorPublishService(mockFetch as unknown as typeof fetch);
    const result = await service.rollback();

    expect(result.success).toBe(false);
    expect(result.error).toContain('No prior published snapshot');
  });
});
