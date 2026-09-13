import { describe, expect, it } from 'vitest';
import { handleTopicRead, TopicReadDependencies } from '../../src/services/topicReadHandler.js';

const topic = { id: 'india', display_name: 'India', display_hashtag: '#India', topic_type: 'country', description: null, registry_version: 7, assigned_version: '2026-09-13T10:00:00Z', status: 'active', verification_state: 'published' };
const article = { cluster_id: 'cluster-b', role: 'actor', confidence: 0.9, assignment_source: 'deterministic', assigned_at: '2026-09-13T10:00:00Z', published_at: '2026-09-13T09:00:00Z', primary_source_id: 'article-b', primary_title: 'India update', primary_snippet: 'A source-grounded update', primary_url: 'https://example.test/b', primary_domain: 'example.test', primary_owner_key: 'example' };

function deps(rows: Record<string, unknown>[][]): TopicReadDependencies {
  let call = 0;
  return { runQuery: async () => rows[call++] || [] };
}

describe('topic read handler', () => {
  it('resolves a registered alias and returns only effective published memberships with every corroborating source', async () => {
    const result = await handleTopicRead({ resource: 'articles', rawTopic: 'USA', limit: 20 }, deps([
      [{ ...topic, id: 'united-states' }], [article],
      [{ cluster_id: 'cluster-b', id: 'article-b', title: 'India update', snippet: 'A source-grounded update', canonical_url: 'https://example.test/b', source_domain: 'example.test', coverage_role: 'primary' }, { cluster_id: 'cluster-b', id: 'article-c', title: 'Corroboration', snippet: null, canonical_url: 'https://example.test/c', source_domain: 'official.test', coverage_role: 'related' }],
      [{ cluster_id: 'cluster-b', thread_id: 'thread-1' }]
    ]), { cursorSecret: 'test-secret-is-long-enough' });

    expect(result.status).toBe(200);
    expect(result.data?.topic?.id).toBe('united-states');
    expect(result.data?.articles?.[0]).toMatchObject({ clusterId: 'cluster-b', role: 'actor', relatedThreadIds: ['thread-1'] });
    expect(result.data?.articles?.[0]?.sources).toHaveLength(2);
  });

  it('resolves a canonical display hashtag without trusting it as a database identifier', async () => {
    const result = await handleTopicRead({ resource: 'detail', rawTopic: '#UnitedStates' }, deps([[{ ...topic, id: 'united-states' }]]), { cursorSecret: 'test-secret-is-long-enough' });
    expect(result.data?.topic?.id).toBe('united-states');
  });

  it('uses a signed cursor to retain a stable tie-breaker and rejects tampering', async () => {
    const first = await handleTopicRead({ resource: 'articles', rawTopic: 'india', limit: 1 }, deps([[topic], [article], [], []]), { cursorSecret: 'test-secret-is-long-enough' });
    const cursor = first.data?.nextCursor;
    expect(cursor).toBeTruthy();
    if (!cursor) throw new Error('Expected pagination cursor');

    const second = await handleTopicRead({ resource: 'articles', rawTopic: 'india', limit: 1, cursor }, deps([[topic], [], [], []]), { cursorSecret: 'test-secret-is-long-enough' });
    expect(second.status).toBe(200);

    const invalid = await handleTopicRead({ resource: 'articles', rawTopic: 'india', cursor: `${cursor}x` }, deps([[topic]]), { cursorSecret: 'test-secret-is-long-enough' });
    expect(invalid).toMatchObject({ status: 400, error: 'Invalid cursor.' });
  });

  it('redirects deprecated topics and never queries a provisional or rejected topic collection', async () => {
    const redirect = await handleTopicRead({ resource: 'detail', rawTopic: 'old-india' }, deps([[{ ...topic, id: 'old-india', status: 'deprecated', replaced_by_topic_id: 'india' }], [topic]]), { cursorSecret: 'test-secret-is-long-enough' });
    expect(redirect).toMatchObject({ status: 308, redirectTopicId: 'india' });

    const hidden = await handleTopicRead({ resource: 'detail', rawTopic: 'candidate' }, deps([[]]), { cursorSecret: 'test-secret-is-long-enough' });
    expect(hidden).toMatchObject({ status: 404, error: 'Topic not found.' });
  });
});
