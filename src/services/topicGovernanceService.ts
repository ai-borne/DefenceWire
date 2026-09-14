/**
 * Client Service for the Topic Governance curator panel (Phase 13 Stage 4).
 * Talks to /api/curator/topic-review (reads) and /api/curator/topics (mutations, preview).
 * Hard limit: <= 300 LOC.
 */
import { TopicGovernanceRequest } from './topicGovernanceHandler.js';
import { QueueName, GovernanceResourceType } from './topicGovernanceReadHandler.js';

export interface GovernanceReadResult { success: boolean; error?: string; rows: Record<string, unknown>[]; }
export interface GovernanceMutationResult { success: boolean; error?: string; preview?: Record<string, unknown>; }

async function parseReadResponse(res: Response): Promise<GovernanceReadResult> {
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null;
    return { success: false, error: body?.error || `HTTP ${res.status}: ${res.statusText}`, rows: [] };
  }
  const body = (await res.json()) as { success: boolean; error?: string; rows?: Record<string, unknown>[] };
  return { success: body.success, error: body.error, rows: body.rows ?? [] };
}

async function parseMutationResponse(res: Response): Promise<GovernanceMutationResult> {
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null;
    return { success: false, error: body?.error || `HTTP ${res.status}: ${res.statusText}` };
  }
  return (await res.json()) as GovernanceMutationResult;
}

export class TopicGovernanceService {
  private fetchFn: typeof fetch;

  constructor(fetchFn: typeof fetch = globalThis.fetch) {
    this.fetchFn = fetchFn;
  }

  public async loadQueue(queue: QueueName): Promise<GovernanceReadResult> {
    try {
      const res = await this.fetchFn(`/api/curator/topic-review?queue=${encodeURIComponent(queue)}`, { headers: { Accept: 'application/json' } });
      return await parseReadResponse(res);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error', rows: [] };
    }
  }

  public async loadCandidateEvidence(candidateId: string): Promise<GovernanceReadResult> {
    try {
      const res = await this.fetchFn(`/api/curator/topic-review?candidateEvidenceFor=${encodeURIComponent(candidateId)}`, { headers: { Accept: 'application/json' } });
      return await parseReadResponse(res);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error', rows: [] };
    }
  }

  public async loadSourceIndependence(topicId: string): Promise<GovernanceReadResult> {
    try {
      const res = await this.fetchFn(`/api/curator/topic-review?sourceIndependenceFor=${encodeURIComponent(topicId)}`, { headers: { Accept: 'application/json' } });
      return await parseReadResponse(res);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error', rows: [] };
    }
  }

  public async loadAssignmentDiff(clusterId: string, topicId: string): Promise<GovernanceReadResult> {
    try {
      const params = new URLSearchParams({ assignmentDiffClusterId: clusterId, assignmentDiffTopicId: topicId });
      const res = await this.fetchFn(`/api/curator/topic-review?${params.toString()}`, { headers: { Accept: 'application/json' } });
      return await parseReadResponse(res);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error', rows: [] };
    }
  }

  /** Reads the current optimistic-concurrency version for a resource just before a mutation is submitted, to minimize the race window. */
  public async getResourceVersion(type: GovernanceResourceType, id: string): Promise<number> {
    try {
      const params = new URLSearchParams({ versionForType: type, versionForId: id });
      const res = await this.fetchFn(`/api/curator/topic-review?${params.toString()}`, { headers: { Accept: 'application/json' } });
      const parsed = await parseReadResponse(res);
      const version = parsed.rows[0]?.version;
      return typeof version === 'number' ? version : 0;
    } catch {
      return 0;
    }
  }

  public async preview(topicId: string, targetTopicId?: string): Promise<GovernanceMutationResult> {
    try {
      const params = new URLSearchParams({ topicId });
      if (targetTopicId) params.set('targetTopicId', targetTopicId);
      const res = await this.fetchFn(`/api/curator/topics?${params.toString()}`, { headers: { Accept: 'application/json' } });
      return await parseMutationResponse(res);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  public async submit(request: TopicGovernanceRequest): Promise<GovernanceMutationResult> {
    try {
      const res = await this.fetchFn('/api/curator/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(request)
      });
      return await parseMutationResponse(res);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }
}

export const defaultTopicGovernanceService = new TopicGovernanceService();
