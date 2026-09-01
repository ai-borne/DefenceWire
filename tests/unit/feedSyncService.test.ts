/**
 * Unit Tests for FeedSyncService
 * Tests delta detection, cooldown throttling, focus/visibility triggers, error handling, and cleanup.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FeedSyncService, FeedDataPayload } from '../../src/services/feedSyncService.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const mockCluster: StoryCluster = {
  id: 'test-cluster-1',
  synthesizedHeadline: 'Test Intelligence Headline',
  primarySource: {
    id: 'src-1',
    title: 'Test Source',
    url: 'https://example.com/test',
    sourceName: 'Defence Source',
    sourceDomain: 'example.com',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-09-01T00:00:00Z',
    isPrimary: true
  },
  relatedCoverage: [],
  discussions: [],
  categories: ['tech'],
  entities: ['DRDO'],
  defenceScore: 90,
  isLeadStory: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z'
};

const mockRiverItem: StorySourceItem = {
  id: 'river-1',
  title: 'River Item',
  url: 'https://example.com/river',
  sourceName: 'River Source',
  sourceDomain: 'example.com',
  tier: SourceTier.TIER_2_NATIONAL,
  publishedAt: '2026-09-01T00:00:00Z'
};

describe('FeedSyncService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('detects feed delta and notifies listeners when generatedAt is new', async () => {
    const payload: FeedDataPayload = {
      clusters: [mockCluster],
      river: [mockRiverItem],
      generatedAt: '2026-09-01T07:00:00Z'
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload
    } as Response);

    const service = new FeedSyncService({ customFetch: mockFetch as unknown as typeof fetch });
    const stateTransitions: string[] = [];
    let receivedData: FeedDataPayload | null = null;

    service.onSyncStateChange((status) => stateTransitions.push(status));
    service.onFeedUpdated((data) => {
      receivedData = data;
    });

    const updated = await service.checkAndSync(false);

    expect(updated).toBe(true);
    expect(service.getStatus()).toBe('updated');
    expect(service.getLastGeneratedAt()).toBe('2026-09-01T07:00:00Z');
    expect(stateTransitions).toEqual(['checking', 'updated']);
    expect(receivedData).toEqual(payload);
  });

  it('skips update and returns idle when generatedAt timestamp has not changed', async () => {
    const payload: FeedDataPayload = { clusters: [mockCluster], generatedAt: '2026-09-01T07:00:00Z' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload
    } as Response);

    const service = new FeedSyncService({ customFetch: mockFetch as unknown as typeof fetch, cooldownMs: 0 });
    service.setLastGeneratedAt('2026-09-01T07:00:00Z');

    let feedUpdated = false;
    service.onFeedUpdated(() => { feedUpdated = true; });

    const updated = await service.checkAndSync(false);
    expect(updated).toBe(false);
    expect(service.getStatus()).toBe('idle');
    expect(feedUpdated).toBe(false);
  });

  it('enforces network cooldown and respects manual force bypass', async () => {
    const payload: FeedDataPayload = { generatedAt: '2026-09-01T07:10:00Z' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload
    } as Response);

    const service = new FeedSyncService({ customFetch: mockFetch as unknown as typeof fetch, cooldownMs: 60_000 });

    await service.checkAndSync(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_000);
    expect(await service.checkAndSync(false)).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    expect(await service.syncNow(true)).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(65_000);
    payload.generatedAt = '2026-09-01T07:15:00Z';
    expect(await service.checkAndSync(false)).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('handles HTTP error responses gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response);
    const service = new FeedSyncService({ customFetch: mockFetch as unknown as typeof fetch, cooldownMs: 0 });

    let receivedError: string | undefined;
    service.onSyncStateChange((status, err) => {
      if (status === 'error') receivedError = err;
    });

    const result = await service.checkAndSync(true);
    expect(result).toBe(false);
    expect(service.getStatus()).toBe('error');
    expect(receivedError).toContain('500');
  });

  it('handles network or JSON parse exceptions without throwing', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));
    const service = new FeedSyncService({ customFetch: mockFetch as unknown as typeof fetch, cooldownMs: 0 });

    let errorReported: string | undefined;
    service.onSyncStateChange((status, err) => {
      if (status === 'error') errorReported = err;
    });

    const result = await service.checkAndSync(true);
    expect(result).toBe(false);
    expect(service.getStatus()).toBe('error');
    expect(errorReported).toBe('Network offline');
  });

  it('attaches and detaches lifecycle listeners and intervals cleanly', () => {
    const service = new FeedSyncService({ intervalMs: 300_000 });
    expect(service.isRunning()).toBe(false);

    service.start();
    expect(service.isRunning()).toBe(true);

    service.start(); // Idempotent
    expect(service.isRunning()).toBe(true);

    service.stop();
    expect(service.isRunning()).toBe(false);
  });

  it('triggers sync on window focus when started', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ generatedAt: '2026-09-01T07:20:00Z' })
    } as Response);

    const service = new FeedSyncService({ customFetch: mockFetch as unknown as typeof fetch, cooldownMs: 0 });
    service.start();

    window.dispatchEvent(new Event('focus'));
    await Promise.resolve();

    expect(mockFetch).toHaveBeenCalled();
    service.stop();
  });

  it('triggers sync on document visibility change when visible but not when hidden', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ generatedAt: '2026-09-01T07:25:00Z' })
    } as Response);

    const service = new FeedSyncService({ customFetch: mockFetch as unknown as typeof fetch, cooldownMs: 0 });
    service.start();

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(mockFetch).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    service.stop();
  });

  it('prevents overlapping concurrent fetches when sync is in flight', async () => {
    let resolveFetch: ((value: unknown) => void) | null = null;
    const pendingPromise = new Promise((resolve) => { resolveFetch = resolve; });
    const mockFetch = vi.fn().mockReturnValue(pendingPromise);

    const service = new FeedSyncService({ customFetch: mockFetch as unknown as typeof fetch, cooldownMs: 0 });
    const firstPromise = service.checkAndSync(false);
    expect(service.getStatus()).toBe('checking');

    const secondResult = await service.checkAndSync(false);
    expect(secondResult).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    if (resolveFetch) {
      (resolveFetch as (value: unknown) => void)({
        ok: true,
        status: 200,
        json: async () => ({ generatedAt: '2026-09-01T07:30:00Z' })
      });
    }
    expect(await firstPromise).toBe(true);
    expect(service.getStatus()).toBe('updated');
  });

  it('unsubscribes listeners properly', () => {
    const service = new FeedSyncService();
    const stateCb = vi.fn();
    const feedCb = vi.fn();

    const unsubState = service.onSyncStateChange(stateCb);
    const unsubFeed = service.onFeedUpdated(feedCb);

    unsubState();
    unsubFeed();

    // @ts-expect-error accessing private property for verification
    expect(service.stateListeners.size).toBe(0);
    // @ts-expect-error accessing private property for verification
    expect(service.feedListeners.size).toBe(0);
  });
});
