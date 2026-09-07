/**
 * ViewModel for Curator Emergent Pattern Review (Phase 5)
 * Manages reactive UI state, filtering, editing, and approval/rejection actions.
 * Hard limit: <= 300 LOC.
 */

import {
  EmergentPattern,
  PatternQueryOptions,
  PatternReviewRequest,
  PatternStatus
} from '../types/patterns.js';
import {
  CuratorPatternService,
  defaultCuratorPatternService
} from '../services/curatorPatternService.js';

export type PatternStateListener = () => void;

export class PatternReviewViewModel {
  private service: CuratorPatternService;
  private patterns: EmergentPattern[] = [];
  private filter: PatternStatus | 'all' = 'draft';
  private isLoading: boolean = false;
  private errorMessage: string | null = null;
  private editingPatternId: string | null = null;
  private editTitle: string = '';
  private editSynthesis: string = '';
  private isSubmitting: boolean = false;
  private listeners: Set<PatternStateListener> = new Set();

  constructor(service: CuratorPatternService = defaultCuratorPatternService) {
    this.service = service;
  }

  public subscribe(listener: PatternStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // Guard against listener exceptions
      }
    }
  }

  public async loadPatterns(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;
    this.notifyListeners();

    const options: PatternQueryOptions = {
      status: this.filter === 'all' ? undefined : this.filter,
      limit: 50
    };

    const res = await this.service.listPatterns(options);
    this.isLoading = false;

    if (res.success) {
      this.patterns = res.patterns;
    } else {
      this.errorMessage = res.error || 'Failed to load pattern hypotheses';
    }

    this.notifyListeners();
  }

  public async setFilter(filter: PatternStatus | 'all'): Promise<void> {
    if (this.filter === filter) return;
    this.filter = filter;
    this.cancelEditing();
    await this.loadPatterns();
  }

  public getPatterns(): EmergentPattern[] {
    return this.patterns;
  }

  public getFilter(): PatternStatus | 'all' {
    return this.filter;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  public getEditingPatternId(): string | null {
    return this.editingPatternId;
  }

  public getEditTitle(): string {
    return this.editTitle;
  }

  public setEditTitle(title: string): void {
    this.editTitle = title;
  }

  public getEditSynthesis(): string {
    return this.editSynthesis;
  }

  public setEditSynthesis(synthesis: string): void {
    this.editSynthesis = synthesis;
  }

  public getIsSubmitting(): boolean {
    return this.isSubmitting;
  }

  public startEditing(pattern: EmergentPattern): void {
    this.editingPatternId = pattern.id;
    this.editTitle = pattern.title;
    this.editSynthesis = pattern.synthesis;
    this.notifyListeners();
  }

  public cancelEditing(): void {
    this.editingPatternId = null;
    this.editTitle = '';
    this.editSynthesis = '';
    this.notifyListeners();
  }

  public async approvePattern(id: string): Promise<boolean> {
    return this.executeReviewAction({ id, action: 'approve' });
  }

  public async rejectPattern(id: string): Promise<boolean> {
    return this.executeReviewAction({ id, action: 'reject' });
  }

  public async saveEdit(id: string): Promise<boolean> {
    if (!this.editSynthesis.trim()) {
      this.errorMessage = 'Hypothesis synthesis cannot be empty';
      this.notifyListeners();
      return false;
    }

    const success = await this.executeReviewAction({
      id,
      action: 'edit',
      title: this.editTitle.trim() || undefined,
      synthesis: this.editSynthesis.trim()
    });

    if (success) {
      this.cancelEditing();
    }
    return success;
  }

  private async executeReviewAction(request: PatternReviewRequest): Promise<boolean> {
    this.isSubmitting = true;
    this.errorMessage = null;
    this.notifyListeners();

    const res = await this.service.reviewPattern(request);
    this.isSubmitting = false;

    if (res.success && res.pattern) {
      // Optimistic in-place update or filter removal
      const updated = res.pattern;
      if (this.filter !== 'all' && updated.status !== this.filter) {
        this.patterns = this.patterns.filter((p) => p.id !== updated.id);
      } else {
        this.patterns = this.patterns.map((p) => (p.id === updated.id ? updated : p));
      }
      this.notifyListeners();
      return true;
    } else {
      this.errorMessage = res.error || 'Review action failed';
      this.notifyListeners();
      return false;
    }
  }
}
