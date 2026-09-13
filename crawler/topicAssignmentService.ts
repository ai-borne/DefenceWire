/** D1 provenance writes and desired-state reconciliation for deterministic topic assignments. */
import { createHash, randomUUID } from 'node:crypto';
import { D1Statement } from '../src/archive/d1QueryBuilder.js';
import { TopicRegistrySnapshot } from '../src/types/topics.js';
import { normalizeTopicAlias } from '../src/services/topicRegistryService.js';
import { D1RestConfig, executeD1Query } from './archiveSync.js';
import { ASSIGNMENT_POLICY_VERSION, CLASSIFIER_VERSION, ClassifiedMention, aggregateClusterMentions } from './deterministicTopicClassifier.js';

export async function fetchTopicRegistry(config: D1RestConfig, fetchFn: typeof fetch): Promise<TopicRegistrySnapshot> {
  const statements: D1Statement[] = [
    { sql: "SELECT id, display_name, display_hashtag, topic_type, description, status, verification_state, display_priority, registry_version, replaced_by_topic_id FROM topics WHERE status IN ('active', 'provisional') AND verification_state != 'rejected' ORDER BY id", params: [] },
    { sql: "SELECT a.normalized_alias, a.topic_id, a.alias_type, a.requires_context, a.context_rule_json, a.verification_state FROM topic_aliases a JOIN topics t ON t.id=a.topic_id WHERE t.status IN ('active', 'provisional') AND a.verification_state != 'rejected' ORDER BY a.normalized_alias, a.topic_id", params: [] },
    { sql: "SELECT source_topic_id, relation_type, target_topic_id, confidence, verification_state FROM topic_relations WHERE verification_state IN ('verified','published')", params: [] },
    { sql: "SELECT source_topic_id, implied_topic_id, required_context_json, maximum_depth, verification_state FROM topic_implication_rules WHERE verification_state IN ('verified','published')", params: [] }
  ];
  const rows = await Promise.all(statements.map(async (statement) => {
    const result = await executeD1Query(statement, config, fetchFn);
    if (!result.ok) throw new Error(`Topic registry load failed: ${result.error ?? result.status}`);
    return result.rows;
  }));
  const [topicRows, aliasRows, relationRows, implicationRows] = rows;
  if (!topicRows || !aliasRows || !relationRows || !implicationRows) throw new Error('Topic registry response was incomplete.');
  const topics = topicRows.map((r) => ({ id: String(r.id), displayName: String(r.display_name), displayHashtag: String(r.display_hashtag), topicType: r.topic_type as never, description: r.description as string | null, status: r.status as never, verificationState: r.verification_state as never, displayPriority: Number(r.display_priority), registryVersion: Number(r.registry_version), replacedByTopicId: r.replaced_by_topic_id as string | null }));
  return { registryVersion: Math.max(0, ...topics.map((t) => t.registryVersion)), topics,
    aliases: aliasRows.map((r) => ({ normalizedAlias: String(r.normalized_alias), topicId: String(r.topic_id), aliasType: r.alias_type as never, requiresContext: Number(r.requires_context) === 1, contextRuleJson: r.context_rule_json as string | null, verificationState: r.verification_state as never })),
    relations: relationRows.map((r) => ({ sourceTopicId: String(r.source_topic_id), relationType: r.relation_type as never, targetTopicId: String(r.target_topic_id), confidence: Number(r.confidence), verificationState: r.verification_state as never })),
    implicationRules: implicationRows.map((r) => ({ sourceTopicId: String(r.source_topic_id), impliedTopicId: String(r.implied_topic_id), requiredContextJson: String(r.required_context_json), maximumDepth: Number(r.maximum_depth), verificationState: r.verification_state as never })) };
}

