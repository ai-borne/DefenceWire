/**
 * Curator Knowledge Base Client Service for DefenceWire.in (Phase 5).
 * Talks to /api/curator/knowledge-base. Mirrors curatorIngestService.ts's shape.
 * Hard limit: <= 300 LOC.
 */

export interface KnowledgeBaseFetchParams {
  table: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
  filter?: string;
}

export interface KnowledgeBaseFetchResult {
  success: boolean;
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  pageSize: number;
  error?: string;
}

interface KnowledgeBaseApiResponse {
  success: boolean;
  data?: { rows: Record<string, unknown>[]; totalCount: number; page: number; pageSize: number };
  error?: string;
}

function resolveEndpoint(path: string): string {
  if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.startsWith('null')) {
    return path;
  }
  return `http://localhost${path}`;
}

const KNOWLEDGE_BASE_API = '/api/curator/knowledge-base';

function emptyResult(error: string): KnowledgeBaseFetchResult {
  return { success: false, rows: [], totalCount: 0, page: 0, pageSize: 0, error };
}

export class CuratorKnowledgeBaseService {
  private fetchFn: typeof fetch;

  constructor(customFetch?: typeof fetch) {
    this.fetchFn = customFetch || (typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch);
  }

  public async fetchTable(params: KnowledgeBaseFetchParams): Promise<KnowledgeBaseFetchResult> {
    const query = new URLSearchParams();
    query.set('table', params.table);
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.pageSize !== undefined) query.set('pageSize', String(params.pageSize));
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortDir) query.set('sortDir', params.sortDir);
    if (params.filter) query.set('filter', params.filter);

    try {
      const response = await this.fetchFn(resolveEndpoint(`${KNOWLEDGE_BASE_API}?${query.toString()}`));
      const data = (await response.json().catch(() => null)) as KnowledgeBaseApiResponse | null;

      if (response.ok && data?.success && data.data) {
        return { success: true, ...data.data };
      }
      if (response.status === 401) {
        return emptyResult('Unauthorized: Session expired or invalid.');
      }
      return emptyResult(data?.error || `Request failed (${response.status})`);
    } catch (err) {
      return emptyResult(err instanceof Error ? err.message : String(err));
    }
  }
}

export const defaultCuratorKnowledgeBaseService = new CuratorKnowledgeBaseService();
