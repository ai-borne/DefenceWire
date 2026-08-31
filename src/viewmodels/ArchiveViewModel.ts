/**
 * Archive ViewModel for DefenceWire.in
 * Drives the Archive tab's search box against the D1-backed story archive.
 * The network call is injected (defaults to archiveService.searchArchive)
 * so this ViewModel stays unit-testable without a real fetch.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { searchArchive, ArchiveSearchOutcome } from '../services/archiveService.js';

export type ArchiveStateListener = () => void;
export type ArchiveSearchFn = (query: string) => Promise<ArchiveSearchOutcome>;

export class ArchiveViewModel {
  private searchQuery: string = '';
  private results: StoryCluster[] = [];
  private loading: boolean = false;
  private errorMessage: string | null = null;
  private listeners: Set<ArchiveStateListener> = new Set();
  private readonly searchFn: ArchiveSearchFn;

  constructor(searchFn: ArchiveSearchFn = (query) => searchArchive(query)) {
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

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  public async search(query: string): Promise<void> {
    const trimmed = query.trim();
    this.searchQuery = query;

    if (!trimmed) {
      this.results = [];
      this.errorMessage = null;
      this.notifyListeners();
      return;
    }

    this.loading = true;
    this.errorMessage = null;
    this.notifyListeners();

    const outcome = await this.searchFn(trimmed);

    this.loading = false;
    this.results = outcome.stories;
    this.errorMessage = outcome.error ?? null;
    this.notifyListeners();
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
