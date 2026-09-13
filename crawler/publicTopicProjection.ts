/** Builds the sole public topic representation from validated D1 memberships. */
import { StoryCluster } from '../src/types/news.js';
import { PublicTopic } from '../src/services/topicReadHandler.js';
import { D1RestConfig, executeD1Query } from './archiveSync.js';

interface TopicRow extends Record<string, unknown> {
  cluster_id: string; id: string; display_name: string; display_hashtag: string;
  topic_type: PublicTopic['topicType']; description: string | null;
  registry_version: number; display_priority: number;
}

function projection(row: TopicRow): PublicTopic {
  return {
    id: row.id, displayName: row.display_name, displayHashtag: row.display_hashtag,
    topicType: row.topic_type, description: row.description,
    registryVersion: Number(row.registry_version), displayPriority: Number(row.display_priority)
  };
}

/**
 * Hydrates only accepted memberships of active published topics. The legacy
 * fields remain a compatibility projection for consumers outside topic routing;
 * they are never used to establish public knowledge-base membership.
 */
export async function hydratePublishedTopics(
  clusters: StoryCluster[], config: D1RestConfig, fetchFn: typeof fetch
): Promise<StoryCluster[]> {
  if (clusters.length === 0) return clusters;
  const ids = clusters.map((cluster) => cluster.id);
  const placeholders = ids.map(() => '?').join(',');
  const result = await executeD1Query({ sql: `SELECT ct.cluster_id, t.id, t.display_name,
      t.display_hashtag, t.topic_type, t.description, t.registry_version, t.display_priority
    FROM cluster_topics ct JOIN topics t ON t.id=ct.topic_id
    WHERE ct.cluster_id IN (${placeholders}) AND t.status='active'
      AND t.verification_state='published'
    ORDER BY ct.cluster_id, t.display_priority DESC, t.id ASC`, params: ids }, config, fetchFn);
  if (!result.ok) throw new Error(`Published topic projection failed: ${result.error ?? result.status ?? 'unknown error'}`);

  const byCluster = new Map<string, PublicTopic[]>();
  for (const row of result.rows as TopicRow[]) {
    if (!row.cluster_id || !row.id || !row.display_hashtag) throw new Error('Published topic projection returned an invalid row.');
    byCluster.set(row.cluster_id, [...(byCluster.get(row.cluster_id) ?? []), projection(row)]);
  }
  return clusters.map((cluster) => {
    const canonicalTopics = byCluster.get(cluster.id) ?? [];
    return {
      ...cluster,
      canonicalTopics,
      primaryTag: canonicalTopics[0]?.displayHashtag,
      hashtags: canonicalTopics.map((topic) => topic.displayHashtag)
    };
  });
}
