/**
 * Archive/Thread Continuity Integration Test (fix for docs/knowledge_base_issues.md#3)
 * Composes findClustersToArchive + runThreadContinuity exactly as crawler/ingest.ts
 * does, proving a cluster that ages out of the live feed this run still gets a
 * threading pass before archival, instead of aging out unthreaded.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { findClustersToArchive } from '../../src/archive/archiveDiff.js';
import { runThreadContinuity } from '../../crawler/threadSync.js';

function makeCluster(id: string, entity: string, publishedAt: string): StoryCluster {
  return {
    id,
    synthesizedHeadline: `${entity} advances in development milestones`,
    primarySource: {
      id: `src-${id}`,
      title: 'MoD Report',
      url: `https://mod.gov.in/${id}`,
      sourceName: 'PIB MoD',
      sourceDomain: 'mod.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt
    },
    relatedCoverage: [],
    discussions: [],
    categories: ['airforce'],
    entities: [entity],
    programTags: [entity.toLowerCase()],
    defenceScore: 88,
    isLeadStory: false,
    createdAt: publishedAt,
    updatedAt: publishedAt
  };
}

describe('archive/thread continuity integration (issue #3)', () => {
  it('threads a cluster that pops out of the live feed this run, before it is archived', async () => {
    const survivor = makeCluster('cluster-amca', 'AMCA', '2026-09-08T02:00:00Z');
    const aging = makeCluster('cluster-zorawar', 'Zorawar', '2026-08-01T02:00:00Z');

    // Previous run's live batch had both; this run's live batch only has the survivor —
    // "aging" fell out of the top-N/72h window and is about to be archived, exactly
    // like crawler/ingest.ts's existingClusters -> finalClusters transition.
    const existingClusters = [survivor, aging];
    const finalClusters = [survivor];

    const poppedClusters = findClustersToArchive(existingClusters, finalClusters);
    expect(poppedClusters.map((c) => c.id)).toEqual(['cluster-zorawar']);

    const result = await runThreadContinuity([...finalClusters, ...poppedClusters], null);

    const threadedIds = result.continuity.events.map((e) => e.clusterId);
    expect(threadedIds).toContain('cluster-amca');
    expect(threadedIds).toContain('cluster-zorawar');
    expect(result.continuity.newlySpawnedCount).toBe(2);
  });

  it('regression check: threading only the live batch (pre-fix behavior) would have dropped the aging cluster', async () => {
    const survivor = makeCluster('cluster-amca-2', 'AMCA', '2026-09-08T02:00:00Z');
    const finalClusters = [survivor];

    const result = await runThreadContinuity(finalClusters, null);

    const threadedIds = result.continuity.events.map((e) => e.clusterId);
    expect(threadedIds).not.toContain('cluster-zorawar-2');
    expect(threadedIds).toContain('cluster-amca-2');
  });
});
