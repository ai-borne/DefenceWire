/**
 * Archive Diff for DefenceWire.in
 * Detects which clusters a crawler run dropped from the live feed (aged past
 * the freshness window or outranked past the top-N cutoff) so they can be
 * archived instead of silently discarded.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';

export function findClustersToArchive(previousClusters: StoryCluster[], nextClusters: StoryCluster[]): StoryCluster[] {
  const nextIds = new Set(nextClusters.map((c) => c.id));
  return previousClusters.filter((c) => !nextIds.has(c.id));
}
