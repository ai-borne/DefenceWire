/**
 * News ViewModel for DefenceWire.in
 * Manages feed state, category filtering, search queries, and SSB drawer expansion.
 * Hard limit: <= 300 LOC.
 */

import { DomainCategory, StoryCluster, StorySourceItem } from '../types/news.js';
import { FilterCategory, FilteredFeedResult } from '../types/viewState.js';
import { INITIAL_STORY_CLUSTERS } from '../data/initialNews.js';
import { INITIAL_RIVER_ITEMS } from '../data/riverNews.js';

export type NewsStateListener = () => void;
export type DossierChangeListener = (clusterId: string | null) => void;

export class NewsViewModel {
  private clusters: StoryCluster[] = [];
  private riverItems: StorySourceItem[] = [];
  private activeCategory: FilterCategory = 'all';
  private searchQuery: string = '';
  private expandedSSBClusterIds: Set<string> = new Set();
  private activeDossierClusterId: string | null = null;
  private isLoading: boolean = false;
  private isOffline: boolean = false;
  private errorMessage: string | null = null;
  private listeners: Set<NewsStateListener> = new Set();
  private dossierListeners: Set<DossierChangeListener> = new Set();

  constructor(
    initialClusters: StoryCluster[] = INITIAL_STORY_CLUSTERS,
    initialRiver: StorySourceItem[] = INITIAL_RIVER_ITEMS
  ) {
    this.clusters = [...initialClusters];
    this.riverItems = [...initialRiver];
  }

  public getActiveCategory(): FilterCategory {
    return this.activeCategory;
  }

