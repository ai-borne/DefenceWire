/** Persistent cache for validated semantic topic decisions. */
import { D1RestConfig, executeD1Query } from './archiveSync.js';

export async function loadSemanticCache(inputHash: string, config: D1RestConfig, fetchFn: typeof fetch): Promise<{ found: boolean; response: unknown | null }> {
  const result = await executeD1Query({ sql: `SELECT validated_response_json FROM topic_semantic_cache WHERE input_hash=? LIMIT 1`, params: [inputHash] }, config, fetchFn);
  if (!result.ok) throw new Error('Semantic topic cache lookup failed.');
  const value = result.rows[0]?.validated_response_json;
  if (result.rows.length === 0) return { found: false, response: null };
  if (typeof value !== 'string') return { found: true, response: null };
  try { return { found: true, response: JSON.parse(value) }; } catch { return { found: true, response: null }; }
}

export async function saveSemanticCache(input: { inputHash: string; registryVersion: number; classifierVersion: string; policyVersion: string; topicIds: string[]; response: unknown | null; now: string }, config: D1RestConfig, fetchFn: typeof fetch): Promise<void> {
  const result = await executeD1Query({
    sql: `INSERT INTO topic_semantic_cache (input_hash,registry_version,classifier_version,assignment_policy_version,retrieved_topic_ids_json,validated_response_json,status,created_at)
      VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(input_hash) DO NOTHING`,
    params: [input.inputHash, input.registryVersion, input.classifierVersion, input.policyVersion, JSON.stringify(input.topicIds), input.response ? JSON.stringify(input.response) : null, input.response ? 'validated' : 'failed', input.now]
  }, config, fetchFn);
  if (!result.ok) throw new Error('Semantic topic cache write failed.');
}
