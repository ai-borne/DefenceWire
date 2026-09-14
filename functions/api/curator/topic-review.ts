/** Curator-only Topic Governance review-queue and evidence reads; never cached, never public. */
import { handleTopicGovernanceRead, TopicGovernanceReadDependencies, TopicGovernanceReadRequest, QueueName, GovernanceResourceType } from '../../../src/services/topicGovernanceReadHandler.js';
import { verifyCuratorAuthorization } from '../../../src/services/curatorAuthHandler.js';
interface Statement { bind(...params: unknown[]): Statement; all<T>(): Promise<{results:T[]}>; }
interface DB { prepare(sql:string): Statement; }
interface Context { request: Request; env: { DB?: DB; CURATOR_SESSION_SECRET?:string; CURATOR_SESSION_EPOCH?:string; CURATOR_TEAM_DOMAIN?:string; }; }
const QUEUE_NAMES: QueueName[] = ['provisionalTopics', 'pendingCandidates', 'aliasCollisions', 'nearDuplicateCandidates', 'assignmentDisagreements'];
const RESOURCE_TYPES: GovernanceResourceType[] = ['candidate', 'topic', 'alias', 'implication', 'assignment'];

function dependencies(context: Context, authorized: boolean): TopicGovernanceReadDependencies {
  const db = context.env.DB!;
  return {
    verifyAuth: async () => authorized,
    runQuery: async (sql, params) => (await db.prepare(sql).bind(...params).all<Record<string, unknown>>()).results
  };
}
function response(result: { success: boolean; error?: string }, authorized: boolean): Response {
  return Response.json(result, { status: result.success ? 200 : authorized ? 400 : 401, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
function parseRequest(url: URL): TopicGovernanceReadRequest {
  const queue = url.searchParams.get('queue');
  const candidateEvidenceFor = url.searchParams.get('candidateEvidenceFor');
  const sourceIndependenceFor = url.searchParams.get('sourceIndependenceFor');
  const clusterId = url.searchParams.get('assignmentDiffClusterId');
  const topicId = url.searchParams.get('assignmentDiffTopicId');
  const versionForType = url.searchParams.get('versionForType');
  const versionForId = url.searchParams.get('versionForId');
  return {
    queue: queue && (QUEUE_NAMES as string[]).includes(queue) ? (queue as QueueName) : undefined,
    candidateEvidenceFor: candidateEvidenceFor || undefined,
    sourceIndependenceFor: sourceIndependenceFor || undefined,
    assignmentDiffFor: clusterId && topicId ? { clusterId, topicId } : undefined,
    versionFor: versionForType && versionForId && (RESOURCE_TYPES as string[]).includes(versionForType)
      ? { type: versionForType as GovernanceResourceType, id: versionForId }
      : undefined
  };
}
export async function onRequestGet(context: Context): Promise<Response> {
  if (!context.env.DB) return Response.json({ success: false, error: 'D1 database not configured' }, { status: 503 });
  const auth = await verifyCuratorAuthorization(context.request.headers, context.request.headers.get('cookie'), context.env.CURATOR_SESSION_SECRET, context.env.CURATOR_TEAM_DOMAIN, globalThis.fetch, context.env.CURATOR_SESSION_EPOCH);
  const url = new URL(context.request.url);
  const result = await handleTopicGovernanceRead(parseRequest(url), dependencies(context, auth.authorized), context.request.headers.get('cookie'));
  return response(result, auth.authorized);
}
