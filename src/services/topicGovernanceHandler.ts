/** Authenticated, audited curator mutations for the canonical topic registry. */
import { normalizeTopicAlias } from './topicRegistryService.js';
import { TopicAssignmentRole } from '../types/topics.js';

type Action = 'candidate' | 'topic' | 'alias' | 'implication' | 'merge' | 'reverse_merge' | 'assignment' | 'suppress' | 'restore';
export interface TopicGovernanceRequest {
  action: Action; expectedVersion: number; topicId?: string; targetTopicId?: string; candidateId?: string;
  clusterId?: string; decision?: 'approve' | 'reject'; displayName?: string; alias?: string;
  aliasType?: 'canonical' | 'acronym' | 'spelling' | 'former_name' | 'transliteration';
  requiresContext?: boolean; contextRuleJson?: string; role?: TopicAssignmentRole; lock?: boolean;
}
export interface GovernanceDependencies {
  runQuery(sql: string, params: unknown[]): Promise<Record<string, unknown>[]>;
  runBatch(statements: Array<{ sql: string; params: unknown[] }>): Promise<void>;
  /** Single-statement write that reports how many rows it actually changed, used for the atomic version claim below. */
  runWrite(sql: string, params: unknown[]): Promise<{ changes: number }>;
  verifyAuth?(cookie: string | null): Promise<boolean>;
}
export interface GovernanceResult { success: boolean; error?: string; preview?: Record<string, unknown>; }
const validId = (value: string | undefined) => Boolean(value && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value));
const stamp = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const audit = (topicId: string | undefined, clusterId: string | undefined, action: string, before: unknown, after: unknown, email: string, expected: number, now: string) => ({
  sql: 'INSERT INTO topic_curation_audit (id,topic_id,cluster_id,action,before_json,after_json,curator_email,expected_version,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
  params: [id('audit'), topicId ?? null, clusterId ?? null, action, JSON.stringify(before), JSON.stringify(after), email, expected, now]
});
async function authorized(deps: GovernanceDependencies, cookie: string | null): Promise<boolean> { return Boolean(deps.verifyAuth && await deps.verifyAuth(cookie)); }
/**
 * Atomically claims the next version for one governed resource: a plain
 * read-then-compare (the old `version()`+`bump()` pair) is NOT safe under
 * concurrent requests, because two requests can both read the same version
 * before either writes, both pass the check, and one silently clobbers the
 * other with no error ever surfacing (proven against a real remote D1
 * instance in Phase 13 Stage 4's concurrency drill). Folding the compare
 * into the write's own WHERE clause makes D1's per-database serialized
 * execution the actual mutual-exclusion mechanism: only one concurrent
 * caller's write can match `version = expectedVersion` for a given resource,
 * so exactly one claim succeeds and every other caller sees changes=0.
 */
