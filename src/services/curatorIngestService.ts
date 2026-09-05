/**
 * Curator Ad-Hoc Ingest Client Service for DefenceWire.in (Phase 4).
 * Talks to /api/curator/ingest. Mirrors curatorPublishService.ts's shape.
 * Hard limit: <= 300 LOC.
 */

export type CuratorIngestPayload =
  | { mode: 'url'; url: string }
  | { mode: 'text'; text: string; sourceName?: string };

export interface CuratorIngestServiceResult {
  success: boolean;
  message?: string;
  error?: string;
}

function resolveEndpoint(path: string): string {
  if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.startsWith('null')) {
    return path;
  }
  return `http://localhost${path}`;
}

const INGEST_API = '/api/curator/ingest';

export class CuratorIngestService {
  private fetchFn: typeof fetch;

  constructor(customFetch?: typeof fetch) {
    this.fetchFn = customFetch || (typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch);
  }

  public async ingest(payload: CuratorIngestPayload): Promise<CuratorIngestServiceResult> {
    try {
      const response = await this.fetchFn(resolveEndpoint(INGEST_API), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => null)) as CuratorIngestServiceResult | null;
      if (response.ok && data?.success) {
        return { success: true, message: data.message || 'Story ingested and published live.' };
      }
      if (response.status === 401) {
        return { success: false, error: 'Unauthorized: Session expired or invalid.' };
      }
      if (response.status === 429) {
        return { success: false, error: 'Too many requests. Please slow down and try again.' };
      }
      return { success: false, error: data?.error || `Ingestion failed (${response.status})` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
}

export const defaultCuratorIngestService = new CuratorIngestService();
