/** Authenticated, curator-only orchestration for Topic Governance review queues and evidence. */
import {
  buildProvisionalTopicsStatement, buildPendingCandidatesStatement, buildAliasCollisionsStatement,
  buildNearDuplicateCandidatesStatement, buildAssignmentDisagreementsStatement,
  buildCandidateEvidenceStatement, buildSourceIndependenceStatement, buildAssignmentDiffStatement,
  buildGovernanceVersionStatement
} from './topicGovernanceQueryBuilder.js';

export type QueueName = 'provisionalTopics' | 'pendingCandidates' | 'aliasCollisions' | 'nearDuplicateCandidates' | 'assignmentDisagreements';
export type GovernanceResourceType = 'candidate' | 'topic' | 'alias' | 'implication' | 'assignment';

export interface TopicGovernanceReadRequest {
  queue?: QueueName;
  candidateEvidenceFor?: string;
  sourceIndependenceFor?: string;
  assignmentDiffFor?: { clusterId: string; topicId: string };
  versionFor?: { type: GovernanceResourceType; id: string };
}
export interface TopicGovernanceReadDependencies {
  runQuery(sql: string, params: unknown[]): Promise<Record<string, unknown>[]>;
  verifyAuth?(cookie: string | null): Promise<boolean>;
}
export interface TopicGovernanceReadResult { success: boolean; error?: string; rows?: Record<string, unknown>[]; }

const QUEUE_BUILDERS: Record<QueueName, () => { sql: string; params: unknown[] }> = {
  provisionalTopics: buildProvisionalTopicsStatement,
  pendingCandidates: buildPendingCandidatesStatement,
  aliasCollisions: buildAliasCollisionsStatement,
  nearDuplicateCandidates: buildNearDuplicateCandidatesStatement,
  assignmentDisagreements: buildAssignmentDisagreementsStatement
};

export async function handleTopicGovernanceRead(
  request: TopicGovernanceReadRequest,
  deps: TopicGovernanceReadDependencies,
  cookie: string | null
): Promise<TopicGovernanceReadResult> {
  if (!deps.verifyAuth || !(await deps.verifyAuth(cookie))) {
    return { success: false, error: 'Unauthorized: Valid curator session required.' };
  }
  if (request.queue) {
    const builder = QUEUE_BUILDERS[request.queue];
    if (!builder) return { success: false, error: 'Unknown review queue.' };
    const { sql, params } = builder();
    return { success: true, rows: await deps.runQuery(sql, params) };
  }
  if (request.candidateEvidenceFor) {
    const { sql, params } = buildCandidateEvidenceStatement(request.candidateEvidenceFor);
    return { success: true, rows: await deps.runQuery(sql, params) };
  }
  if (request.sourceIndependenceFor) {
    const { sql, params } = buildSourceIndependenceStatement(request.sourceIndependenceFor);
    return { success: true, rows: await deps.runQuery(sql, params) };
  }
  if (request.assignmentDiffFor) {
    const { clusterId, topicId } = request.assignmentDiffFor;
    const { sql, params } = buildAssignmentDiffStatement(clusterId, topicId);
    return { success: true, rows: await deps.runQuery(sql, params) };
  }
  if (request.versionFor) {
    const { type, id } = request.versionFor;
    const { sql, params } = buildGovernanceVersionStatement(type, id);
    const rows = await deps.runQuery(sql, params);
    return { success: true, rows: rows.length ? rows : [{ version: 0 }] };
  }
  return { success: false, error: 'No queue or evidence lookup specified.' };
}
