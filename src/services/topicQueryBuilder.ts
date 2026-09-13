/** Parameterized D1 reads for the living canonical-topic registry. */
import { D1Statement } from '../archive/d1QueryBuilder.js';

export function buildLoadTopicRegistryStatement(): D1Statement {
  return {
    sql: `SELECT id, display_name, display_hashtag, topic_type, description,
                 status, verification_state, display_priority, registry_version,
                 replaced_by_topic_id
          FROM topics
          WHERE status IN ('active', 'provisional')
            AND verification_state != 'rejected'
          ORDER BY id`,
    params: []
  };
}

export function buildLoadTopicAliasesStatement(): D1Statement {
  return {
    sql: `SELECT a.normalized_alias, a.topic_id, a.alias_type, a.requires_context,
                 a.context_rule_json, a.verification_state
          FROM topic_aliases a
          JOIN topics t ON t.id = a.topic_id
          WHERE t.status IN ('active', 'provisional')
            AND a.verification_state != 'rejected'
          ORDER BY a.normalized_alias, a.topic_id`,
    params: []
  };
}

export function buildResolveTopicRedirectStatement(topicId: string): D1Statement {
  return {
    sql: `WITH RECURSIVE redirect(id, replaced_by_topic_id, depth) AS (
            SELECT id, replaced_by_topic_id, 0 FROM topics WHERE id = ?
            UNION ALL
            SELECT t.id, t.replaced_by_topic_id, redirect.depth + 1
            FROM topics t JOIN redirect ON t.id = redirect.replaced_by_topic_id
            WHERE redirect.depth < 20
          )
          SELECT id FROM redirect
          WHERE replaced_by_topic_id IS NULL
          ORDER BY depth DESC LIMIT 1`,
    params: [topicId]
  };
}

export function buildLoadTopicRelationsStatement(): D1Statement {
  return {
    sql: `SELECT source_topic_id, relation_type, target_topic_id, confidence, verification_state
          FROM topic_relations
          WHERE verification_state IN ('verified', 'published')
          ORDER BY source_topic_id, relation_type, target_topic_id`,
    params: []
  };
}

export function buildLoadTopicImplicationsStatement(): D1Statement {
  return {
    sql: `SELECT source_topic_id, implied_topic_id, required_context_json,
                 maximum_depth, verification_state
          FROM topic_implication_rules
          WHERE verification_state IN ('verified', 'published')
          ORDER BY source_topic_id, implied_topic_id`,
    params: []
  };
}
