/**
 * Unit Tests for EditorViewModel (Curation, Auth & Git Sync)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EditorViewModel } from '../../src/viewmodels/EditorViewModel.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { AuthService } from '../../src/services/authService.js';
import { CuratorPublishService } from '../../src/services/curatorPublishService.js';

describe('EditorViewModel', () => {
  let newsVm: NewsViewModel;
  let authService: AuthService;
  let publishService: CuratorPublishService;
  let editorVm: EditorViewModel;

  const mockCluster1: StoryCluster = {
    id: 'cluster-1',
    synthesizedHeadline: 'Original Headline 1',
    primarySource: {
      id: 'src-1',
      title: 'Source 1 Title',
      url: 'https://pib.gov.in/news/1',
      sourceName: 'PIB India',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T10:00:00Z'
    },
    relatedCoverage: [],
    discussions: [],
    categories: ['airforce'],
    entities: ['Tejas Mk1A'],
    defenceScore: 70,
    isLeadStory: false,
    createdAt: '2026-08-30T10:00:00Z',
    updatedAt: '2026-08-30T10:00:00Z'
  };

  const mockCluster2: StoryCluster = {
    id: 'cluster-2',
    synthesizedHeadline: 'Original Headline 2',
    primarySource: {
      id: 'src-2',
      title: 'Source 2 Title',
      url: 'https://thehindu.com/news/2',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-30T09:00:00Z'
    },
    relatedCoverage: [],
    discussions: [],
    categories: ['navy'],
    entities: ['Project 75I'],
    defenceScore: 80,
    isLeadStory: true,
    createdAt: '2026-08-30T09:00:00Z',
    updatedAt: '2026-08-30T09:00:00Z'
  };

  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    newsVm = new NewsViewModel([mockCluster1, mockCluster2], []);
    authService = new AuthService();
    publishService = new CuratorPublishService();
    editorVm = new EditorViewModel(newsVm, authService, publishService);
  });

  it('retrieves candidate clusters sorted with scores', () => {
    const candidates = editorVm.getCandidateClusters();
    expect(candidates.length).toBe(2);
    expect(candidates[0]!.id).toBe('cluster-2');
  });

  it('filters candidate clusters by search term', () => {
    editorVm.setSearchQuery('Tejas');
    const filtered = editorVm.getCandidateClusters();
    expect(filtered.length).toBe(1);
    expect(filtered[0]!.id).toBe('cluster-1');
  });

  it('promotes a cluster to lead story', () => {
    editorVm.promoteToLead('cluster-1');

    const updatedCluster1 = editorVm.getClusterById('cluster-1');
    expect(updatedCluster1?.isEditorPromoted).toBe(true);
    expect(updatedCluster1?.isLeadStory).toBe(true);
    expect(updatedCluster1?.defenceScore).toBeGreaterThan(100);

    const feed = newsVm.getFilteredClusters();
    expect(feed.leadStory?.id).toBe('cluster-1');
  });

  it('demotes a promoted lead cluster', () => {
    editorVm.promoteToLead('cluster-1');
    expect(editorVm.getClusterById('cluster-1')?.isEditorPromoted).toBe(true);

    editorVm.demoteStory('cluster-1');
    const demoted = editorVm.getClusterById('cluster-1');
    expect(demoted?.isEditorPromoted).toBe(false);
  });

  it('edits a cluster synthesized headline', () => {
    const newHeadline = 'IAF Boosts Tejas Fleet with Upgraded EW Suites';
    editorVm.editHeadline('cluster-1', newHeadline);

    expect(editorVm.getClusterById('cluster-1')?.synthesizedHeadline).toBe(newHeadline);
    expect(newsVm.getFilteredClusters().regularClusters.find((c) => c.id === 'cluster-1')?.synthesizedHeadline).toBe(
      newHeadline
    );
  });

  it('edits cluster SSB intelligence brief', () => {
    const ssbBrief = {
      whyItMatters: 'Crucial for CDS/AFCAT technical questions on 4.5 Gen combat aircraft.',
      gdLecturettePoints: ['Indigenisation in defence aerospace', 'GE F404 engine dependency'],
      potentialInterviewQuestions: ['What are the key avionics upgrades in Tejas Mk1A?']
    };

    editorVm.editSSBBrief('cluster-1', ssbBrief);

    const cluster = editorVm.getClusterById('cluster-1');
    expect(cluster?.ssbIntel?.whyItMatters).toBe(ssbBrief.whyItMatters);
    expect(cluster?.ssbIntel?.gdLecturettePoints?.length).toBe(2);
  });

  it('toggles ignore and filters ignored clusters from public feed', () => {
    editorVm.toggleIgnore('cluster-1');
    expect(editorVm.getClusterById('cluster-1')?.isIgnored).toBe(true);

    const publicFeed = newsVm.getFilteredClusters();
    expect(publicFeed.totalMatchingStories).toBe(1);
    expect(publicFeed.leadStory?.id).toBe('cluster-2');

    editorVm.setFilterMode('ignored');
    expect(editorVm.getCandidateClusters().length).toBe(1);
    expect(editorVm.getCandidateClusters()[0]!.id).toBe('cluster-1');

    editorVm.setFilterMode('active');
    expect(editorVm.getCandidateClusters().length).toBe(1);
    expect(editorVm.getCandidateClusters()[0]!.id).toBe('cluster-2');

    editorVm.toggleIgnore('cluster-1');
    expect(editorVm.getClusterById('cluster-1')?.isIgnored).toBe(false);
  });

  it('handles auth operations and session state correctly', async () => {
    expect(editorVm.isAuthenticated()).toBe(false);

    authService.setAuthenticated(true);
    expect(editorVm.isAuthenticated()).toBe(true);

    editorVm.logout();
    expect(editorVm.isAuthenticated()).toBe(false);
  });

  it('exports valid formatted JSON snapshot of curated intelligence', () => {
    const jsonStr = editorVm.exportCuratedJson();
    const parsed = JSON.parse(jsonStr) as { clusters: StoryCluster[] };
    expect(parsed.clusters).toBeDefined();
    expect(parsed.clusters.length).toBe(2);
  });

  it('coordinates publishing to production with publishService', async () => {
    const mockFetch = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({
          success: true
        })
      } as unknown as Response);

    const customPublish = new CuratorPublishService(mockFetch as unknown as typeof fetch);
    const vm = new EditorViewModel(newsVm, authService, customPublish);

    const res = await vm.publishToProduction();
    expect(res.success).toBe(true);
    expect(vm.getPublishStatusMessage()).toBeDefined();
  });

  it('coordinates rollback to previous publish with publishService', async () => {
    const mockFetch = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Rolled back to snapshot published 2026-09-01T00:00:00Z.'
        })
      } as unknown as Response);

    const customPublish = new CuratorPublishService(mockFetch as unknown as typeof fetch);
    const vm = new EditorViewModel(newsVm, authService, customPublish);

    expect(vm.getIsRollingBack()).toBe(false);
    const res = await vm.rollbackToPreviousPublish();
    expect(res.success).toBe(true);
    expect(vm.getIsRollingBack()).toBe(false);
    expect(vm.getPublishStatusMessage()).toContain('Rolled back');
  });
});
