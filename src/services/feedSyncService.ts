/**
 * Client-Side Feed Revalidation and Delta Detection Service for DefenceWire.in
 * Listens to tab visibility/focus changes and background intervals to revalidate news feeds.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster, StorySourceItem } from '../types/news.js';

export type SyncStatus = 'idle' | 'checking' | 'syncing' | 'updated' | 'error';

export interface FeedDataPayload {
  clusters?: StoryCluster[];
  river?: StorySourceItem[];
  generatedAt?: string;
  totalIngested?: number;
  totalFiltered?: number;
  activeFeedsCount?: number;
  durationMs?: number;
}

export interface FeedSyncOptions {
  feedUrl?: string;
  cooldownMs?: number;
  intervalMs?: number;
  customFetch?: typeof fetch;
}

export type SyncStateListener = (status: SyncStatus, error?: string) => void;
export type FeedUpdateListener = (payload: FeedDataPayload) => void;

const DEFAULT_FEED_URL = '/data/news.json';
const DEFAULT_COOLDOWN_MS = 60_000; // 60 seconds minimum between revalidations
const DEFAULT_INTERVAL_MS = 300_000; // 5 minutes periodic heartbeat

export class FeedSyncService {
  private feedUrl: string;
  private cooldownMs: number;
  private intervalMs: number;
  private fetchFn: typeof fetch;
  private status: SyncStatus = 'idle';
  private lastFetchTimestamp: number = 0;
  private lastGeneratedAt: string | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isStarted: boolean = false;
  private visibilityHandler: (() => void) | null = null;
  private focusHandler: (() => void) | null = null;
  private stateListeners: Set<SyncStateListener> = new Set();
  private feedListeners: Set<FeedUpdateListener> = new Set();

  constructor(options: FeedSyncOptions = {}) {
    this.feedUrl = options.feedUrl || DEFAULT_FEED_URL;
    this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.fetchFn =
      options.customFetch ||
      (typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch);
  }

  /**
   * Starts automatic visibility, focus, and background interval listeners.
   */
  public start(): void {
    if (this.isStarted) return;
    this.isStarted = true;

    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          void this.checkAndSync(false);
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    if (typeof window !== 'undefined') {
      this.focusHandler = () => {
        void this.checkAndSync(false);
      };
      window.addEventListener('focus', this.focusHandler);
    }

    if (this.intervalMs > 0) {
      this.syncTimer = setInterval(() => {
        void this.checkAndSync(false);
      }, this.intervalMs);
    }
  }

  /**
   * Stops background interval and removes document/window event listeners.
   */
  public stop(): void {
    this.isStarted = false;

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.focusHandler && typeof window !== 'undefined') {
      window.removeEventListener('focus', this.focusHandler);
      this.focusHandler = null;
    }
  }

  /**
   * Checks for remote feed updates and syncs if new data is detected.
   * @param force - If true, bypasses the cooldown throttle.
   * @returns boolean indicating whether new feed data was detected and applied.
   */
  public async checkAndSync(force: boolean = false): Promise<boolean> {
    if (this.status === 'checking' || this.status === 'syncing') {
      return false;
    }

    const now = Date.now();
    if (!force && this.lastFetchTimestamp > 0 && now - this.lastFetchTimestamp < this.cooldownMs) {
      return false;
    }

    this.setStatus('checking');
    this.lastFetchTimestamp = now;

    try {
      const response = await this.fetchFn(this.feedUrl, {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) {
        this.setStatus('error', `HTTP error ${response.status}`);
        return false;
      }

      const data = (await response.json()) as FeedDataPayload;

      // Delta detection via generatedAt timestamp
      if (data.generatedAt) {
        if (this.lastGeneratedAt !== null && data.generatedAt === this.lastGeneratedAt) {
          this.setStatus('idle');
          return false;
        }
        this.lastGeneratedAt = data.generatedAt;
      }

      this.setStatus('updated');
      this.notifyFeedListeners(data);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.setStatus('error', message);
      return false;
    }
  }

  /**
   * Immediately triggers a forced manual sync, bypassing cooldown.
   */
  public async syncNow(force: boolean = true): Promise<boolean> {
    return this.checkAndSync(force);
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public getLastGeneratedAt(): string | null {
    return this.lastGeneratedAt;
  }

  public setLastGeneratedAt(timestamp: string | null): void {
    this.lastGeneratedAt = timestamp;
  }

  public getLastFetchTimestamp(): number {
    return this.lastFetchTimestamp;
  }

  public isRunning(): boolean {
    return this.isStarted;
  }

  public onSyncStateChange(listener: SyncStateListener): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public onFeedUpdated(listener: FeedUpdateListener): () => void {
    this.feedListeners.add(listener);
    return () => {
      this.feedListeners.delete(listener);
    };
  }

  private setStatus(status: SyncStatus, error?: string): void {
    this.status = status;
    for (const listener of this.stateListeners) {
      listener(status, error);
    }
  }

  private notifyFeedListeners(payload: FeedDataPayload): void {
    for (const listener of this.feedListeners) {
      listener(payload);
    }
  }
}

export const defaultFeedSyncService = new FeedSyncService();
