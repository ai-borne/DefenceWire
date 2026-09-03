/**
 * Editorial Curator ViewModel for DefenceWire.in
 * Manages curator desk state, candidate cluster filtering, promote/demote, headline editing, SSB briefs, ignore flags, auth, and 1-click Git sync.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster, SSBIntelligence, StorySourceItem } from '../types/news.js';
import { NewsViewModel } from './NewsViewModel.js';
import { AuthService, defaultAuthService } from '../services/authService.js';
import { CuratorSyncService, defaultCuratorSyncService, CuratorSyncResult } from '../services/curatorSyncService.js';
import { STRINGS } from '../resources/strings.js';

export type EditorFilterMode = 'all' | 'active' | 'ignored';
export type EditorDeskPanel = 'stories' | 'supplierCandidates';
export type EditorStateListener = () => void;

export class EditorViewModel {
  private newsVm: NewsViewModel;
  private authService: AuthService;
  private syncService: CuratorSyncService;
  private filterMode: EditorFilterMode = 'all';
  private searchQuery: string = '';
  private isDashboardOpen: boolean = false;
  private activeDeskPanel: EditorDeskPanel = 'stories';
  private activeEditingClusterId: string | null = null;
  private isPublishing: boolean = false;
  private publishStatusMessage: string | null = null;
  private listeners: Set<EditorStateListener> = new Set();

  constructor(
    newsVm: NewsViewModel,
    authService?: AuthService,
    syncService?: CuratorSyncService
  ) {
    this.newsVm = newsVm;
    this.authService = authService || defaultAuthService;
    this.syncService = syncService || defaultCuratorSyncService;

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
    return this.isPublishing;
  }

  public getPublishStatusMessage(): string | null {
    return this.publishStatusMessage;
  }

  public clearPublishStatus(): void {
    this.publishStatusMessage = null;
    this.notifyListeners();
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
   * Synchronizes curated snapshot to Cloudflare D1 via authenticated edge endpoint.
   */
  public async publishToProduction(): Promise<CuratorSyncResult> {
    this.isPublishing = true;
    this.publishStatusMessage = STRINGS.editor.publishing;
    this.notifyListeners();

    try {
      const payload = {
        clusters: this.newsVm.getAllClusters(true),
        river: this.newsVm.getFilteredRiverItems()
      };

      const result = await this.syncService.publishCuratedSnapshot(payload);
      this.isPublishing = false;
      this.publishStatusMessage = result.success
        ? (result.message || STRINGS.editor.publishSuccess)
        : `${STRINGS.editor.publishError} ${result.error || ''}`;
      this.notifyListeners();
      return result;
    } catch (err) {
      this.isPublishing = false;
      const message = err instanceof Error ? err.message : String(err);
      this.publishStatusMessage = `${STRINGS.editor.publishError} ${message}`;
      this.notifyListeners();
      return { success: false, error: message };
    }
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
