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
});
