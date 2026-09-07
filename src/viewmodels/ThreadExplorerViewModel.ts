/**
 * Story Thread Explorer ViewModel (Phase 4)
 * Pure MVVM controller managing thread listing, search filtering,
 * status filters, selection state, and event timeline retrieval.
 * Hard limit: <= 300 LOC.
 */

import {
  StoryThread,
  StoryThreadEvent,
  ThreadDetailResult,
  ThreadListResult,
  ThreadQueryOptions,
  ThreadStatus
} from '../types/threads.js';
import { fetchThreadsList, fetchThreadDetail } from '../services/threadService.js';

export interface ThreadExplorerViewModelDeps {
  fetchThreadsList?: (options?: ThreadQueryOptions) => Promise<ThreadListResult>;
  fetchThreadDetail?: (threadId: string) => Promise<ThreadDetailResult>;
}

export class ThreadExplorerViewModel {
  private threads: StoryThread[] = [];
  private selectedThreadId: string | null = null;
  private selectedThread: StoryThread | null = null;
  private events: StoryThreadEvent[] = [];
  private isLoadingThreads = false;
  private isLoadingEvents = false;
  private errorMessage: string | null = null;
  private searchQuery = '';
  private statusFilter: ThreadStatus | 'all' = 'all';
  private categoryFilter: string | 'all' = 'all';
  private nextCursor: string | null = null;
  private listeners: Set<() => void> = new Set();

  private readonly fetchListFn: (options?: ThreadQueryOptions) => Promise<ThreadListResult>;
  private readonly fetchDetailFn: (threadId: string) => Promise<ThreadDetailResult>;

  constructor(deps: ThreadExplorerViewModelDeps = {}) {
    this.fetchListFn = deps.fetchThreadsList ?? fetchThreadsList;
    this.fetchDetailFn = deps.fetchThreadDetail ?? fetchThreadDetail;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public async loadThreads(reset: boolean = true): Promise<void> {
    if (reset) {
      this.threads = [];
      this.nextCursor = null;
    }

    this.isLoadingThreads = true;
    this.errorMessage = null;
    this.notify();

    try {
      const options: ThreadQueryOptions = {
        status: this.statusFilter === 'all' ? undefined : this.statusFilter,
        category: this.categoryFilter === 'all' ? undefined : this.categoryFilter,
        cursor: reset ? undefined : (this.nextCursor ?? undefined),
        limit: 25
      };

      const result = await this.fetchListFn(options);

      if (result.error && this.threads.length === 0) {
        this.errorMessage = result.error;
      } else {
        if (reset) {
          this.threads = result.threads;
        } else {
          this.threads.push(...result.threads);
        }
        this.nextCursor = result.nextCursor;

        // Auto-select first thread if nothing is selected
        if (!this.selectedThreadId && this.threads.length > 0) {
          const first = this.threads[0];
          if (first) {
            void this.selectThread(first.id);
          }
        }
      }
    } catch {
      this.errorMessage = 'Failed to load story threads.';
    } finally {
      this.isLoadingThreads = false;
      this.notify();
    }
  }

  public async selectThread(threadId: string): Promise<void> {
    if (this.selectedThreadId === threadId && this.events.length > 0) {
      return;
    }

    this.selectedThreadId = threadId;
    this.selectedThread = this.threads.find((t) => t.id === threadId) ?? null;
    this.isLoadingEvents = true;
    this.events = [];
    this.notify();

    try {
      const result = await this.fetchDetailFn(threadId);
      if (result.thread) {
        this.selectedThread = result.thread;
      }
      this.events = result.events;
    } catch {
      this.errorMessage = 'Failed to load thread details.';
    } finally {
      this.isLoadingEvents = false;
      this.notify();
    }
  }

  public setSearchQuery(query: string): void {
    this.searchQuery = query.trim().toLowerCase();
    this.notify();
  }

  public setStatusFilter(status: ThreadStatus | 'all'): void {
    if (this.statusFilter === status) return;
    this.statusFilter = status;
    void this.loadThreads(true);
  }

  public setCategoryFilter(category: string | 'all'): void {
    if (this.categoryFilter === category) return;
    this.categoryFilter = category;
    void this.loadThreads(true);
  }

  public getFilteredThreads(): StoryThread[] {
    if (!this.searchQuery) {
      return this.threads;
    }

    return this.threads.filter((t) => {
      const titleMatch = t.title.toLowerCase().includes(this.searchQuery);
      const entityMatch = t.canonicalEntity.toLowerCase().includes(this.searchQuery);
      const categoryMatch = t.category.toLowerCase().includes(this.searchQuery);
      return titleMatch || entityMatch || categoryMatch;
    });
  }

  public getSelectedThreadId(): string | null {
    return this.selectedThreadId;
  }

  public getSelectedThread(): StoryThread | null {
    return this.selectedThread;
  }

  public getEvents(): StoryThreadEvent[] {
    return this.events;
  }

  public getSearchQuery(): string {
    return this.searchQuery;
  }

  public getStatusFilter(): ThreadStatus | 'all' {
    return this.statusFilter;
  }

  public getCategoryFilter(): string | 'all' {
    return this.categoryFilter;
  }

  public getIsLoadingThreads(): boolean {
    return this.isLoadingThreads;
  }

  public getIsLoadingEvents(): boolean {
    return this.isLoadingEvents;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  public hasMoreThreads(): boolean {
    return Boolean(this.nextCursor);
  }

  public destroy(): void {
    this.listeners.clear();
  }
}
