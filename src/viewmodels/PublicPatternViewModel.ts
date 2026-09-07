/**
 * Public Pattern ViewModel (Phase 5 Display UI)
 * Manages presentation state for the Emergent Situational Matrix banner:
 * carousel pagination, signal expansion, dismissal, and data loading.
 * Hard limit: <= 300 LOC.
 */

import { EmergentPattern } from '../types/patterns.js';
import { fetchApprovedPatterns, FetchPatternsOptions } from '../services/publicPatternService.js';

export type PublicPatternListener = () => void;

export class PublicPatternViewModel {
  private patterns: EmergentPattern[] = [];
  private activePatternIndex = 0;
  private isExpanded = false;
  private isDismissed = false;
  private isLoading = false;
  private listeners: Set<PublicPatternListener> = new Set();
  private fetchFn: (options?: FetchPatternsOptions) => Promise<EmergentPattern[]>;

  constructor(fetchFn: (options?: FetchPatternsOptions) => Promise<EmergentPattern[]> = fetchApprovedPatterns) {
    this.fetchFn = fetchFn;
  }

  public subscribe(listener: PublicPatternListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public async loadPatterns(forceRefresh: boolean = false): Promise<void> {
    this.isLoading = true;
    this.notify();

    try {
      const result = await this.fetchFn({ forceRefresh, limit: 10 });
      this.patterns = Array.isArray(result) ? result : [];
      if (this.activePatternIndex >= this.patterns.length) {
        this.activePatternIndex = Math.max(0, this.patterns.length - 1);
      }
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  public setPatterns(patterns: EmergentPattern[]): void {
    this.patterns = [...patterns];
    this.activePatternIndex = 0;
    this.notify();
  }

  public nextPattern(): void {
    if (this.patterns.length <= 1) return;
    this.activePatternIndex = (this.activePatternIndex + 1) % this.patterns.length;
    this.notify();
  }

  public prevPattern(): void {
    if (this.patterns.length <= 1) return;
    this.activePatternIndex =
      (this.activePatternIndex - 1 + this.patterns.length) % this.patterns.length;
    this.notify();
  }

  public setActiveIndex(index: number): void {
    if (index >= 0 && index < this.patterns.length) {
      this.activePatternIndex = index;
      this.notify();
    }
  }

  public toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
    this.notify();
  }

  public setExpanded(expanded: boolean): void {
    if (this.isExpanded === expanded) return;
    this.isExpanded = expanded;
    this.notify();
  }

  public dismiss(): void {
    this.isDismissed = true;
    this.notify();
  }

  public getActivePattern(): EmergentPattern | null {
    if (this.patterns.length === 0) return null;
    return this.patterns[this.activePatternIndex] || null;
  }

  public getPatterns(): EmergentPattern[] {
    return [...this.patterns];
  }

  public getTotalPatterns(): number {
    return this.patterns.length;
  }

  public getActiveIndex(): number {
    return this.activePatternIndex;
  }

  public getIsExpanded(): boolean {
    return this.isExpanded;
  }

  public getIsDismissed(): boolean {
    return this.isDismissed;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }
}
