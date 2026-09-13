import { describe, expect, it, vi } from 'vitest';
import { backfillHistoricalTopics } from '../../crawler/topicHistoricalBackfill.js';

const d1 = { accountId: 'account', databaseId: 'database', apiToken: 'token' };
const r2 = { accountId: 'account', accessKeyId: 'key', secretAccessKey: 'secret', bucketName: 'bucket' };

function response(rows: Record<string, unknown>[] = []): Response {
  const body = { success: true, result: [{ success: true, results: rows }] };
  return { ok: true, status: 200, text: async () => JSON.stringify(body), json: async () => body } as unknown as Response;
}

describe('historical topic backfill', () => {
  it('reads archived R2 evidence, classifies a missing cluster, and reports before/after assignment counts', async () => {
    let assignments = 0;
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('r2.cloudflarestorage.com')) {
        return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'cluster-iran', hashtags: ['#Iran', '#UnreviewedVariant'] }) } as unknown as Response;
      }
      const body = JSON.parse(String(init?.body)) as { sql?: string; batch?: unknown[] };
      if (body.batch) { assignments = 1; return response(body.batch.map(() => ({}))); }
      const sql = body.sql ?? '';
      if (sql.includes('FROM topics WHERE')) return response([{ id: 'iran', display_name: 'Iran', display_hashtag: '#Iran', topic_type: 'country', description: null, status: 'active', verification_state: 'published', display_priority: 1, registry_version: 3, replaced_by_topic_id: null }]);
      if (sql.includes('FROM topic_aliases')) return response([{ normalized_alias: 'iran', topic_id: 'iran', alias_type: 'canonical', requires_context: 0, context_rule_json: null, verification_state: 'published' }]);
      if (sql.includes('FROM topic_relations') || sql.includes('FROM topic_implication_rules')) return response();
      if (sql.includes('SELECT sc.id')) return response(assignments ? [] : [{ id: 'cluster-iran', is_archived: 1 }]);
      if (sql.includes('COUNT(*) AS count')) return response([{ count: assignments }]);
      if (sql.includes('FROM cluster_sources')) return response([{ id: 'article-iran', canonical_url: 'https://example.test/iran', original_url: null, source_domain: 'example.test', title: 'Iran launches a missile', snippet: null, published_at: '2026-09-01T00:00:00Z', content_hash: 'article-hash' }]);
      if (sql.includes('FROM topic_assignment_runs WHERE')) return response();
      return response();
    });

    const result = await backfillHistoricalTopics(d1, r2, 25, { fetchFn: fetchFn as typeof fetch, now: () => new Date('2026-09-13T00:00:00Z') });

    expect(result).toEqual({ scanned: 1, validated: 1, reused: 0, failed: 0, beforeAssignments: 0, afterAssignments: 1 });
    expect(fetchFn.mock.calls.some(([url]) => String(url).includes('r2.cloudflarestorage.com'))).toBe(true);
    expect(fetchFn.mock.calls.some(([, init]) => String(init?.body).includes("DELETE FROM topic_backfill_failures"))).toBe(true);
    expect(fetchFn.mock.calls.some(([, init]) => String(init?.body).includes('"migration"'))).toBe(true);
    expect(fetchFn.mock.calls.some(([, init]) => String(init?.body).includes("legacy_source,legacy_source_id"))).toBe(true);

    const second = await backfillHistoricalTopics(d1, r2, 25, { fetchFn: fetchFn as typeof fetch, now: () => new Date('2026-09-13T00:00:00Z') });
    expect(second).toEqual({ scanned: 0, validated: 0, reused: 0, failed: 0, beforeAssignments: 1, afterAssignments: 1 });
  });

  it('records an unavailable archived payload as retryable work without attempting classification', async () => {
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('r2.cloudflarestorage.com')) return { ok: false, status: 503 } as Response;
      const sql = (JSON.parse(String(init?.body)) as { sql?: string }).sql ?? '';
      if (sql.includes('FROM topics WHERE')) return response([{ id: 'iran', display_name: 'Iran', display_hashtag: '#Iran', topic_type: 'country', description: null, status: 'active', verification_state: 'published', display_priority: 1, registry_version: 3, replaced_by_topic_id: null }]);
      if (sql.includes('SELECT sc.id')) return response([{ id: 'cluster-missing', is_archived: 1 }]);
      if (sql.includes('COUNT(*) AS count')) return response([{ count: 0 }]);
      return response();
    });

    const result = await backfillHistoricalTopics(d1, r2, 1, { fetchFn: fetchFn as typeof fetch });

    expect(result.scanned).toBe(1);
    expect(result.failed).toBe(1);
    expect(fetchFn.mock.calls.some(([, init]) => String(init?.body).includes('INSERT INTO topic_backfill_failures'))).toBe(true);
    expect(fetchFn.mock.calls.some(([, init]) => String(init?.body).includes('FROM cluster_sources'))).toBe(false);
  });
});
