/**
 * Archive ViewModel for DefenceWire.in
 * Drives the Archive tab: a keyword search and the default cursor-paginated
 * "browse" listing (blank query) behind one search() call. The network call
 * is injected (defaults to archiveService.searchArchive) so this ViewModel
 * stays unit-testable without a real fetch.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { searchArchive, ArchiveSearchOutcome } from '../services/archiveService.js';

export type ArchiveStateListener = () => void;
export type ArchiveSearchFn = (query: string, cursor?: string | null) => Promise<ArchiveSearchOutcome>;

export class ArchiveViewModel {
  private searchQuery: string = '';
  private results: StoryCluster[] = [];
  private nextCursor: string | null = null;
  private loading: boolean = false;
  private loadingMore: boolean = false;
  private errorMessage: string | null = null;
  private hasLoadedOnce: boolean = false;
  private listeners: Set<ArchiveStateListener> = new Set();
  private readonly searchFn: ArchiveSearchFn;

  constructor(searchFn: ArchiveSearchFn = (query, cursor) => searchArchive(query, cursor)) {
    this.searchFn = searchFn;
  }

  public getSearchQuery(): string {
    return this.searchQuery;
  }

  public getResults(): StoryCluster[] {
    return this.results;
  }

  public isLoading(): boolean {
    return this.loading;
  }

  public isLoadingMore(): boolean {
    return this.loadingMore;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  public hasMore(): boolean {
    return this.nextCursor !== null;
  }

  /** Runs a fresh search (or browse, if query is blank), replacing any prior results. */
  public async search(query: string): Promise<void> {
    this.searchQuery = query;
    this.hasLoadedOnce = true;
    this.loading = true;
    this.errorMessage = null;
    this.notifyListeners();

    const outcome = await this.searchFn(query.trim());

    this.loading = false;
    this.results = outcome.stories;
    this.nextCursor = outcome.nextCursor;
    this.errorMessage = outcome.error ?? null;
    this.notifyListeners();
  }

  /** Fetches the next page for the current query and appends it to the results. */
  public async loadMore(): Promise<void> {
    if (this.loadingMore || !this.nextCursor) return;

    this.loadingMore = true;
    this.notifyListeners();

    const outcome = await this.searchFn(this.searchQuery.trim(), this.nextCursor);

    this.loadingMore = false;
    this.results = [...this.results, ...outcome.stories];
    this.nextCursor = outcome.nextCursor;
    this.errorMessage = outcome.error ?? null;
    this.notifyListeners();
  }

  /**
   * Kicks off the default browse listing the first time the Archive tab is
   * shown. Deferred via microtask so it never fires synchronously inside a
   * render pass (this VM's own notifyListeners can trigger a full app
   * re-render, and re-entering that render synchronously would be fragile).
   */
  public ensureBrowseLoaded(): void {
    if (this.hasLoadedOnce || this.loading) return;
    this.hasLoadedOnce = true;
    queueMicrotask(() => {
      void this.search('');
    });
  }

  public subscribe(listener: ArchiveStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
