/**
 * Curator Desk Supplier Candidates Panel ViewModel.
 * State for the click-through review UI over the Phase 2.6 growth pipeline —
 * fetch/list, per-candidate approve/reject with optimistic removal, loading
 * and error state. Follows the EditorViewModel pub/sub convention.
 * Hard limit: <= 300 LOC.
 */

import {
  CuratorSupplierCandidateSyncService,
  defaultCuratorSupplierCandidateSyncService
} from '../services/curatorSupplierCandidateSyncService.js';
import { SupplierCandidateRow } from '../services/curatorSupplierCandidateHandler.js';

export type SupplierCandidatesPanelListener = () => void;

export class SupplierCandidatesPanelViewModel {
  private syncService: CuratorSupplierCandidateSyncService;
  private candidates: SupplierCandidateRow[] = [];
  private isLoading: boolean = false;
  private error: string | null = null;
  private reviewingId: string | null = null;
  private hasLoaded: boolean = false;
  private listeners: Set<SupplierCandidatesPanelListener> = new Set();

  constructor(syncService?: CuratorSupplierCandidateSyncService) {
    this.syncService = syncService || defaultCuratorSupplierCandidateSyncService;
  }

  public getCandidates(): SupplierCandidateRow[] {
    return this.candidates;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getError(): string | null {
    return this.error;
  }

  public getReviewingId(): string | null {
    return this.reviewingId;
  }

  public hasLoadedOnce(): boolean {
    return this.hasLoaded;
  }

  public async load(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    this.notifyListeners();

    const { candidates, error } = await this.syncService.fetchPendingCandidates();
    this.candidates = candidates;
    this.error = error || null;
    this.isLoading = false;
    this.hasLoaded = true;
    this.notifyListeners();
  }

  public async review(id: string, action: 'approve' | 'reject'): Promise<void> {
    if (this.reviewingId) return;
    this.reviewingId = id;
    this.error = null;
    this.notifyListeners();

    const result = await this.syncService.reviewCandidate(id, action);
    if (result.success) {
      this.candidates = this.candidates.filter((c) => c.id !== id);
    } else {
      this.error = result.error || `Failed to ${action} candidate.`;
    }
    this.reviewingId = null;
    this.notifyListeners();
  }

  public subscribe(listener: SupplierCandidatesPanelListener): () => void {
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

  public destroy(): void {
    this.listeners.clear();
  }
}