export async function reconcileTopicAssignments(input: { clusterId: string; fingerprint: string; registryVersion: number; publishedTopicIds: Set<string>; articleMentions: Array<{ sourceArticleId: string; mention: ClassifiedMention }>; candidates: Array<{ sourceArticleId: string; name: string; evidenceStart: number; evidenceEnd: number; evidenceContentHash: string }>; now: string }, config: D1RestConfig, fetchFn: typeof fetch): Promise<'reused' | 'validated'> {
  const prior = await executeD1Query({ sql: `SELECT id FROM topic_assignment_runs WHERE cluster_id=? AND content_fingerprint=? AND registry_version=? AND classifier_version=? AND assignment_policy_version=? AND status IN ('validated','reused') LIMIT 1`, params: [input.clusterId, input.fingerprint, input.registryVersion, CLASSIFIER_VERSION, ASSIGNMENT_POLICY_VERSION] }, config, fetchFn);
  if (!prior.ok) throw new Error('Unable to check prior topic assignment.');
  if (prior.rows.length) return 'reused';
  const runId = `topicrun_${randomUUID()}`; const desired = aggregateClusterMentions(input.articleMentions.map((item) => item.mention));
  const statements: D1Statement[] = [{ sql: `INSERT INTO topic_assignment_runs (id,cluster_id,content_fingerprint,registry_version,classifier_version,assignment_policy_version,status,started_at,completed_at) VALUES (?,?,?,?,?,?,'validated',?,?)`, params: [runId,input.clusterId,input.fingerprint,input.registryVersion,CLASSIFIER_VERSION,ASSIGNMENT_POLICY_VERSION,input.now,input.now] }];
  for (const { sourceArticleId, mention } of input.articleMentions) statements.push({ sql: `INSERT INTO article_topic_mentions (topic_id,cluster_id,source_article_id,mention_kind,evidence_start,evidence_end,evidence_content_hash,extraction_run_id,observed_at) VALUES (?,?,?,?,?,?,?,?,?)`, params: [mention.topicId,input.clusterId,sourceArticleId,mention.mentionKind,mention.evidenceStart,mention.evidenceEnd,mention.evidenceContentHash,runId,input.now] });
  for (const candidate of input.candidates) statements.push({ sql: `INSERT OR IGNORE INTO topic_candidates (id,normalized_name,proposed_display_name,source_article_id,evidence_start,evidence_end,evidence_content_hash,legacy_source,status,created_at) VALUES (?,?,?,?,?,?,?,'runtime_discovery','pending',?)`, params: [candidateId(candidate), normalizeTopicAlias(candidate.name), candidate.name, candidate.sourceArticleId, candidate.evidenceStart, candidate.evidenceEnd, candidate.evidenceContentHash, input.now] });
  for (const mention of desired) { const decisionId = `topicdecision_${randomUUID()}`; const published = input.publishedTopicIds.has(mention.topicId); statements.push({ sql: `INSERT INTO cluster_topic_decisions (id,assignment_run_id,cluster_id,topic_id,role,confidence,assignment_source,decision_state,decided_at) VALUES (?,?,?,?,?,?,?, ?,?)`, params: [decisionId,runId,input.clusterId,mention.topicId,mention.role,mention.confidence,'deterministic',published ? 'accepted' : 'shadow',input.now] }); if (published) statements.push({ sql: `INSERT INTO cluster_topics (cluster_id,topic_id,role,confidence,assignment_source,source_decision_id,locked_by_curator,assignment_run_id,classifier_version,assigned_at) VALUES (?,?,?,?,?,?,0,?,?,?) ON CONFLICT(cluster_id,topic_id) DO UPDATE SET role=excluded.role,confidence=excluded.confidence,assignment_source=excluded.assignment_source,source_decision_id=excluded.source_decision_id,assignment_run_id=excluded.assignment_run_id,classifier_version=excluded.classifier_version,assigned_at=excluded.assigned_at WHERE cluster_topics.locked_by_curator=0`, params: [input.clusterId,mention.topicId,mention.role,mention.confidence,'deterministic',decisionId,runId,CLASSIFIER_VERSION,input.now] }); }
  const desiredIds = desired.filter((item) => input.publishedTopicIds.has(item.topicId)).map((item) => item.topicId);
  statements.push({ sql: desiredIds.length ? `DELETE FROM cluster_topics WHERE cluster_id=? AND locked_by_curator=0 AND topic_id NOT IN (${desiredIds.map(() => '?').join(',')})` : 'DELETE FROM cluster_topics WHERE cluster_id=? AND locked_by_curator=0', params: [input.clusterId, ...desiredIds] });
  await executeBatch(statements, config, fetchFn); return 'validated';
}

function candidateId(candidate: { sourceArticleId: string; name: string; evidenceStart: number; evidenceEnd: number }): string {
  return `candidate_${createHash('sha256').update(`${candidate.sourceArticleId}|${candidate.evidenceStart}|${candidate.evidenceEnd}|${candidate.name}`).digest('hex').slice(0, 24)}`;
}

async function executeBatch(statements: D1Statement[], config: D1RestConfig, fetchFn: typeof fetch): Promise<void> {
  const response = await fetchFn(`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`, { method: 'POST', headers: { Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ batch: statements }) });
  const body = await response.json().catch(() => null) as { success?: boolean; result?: Array<{ success?: boolean }> } | null;
  if (!response.ok || !body?.success || body.result?.some((item) => item.success === false)) throw new Error('Atomic topic assignment reconciliation failed.');
}
