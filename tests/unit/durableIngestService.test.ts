import { describe, expect, it, vi } from 'vitest';
import { persistDurableInput } from '../../crawler/durableIngestService.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const config = {
  d1: { accountId: 'account', databaseId: 'database', apiToken: 'token' },
  r2: { accountId: 'account', accessKeyId: 'key', secretAccessKey: 'secret', bucketName: 'bucket' }
};

function fixture(): { articles: StorySourceItem[]; clusters: StoryCluster[] } {
  const item: StorySourceItem = {
    id: 'feed-a', title: 'Army tests Zorawar tank', url: 'https://example.com/zorawar',
    sourceName: 'Example', sourceDomain: 'example.com', tier: SourceTier.TIER_2_NATIONAL,
    publishedAt: '2026-09-13T08:00:00Z', snippet: 'The Army tested Zorawar.'
  };
  return { articles: [item], clusters: [{
    id: 'temporary', synthesizedHeadline: item.title, primarySource: item,
    relatedCoverage: [], discussions: [], categories: ['army'], entities: ['Zorawar'],
    defenceScore: 80, isLeadStory: true, createdAt: item.publishedAt, updatedAt: item.publishedAt
  }] };
}

function d1Harness(clusterFailures = 0) {
  let status: string | null = null;
  const calls: string[] = [];
  const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    if (body.batch) {
      const sql = body.batch.map((item: { sql: string }) => item.sql).join('\n');
      calls.push(sql.includes('INSERT INTO story_clusters') ? `d1-clusters\n${sql}` : sql);
      if (clusterFailures > 0 && sql.includes('INSERT INTO story_clusters')) {
        clusterFailures--;
        return new Response('{}', { status: 500 });
      }
      const failure = body.batch.find((item: { sql: string }) => item.sql.includes("SET status = 'failed_retryable'"));
      if (failure) status = 'failed_retryable';
      return Response.json({ success: true, result: body.batch.map(() => ({ success: true })) });
    }
    const sql = String(body.sql);
    if (sql.includes('FROM story_clusters')) calls.push(sql);
    if (sql.includes('FROM ingestion_cluster_manifest')) return d1Rows([]);
    if (sql.includes('FROM story_clusters')) return d1Rows([]);
    if (sql.includes('INSERT INTO ingestion_runs')) status ??= 'started';
    if (sql.includes('SELECT id, status, retry_count')) {
      return d1Rows(status ? [{ id: 'run', status, retry_count: 0 }] : []);
    }
    if (sql.includes('SET status = ?')) status = body.params[0];
    return d1Rows([]);
  });
  return { fetchFn: fetchFn as unknown as typeof fetch, calls, getStatus: () => status };
}

function d1Rows(rows: Record<string, unknown>[]): Response {
  return Response.json({ success: true, result: [{ success: true, results: rows }] });
}

