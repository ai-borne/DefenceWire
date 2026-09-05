/**
 * Editor Publish / Rollback / Cache-Purge Action Controller for DefenceWire.in
 * Extracted from EditorViewModel (Phase 1) to keep it under the 300-line
 * hard cap once the kill-switch rollback action joined publish and purge —
 * all three share identical loading/status-message/notify coordination
 * around an edge endpoint returning a CuratorSyncResult.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';
import { CuratorPublishService, defaultCuratorPublishService, CuratorPublishPayload } from '../services/curatorPublishService.js';
import { CuratorSyncResult } from '../services/curatorSyncService.js';

export class EditorPublishController {
  private publishService: CuratorPublishService;
  private isPublishing: boolean = false;
  private isRollingBack: boolean = false;
  private isPurgingCache: boolean = false;
  private statusMessage: string | null = null;
  private onChange: () => void;

  constructor(onChange: () => void, publishService?: CuratorPublishService) {
    this.onChange = onChange;
    this.publishService = publishService || defaultCuratorPublishService;
  }

  public getIsPublishing(): boolean {
    return this.isPublishing;
  }

  public getIsRollingBack(): boolean {
    return this.isRollingBack;
  }

  public getIsPurgingCache(): boolean {
    return this.isPurgingCache;
  }

  public getStatusMessage(): string | null {
    return this.statusMessage;
  }

  public clearStatus(): void {
    this.statusMessage = null;
    this.onChange();
  }

  public async publish(payload: CuratorPublishPayload): Promise<CuratorSyncResult> {
    return this.run(
      (loading) => { this.isPublishing = loading; },
      STRINGS.editor.publishing,
      STRINGS.editor.publishSuccess,
      STRINGS.editor.publishError,
      () => this.publishService.publish(payload)
    );
  }

  /**
   * Kill-switch: reverts the live homepage to the previous published snapshot,
   * independent of whatever is in any curator's browser memory.
   */
  public async rollback(): Promise<CuratorSyncResult> {
    return this.run(
      (loading) => { this.isRollingBack = loading; },
      STRINGS.editor.rollingBack,
      STRINGS.editor.rollbackSuccess,
      STRINGS.editor.rollbackError,
      () => this.publishService.rollback()
    );
  }

  public async purgeCache(urls?: string[], fetchFn: typeof fetch = globalThis.fetch): Promise<boolean> {
    const result = await this.run(
      (loading) => { this.isPurgingCache = loading; },
      STRINGS.editor.purgingCache,
      STRINGS.editor.purgeCacheSuccess,
      STRINGS.editor.purgeCacheError,
      async () => {
        const res = await fetchFn('/api/curator/purge-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: urls ? JSON.stringify({ urls }) : undefined
        });
        return (await res.json()) as CuratorSyncResult;
      }
    );
    return result.success;
  }

  private async run(
    setLoading: (loading: boolean) => void,
    loadingMessage: string,
    defaultSuccessMessage: string,
    errorPrefix: string,
    action: () => Promise<CuratorSyncResult>
  ): Promise<CuratorSyncResult> {
    setLoading(true);
    this.statusMessage = loadingMessage;
    this.onChange();

    try {
      const result = await action();
      setLoading(false);
      this.statusMessage = result.success
        ? (result.message || defaultSuccessMessage)
        : `${errorPrefix} ${result.error || ''}`;
      this.onChange();
      return result;
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : String(err);
      this.statusMessage = `${errorPrefix} ${message}`;
      this.onChange();
      return { success: false, error: message };
    }
  }
}