async function claimVersion(deps: GovernanceDependencies, type: string, resourceId: string, expectedVersion: number): Promise<boolean> {
  if (expectedVersion === 0) {
    const result = await deps.runWrite(
      "INSERT INTO topic_governance_versions (resource_type,resource_id,version) VALUES (?,?,1) ON CONFLICT(resource_type,resource_id) DO UPDATE SET version=version+1 WHERE topic_governance_versions.version=0",
      [type, resourceId]
    );
    return result.changes === 1;
  }
  const result = await deps.runWrite(
    'UPDATE topic_governance_versions SET version=version+1 WHERE resource_type=? AND resource_id=? AND version=?',
    [type, resourceId, expectedVersion]
  );
  return result.changes === 1;
}
async function enqueue(deps: GovernanceDependencies, topicId: string, trigger: string, now: string): Promise<Array<{sql:string;params:unknown[]}>> {
  const rows = await deps.runQuery(`SELECT DISTINCT cluster_id FROM cluster_topics WHERE topic_id=? UNION SELECT DISTINCT cluster_id FROM article_topic_mentions WHERE topic_id=? LIMIT 500`, [topicId, topicId]);
  return rows.map((row) => ({ sql: "INSERT OR IGNORE INTO topic_reclassification_queue (id,trigger_type,trigger_id,cluster_id,status,attempts,available_at) VALUES (?,?,?,?, 'pending',0,?)", params: [id('queue'), trigger === 'alias' ? 'alias_change' : trigger === 'merge' ? 'topic_merge' : 'registry_change', topicId, row.cluster_id, now] }));
}
export async function previewTopicGovernance(request: TopicGovernanceRequest, deps: GovernanceDependencies, cookie: string | null): Promise<GovernanceResult> {
  if (!await authorized(deps, cookie) || !validId(request.topicId)) return { success: false, error: 'Unauthorized or invalid topic.' };
  const [topics, clusters, urls] = await Promise.all([
    deps.runQuery('SELECT id,display_name,status,replaced_by_topic_id,curation_version FROM topics WHERE id IN (?,?)', [request.topicId, request.targetTopicId ?? '']),
    deps.runQuery('SELECT DISTINCT cluster_id FROM cluster_topics WHERE topic_id=? LIMIT 500', [request.topicId]),
    deps.runQuery('SELECT normalized_alias,topic_id,requires_context FROM topic_aliases WHERE topic_id=?', [request.topicId])
  ]);
  return { success: true, preview: { topics, affectedClusters: clusters, aliases: urls, redirects: request.targetTopicId ? [{ from: request.topicId, to: request.targetTopicId }] : [] } };
}
export async function handleTopicGovernance(request: TopicGovernanceRequest, deps: GovernanceDependencies, cookie: string | null, email: string): Promise<GovernanceResult> {
  if (!await authorized(deps, cookie)) return { success: false, error: 'Unauthorized: Valid curator session required.' };
  if (!Number.isInteger(request.expectedVersion) || request.expectedVersion < 0) return { success: false, error: 'Invalid optimistic-concurrency version.' };
  const now = stamp(); const statements: Array<{sql:string;params:unknown[]}> = [];
  const stale = () => ({ success: false, error: 'Conflict: this record has changed; refresh and retry.' });
  if (request.action === 'candidate') {
    if (!request.candidateId || !request.decision) return { success:false, error:'Candidate and decision are required.' };
    if (!await claimVersion(deps, 'candidate', request.candidateId, request.expectedVersion)) return stale();
    const before = (await deps.runQuery('SELECT * FROM topic_candidates WHERE id=?', [request.candidateId]))[0];
    if (!before || before.status !== 'pending') return { success:false, error:'Only pending candidates can be reviewed.' };
    const topicId = request.topicId ?? String(before.resolved_topic_id ?? '');
    if (request.decision === 'approve' && !validId(topicId)) return { success:false, error:'Approval requires a valid resolved topic.' };
    statements.push({sql:"UPDATE topic_candidates SET status=?,resolved_topic_id=?,reviewed_at=?,reviewed_by=? WHERE id=?",params:[request.decision === 'approve' ? 'approved' : 'rejected', request.decision === 'approve' ? topicId : null, now,email,request.candidateId]});
    if (request.decision === 'approve') statements.push({sql:"UPDATE topics SET status='active',verification_state='published',registry_version=registry_version+1,updated_at=? WHERE id=?",params:[now,topicId]});
    statements.push(audit(topicId || undefined, undefined, request.decision, before, { decision:request.decision, topicId }, email, request.expectedVersion, now));
    if (topicId) statements.push(...await enqueue(deps, topicId, 'registry', now));
  } else if (request.action === 'topic') {
    if (!validId(request.topicId) || !request.displayName || request.displayName.length > 120) return {success:false,error:'Valid topic and bounded display name are required.'};
    const topicId=request.topicId!; if (!await claimVersion(deps,'topic',topicId,request.expectedVersion)) return stale();
    const before=(await deps.runQuery('SELECT * FROM topics WHERE id=?',[topicId]))[0]; if(!before) return {success:false,error:'Topic not found.'};
    statements.push({sql:'UPDATE topics SET display_name=?,updated_at=?,registry_version=registry_version+1 WHERE id=?',params:[request.displayName.trim(),now,topicId]});
    statements.push(audit(topicId,undefined,'update',before,{displayName:request.displayName.trim()},email,request.expectedVersion,now),...await enqueue(deps,topicId,'registry',now));
  } else if (request.action === 'alias') {
    if (!validId(request.topicId) || !request.alias || !request.aliasType) return {success:false,error:'Topic, alias, and alias type are required.'};
    const alias=normalizeTopicAlias(request.alias); if(!alias || alias.length>120) return {success:false,error:'Invalid alias.'};
    if (!await claimVersion(deps,'alias',`${alias}:${request.topicId}`,request.expectedVersion)) return stale();
    if (request.requiresContext && !request.contextRuleJson) return {success:false,error:'Contextual aliases require a context rule.'};
    if (request.contextRuleJson) try { JSON.parse(request.contextRuleJson); } catch { return {success:false,error:'Context rule must be JSON.'}; }
    const collision=await deps.runQuery('SELECT topic_id FROM topic_aliases WHERE normalized_alias=? AND requires_context=0 AND verification_state != ? AND topic_id != ?', [alias,'rejected',request.topicId]);
    if (!request.requiresContext && collision.length) return {success:false,error:'Unconditional alias collides with another topic.'};
    statements.push({sql:"INSERT INTO topic_aliases (normalized_alias,topic_id,alias_type,requires_context,context_rule_json,verification_state,created_at) VALUES (?,?,?,?,?,'verified',?) ON CONFLICT(normalized_alias,topic_id) DO UPDATE SET alias_type=excluded.alias_type,requires_context=excluded.requires_context,context_rule_json=excluded.context_rule_json,verification_state='verified'",params:[alias,request.topicId,request.aliasType,request.requiresContext?1:0,request.requiresContext?request.contextRuleJson:null,now]});
    statements.push(audit(request.topicId!,undefined,'update',null,{alias,contextual:Boolean(request.requiresContext)},email,request.expectedVersion,now),...await enqueue(deps,request.topicId!,'alias',now));
  } else if (request.action === 'implication') {
    if (!validId(request.topicId)||!validId(request.targetTopicId)||request.topicId===request.targetTopicId) return {success:false,error:'Two distinct valid topics are required.'};
    if (!await claimVersion(deps,'implication',`${request.topicId}:${request.targetTopicId}`,request.expectedVersion)) return stale();
    statements.push({sql:"INSERT INTO topic_implication_rules (source_topic_id,implied_topic_id,required_context_json,maximum_depth,verification_state) VALUES (?,?,?,1,'verified') ON CONFLICT(source_topic_id,implied_topic_id) DO UPDATE SET verification_state='verified'",params:[request.topicId,request.targetTopicId,request.contextRuleJson ?? '{}']});
    statements.push(audit(request.topicId!,undefined,'approve',null,{implies:request.targetTopicId},email,request.expectedVersion,now),...await enqueue(deps,request.topicId!,'registry',now));
  } else if (request.action === 'merge' || request.action === 'reverse_merge') {
    if (!validId(request.topicId)||!validId(request.targetTopicId)||request.topicId===request.targetTopicId) return {success:false,error:'Two distinct valid topics are required.'};
    if (!await claimVersion(deps,'topic',request.topicId!,request.expectedVersion)) return stale();
    const before=(await deps.runQuery('SELECT * FROM topics WHERE id=?',[request.topicId]))[0]; if(!before)return {success:false,error:'Topic not found.'};
    if(request.action==='merge') statements.push({sql:"UPDATE topics SET status='merged',verification_state='verified',replaced_by_topic_id=?,updated_at=?,registry_version=registry_version+1 WHERE id=?",params:[request.targetTopicId,now,request.topicId]});
    else statements.push({sql:"UPDATE topics SET status='active',replaced_by_topic_id=NULL,updated_at=?,registry_version=registry_version+1 WHERE id=?",params:[now,request.topicId]});
    statements.push(audit(request.topicId!,undefined,'merge',before,{targetTopicId:request.targetTopicId,reversed:request.action==='reverse_merge'},email,request.expectedVersion,now),...await enqueue(deps,request.topicId!,'merge',now),...await enqueue(deps,request.targetTopicId!,'merge',now));
  } else if (request.action === 'suppress' || request.action === 'restore') {
    if (!validId(request.topicId)) return {success:false,error:'A valid topic is required.'};
    const topicId=request.topicId!; if (!await claimVersion(deps,'topic',topicId,request.expectedVersion)) return stale();
    const before=(await deps.runQuery('SELECT * FROM topics WHERE id=?',[topicId]))[0]; if(!before)return {success:false,error:'Topic not found.'};
    if (request.action==='suppress') {
      if (before.status !== 'active') return {success:false,error:'Only an active topic can be suppressed.'};
      statements.push({sql:"UPDATE topics SET status='deprecated',verification_state='rejected',updated_at=?,registry_version=registry_version+1 WHERE id=?",params:[now,topicId]});
      statements.push(audit(topicId,undefined,'reject',before,{status:'deprecated',verificationState:'rejected'},email,request.expectedVersion,now));
    } else {
      if (before.status !== 'deprecated') return {success:false,error:'Only a deprecated topic can be restored.'};
      statements.push({sql:"UPDATE topics SET status='active',verification_state='published',updated_at=?,registry_version=registry_version+1 WHERE id=?",params:[now,topicId]});
      statements.push(audit(topicId,undefined,'approve',before,{status:'active',verificationState:'published'},email,request.expectedVersion,now));
    }
    statements.push(...await enqueue(deps,topicId,'registry',now));
  } else if (request.action === 'assignment') {
    if (!validId(request.topicId) || !validId(request.clusterId) || !request.role || !['subject','actor','target','operator','location','facility','platform','programme','context'].includes(request.role)) return {success:false,error:'Cluster, topic, and valid role are required.'};
    const assignmentKey=`${request.clusterId}:${request.topicId}`;
    if (!await claimVersion(deps,'assignment',assignmentKey,request.expectedVersion)) return stale();
    const exists = await deps.runQuery('SELECT status,verification_state FROM topics WHERE id=?', [request.topicId]);
    if (!exists[0] || exists[0].status !== 'active' || exists[0].verification_state !== 'published') return {success:false,error:'Assignments require an active published topic.'};
    const current = (await deps.runQuery('SELECT * FROM cluster_topics WHERE cluster_id=? AND topic_id=?', [request.clusterId,request.topicId]))[0];
    if (request.decision === 'reject') {
      if (!current) return {success:false,error:'Assignment not found.'};
      if (Number(current.locked_by_curator) === 1) {
        statements.push(audit(request.topicId,request.clusterId,'unlock',current,{locked:false},email,request.expectedVersion,now));
        statements.push({sql:'UPDATE cluster_topics SET locked_by_curator=0,reviewed_at=? WHERE cluster_id=? AND topic_id=?',params:[now,request.clusterId,request.topicId]});
      }
      statements.push({sql:'DELETE FROM cluster_topics WHERE cluster_id=? AND topic_id=?',params:[request.clusterId,request.topicId]});
      statements.push(audit(request.topicId,request.clusterId,'remove',current,null,email,request.expectedVersion,now));
    } else {
      const runId=id('curator_run'), decisionId=id('curator_decision');
      statements.push({sql:"INSERT INTO topic_assignment_runs (id,cluster_id,content_fingerprint,registry_version,classifier_version,assignment_policy_version,status,started_at,completed_at) VALUES (?,?,?,?,?,'curator-v1','validated',?,?)",params:[runId,request.clusterId,`curator:${decisionId}`,1,'curator-v1',now,now]});
      statements.push({sql:"INSERT INTO cluster_topic_decisions (id,assignment_run_id,cluster_id,topic_id,role,confidence,assignment_source,decision_state,decided_at) VALUES (?,?,?,?,?,1,'curator','accepted',?)",params:[decisionId,runId,request.clusterId,request.topicId,request.role,now]});
      statements.push({sql:"INSERT INTO cluster_topics (cluster_id,topic_id,role,confidence,assignment_source,source_decision_id,locked_by_curator,assignment_run_id,classifier_version,assigned_at,reviewed_at) VALUES (?,?,?,1,'curator',?,?,?,'curator-v1',?,?) ON CONFLICT(cluster_id,topic_id) DO UPDATE SET role=excluded.role,confidence=excluded.confidence,assignment_source='curator',source_decision_id=excluded.source_decision_id,locked_by_curator=excluded.locked_by_curator,assignment_run_id=excluded.assignment_run_id,classifier_version=excluded.classifier_version,assigned_at=excluded.assigned_at,reviewed_at=excluded.reviewed_at",params:[request.clusterId,request.topicId,request.role,decisionId,request.lock?1:0,runId,now,now]});
      statements.push(audit(request.topicId,request.clusterId,request.lock?'lock':'assign',current,{role:request.role,locked:Boolean(request.lock)},email,request.expectedVersion,now));
    }
  } else return {success:false,error:'Unknown governance action.'};
  try { await deps.runBatch(statements); return {success:true}; } catch { return {success:false,error:'Governance mutation failed; no change was committed.'}; }
}
