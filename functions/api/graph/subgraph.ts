/**
 * Cloudflare Pages Function: GET /api/graph/subgraph
 * Thin runtime adapter wiring Cloudflare D1 to the edge-agnostic handleGetSubgraph.
 * Hard limit: <= 300 LOC.
 */

import { handleGetSubgraph } from '../../../src/services/graphQueryHandler.js';
import {
  checkRateLimit,
  getClientIp,
  getRateLimitHeaders
} from '../../../src/services/edgeRateLimiter.js';
import { EpistemicState, NodeCategory } from '../../../src/types/graph.js';

interface D1PreparedStatement {
  bind: (...params: unknown[]) => D1PreparedStatement;
  all: <T>() => Promise<{ results: T[] }>;
}

interface D1Database {
  prepare: (sql: string) => D1PreparedStatement;
}

interface PagesFunctionContext {
  request: Request;
  env: { DB?: D1Database };
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const clientIp = getClientIp(context.request.headers);
  const rateLimitKey = `graph_subgraph:${clientIp}`;
  const rateLimit = checkRateLimit(rateLimitKey, 60, 60_000);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return Response.json(
      { nodes: [], edges: [], totalNodes: 0, totalEdges: 0, generatedAt: new Date().toISOString(), error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const url = new URL(context.request.url);
  const centerNodeId = url.searchParams.get('centerNodeId') || undefined;
  const hops = Number(url.searchParams.get('hops')) || 2;
  const limit = Number(url.searchParams.get('limit')) || 100;
  const startDate = url.searchParams.get('startDate') || undefined;
  const endDate = url.searchParams.get('endDate') || undefined;
  const minWeight = url.searchParams.get('minWeight') ? Number(url.searchParams.get('minWeight')) : undefined;

  const categoryParam = url.searchParams.get('category');
  const categories = categoryParam
    ? (categoryParam.split(',').map((c) => c.trim()) as NodeCategory[])
    : undefined;

  const stateParam = url.searchParams.get('state');
  const epistemicStates = stateParam
    ? (stateParam.split(',').map((s) => s.trim().toUpperCase()) as EpistemicState[])
    : undefined;

  const db = context.env.DB;
  if (!db) {
    return Response.json(
      { nodes: [], edges: [], totalNodes: 0, totalEdges: 0, generatedAt: new Date().toISOString(), error: 'Knowledge graph database is not configured.' },
      { status: 503, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const result = await handleGetSubgraph(
    {
      centerNodeId,
      maxHops: hops,
      limit,
      startDate,
      endDate,
      categories,
      epistemicStates,
      minWeight
    },
    {
      runQuery: async (sql, params) => {
        const { results } = await db.prepare(sql).bind(...params).all();
        return results;
      }
    }
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    ...rateLimitHeaders
  };

  if (!result.error) {
    headers['Cache-Control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';
  } else {
    headers['Cache-Control'] = 'no-store';
  }

  return new Response(JSON.stringify(result), {
    status: result.error ? 500 : 200,
    headers
  });
}
