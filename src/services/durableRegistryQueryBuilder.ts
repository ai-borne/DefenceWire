/** Parameterized reads for durable articles and clusters. */
import { D1Statement } from '../archive/d1QueryBuilder.js';

export function buildGetSourceArticleByCanonicalUrlStatement(canonicalUrl: string): D1Statement {
  return {
    sql: `SELECT id, canonical_url, original_url, source_domain, source_owner_key,
                 title, published_at, content_hash
          FROM source_articles WHERE canonical_url = ? LIMIT 1`,
    params: [canonicalUrl]
  };
}

export function buildGetStoryClusterStatement(clusterId: string): D1Statement {
  return {
    sql: `SELECT id, event_fingerprint, status, primary_source_article_id,
                 merged_into_cluster_id, first_observed_at, last_observed_at
          FROM story_clusters WHERE id = ? LIMIT 1`,
    params: [clusterId]
  };
}

export function buildResolveClusterRedirectStatement(clusterId: string): D1Statement {
  return {
    sql: `WITH RECURSIVE redirect(id, merged_into_cluster_id, depth) AS (
            SELECT id, merged_into_cluster_id, 0 FROM story_clusters WHERE id = ?
            UNION ALL
            SELECT c.id, c.merged_into_cluster_id, redirect.depth + 1
            FROM story_clusters c JOIN redirect ON c.id = redirect.merged_into_cluster_id
            WHERE redirect.depth < 20
          )
          SELECT id FROM redirect WHERE merged_into_cluster_id IS NULL
          ORDER BY depth DESC LIMIT 1`,
    params: [clusterId]
  };
}
