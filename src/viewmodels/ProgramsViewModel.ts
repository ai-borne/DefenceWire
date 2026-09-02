/**
 * Programs ViewModel for DefenceWire.in
 * Drives the /programs Explorer tab: domain filtering, lifecycle stage filters,
 * keyword search, and corroborated live news cluster links.
 * Hard limit: <= 300 LOC.
 */

import {
  LifecycleStage,
  ProgramDomain,
  ProgramDomainStats,
  ProgramFilterOptions,
  StrategicProgram
} from '../types/programs.js';
import {
  filterPrograms,
  getAllPrograms,
  getProgramById,
  getProgramDomainStats,
  findProgramByAlias
} from '../data/strategicPrograms.js';
import { NewsViewModel } from './NewsViewModel.js';
import { StoryCluster } from '../types/news.js';
import { getRelatedStoriesForProgram } from '../engine/programMatcher.js';

export type ProgramsStateListener = () => void;

export class ProgramsViewModel {
  private activeDomain: ProgramDomain | 'all' = 'all';
  private activeStage: LifecycleStage | 'all' = 'all';
  private searchQuery: string = '';
  private selectedProgram: StrategicProgram | null = null;
  private listeners: Set<ProgramsStateListener> = new Set();
  private newsVm: NewsViewModel | null = null;

  constructor(newsVm?: NewsViewModel) {
    if (newsVm) {
      this.newsVm = newsVm;
      this.newsVm.subscribe(() => {
        this.notifyListeners();
      });
    }
  }

  public getActiveDomain(): ProgramDomain | 'all' {
    return this.activeDomain;
  }

  public setActiveDomain(domain: ProgramDomain | 'all'): void {
    if (this.activeDomain === domain) return;
    this.activeDomain = domain;
    this.notifyListeners();
  }

  public getActiveStage(): LifecycleStage | 'all' {
    return this.activeStage;
  }

  public setActiveStage(stage: LifecycleStage | 'all'): void {
    if (this.activeStage === stage) return;
    this.activeStage = stage;
    this.notifyListeners();
  }

  public getSearchQuery(): string {
    return this.searchQuery;
  }

  public setSearchQuery(query: string): void {
    const trimmed = query.trim();
    if (this.searchQuery === trimmed) return;
    this.searchQuery = trimmed;
    this.notifyListeners();
  }

  public resetFilters(): void {
    this.activeDomain = 'all';
    this.activeStage = 'all';
    this.searchQuery = '';
    this.notifyListeners();
  }

  public getSelectedProgram(): StrategicProgram | null {
    return this.selectedProgram;
  }

  public setSelectedProgram(program: StrategicProgram | null): void {
    if (this.selectedProgram?.id === program?.id) return;
    this.selectedProgram = program;
    this.notifyListeners();
  }

  public selectProgramById(id: string): boolean {
    const found = getProgramById(id) ?? findProgramByAlias(id);
    if (found) {
      this.setSelectedProgram(found);
      return true;
    }
    return false;
  }

  public getFilterOptions(): ProgramFilterOptions {
    return {
      domain: this.activeDomain,
      stage: this.activeStage,
      query: this.searchQuery
    };
  }

  public getFilteredPrograms(): StrategicProgram[] {
    return filterPrograms(this.getFilterOptions());
  }

  public getAllPrograms(): StrategicProgram[] {
    return getAllPrograms();
  }

  public getStats(): ProgramDomainStats {
    return getProgramDomainStats();
  }

  public getProgramRelatedClusters(programId: string): StoryCluster[] {
    if (!this.newsVm) return [];
    const clusters = this.newsVm.getAllClusters(false);
    return getRelatedStoriesForProgram(programId, clusters);
  }

  public getProgramNewsCount(programId: string): number {
    return this.getProgramRelatedClusters(programId).length;
  }

  public setNewsViewModel(newsVm: NewsViewModel): void {
    this.newsVm = newsVm;
    this.newsVm.subscribe(() => {
      this.notifyListeners();
    });
    this.notifyListeners();
  }

  public subscribe(listener: ProgramsStateListener): () => void {
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
