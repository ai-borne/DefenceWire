/** Shared edge adapter for the public canonical-topic read routes. */
import { handleTopicRead, TopicReadRequest } from '../../../src/services/topicReadHandler.js';
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '../../../src/services/edgeRateLimiter.js';

interface Statement { bind(...params: unknown[]): Statement; all<T>(): Promise<{ results: T[] }>; }
interface DB { prepare(sql: string): Statement; }
export interface TopicContext { request: Request; env: { DB?: DB; TOPIC_CURSOR_SECRET?: string; TOPIC_API_ENABLED?: string; }; }

/**
 * Cloudflare Pages Functions does not URL-decode dynamic route params — a
 * hashtag lookup like /api/topics/%23Jordan otherwise arrives as the literal
 * "%23Jordan" and fails every downstream check. Decode once at this shared
 * boundary; a malformed sequence falls through unchanged and is rejected by
 * handleTopicRead's own input validation rather than throwing here.
 */
function decodeRawTopic(rawTopic: string | undefined): string | undefined {
  if (rawTopic === undefined) return undefined;
  try { return decodeURIComponent(rawTopic); } catch { return rawTopic; }
}

export async function topicResponse(context: TopicContext, request: TopicReadRequest): Promise<Response> {
  request = { ...request, rawTopic: decodeRawTopic(request.rawTopic) };
  if (context.env.TOPIC_API_ENABLED !== 'true') {
    return new Response(JSON.stringify({ error: 'Topic endpoint not found.' }), { status: 404, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Type': 'application/json' } });
  }
  const rate = checkRateLimit(`topics:${getClientIp(context.request.headers)}`, 60, 60_000);
  const headers: Record<string, string> = { ...getRateLimitHeaders(rate), 'X-Content-Type-Options': 'nosniff', 'Content-Type': 'application/json' };
  if (!rate.allowed) return new Response(JSON.stringify({ error: 'Too many topic requests. Please slow down.' }), { status: 429, headers: { ...headers, 'Cache-Control': 'no-store' } });
  if (!context.env.DB) return new Response(JSON.stringify({ error: 'Topic database is not configured.' }), { status: 503, headers: { ...headers, 'Cache-Control': 'no-store' } });
  const result = await handleTopicRead(request, { runQuery: async (sql, params) => (await context.env.DB!.prepare(sql).bind(...params).all<Record<string, unknown>>()).results }, { cursorSecret: context.env.TOPIC_CURSOR_SECRET });
  if (result.status === 308 && result.redirectTopicId) {
    headers.Location = `/api/topics/${encodeURIComponent(result.redirectTopicId)}`;
    headers['Cache-Control'] = 'public, max-age=300, s-maxage=3600';
    return new Response(null, { status: 308, headers });
  }
  if (result.status === 200) {
    const id = result.data?.topic?.id ?? 'list';
    headers['Cache-Control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';
    headers['Cache-Tag'] = `dw-topic-${id}-r${result.data?.registryVersion ?? 0}-a${result.data?.assignmentVersion ?? 'none'}`;
  } else headers['Cache-Control'] = 'no-store';
  return new Response(JSON.stringify(result.data ?? { error: result.error }), { status: result.status, headers });
}
