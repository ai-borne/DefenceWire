/**
 * Tenders ViewModel for DefenceWire.in
 * Drives the Tenders/RFP tab and the iDEX/TDF innovation-grant tab (same
 * view, filtered by sourceScope — see TendersExplorerView.ts): status/domain
 * filters, keyword search, and cursor-paginated "load more", mirroring
 * ArchiveViewModel's search()/loadMore() shape. The network call is injected
 * so this ViewModel stays unit-testable without a real fetch.
 * Hard limit: <= 300 LOC.
 */

import { Tender, TenderFilters, TenderSourceScope, TenderStatus } from '../types/tenders.js';
import { searchTenders, TenderSearchOutcome } from '../services/tenderService.js';

export type TendersStateListener = () => void;
export type TendersSearchFn = (filters: TenderFilters, cursor?: string | null) => Promise<TenderSearchOutcome>;

export class TendersViewModel {
  private status: TenderStatus | 'all' = 'active';
  private domain: string | 'all' = 'all';
  private sourceScope: TenderSourceScope = 'mod';
  private searchQuery: string = '';
  private results: Tender[] = [];
  private nextCursor: string | null = null;
  private loading: boolean = false;
  private loadingMore: boolean = false;
  private errorMessage: string | null = null;
  private hasLoadedOnce: boolean = false;
  private selectedTender: Tender | null = null;
  private listeners: Set<TendersStateListener> = new Set();
  private readonly searchFn: TendersSearchFn;

  constructor(searchFn: TendersSearchFn = (filters, cursor) => searchTenders(filters, cursor)) {
    this.searchFn = searchFn;
  }

  public getStatus(): TenderStatus | 'all' {
    return this.status;
  }

  public setStatus(status: TenderStatus | 'all'): void {
    if (this.status === status) return;
    this.status = status;
    this.runFreshSearch();
  }

  public getDomain(): string | 'all' {
    return this.domain;
  }

  public setDomain(domain: string | 'all'): void {
    if (this.domain === domain) return;
    this.domain = domain;
    this.runFreshSearch();
  }

  public getSourceScope(): TenderSourceScope {
    return this.sourceScope;
  }

  public setSourceScope(scope: TenderSourceScope): void {
    if (this.sourceScope === scope) return;
    this.sourceScope = scope;
    this.runFreshSearch();
  }

  public getSearchQuery(): string {
    return this.searchQuery;
  }

  public setSearchQuery(query: string): void {
    const trimmed = query.trim();
    if (this.searchQuery === trimmed) return;
    this.searchQuery = trimmed;
    this.runFreshSearch();
  }

  public getResults(): Tender[] {
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

  private getFilters(): TenderFilters {
    return { status: this.status, domain: this.domain, sourceScope: this.sourceScope, query: this.searchQuery };
  }

  /** Fresh filter change: replaces results, notifying immediately so the UI can show a loading state. */
  private runFreshSearch(): void {
    this.hasLoadedOnce = true;
    this.loading = true;
    this.errorMessage = null;
    this.notifyListeners();

    void this.searchFn(this.getFilters(), null).then((outcome) => {
      this.loading = false;
      this.results = outcome.tenders;
      this.nextCursor = outcome.nextCursor;
      this.errorMessage = outcome.error ?? null;
      this.notifyListeners();
    });
  }

  /** Kicks off the first load the first time the tab is shown. Idempotent. */
  public ensureLoaded(): void {
    if (this.hasLoadedOnce || this.loading) return;
    this.runFreshSearch();
  }

  /** Fetches the next page for the current filters and appends it to the results. */
  public async loadMore(): Promise<void> {
    if (this.loadingMore || !this.nextCursor) return;

    this.loadingMore = true;
    this.notifyListeners();

    const outcome = await this.searchFn(this.getFilters(), this.nextCursor);

    this.loadingMore = false;
    this.results = [...this.results, ...outcome.tenders];
    this.nextCursor = outcome.nextCursor;
    this.errorMessage = outcome.error ?? null;
    this.notifyListeners();
  }

  public getSelectedTender(): Tender | null {
    return this.selectedTender;
  }

  public setSelectedTender(tender: Tender | null): void {
    if (this.selectedTender?.id === tender?.id) return;
    this.selectedTender = tender;
    this.notifyListeners();
  }

  /** Best-effort lookup for #tender/<id> deep links: tenders aren't a static catalog like programs, so only currently-loaded pages are searchable without a live-scan endpoint. */
  public findLoadedTenderById(id: string): Tender | null {
    return this.results.find((t) => t.id === id) ?? null;
  }

  public subscribe(listener: TendersStateListener): () => void {
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
