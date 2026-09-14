import { describe, expect, it, vi } from 'vitest';
import { handleTopicGovernanceRead } from '../../src/services/topicGovernanceReadHandler.js';

function deps(rows: Record<string, unknown>[] = [], authorized = true) {
  const runQuery = vi.fn().mockResolvedValue(rows);
  return { runQuery, verifyAuth: async () => authorized };
}

describe('topic governance read models', () => {
  it('rejects an unauthenticated read before querying anything', async () => {
    const d = deps([], false);
    const result = await handleTopicGovernanceRead({ queue: 'pendingCandidates' }, d, null);
    expect(result.error).toMatch(/Unauthorized/);
    expect(d.runQuery).not.toHaveBeenCalled();
  });

  it('rejects an unknown queue name', async () => {
    const d = deps();
    const result = await handleTopicGovernanceRead({ queue: 'notAQueue' as never }, d, 'cookie');
    expect(result.error).toMatch(/Unknown review queue/);
  });

  it('returns rows for a valid queue', async () => {
    const d = deps([{ id: 'candidate-a' }]);
    const result = await handleTopicGovernanceRead({ queue: 'pendingCandidates' }, d, 'cookie');
    expect(result.success).toBe(true);
    expect(result.rows).toEqual([{ id: 'candidate-a' }]);
  });

  it('returns candidate evidence when candidateEvidenceFor is given', async () => {
    const d = deps([{ source_article_id: 'article-a' }]);
    const result = await handleTopicGovernanceRead({ candidateEvidenceFor: 'candidate-a' }, d, 'cookie');
    expect(result.success).toBe(true);
    expect(d.runQuery).toHaveBeenCalledWith(expect.stringContaining('topic_candidate_evidence'), ['candidate-a', 20]);
  });

  it('returns version 0 when a governed resource has never been mutated', async () => {
    const d = deps([]);
    const result = await handleTopicGovernanceRead({ versionFor: { type: 'topic', id: 'new-topic' } }, d, 'cookie');
    expect(result.success).toBe(true);
    expect(result.rows).toEqual([{ version: 0 }]);
  });

  it('returns the stored version when a governed resource has been mutated before', async () => {
    const d = deps([{ version: 3 }]);
    const result = await handleTopicGovernanceRead({ versionFor: { type: 'topic', id: 'india' } }, d, 'cookie');
    expect(result.rows).toEqual([{ version: 3 }]);
  });

  it('returns an error when no queue or lookup is specified', async () => {
    const d = deps();
    const result = await handleTopicGovernanceRead({}, d, 'cookie');
    expect(result.error).toMatch(/No queue or evidence lookup/);
  });
});