describe('durable ingestion service', () => {
  it('writes R2 before exposing the D1 cluster reference and reaches clusters_persisted', async () => {
    const harness = d1Harness();
    const put = vi.fn(async () => {
      harness.calls.push('r2');
      return { ok: true, status: 200 };
    });
    const data = fixture();
    const result = await persistDurableInput(data.articles, data.clusters, config, {
      fetchFn: harness.fetchFn, putClusterJsonFn: put,
      mintUuid: () => '00000000-0000-4000-8000-000000000001'
    });

    expect(harness.calls.indexOf('r2')).toBeLessThan(
      harness.calls.findIndex((call) => call.startsWith('d1-clusters'))
    );
    expect(harness.getStatus()).toBe('clusters_persisted');
    expect(result.clusters[0]?.id).toBe('cluster_00000000-0000-4000-8000-000000000001');
  });

  it('fails the run and leaves a detectable orphan candidate after D1 rejects cluster metadata', async () => {
    const harness = d1Harness(1);
    const put = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const data = fixture();

    await expect(persistDurableInput(data.articles, data.clusters, config, {
      fetchFn: harness.fetchFn, putClusterJsonFn: put,
      mintUuid: () => '00000000-0000-4000-8000-000000000002'
    })).rejects.toThrow('D1 transactional batch failed');

    expect(put).toHaveBeenCalledOnce();
    expect(harness.calls.some((sql) => sql.includes('ingestion_orphan_candidates'))).toBe(true);
    expect(harness.getStatus()).toBe('failed_retryable');
  });

  it('surfaces the D1 error detail instead of just the HTTP status when a batch is rejected', async () => {
    const data = fixture();
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (body.batch?.some((item: { sql: string }) => item.sql.includes('ingestion_cluster_manifest'))) {
        return new Response(JSON.stringify({ success: false, errors: [{ code: 7500, message: 'too many SQL variables' }] }), { status: 400 });
      }
      if (body.sql?.includes('SELECT id, status, retry_count')) return d1Rows([]);
      return d1Rows([]);
    });
    await expect(persistDurableInput(data.articles, data.clusters, config, {
      fetchFn: fetchFn as unknown as typeof fetch, putClusterJsonFn: vi.fn(), mintUuid: () => '00000000-0000-4000-8000-000000000004'
    })).rejects.toThrow('too many SQL variables');
  });

  it('blocks D1 cluster visibility when R2 fails', async () => {
    const harness = d1Harness();
    const data = fixture();
    await expect(persistDurableInput(data.articles, data.clusters, config, {
      fetchFn: harness.fetchFn,
      putClusterJsonFn: vi.fn().mockResolvedValue({ ok: false, status: 503 }),
      mintUuid: () => '00000000-0000-4000-8000-000000000003'
    })).rejects.toThrow('R2 payload write failed');
    expect(harness.calls.some((call) => call.startsWith('d1-clusters'))).toBe(false);
    expect(harness.getStatus()).toBe('failed_retryable');
  });

  it('adopts the deterministic R2 orphan safely on retry without minting another cluster', async () => {
    const harness = d1Harness(1);
    const put = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const data = fixture();
    const deps = {
      fetchFn: harness.fetchFn, putClusterJsonFn: put,
      mintUuid: () => '00000000-0000-4000-8000-000000000004'
    };
    await expect(persistDurableInput(data.articles, data.clusters, config, deps)).rejects.toThrow();
    const retried = await persistDurableInput(data.articles, data.clusters, config, deps);

    expect(retried.clusters[0]?.id).toBe('cluster_00000000-0000-4000-8000-000000000004');
    expect(harness.calls.some((sql) => sql.includes("resolution_state = 'adopted'"))).toBe(true);
    expect(harness.getStatus()).toBe('clusters_persisted');
  });

  it('does no article, blob, or cluster mutation after an already persisted rerun', async () => {
    const harness = d1Harness();
    const put = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const data = fixture();
    const deps = {
      fetchFn: harness.fetchFn, putClusterJsonFn: put,
      mintUuid: () => '00000000-0000-4000-8000-000000000005'
    };
    await persistDurableInput(data.articles, data.clusters, config, deps);
    const callsAfterFirstRun = harness.calls.length;
    await persistDurableInput(data.articles, data.clusters, config, deps);

    expect(put).toHaveBeenCalledOnce();
    expect(harness.calls.slice(callsAfterFirstRun)
      .some((call) => call.startsWith('d1-clusters'))).toBe(false);
  });

  it('chunks the existing-membership lookup so no single D1 statement exceeds the bound-parameter limit', async () => {
    const harness = d1Harness();
    const put = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const item = (index: number): StorySourceItem => ({
      id: `feed-${index}`, title: `Army tests platform ${index}`, url: `https://example.com/story-${index}`,
      sourceName: 'Example', sourceDomain: 'example.com', tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-09-13T08:00:00Z', snippet: `Defence report ${index}`
    });
    const articles = Array.from({ length: 95 }, (_, index) => item(index));
    const clusters: StoryCluster[] = articles.map((article, index) => ({
      id: `temporary-${index}`, synthesizedHeadline: article.title, primarySource: article,
      relatedCoverage: [], discussions: [], categories: ['army'], entities: [],
      defenceScore: 80, isLeadStory: index === 0, createdAt: article.publishedAt, updatedAt: article.publishedAt
    }));

    await persistDurableInput(articles, clusters, config, {
      fetchFn: harness.fetchFn, putClusterJsonFn: put,
      mintUuid: () => '00000000-0000-4000-8000-000000000006'
    });

    const lookupCalls = harness.calls.filter((sql) => sql.includes('FROM story_clusters'));
    expect(lookupCalls.length).toBeGreaterThan(1);
    for (const sql of lookupCalls) {
      expect((sql.match(/\?/g) ?? []).length).toBeLessThanOrEqual(90);
    }
  });
});
