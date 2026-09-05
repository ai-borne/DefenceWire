/**
 * Curator Desk Knowledge Base Tab ViewModel (Phase 5).
 * State for the read-only Knowledge Base tab: selected table, sort, filter,
 * pagination, and fetched rows. Follows the EditorViewModel pub/sub convention.
 * Hard limit: <= 300 LOC.
 */

import { CuratorKnowledgeBaseService, defaultCuratorKnowledgeBaseService } from '../services/curatorKnowledgeBaseService.js';

export type KnowledgeBaseTableKey =
  | 'discovered_entities'
  | 'source_reputation'
  | 'supplier_candidates'
  | 'curator_overrides'
  | 'published_snapshots';

export type KnowledgeBaseListener = () => void;

const PAGE_SIZE = 20;

export class CuratorKnowledgeBaseViewModel {
  private service: CuratorKnowledgeBaseService;
  private table: KnowledgeBaseTableKey = 'discovered_entities';
  private page: number = 0;
  private sortBy: string | undefined = undefined;
  private sortDir: 'ASC' | 'DESC' = 'DESC';
  private filter: string = '';
  private rows: Record<string, unknown>[] = [];
  private totalCount: number = 0;
  private isLoading: boolean = false;
  private hasLoadedOnce: boolean = false;
  private error: string | null = null;
  private listeners: Set<KnowledgeBaseListener> = new Set();

  constructor(service?: CuratorKnowledgeBaseService) {
    this.service = service || defaultCuratorKnowledgeBaseService;
  }

  public getTable(): KnowledgeBaseTableKey {
    return this.table;
  }

  public getPage(): number {
    return this.page;
  }

  public getPageSize(): number {
    return PAGE_SIZE;
  }

  public getSortBy(): string | undefined {
    return this.sortBy;
  }

  public getSortDir(): 'ASC' | 'DESC' {
    return this.sortDir;
  }

  public getFilter(): string {
    return this.filter;
  }

  public getRows(): Record<string, unknown>[] {
    return this.rows;
  }

  public getTotalCount(): number {
    return this.totalCount;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getHasLoadedOnce(): boolean {
    return this.hasLoadedOnce;
  }

  public getError(): string | null {
    return this.error;
  }

  public ensureLoaded(): void {
    if (this.hasLoadedOnce || this.isLoading) return;
    void this.load();
  }

  public setTable(table: KnowledgeBaseTableKey): void {
    if (this.table === table) return;
    this.table = table;
    this.page = 0;
    this.sortBy = undefined;
    this.sortDir = 'DESC';
    this.filter = '';
    void this.load();
  }

  public setFilter(filter: string): void {
    if (this.filter === filter) return;
    this.filter = filter;
    this.page = 0;
    void this.load();
  }

  public setSort(column: string): void {
    if (this.sortBy === column) {
      this.sortDir = this.sortDir === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortBy = column;
      this.sortDir = 'ASC';
    }
    void this.load();
  }

  public nextPage(): void {
    if ((this.page + 1) * PAGE_SIZE >= this.totalCount) return;
    this.page += 1;
    void this.load();
  }

  public prevPage(): void {
    if (this.page === 0) return;
    this.page -= 1;
    void this.load();
  }

  public async load(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    this.notifyListeners();

    const result = await this.service.fetchTable({
      table: this.table,
      page: this.page,
      pageSize: PAGE_SIZE,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
      filter: this.filter || undefined
    });

    this.isLoading = false;
    this.hasLoadedOnce = true;
    if (result.success) {
      this.rows = result.rows;
      this.totalCount = result.totalCount;
    } else {
      this.rows = [];
      this.totalCount = 0;
      this.error = result.error || 'Failed to load knowledge base.';
    }
    this.notifyListeners();
  }

  public subscribe(listener: KnowledgeBaseListener): () => void {
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
