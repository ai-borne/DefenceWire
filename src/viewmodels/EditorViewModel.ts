/**
 * Editorial Curator ViewModel for DefenceWire.in
 * Manages curator desk state, candidate cluster filtering, promote/demote, headline editing, SSB briefs, ignore flags, auth, and 1-click Git sync.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster, SSBIntelligence, StorySourceItem } from '../types/news.js';
import { NewsViewModel } from './NewsViewModel.js';
import { AuthService, defaultAuthService } from '../services/authService.js';
import { CuratorPublishService } from '../services/curatorPublishService.js';
import { CuratorSyncResult } from '../services/curatorSyncService.js';
import { EditorPublishController } from './EditorPublishController.js';

export type EditorFilterMode = 'all' | 'active' | 'ignored';
export type EditorDeskPanel =
  | 'stories'
  | 'supplierCandidates'
  | 'wire'
  | 'intel'
  | 'ecosystem'
  | 'crawler'
  | 'scorecard';
export type EditorStateListener = () => void;

export class EditorViewModel {
  private newsVm: NewsViewModel;
  private authService: AuthService;
  private publishController: EditorPublishController;
  private filterMode: EditorFilterMode = 'all';
  private searchQuery: string = '';
  private isDashboardOpen: boolean = false;
  private activeDeskPanel: EditorDeskPanel = 'stories';
  private activeEditingClusterId: string | null = null;
  private listeners: Set<EditorStateListener> = new Set();

  constructor(
    newsVm: NewsViewModel,
    authService?: AuthService,
    publishService?: CuratorPublishService
  ) {
    this.newsVm = newsVm;
    this.authService = authService || defaultAuthService;
    this.publishController = new EditorPublishController(() => this.notifyListeners(), publishService);

    // Mirror updates from NewsViewModel
    this.newsVm.subscribe(() => {
      this.notifyListeners();
    });

    // Mirror auth changes
    this.authService.onAuthChange(() => {
      this.notifyListeners();
    });
  }

  // Auth Operations
  public isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  public async login(passcode: string, remember: boolean = true): Promise<boolean> {
    const success = await this.authService.login(passcode, remember);
    this.notifyListeners();
    return success;
  }

  public getCuratorEmail(): string | null {
    return this.authService.getCuratorEmail();
  }

  public getAuthProvider(): 'cloudflare_zero_trust' | 'edge_session' | null {
    return this.authService.getAuthProvider();
  }

  public logout(): void {
    this.authService.logout();
    this.notifyListeners();
  }

  // Dashboard Window State
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

  public getActiveDeskPanel(): EditorDeskPanel {
    return this.activeDeskPanel;
  }

  public setActiveDeskPanel(panel: EditorDeskPanel): void {
    if (this.activeDeskPanel === panel) return;
    this.activeDeskPanel = panel;
    this.notifyListeners();
  }

  public isPanelActive(panel: EditorDeskPanel): boolean {
    if (this.activeDeskPanel === panel) return true;
    if ((panel === 'wire' || panel === 'stories') && (this.activeDeskPanel === 'wire' || this.activeDeskPanel === 'stories')) return true;
    if ((panel === 'ecosystem' || panel === 'supplierCandidates') && (this.activeDeskPanel === 'ecosystem' || this.activeDeskPanel === 'supplierCandidates')) return true;
    return false;
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

  public getIsPublishing(): boolean {
    return this.publishController.getIsPublishing();
  }

  public getPublishStatusMessage(): string | null {
    return this.publishController.getStatusMessage();
  }

  public clearPublishStatus(): void {
    this.publishController.clearStatus();
  }

  /**
   * Retrieves all candidate clusters filtered by curator search and filterMode.
   */
  public getCandidateClusters(): StoryCluster[] {
    const all = this.newsVm.getAllClusters(true);
    const query = this.searchQuery.toLowerCase();

    const filtered = all.filter((cluster) => {
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

  /**
   * Exports complete curated dataset formatted as JSON.
   */
  public exportCuratedJson(): string {
    const snapshot: { clusters: StoryCluster[]; river: StorySourceItem[] } = {
      clusters: this.newsVm.getAllClusters(true),
      river: this.newsVm.getFilteredRiverItems()
    };
    return JSON.stringify(snapshot, null, 2);
  }

  /**
   * Publishes the curated snapshot live via the one-push server-side publish endpoint.
   */
  public async publishToProduction(): Promise<CuratorSyncResult> {
    const payload = {
      clusters: this.newsVm.getAllClusters(true),
      river: this.newsVm.getFilteredRiverItems()
    };
    return this.publishController.publish(payload);
  }

  public getIsRollingBack(): boolean {
    return this.publishController.getIsRollingBack();
  }

  /**
   * Kill-switch: reverts the live homepage to the previous published snapshot,
   * independent of whatever is in any curator's browser memory.
   */
  public async rollbackToPreviousPublish(): Promise<CuratorSyncResult> {
    return this.publishController.rollback();
  }

  public getIsPurgingCache(): boolean {
    return this.publishController.getIsPurgingCache();
  }

  public async purgeEdgeCache(tags?: string[], fetchFn: typeof fetch = globalThis.fetch): Promise<boolean> {
    return this.publishController.purgeCache(tags, fetchFn);
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
