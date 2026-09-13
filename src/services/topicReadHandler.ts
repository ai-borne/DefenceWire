/** Public, D1-only canonical-topic collection handler. */
import { TopicAssignmentRole, TopicType } from '../types/topics.js';
import { decodeTopicCursor, encodeTopicCursor, TopicCursorKind } from './topicReadCursor.js';
import {
  buildClusterSourcesStatement, buildClusterThreadIdsStatement, buildListPublicTopicsStatement,
  buildRelatedTopicsStatement, buildResolvePublicTopicStatement, buildResolveTopicRedirectStatement,
  buildTopicArticleStatement
} from './topicReadQueryBuilder.js';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

interface TopicRow extends Record<string, unknown> {
  id: string; display_name: string; display_hashtag: string; topic_type: TopicType; description: string | null;
  registry_version: number; assigned_version: string; status?: string; verification_state?: string;
  replaced_by_topic_id?: string | null; display_priority?: number;
}
interface ArticleRow extends Record<string, unknown> {
  cluster_id: string; role: TopicAssignmentRole; confidence: number; assignment_source: string; assigned_at: string;
  published_at: string; primary_source_id: string; primary_title: string; primary_snippet: string | null;
  primary_url: string | null; primary_domain: string; primary_owner_key: string;
}
interface SourceRow extends Record<string, unknown> { cluster_id: string; id: string; title: string; snippet: string | null; canonical_url: string | null; source_domain: string; coverage_role: 'primary' | 'related' | 'social'; }

export interface TopicReadDependencies { runQuery(sql: string, params: unknown[]): Promise<Record<string, unknown>[]>; }
export interface TopicReadRequest { resource: 'list' | 'detail' | 'articles' | 'related'; rawTopic?: string; limit?: number; cursor?: string; }
export interface TopicReadOptions { cursorSecret?: string; }
export interface PublicTopic { id: string; displayName: string; displayHashtag: string; topicType: TopicType; description: string | null; registryVersion: number; }
export interface TopicReadResult { status: number; data?: { topic?: PublicTopic; topics?: PublicTopic[]; articles?: PublicTopicArticle[]; related?: Array<PublicTopic & { relationType: string }>; nextCursor?: string | null; registryVersion?: number; assignmentVersion?: string; }; error?: string; redirectTopicId?: string; }
export interface PublicTopicArticle { clusterId: string; role: TopicAssignmentRole; confidence: number; assignmentSource: string; assignedAt: string; publishedAt: string; primarySource: PublicSource; sources: PublicSource[]; relatedThreadIds: string[]; }
export interface PublicSource { id: string; title: string; snippet: string | null; canonicalUrl: string | null; sourceDomain: string; coverageRole: 'primary' | 'related' | 'social'; }

function cleanLookup(raw: string | undefined): { id: string; alias: string; displayHashtag: string } | null {
  if (!raw || raw.length > 120) return null;
  const value = raw.normalize('NFKC').trim().replace(/^#/, '');
  if (!value || /[\x00-\x1F\x7F]/.test(value)) return null;
  const alias = value.toLocaleLowerCase('en-US').replace(/[.‐‑‒–—−]/g, '-').replace(/[_\s-]+/g, ' ').trim();
  const id = value.toLocaleLowerCase('en-US');
  if (!alias || alias.length > 100 || !/^[a-z0-9-]+$/.test(id)) return null;
  return { id, alias, displayHashtag: `#${id.replace(/-/g, '')}` };
}

function topic(row: TopicRow): PublicTopic {
  return { id: row.id, displayName: row.display_name, displayHashtag: row.display_hashtag, topicType: row.topic_type, description: row.description, registryVersion: row.registry_version };
}

function limit(value: number | undefined): number { return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(value ?? DEFAULT_LIMIT) || DEFAULT_LIMIT)); }

async function resolve(rawTopic: string | undefined, deps: TopicReadDependencies): Promise<{ row?: TopicRow; redirect?: string; error?: string }> {
  const lookup = cleanLookup(rawTopic);
  if (!lookup) return { error: 'Invalid topic identifier.' };
  const statement = buildResolvePublicTopicStatement(lookup.id, lookup.alias, lookup.displayHashtag);
  const match = (await deps.runQuery(statement.sql, statement.params))[0] as TopicRow | undefined;
  if (!match) return { error: 'Topic not found.' };
  if (match.status === 'active' && match.verification_state === 'published') return { row: match };
  if (!match.replaced_by_topic_id) return { error: 'Topic not found.' };
  const redirectStatement = buildResolveTopicRedirectStatement(match.id);
  const resolved = (await deps.runQuery(redirectStatement.sql, redirectStatement.params))[0] as TopicRow | undefined;
  return resolved ? { row: resolved, redirect: resolved.id } : { error: 'Topic not found.' };
}

async function cursor(request: TopicReadRequest, row: TopicRow, kind: TopicCursorKind, secret: string): Promise<{ value?: Awaited<ReturnType<typeof decodeTopicCursor>>; error?: string }> {
  if (!request.cursor) return {};
  const value = await decodeTopicCursor(request.cursor, secret, kind, row.registry_version, row.assigned_version);
  return value ? { value } : { error: 'Invalid cursor.' };
}

