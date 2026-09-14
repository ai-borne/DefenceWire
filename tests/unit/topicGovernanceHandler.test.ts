import { describe, expect, it, vi } from 'vitest';
import { handleTopicGovernance, previewTopicGovernance } from '../../src/services/topicGovernanceHandler.js';

function deps(rows: Record<string, unknown>[][] = [], claimSucceeds = true) {
  const runQuery = vi.fn().mockImplementation(async () => rows.shift() ?? []);
  const runBatch = vi.fn().mockResolvedValue(undefined);
  const runWrite = vi.fn().mockResolvedValue({ changes: claimSucceeds ? 1 : 0 });
  return { runQuery, runBatch, runWrite, verifyAuth: async () => true };
}

describe('topic governance', () => {
  it('rejects unauthenticated governance mutations before reading or writing', async () => {
    const d = { ...deps(), verifyAuth: async () => false };
    const result = await handleTopicGovernance({ action:'topic', expectedVersion:0, topicId:'india', displayName:'India' }, d, null, 'x');
    expect(result.error).toMatch(/Unauthorized/); expect(d.runBatch).not.toHaveBeenCalled();
  });

  it('rejects a stale topic edit atomically, without ever touching runBatch', async () => {
    const d = deps([], false);
    const result = await handleTopicGovernance({ action:'topic', expectedVersion:1, topicId:'india', displayName:'India Updated' }, d, 'cookie', 'curator@example.com');
    expect(result.error).toMatch(/Conflict/);
    expect(d.runBatch).not.toHaveBeenCalled();
    expect(d.runWrite).toHaveBeenCalledWith(expect.stringContaining('version=?'), ['topic', 'india', 1]);
  });

  it('claims the version atomically for the very first mutation of a resource (expectedVersion 0)', async () => {
    const d = deps([[{ id:'india' }]]);
    const result = await handleTopicGovernance({ action:'topic', expectedVersion:0, topicId:'india', displayName:'India' }, d, 'cookie', 'curator@example.com');
    expect(result.success).toBe(true);
    expect(d.runWrite).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT'), ['topic', 'india']);
  });

  it('never issues the mutation batch when the atomic version claim itself reports zero rows changed (the real concurrency-race fix)', async () => {
    const d = deps([], false);
    const result = await handleTopicGovernance({ action:'suppress', expectedVersion:0, topicId:'auto-topic' }, d, 'cookie', 'curator@example.com');
    expect(result.error).toMatch(/Conflict/);
    expect(d.runQuery).not.toHaveBeenCalled();
    expect(d.runBatch).not.toHaveBeenCalled();
  });

  it('rejects unconditional alias collisions while allowing contextual aliases', async () => {
    const collision = deps([[{ topic_id:'china' }]]);
    const rejected = await handleTopicGovernance({ action:'alias', expectedVersion:0, topicId:'india', alias:'LAC', aliasType:'acronym' }, collision, 'cookie', 'curator@example.com');
    expect(rejected.error).toMatch(/collides/);
    const contextual = deps([[]]);
    const accepted = await handleTopicGovernance({ action:'alias', expectedVersion:0, topicId:'india', alias:'LAC', aliasType:'acronym', requiresContext:true, contextRuleJson:'{"sense":"border"}' }, contextual, 'cookie', 'curator@example.com');
    expect(accepted.success).toBe(true); expect(contextual.runBatch.mock.calls[0]![0][0].params).toContain('lac');
  });

  it('approves a candidate with audit, promotion, and only affected-cluster queue entries', async () => {
    const d = deps([[{ id:'candidate-x', status:'pending', resolved_topic_id:'india' }], [{ cluster_id:'cluster-a' }]]);
    const result = await handleTopicGovernance({ action:'candidate', expectedVersion:0, candidateId:'candidate-x', topicId:'india', decision:'approve' }, d, 'cookie', 'curator@example.com');
    expect(result.success).toBe(true);
    const batch = d.runBatch.mock.calls[0]![0];
    expect(batch.some((s: {sql:string}) => s.sql.includes('topic_curation_audit'))).toBe(true);
    expect(batch.some((s: {sql:string}) => s.sql.includes('topic_reclassification_queue'))).toBe(true);
    expect(batch.some((s: {sql:string}) => s.sql.includes('status=\'active\''))).toBe(true);
  });

  it('suppresses an active auto-promoted topic and can restore it, each with an audit record', async () => {
    const suppressDeps = deps([[{ id:'auto-topic', status:'active', verification_state:'published' }], [{ cluster_id:'cluster-a' }]]);
    const suppressed = await handleTopicGovernance({ action:'suppress', expectedVersion:0, topicId:'auto-topic' }, suppressDeps, 'cookie', 'curator@example.com');
    expect(suppressed.success).toBe(true);
    const suppressBatch = suppressDeps.runBatch.mock.calls[0]![0];
    expect(suppressBatch.some((s: {sql:string}) => s.sql.includes("status='deprecated'"))).toBe(true);
    expect(suppressBatch.some((s: {sql:string}) => s.sql.includes('topic_curation_audit'))).toBe(true);

    const restoreDeps = deps([[{ id:'auto-topic', status:'deprecated', verification_state:'rejected' }], [{ cluster_id:'cluster-a' }]]);
    const restored = await handleTopicGovernance({ action:'restore', expectedVersion:1, topicId:'auto-topic' }, restoreDeps, 'cookie', 'curator@example.com');
    expect(restored.success).toBe(true);
    const restoreBatch = restoreDeps.runBatch.mock.calls[0]![0];
    expect(restoreBatch.some((s: {sql:string}) => s.sql.includes("status='active'") && s.sql.includes("verification_state='published'"))).toBe(true);
  });

  it('refuses to suppress a topic that is not active, and to restore one that is not deprecated', async () => {
    const notActive = deps([[{ id:'x', status:'provisional' }]]);
    const suppressRejected = await handleTopicGovernance({ action:'suppress', expectedVersion:0, topicId:'x' }, notActive, 'cookie', 'curator@example.com');
    expect(suppressRejected.error).toMatch(/Only an active topic/); expect(notActive.runBatch).not.toHaveBeenCalled();

    const notDeprecated = deps([[{ id:'x', status:'active' }]]);
    const restoreRejected = await handleTopicGovernance({ action:'restore', expectedVersion:0, topicId:'x' }, notDeprecated, 'cookie', 'curator@example.com');
    expect(restoreRejected.error).toMatch(/Only a deprecated topic/); expect(notDeprecated.runBatch).not.toHaveBeenCalled();
  });

  it('rejects a stale suppress request without silently overwriting a newer curator decision', async () => {
    const d = deps([], false);
    const result = await handleTopicGovernance({ action:'suppress', expectedVersion:1, topicId:'auto-topic' }, d, 'cookie', 'curator@example.com');
    expect(result.error).toMatch(/Conflict/); expect(d.runBatch).not.toHaveBeenCalled();
  });

  it('previews merge redirects and affected assignments without mutating records', async () => {
    const d = deps([[{ id:'old-topic' }], [{ cluster_id:'cluster-a' }], [{ normalized_alias:'old topic' }]]);
    const result = await previewTopicGovernance({ action:'merge', expectedVersion:0, topicId:'old-topic', targetTopicId:'new-topic' }, d, 'cookie');
    expect(result.preview?.redirects).toEqual([{ from:'old-topic', to:'new-topic' }]); expect(d.runBatch).not.toHaveBeenCalled();
  });
});
