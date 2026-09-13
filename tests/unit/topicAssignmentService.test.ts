import { describe, expect, it } from 'vitest';
import { reconcileTopicAssignments } from '../../crawler/topicAssignmentService.js';

describe('topic assignment reconciliation', () => {
  it('records model links and provisional discoveries as shadow-only decisions', async () => {
    const requests: unknown[] = [];
    const fetchFn = async (_url: string, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)));
      const body = requests.length === 1
        ? { success: true, result: [{ success: true, results: [] }] }
        : { success: true, result: (JSON.parse(String(init?.body)).batch as unknown[]).map(() => ({ success: true })) };
      return new Response(JSON.stringify(body), { status: 200 });
    };
    await reconcileTopicAssignments({
      clusterId: 'cluster-1', fingerprint: 'fingerprint', registryVersion: 4, publishedTopicIds: new Set(),
      articleMentions: [],
      shadowArticleMentions: [{ sourceArticleId: 'article-1', mention: { topicId: 'jordan', role: 'location', confidence: 0.9, evidenceStart: 49, evidenceEnd: 55, evidenceContentHash: 'hash', mentionKind: 'exact' } }],
      candidates: [], discoveredConcepts: [{ sourceArticleId: 'article-1', name: 'Muwaffaq Salti Air Base', topicType: 'facility', role: 'target', confidence: 0.96, evidenceStart: 20, evidenceEnd: 43, evidenceContentHash: 'hash', candidateId: 'candidate-new-base', createProvisional: true }],
      now: '2026-09-13T00:00:00Z'
    }, { accountId: 'account', databaseId: 'database', apiToken: 'token' }, fetchFn as typeof fetch);
    const batch = (requests[1] as { batch: Array<{ sql: string; params: unknown[] }> }).batch;
    const decisions = batch.filter((statement) => statement.sql.includes('INSERT INTO cluster_topic_decisions'));
    expect(decisions).toHaveLength(2);
    expect(decisions.every((statement) => statement.params.includes('model') && statement.params.includes('shadow'))).toBe(true);
    expect(batch.some((statement) => statement.sql.includes('INSERT INTO cluster_topics'))).toBe(false);
    expect(batch.some((statement) => statement.sql.includes('INSERT OR IGNORE INTO topics'))).toBe(true);
  });

  it('reuses a prior validated run for an unchanged fingerprint instead of writing a new batch', async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      return new Response(JSON.stringify({ success: true, result: [{ success: true, results: [{ id: 'topicrun_prior' }] }] }), { status: 200 });
    };
    const outcome = await reconcileTopicAssignments({
      clusterId: 'cluster-1', fingerprint: 'fingerprint', registryVersion: 4, publishedTopicIds: new Set(['india']),
      articleMentions: [{ sourceArticleId: 'article-1', mention: { topicId: 'india', role: 'actor', confidence: 0.95, evidenceStart: 0, evidenceEnd: 5, evidenceContentHash: 'hash', mentionKind: 'exact' } }],
      shadowArticleMentions: [], candidates: [], discoveredConcepts: [], now: '2026-09-13T00:00:00Z'
    }, { accountId: 'account', databaseId: 'database', apiToken: 'token' }, fetchFn as typeof fetch);
    expect(outcome).toBe('reused');
    expect(calls).toBe(1);
  });

  it('aggregates multiple articles in one cluster down to a single highest-confidence decision per topic', async () => {
    const requests: unknown[] = [];
    const fetchFn = async (_url: string, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)));
      const body = requests.length === 1
        ? { success: true, result: [{ success: true, results: [] }] }
        : { success: true, result: (JSON.parse(String(init?.body)).batch as unknown[]).map(() => ({ success: true })) };
      return new Response(JSON.stringify(body), { status: 200 });
    };
    await reconcileTopicAssignments({
      clusterId: 'cluster-1', fingerprint: 'fingerprint', registryVersion: 4, publishedTopicIds: new Set(['india']),
      articleMentions: [
        { sourceArticleId: 'article-1', mention: { topicId: 'india', role: 'actor', confidence: 0.8, evidenceStart: 0, evidenceEnd: 5, evidenceContentHash: 'hash-1', mentionKind: 'exact' } },
        { sourceArticleId: 'article-2', mention: { topicId: 'india', role: 'actor', confidence: 0.95, evidenceStart: 10, evidenceEnd: 15, evidenceContentHash: 'hash-2', mentionKind: 'exact' } }
      ],
      shadowArticleMentions: [], candidates: [], discoveredConcepts: [], now: '2026-09-13T00:00:00Z'
    }, { accountId: 'account', databaseId: 'database', apiToken: 'token' }, fetchFn as typeof fetch);
    const batch = (requests[1] as { batch: Array<{ sql: string; params: unknown[] }> }).batch;
    const decisions = batch.filter((statement) => statement.sql.includes('INSERT INTO cluster_topic_decisions') && statement.params.includes('india'));
    const assignments = batch.filter((statement) => statement.sql.includes('INSERT INTO cluster_topics') && statement.params.includes('india'));
    expect(decisions).toHaveLength(1);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]!.params).toContain(0.95);
    expect(batch.filter((statement) => statement.sql.includes('INSERT INTO article_topic_mentions'))).toHaveLength(2);
  });

  it('removes stale unlocked assignments outside the desired set but never touches curator-locked rows', async () => {
    const requests: unknown[] = [];
    const fetchFn = async (_url: string, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)));
      const body = requests.length === 1
        ? { success: true, result: [{ success: true, results: [] }] }
        : { success: true, result: (JSON.parse(String(init?.body)).batch as unknown[]).map(() => ({ success: true })) };
      return new Response(JSON.stringify(body), { status: 200 });
    };
    await reconcileTopicAssignments({
      clusterId: 'cluster-1', fingerprint: 'fingerprint', registryVersion: 4, publishedTopicIds: new Set(['india']),
      articleMentions: [{ sourceArticleId: 'article-1', mention: { topicId: 'india', role: 'actor', confidence: 0.95, evidenceStart: 0, evidenceEnd: 5, evidenceContentHash: 'hash', mentionKind: 'exact' } }],
      shadowArticleMentions: [], candidates: [], discoveredConcepts: [], now: '2026-09-13T00:00:00Z'
    }, { accountId: 'account', databaseId: 'database', apiToken: 'token' }, fetchFn as typeof fetch);
    const batch = (requests[1] as { batch: Array<{ sql: string; params: unknown[] }> }).batch;
    const cleanup = batch.find((statement) => statement.sql.includes('DELETE FROM cluster_topics'));
    expect(cleanup?.sql).toContain('locked_by_curator=0');
    expect(cleanup?.sql).toContain('topic_id NOT IN');
    expect(cleanup?.params).toEqual(['cluster-1', 'india']);
    const upsert = batch.find((statement) => statement.sql.includes('INSERT INTO cluster_topics'));
    expect(upsert?.sql).toContain('WHERE cluster_topics.locked_by_curator=0');
  });
});