export async function handleTopicRead(request: TopicReadRequest, deps: TopicReadDependencies, options: TopicReadOptions = {}): Promise<TopicReadResult> {
  const secret = options.cursorSecret;
  if (!secret || secret.length < 16) return { status: 503, error: 'Topic collections are not configured.' };
  try {
    if (request.resource === 'list') return await listTopics(request, deps, secret);
    const resolved = await resolve(request.rawTopic, deps);
    if (resolved.error) return { status: resolved.error.startsWith('Invalid') ? 400 : 404, error: resolved.error };
    if (resolved.redirect) return { status: 308, redirectTopicId: resolved.redirect };
    const current = resolved.row!;
    if (request.resource === 'detail') return { status: 200, data: { topic: topic(current), registryVersion: current.registry_version, assignmentVersion: current.assigned_version } };
    if (request.resource === 'related') return related(current, deps);
    return articles(request, current, deps, secret);
  } catch {
    return { status: 500, error: 'Topic query failed.' };
  }
}

async function listTopics(request: TopicReadRequest, deps: TopicReadDependencies, secret: string): Promise<TopicReadResult> {
  const requestedLimit = limit(request.limit);
  const versionRow = (await deps.runQuery('SELECT COALESCE(MAX(registry_version), 0) AS registry_version, COALESCE((SELECT MAX(assigned_at) FROM cluster_topics), \'\') AS assigned_version FROM topics WHERE status=\'active\' AND verification_state=\'published\'', []))[0] as { registry_version: number; assigned_version: string } | undefined;
  const registryVersion = versionRow?.registry_version ?? 0;
  const assignmentVersion = versionRow?.assigned_version ?? '';
  const decoded = request.cursor ? await decodeTopicCursor(request.cursor, secret, 'topics', registryVersion, assignmentVersion) : null;
  if (request.cursor && !decoded) return { status: 400, error: 'Invalid cursor.' };
  const statement = buildListPublicTopicsStatement(requestedLimit, decoded ? { priority: decoded.priority!, topicId: decoded.topicId! } : undefined);
  const rows = await deps.runQuery(statement.sql, statement.params) as TopicRow[];
  const last = rows[rows.length - 1];
  return { status: 200, data: { topics: rows.map(topic), registryVersion, assignmentVersion, nextCursor: last && rows.length === requestedLimit ? await encodeTopicCursor({ v: 1, kind: 'topics', registryVersion, assignmentVersion, priority: last.display_priority ?? 0, topicId: last.id }, secret) : null } };
}

async function articles(request: TopicReadRequest, current: TopicRow, deps: TopicReadDependencies, secret: string): Promise<TopicReadResult> {
  const decoded = await cursor(request, current, 'articles', secret);
  if (decoded.error) return { status: 400, error: decoded.error };
  const requestedLimit = limit(request.limit);
  const statement = buildTopicArticleStatement(current.id, requestedLimit, decoded.value ? { publishedAt: decoded.value.publishedAt!, clusterId: decoded.value.clusterId! } : undefined);
  const rows = await deps.runQuery(statement.sql, statement.params) as ArticleRow[];
  const ids = rows.map((row) => row.cluster_id);
  const sourceStatement = ids.length ? buildClusterSourcesStatement(ids) : null;
  const threadStatement = ids.length ? buildClusterThreadIdsStatement(ids) : null;
  const sourceRows = sourceStatement ? await deps.runQuery(sourceStatement.sql, sourceStatement.params) as SourceRow[] : [];
  const threadRows = threadStatement ? await deps.runQuery(threadStatement.sql, threadStatement.params) as Array<{ cluster_id: string; thread_id: string }> : [];
  const sources = new Map<string, PublicSource[]>();
  for (const source of sourceRows) sources.set(source.cluster_id, [...(sources.get(source.cluster_id) ?? []), { id: source.id, title: source.title, snippet: source.snippet, canonicalUrl: source.canonical_url, sourceDomain: source.source_domain, coverageRole: source.coverage_role }]);
  const threads = new Map<string, string[]>();
  for (const item of threadRows) threads.set(item.cluster_id, [...(threads.get(item.cluster_id) ?? []), item.thread_id]);
  const result = rows.map((row) => ({ clusterId: row.cluster_id, role: row.role, confidence: row.confidence, assignmentSource: row.assignment_source, assignedAt: row.assigned_at, publishedAt: row.published_at, primarySource: { id: row.primary_source_id, title: row.primary_title, snippet: row.primary_snippet, canonicalUrl: row.primary_url, sourceDomain: row.primary_domain, coverageRole: 'primary' as const }, sources: sources.get(row.cluster_id) ?? [], relatedThreadIds: threads.get(row.cluster_id) ?? [] }));
  const last = rows[rows.length - 1];
  return { status: 200, data: { topic: topic(current), articles: result, registryVersion: current.registry_version, assignmentVersion: current.assigned_version, nextCursor: last && rows.length === requestedLimit ? await encodeTopicCursor({ v: 1, kind: 'articles', registryVersion: current.registry_version, assignmentVersion: current.assigned_version, publishedAt: last.published_at, clusterId: last.cluster_id }, secret) : null } };
}

async function related(current: TopicRow, deps: TopicReadDependencies): Promise<TopicReadResult> {
  const statement = buildRelatedTopicsStatement(current.id);
  const rows = await deps.runQuery(statement.sql, statement.params) as Array<TopicRow & { relation_type: string }>;
  return { status: 200, data: { topic: topic(current), related: rows.map((row) => ({ ...topic(row), relationType: row.relation_type })), registryVersion: current.registry_version, assignmentVersion: current.assigned_version } };
}
