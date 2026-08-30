/**
 * Editorial Curator ViewModel for DefenceWire.in
 * Manages curator desk state, candidate cluster filtering, promote/demote, headline editing, SSB briefs, and ignore flags.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster, SSBIntelligence } from '../types/news.js';
import { NewsViewModel } from './NewsViewModel.js';

export type EditorFilterMode = 'all' | 'active' | 'ignored';
export type EditorStateListener = () => void;

export class EditorViewModel {
  private newsVm: NewsViewModel;
  private filterMode: EditorFilterMode = 'all';
  private searchQuery: string = '';
  private isDashboardOpen: boolean = false;
  private activeEditingClusterId: string | null = null;
  private listeners: Set<EditorStateListener> = new Set();

  constructor(newsVm: NewsViewModel) {
    this.newsVm = newsVm;
    // Mirror updates from NewsViewModel
    this.newsVm.subscribe(() => {
      this.notifyListeners();
    });
  }

  public isOpen(): boolean {
    return this.isDashboardOpen;
  }

  public setOpen(open: boolean): void {
    if (this.isDashboardOpen === open) return;
    this.isDashboardOpen = open;
    this.notifyListeners();
  }

  public toggleOpen(): void {
    this.isDashboardOpen = !this.isDashboardOpen;
    this.notifyListeners();
  }

  public getFilterMode(): EditorFilterMode {
    return this.filterMode;
  }

  public setFilterMode(mode: EditorFilterMode): void {
    if (this.filterMode === mode) return;
    this.filterMode = mode;
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

  public getActiveEditingClusterId(): string | null {
    return this.activeEditingClusterId;
  }

  public setActiveEditingClusterId(id: string | null): void {
    this.activeEditingClusterId = id;
    this.notifyListeners();
  }

  /**
   * Retrieves all candidate clusters filtered by curator search and filterMode.
   */
  public getCandidateClusters(): StoryCluster[] {
    const all = this.newsVm.getAllClusters(true);
    const query = this.searchQuery.toLowerCase();

    let filtered = all.filter((cluster) => {
      // 1. Status Filter
      if (this.filterMode === 'active' && cluster.isIgnored) return false;
      if (this.filterMode === 'ignored' && !cluster.isIgnored) return false;

      // 2. Search query filter
      if (query) {
        const inHeadline = cluster.synthesizedHeadline.toLowerCase().includes(query);
        const inSource = cluster.primarySource.sourceName.toLowerCase().includes(query);
        const inEntity = cluster.entities.some((e) => e.toLowerCase().includes(query));
        if (!inHeadline && !inSource && !inEntity) return false;
      }

      return true;
    });

    // Sort by defenceScore descending
    filtered.sort((a, b) => b.defenceScore - a.defenceScore);
    return filtered;
  }

  public getClusterById(id: string): StoryCluster | undefined {
    return this.newsVm.getClusterById(id);
  }

  public promoteToLead(clusterId: string): void {
    this.newsVm.promoteToLead(clusterId);
  }

  public demoteStory(clusterId: string): void {
    this.newsVm.demoteStory(clusterId);
  }

  public editHeadline(clusterId: string, newHeadline: string): void {
    this.newsVm.updateHeadline(clusterId, newHeadline);
  }

  public editSSBBrief(clusterId: string, ssbIntel: SSBIntelligence): void {
    this.newsVm.updateSSBIntel(clusterId, ssbIntel);
  }

  public toggleIgnore(clusterId: string): void {
    this.newsVm.toggleIgnore(clusterId);
  }

  public subscribe(listener: EditorStateListener): () => void {
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
