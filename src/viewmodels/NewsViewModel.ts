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

export class NewsViewModel {
  private clusters: StoryCluster[] = [];
  private riverItems: StorySourceItem[] = [];
  private activeCategory: FilterCategory = 'all';
  private searchQuery: string = '';
  private expandedSSBClusterIds: Set<string> = new Set();
  private isLoading: boolean = false;
  private isOffline: boolean = false;
  private errorMessage: string | null = null;
  private listeners: Set<NewsStateListener> = new Set();

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
    if (this.expandedSSBClusterIds.has(clusterId)) {
      this.expandedSSBClusterIds.delete(clusterId);
    } else {
      this.expandedSSBClusterIds.add(clusterId);
    }
    this.notifyListeners();
  }

  public isSSBExpanded(clusterId: string): boolean {
    return this.expandedSSBClusterIds.has(clusterId);
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

    if (cluster.synthesizedHeadline.toLowerCase().includes(queryLower)) return true;
    if (cluster.primarySource.title.toLowerCase().includes(queryLower)) return true;
    if (cluster.primarySource.sourceName.toLowerCase().includes(queryLower)) return true;
    if (cluster.primarySource.snippet?.toLowerCase().includes(queryLower)) return true;
    if (cluster.entities.some((e) => e.toLowerCase().includes(queryLower))) return true;

    if (cluster.ssbIntel) {
      if (cluster.ssbIntel.whyItMatters.toLowerCase().includes(queryLower)) return true;
      if (cluster.ssbIntel.gdLecturettePoints.some((p) => p.toLowerCase().includes(queryLower))) return true;
      if (cluster.ssbIntel.defenceTechTakeaway?.platformOrSystem.toLowerCase().includes(queryLower)) return true;
    }

    if (cluster.relatedCoverage.some((r) => r.title.toLowerCase().includes(queryLower) || r.sourceName.toLowerCase().includes(queryLower))) {
      return true;
    }

    return false;
  }

  /**
   * Retrieves filtered story clusters according to category and search query.
   */
  public getFilteredClusters(): FilteredFeedResult {
    const queryLower = this.searchQuery.toLowerCase();

    // 1. Filter out ignored clusters and apply category & search filters
    let eligible = this.clusters.filter((c) => {
      if (c.isIgnored) return false;

      // Category filter
      if (this.activeCategory !== 'all' && this.activeCategory !== 'river') {
        const cat = this.activeCategory as DomainCategory;
        if (!c.categories.includes(cat)) {
          return false;
        }
      }

      // Search filter
      return this.matchesSearch(c, queryLower);
    });

    // 2. Sort by defenceScore descending
    eligible.sort((a, b) => b.defenceScore - a.defenceScore);

    if (eligible.length === 0) {
      return { leadStory: null, regularClusters: [], totalMatchingStories: 0 };
    }

    // Designate first cluster as lead story
    const leadStory = eligible[0] ?? null;
    const regularClusters = eligible.slice(1);

    return {
      leadStory,
      regularClusters,
      totalMatchingStories: eligible.length
    };
  }

  /**
   * Retrieves filtered river news items.
   */
  public getFilteredRiverItems(): StorySourceItem[] {
    const queryLower = this.searchQuery.toLowerCase();
    if (!queryLower) {
      return this.riverItems;
    }

    return this.riverItems.filter((item) => {
      return (
        item.title.toLowerCase().includes(queryLower) ||
        item.sourceName.toLowerCase().includes(queryLower) ||
        (item.snippet && item.snippet.toLowerCase().includes(queryLower))
      );
    });
  }

  /**
   * Returns all clusters, optionally including ignored ones.
   */
  public getAllClusters(includeIgnored: boolean = true): StoryCluster[] {
    if (includeIgnored) {
      return [...this.clusters];
    }
    return this.clusters.filter((c) => !c.isIgnored);
  }

  /**
   * Finds a cluster by its ID.
   */
  public getClusterById(id: string): StoryCluster | undefined {
    return this.clusters.find((c) => c.id === id);
  }

  /**
   * Replaces the entire cluster list (e.g. from cache or crawler).
   */
  public setClusters(clusters: StoryCluster[]): void {
    this.clusters = [...clusters];
    this.notifyListeners();
  }

  public setRiverItems(items: StorySourceItem[]): void {
    this.riverItems = [...items];
    this.notifyListeners();
  }

  /**
   * Surgically updates a specific cluster.
   */
  public updateCluster(id: string, updater: (cluster: StoryCluster) => StoryCluster): void {
    const idx = this.clusters.findIndex((c) => c.id === id);
    if (idx === -1) return;

    const current = this.clusters[idx];
    if (!current) return;

    this.clusters[idx] = updater({ ...current });
    this.notifyListeners();
  }


  /**
   * Promotes a cluster to Lead story.
   */
  public promoteToLead(id: string): void {
    const maxScore = Math.max(...this.clusters.map((c) => c.defenceScore), 100);
    this.clusters = this.clusters.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          isLeadStory: true,
          isEditorPromoted: true,
          isIgnored: false,
          defenceScore: maxScore + 50,
          updatedAt: new Date().toISOString()
        };
      }
      return {
        ...c,
        isLeadStory: false
      };
    });
    this.notifyListeners();
  }

  /**
   * Demotes a promoted lead cluster.
   */
  public demoteStory(id: string): void {
    this.updateCluster(id, (cluster) => ({
      ...cluster,
      isLeadStory: false,
      isEditorPromoted: false,
      updatedAt: new Date().toISOString()
    }));
  }

  /**
   * Updates synthesized headline for a cluster.
   */
  public updateHeadline(id: string, newHeadline: string): void {
    this.updateCluster(id, (cluster) => ({
      ...cluster,
      synthesizedHeadline: newHeadline.trim(),
      updatedAt: new Date().toISOString()
    }));
  }

  /**
   * Updates SSB Intelligence briefing for a cluster.
   */
  public updateSSBIntel(id: string, ssbIntel: import('../types/news.js').SSBIntelligence): void {
    this.updateCluster(id, (cluster) => ({
      ...cluster,
      ssbIntel: { ...ssbIntel },
      updatedAt: new Date().toISOString()
    }));
  }

  /**
   * Toggles the ignored status of a cluster.
   */
  public toggleIgnore(id: string): void {
    this.updateCluster(id, (cluster) => ({
      ...cluster,
      isIgnored: !cluster.isIgnored,
      updatedAt: new Date().toISOString()
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

