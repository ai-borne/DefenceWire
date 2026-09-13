import { describe, expect, it, vi } from 'vitest';
import { handleTopicGovernance, previewTopicGovernance } from '../../src/services/topicGovernanceHandler.js';

function deps(rows: Record<string, unknown>[][] = []) {
  const runQuery = vi.fn().mockImplementation(async () => rows.shift() ?? []);
  const runBatch = vi.fn().mockResolvedValue(undefined);
  return { runQuery, runBatch, verifyAuth: async () => true };
}

describe('topic governance', () => {
  it('rejects unauthenticated governance mutations before reading or writing', async () => {
    const d = { ...deps(), verifyAuth: async () => false };
    const result = await handleTopicGovernance({ action:'topic', expectedVersion:0, topicId:'india', displayName:'India' }, d, null, 'x');
    expect(result.error).toMatch(/Unauthorized/); expect(d.runBatch).not.toHaveBeenCalled();
  });

  it('rejects stale topic edits and does not silently overwrite a newer curator decision', async () => {
    const d = deps([[{ version: 2 }]]);
    const result = await handleTopicGovernance({ action:'topic', expectedVersion:1, topicId:'india', displayName:'India Updated' }, d, 'cookie', 'curator@example.com');
    expect(result.error).toMatch(/Conflict/); expect(d.runBatch).not.toHaveBeenCalled();
  });

  it('rejects unconditional alias collisions while allowing contextual aliases', async () => {
    const collision = deps([[{ version:0 }], [{ topic_id:'china' }]]);
    const rejected = await handleTopicGovernance({ action:'alias', expectedVersion:0, topicId:'india', alias:'LAC', aliasType:'acronym' }, collision, 'cookie', 'curator@example.com');
    expect(rejected.error).toMatch(/collides/);
    const contextual = deps([[], [], []]);
    const accepted = await handleTopicGovernance({ action:'alias', expectedVersion:0, topicId:'india', alias:'LAC', aliasType:'acronym', requiresContext:true, contextRuleJson:'{"sense":"border"}' }, contextual, 'cookie', 'curator@example.com');
    expect(accepted.success).toBe(true); expect(contextual.runBatch.mock.calls[0]![0][0].params).toContain('lac');
  });

  it('approves a candidate with audit, promotion, and only affected-cluster queue entries', async () => {
    const d = deps([[{ version:0 }], [{ id:'candidate-x', status:'pending', resolved_topic_id:'india' }], [{ cluster_id:'cluster-a' }]]);
    const result = await handleTopicGovernance({ action:'candidate', expectedVersion:0, candidateId:'candidate-x', topicId:'india', decision:'approve' }, d, 'cookie', 'curator@example.com');
    expect(result.success).toBe(true);
    const batch = d.runBatch.mock.calls[0]![0];
    expect(batch.some((s: {sql:string}) => s.sql.includes('topic_curation_audit'))).toBe(true);
    expect(batch.some((s: {sql:string}) => s.sql.includes('topic_reclassification_queue'))).toBe(true);
    expect(batch.some((s: {sql:string}) => s.sql.includes('status=\'active\''))).toBe(true);
  });

  it('previews merge redirects and affected assignments without mutating records', async () => {
    const d = deps([[{ id:'old-topic' }], [{ cluster_id:'cluster-a' }], [{ normalized_alias:'old topic' }]]);
    const result = await previewTopicGovernance({ action:'merge', expectedVersion:0, topicId:'old-topic', targetTopicId:'new-topic' }, d, 'cookie');
    expect(result.preview?.redirects).toEqual([{ from:'old-topic', to:'new-topic' }]); expect(d.runBatch).not.toHaveBeenCalled();
  });
});
