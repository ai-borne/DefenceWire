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

  // Regression coverage for every status seen in production breaking the whole run:
  // 403 (spend cap breached), 404 (gemini-2.5-flash-lite retired for new projects —
  // found live against a fresh no-billing key), and 429 (daily/rate quota exhausted).
  // Without a breaker, each cluster still pays the full MIN_REQUEST_INTERVAL_MS wait
  // before failing — 142 clusters x 4.5s blew a 15-minute CI job's timeout in production.
  it.each([401, 403, 404, 429])(
    'opens a circuit breaker after a %i so later clusters skip Gemini instead of re-throttling',
    async (status) => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let callCount = 0;
      const permanentFailureFetch = async () => {
        callCount++;
        return new Response(JSON.stringify({ error: { code: status, message: 'Permanent failure' } }), { status });
      };

      const clusterA: StoryCluster = { ...MOCK_CLUSTER, id: `c-circuit-a-${status}`, synthesizedHeadline: 'Headline Circuit A' };
      const clusterB: StoryCluster = { ...MOCK_CLUSTER, id: `c-circuit-b-${status}`, synthesizedHeadline: 'Headline Circuit B' };

      const resultA = await summarizeWithGemini(clusterA, 'bad-key', permanentFailureFetch as typeof fetch);
      expect(resultA).toBeNull();
      expect(callCount).toBe(1);

      const startedAt = Date.now();
      const resultB = await summarizeWithGemini(clusterB, 'bad-key', permanentFailureFetch as typeof fetch);

      expect(resultB).toBeNull();
      expect(callCount).toBe(1); // circuit open: fetch is never invoked again this run
      expect(Date.now() - startedAt).toBeLessThan(MIN_REQUEST_INTERVAL_MS); // no wasted throttle wait
      errorSpy.mockRestore();
    }
  );

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
