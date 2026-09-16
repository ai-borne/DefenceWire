import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSummaryMemoryCache, MIN_REQUEST_INTERVAL_MS, summarizeWithGemini } from '../../crawler/summarizer.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const MOCK_CLUSTER: StoryCluster = {
  id: 'c-circuit-breaker-test',
  synthesizedHeadline: 'Project 75I Submarine Deal Finalized with Fuel-Cell AIP',
  primarySource: {
    id: 'ps-circuit',
    title: 'MoD Finalizes Project 75I Deal',
    url: 'https://mod.gov.in/press/p75i',
    sourceName: 'MoD Press',
    sourceDomain: 'mod.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-30T09:00:00Z'
  },
  relatedCoverage: [],
  discussions: [],
  categories: ['navy', 'procurement'],
  entities: ['Project 75I'],
  defenceScore: 92,
  isLeadStory: true,
  createdAt: '2026-08-30T09:00:00Z',
  updatedAt: '2026-08-30T09:00:00Z'
};

describe('Gemini Circuit Breaker', () => {
  beforeEach(() => {
    clearSummaryMemoryCache();
  });

  it('opens a circuit breaker after a 401/403 so later clusters skip Gemini instead of re-throttling', async () => {
    // Regression: a breached spend cap (or revoked key) 403s every call, but without a
    // breaker each cluster still pays the full MIN_REQUEST_INTERVAL_MS wait before failing
    // — 142 clusters x 4.5s blew a 15-minute CI job's timeout in production.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let callCount = 0;
    const spendCapFetch = async () => {
      callCount++;
      return new Response(JSON.stringify({ error: { code: 403, message: 'Spend cap breached' } }), { status: 403 });
    };

    const clusterA: StoryCluster = { ...MOCK_CLUSTER, id: 'c-circuit-a', synthesizedHeadline: 'Headline Circuit A' };
    const clusterB: StoryCluster = { ...MOCK_CLUSTER, id: 'c-circuit-b', synthesizedHeadline: 'Headline Circuit B' };

    const resultA = await summarizeWithGemini(clusterA, 'bad-key', spendCapFetch as typeof fetch);
    expect(resultA).toBeNull();
    expect(callCount).toBe(1);

    const startedAt = Date.now();
    const resultB = await summarizeWithGemini(clusterB, 'bad-key', spendCapFetch as typeof fetch);

    expect(resultB).toBeNull();
    expect(callCount).toBe(1); // circuit open: fetch is never invoked again this run
    expect(Date.now() - startedAt).toBeLessThan(MIN_REQUEST_INTERVAL_MS); // no wasted throttle wait
    errorSpy.mockRestore();
  });

  it('does not open the circuit on a transient (non-auth) failure like a 500', async () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let callCount = 0;
    const serverErrorFetch = async () => {
      callCount++;
      return new Response('Server Error', { status: 500 });
    };

    const clusterA: StoryCluster = { ...MOCK_CLUSTER, id: 'c-transient-a', synthesizedHeadline: 'Headline Transient A' };
    const clusterB: StoryCluster = { ...MOCK_CLUSTER, id: 'c-transient-b', synthesizedHeadline: 'Headline Transient B' };

    const p1 = summarizeWithGemini(clusterA, 'mock-key', serverErrorFetch as typeof fetch);
    await vi.advanceTimersByTimeAsync(0);
    const p2 = summarizeWithGemini(clusterB, 'mock-key', serverErrorFetch as typeof fetch);
    await vi.advanceTimersByTimeAsync(MIN_REQUEST_INTERVAL_MS);
    await Promise.all([p1, p2]);

    expect(callCount).toBe(2); // each cluster still gets its own attempt; a 500 may be momentary
    errorSpy.mockRestore();
    vi.useRealTimers();
  });
});
