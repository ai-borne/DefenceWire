/** Indexed and parameterized D1 queries for public canonical-topic reads. */
import { D1Statement } from '../archive/d1QueryBuilder.js';

export function buildResolvePublicTopicStatement(id: string, alias: string, displayHashtag: string): D1Statement {
  return { sql: `SELECT t.id, t.display_name, t.display_hashtag, t.topic_type, t.description,
      t.registry_version, t.status, t.verification_state, t.replaced_by_topic_id,
      COALESCE((SELECT MAX(assigned_at) FROM cluster_topics), '') AS assigned_version
    FROM topics t LEFT JOIN topic_aliases a ON a.topic_id=t.id
      AND a.normalized_alias=? AND a.requires_context=0 AND a.verification_state='published'
    WHERE t.id=? OR lower(t.display_hashtag)=? OR a.topic_id IS NOT NULL
    ORDER BY CASE WHEN t.id=? THEN 0 WHEN lower(t.display_hashtag)=? THEN 1 ELSE 2 END LIMIT 1`, params: [alias, id, displayHashtag, id, displayHashtag] };
}

export function buildResolveTopicRedirectStatement(topicId: string): D1Statement {
  return { sql: `WITH RECURSIVE redirect(id, display_name, display_hashtag, topic_type, description, registry_version, status, verification_state, replaced_by_topic_id, depth) AS (
      SELECT id, display_name, display_hashtag, topic_type, description, registry_version, status, verification_state, replaced_by_topic_id, 0 FROM topics WHERE id=?
      UNION ALL SELECT t.id, t.display_name, t.display_hashtag, t.topic_type, t.description, t.registry_version, t.status, t.verification_state, t.replaced_by_topic_id, redirect.depth+1
      FROM topics t JOIN redirect ON t.id=redirect.replaced_by_topic_id WHERE redirect.depth<20
    ) SELECT *, COALESCE((SELECT MAX(assigned_at) FROM cluster_topics), '') AS assigned_version FROM redirect
    WHERE status='active' AND verification_state='published' ORDER BY depth DESC LIMIT 1`, params: [topicId] };
}

export function buildListPublicTopicsStatement(limit: number, cursor?: { priority: number; topicId: string }): D1Statement {
  const clause = cursor ? 'AND (display_priority < ? OR (display_priority = ? AND id > ?))' : '';
  const params: unknown[] = cursor ? [cursor.priority, cursor.priority, cursor.topicId, limit] : [limit];
  return { sql: `SELECT id, display_name, display_hashtag, topic_type, description, registry_version, display_priority,
      COALESCE((SELECT MAX(assigned_at) FROM cluster_topics), '') AS assigned_version
    FROM topics WHERE status='active' AND verification_state='published' ${clause}
    ORDER BY display_priority DESC, id ASC LIMIT ?`, params };
}

export function buildTopicArticleStatement(topicId: string, limit: number, cursor?: { publishedAt: string; clusterId: string }): D1Statement {
  const clause = cursor ? 'AND (p.published_at < ? OR (p.published_at = ? AND c.id < ?))' : '';
  const params: unknown[] = cursor ? [topicId, cursor.publishedAt, cursor.publishedAt, cursor.clusterId, limit] : [topicId, limit];
  return { sql: `SELECT c.id AS cluster_id, ct.role, ct.confidence, ct.assignment_source, ct.assigned_at,
      p.published_at, p.id AS primary_source_id, p.title AS primary_title, p.snippet AS primary_snippet,
      p.canonical_url AS primary_url, p.source_domain AS primary_domain, p.source_owner_key AS primary_owner_key
    FROM cluster_topics ct JOIN story_clusters c ON c.id=ct.cluster_id AND c.status='active'
      JOIN source_articles p ON p.id=c.primary_source_article_id
    WHERE ct.topic_id=? ${clause}
    ORDER BY p.published_at DESC, c.id DESC LIMIT ?`, params };
}

export function buildClusterSourcesStatement(clusterIds: string[]): D1Statement {
  const placeholders = clusterIds.map(() => '?').join(',');
  return { sql: `SELECT cs.cluster_id, a.id, a.title, a.snippet, a.canonical_url, a.source_domain, cs.coverage_role
    FROM cluster_sources cs JOIN source_articles a ON a.id=cs.source_article_id
    WHERE cs.cluster_id IN (${placeholders}) ORDER BY cs.cluster_id, CASE cs.coverage_role WHEN 'primary' THEN 0 ELSE 1 END, a.published_at DESC`, params: clusterIds };
}

export function buildClusterThreadIdsStatement(clusterIds: string[]): D1Statement {
  const placeholders = clusterIds.map(() => '?').join(',');
  return { sql: `SELECT DISTINCT cluster_id, thread_id FROM story_thread_events WHERE cluster_id IN (${placeholders}) ORDER BY cluster_id, thread_id`, params: clusterIds };
}

export function buildRelatedTopicsStatement(topicId: string): D1Statement {
  return { sql: `SELECT r.relation_type, t.id, t.display_name, t.display_hashtag, t.topic_type, t.description, t.registry_version
    FROM topic_relations r JOIN topics t ON t.id=r.target_topic_id
    WHERE r.source_topic_id=? AND r.verification_state='published' AND t.status='active' AND t.verification_state='published'
    ORDER BY t.display_priority DESC, t.id ASC LIMIT 50`, params: [topicId] };
}