  public setActiveCategory(category: FilterCategory): void {
    if (this.activeCategory === category) return;
    this.activeCategory = category;
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

  public toggleSSBDrawer(clusterId: string): void {
    const isExpanded = this.expandedSSBClusterIds.has(clusterId);
    this.setSSBExpanded(clusterId, !isExpanded, true);
  }

  public setSSBExpanded(clusterId: string, expanded: boolean, notify: boolean = true): void {
    const currentlyExpanded = this.expandedSSBClusterIds.has(clusterId);
    if (currentlyExpanded === expanded) return;

    if (expanded) {
      this.expandedSSBClusterIds.add(clusterId);
    } else {
      this.expandedSSBClusterIds.delete(clusterId);
    }

    if (notify) {
      this.notifyListeners();
    }
  }

  public isSSBExpanded(clusterId: string): boolean {
    return this.expandedSSBClusterIds.has(clusterId);
  }

  public hasExpandedSSBDrawers(): boolean {
    return this.expandedSSBClusterIds.size > 0;
  }

  public getExpandedSSBClusterIds(): Set<string> {
    return new Set(this.expandedSSBClusterIds);
  }

  public openStoryDossier(clusterId: string, notifyState: boolean = false): void {
    if (this.activeDossierClusterId === clusterId) return;
    this.activeDossierClusterId = clusterId;
    this.notifyDossierListeners(clusterId);
    if (notifyState) this.notifyListeners();
  }

  public closeStoryDossier(notifyState: boolean = false): void {
    if (this.activeDossierClusterId === null) return;
    this.activeDossierClusterId = null;
    this.notifyDossierListeners(null);
    if (notifyState) this.notifyListeners();
  }

  public getActiveDossierClusterId(): string | null {
    return this.activeDossierClusterId;
  }

  public getActiveDossierCluster(): StoryCluster | undefined {
    return this.activeDossierClusterId ? this.getClusterById(this.activeDossierClusterId) : undefined;
  }

  public onDossierChange(listener: DossierChangeListener): () => void {
    this.dossierListeners.add(listener);
    return () => { this.dossierListeners.delete(listener); };
  }

  private notifyDossierListeners(clusterId: string | null): void {
    for (const listener of this.dossierListeners) listener(clusterId);
  }

  public setOffline(offline: boolean): void {
    if (this.isOffline === offline) return;
    this.isOffline = offline;
    this.notifyListeners();
  }

  public getIsOffline(): boolean {
    return this.isOffline;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  /**
   * Evaluates if a cluster matches search query tokens.
   */
  private matchesSearch(cluster: StoryCluster, queryLower: string): boolean {
    if (!queryLower) return true;
    const matchIntel = cluster.ssbIntel && (
      cluster.ssbIntel.whyItMatters.toLowerCase().includes(queryLower) ||
      cluster.ssbIntel.gdLecturettePoints?.some((p) => p.toLowerCase().includes(queryLower)) ||
      cluster.ssbIntel.defenceTechTakeaway?.platformOrSystem.toLowerCase().includes(queryLower)
    );
    return cluster.synthesizedHeadline.toLowerCase().includes(queryLower) ||
      cluster.primarySource.title.toLowerCase().includes(queryLower) ||
      cluster.primarySource.sourceName.toLowerCase().includes(queryLower) ||
      Boolean(cluster.primarySource.snippet?.toLowerCase().includes(queryLower)) ||
      cluster.entities.some((e) => e.toLowerCase().includes(queryLower)) ||
      Boolean(matchIntel) ||
      cluster.relatedCoverage.some((r) => r.title.toLowerCase().includes(queryLower) || r.sourceName.toLowerCase().includes(queryLower));
  }

  /**
   * Retrieves filtered story clusters according to category and search query.
   */
  public getFilteredClusters(): FilteredFeedResult {
    const queryLower = this.searchQuery.toLowerCase();
    const eligible = this.clusters.filter((c) => {
      if (c.isIgnored) return false;
      if (this.activeCategory !== 'all' && this.activeCategory !== 'river') {
        if (!c.categories.includes(this.activeCategory as DomainCategory)) return false;
      }
      return this.matchesSearch(c, queryLower);
    });
    eligible.sort((a, b) => b.defenceScore - a.defenceScore);
    if (eligible.length === 0) {
      return { leadStory: null, regularClusters: [], totalMatchingStories: 0 };
    }
    return {
      leadStory: eligible[0] ?? null,
      regularClusters: eligible.slice(1),
      totalMatchingStories: eligible.length
    };
  }

  /**
   * Retrieves filtered river news items.
   */
  public getFilteredRiverItems(): StorySourceItem[] {
    const queryLower = this.searchQuery.toLowerCase();
    if (!queryLower) return this.riverItems;
    return this.riverItems.filter((item) => (
      item.title.toLowerCase().includes(queryLower) ||
      item.sourceName.toLowerCase().includes(queryLower) ||
      (item.snippet && item.snippet.toLowerCase().includes(queryLower))
    ));
  }

  /**
   * Returns all clusters, optionally including ignored ones.
   */
  public getAllClusters(includeIgnored: boolean = true): StoryCluster[] {
    return includeIgnored ? [...this.clusters] : this.clusters.filter((c) => !c.isIgnored);
  }

  public getClusterById(id: string): StoryCluster | undefined {
    return this.clusters.find((c) => c.id === id);
  }

  public setClusters(clusters: StoryCluster[]): void {
    this.clusters = [...clusters];
    this.notifyListeners();
  }

  public setRiverItems(items: StorySourceItem[]): void {
    this.riverItems = [...items];
    this.notifyListeners();
  }

  public updateCluster(id: string, updater: (cluster: StoryCluster) => StoryCluster): void {
    const idx = this.clusters.findIndex((c) => c.id === id);
    if (idx === -1 || !this.clusters[idx]) return;
    this.clusters[idx] = updater({ ...this.clusters[idx] });
    this.notifyListeners();
  }

  public promoteToLead(id: string): void {
    const maxScore = Math.max(...this.clusters.map((c) => c.defenceScore), 100);
    this.clusters = this.clusters.map((c) => (c.id === id
      ? { ...c, isLeadStory: true, isEditorPromoted: true, isIgnored: false, defenceScore: maxScore + 50, updatedAt: new Date().toISOString() }
      : { ...c, isLeadStory: false }));
    this.notifyListeners();
  }

  public demoteStory(id: string): void {
    this.updateCluster(id, (cluster) => ({
      ...cluster, isLeadStory: false, isEditorPromoted: false, updatedAt: new Date().toISOString()
    }));
  }

  public updateHeadline(id: string, newHeadline: string): void {
    this.updateCluster(id, (cluster) => ({
      ...cluster, synthesizedHeadline: newHeadline.trim(), updatedAt: new Date().toISOString()
    }));
  }

  public updateSSBIntel(id: string, ssbIntel: import('../types/news.js').SSBIntelligence): void {
    this.updateCluster(id, (cluster) => ({
      ...cluster, ssbIntel: { ...ssbIntel }, updatedAt: new Date().toISOString()
    }));
  }

  public toggleIgnore(id: string): void {
    this.updateCluster(id, (cluster) => ({
      ...cluster, isIgnored: !cluster.isIgnored, updatedAt: new Date().toISOString()
    }));
  }

  public subscribe(listener: NewsStateListener): () => void {
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
