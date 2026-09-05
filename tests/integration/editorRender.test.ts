/**
 * Integration Tests for EditorDashboard and Auth Gate Rendering
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderEditorDashboard } from '../../src/components/EditorDashboard.js';
import { EditorViewModel } from '../../src/viewmodels/EditorViewModel.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { STRINGS } from '../../src/resources/strings.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { AuthService } from '../../src/services/authService.js';
import { CuratorPublishService } from '../../src/services/curatorPublishService.js';
import { SupplierCandidatesPanelViewModel } from '../../src/viewmodels/SupplierCandidatesPanelViewModel.js';
import { CuratorSupplierCandidateSyncService } from '../../src/services/curatorSupplierCandidateSyncService.js';

describe('EditorDashboard Component Integration', () => {
  let newsVm: NewsViewModel;
  let authService: AuthService;
  let publishService: CuratorPublishService;
  let editorVm: EditorViewModel;
  let supplierCandidatesVm: SupplierCandidatesPanelViewModel;

  const mockCluster: StoryCluster = {
    id: 'cluster-mod-1',
    synthesizedHeadline: 'HAL Delivers First Batch of Tejas Mk1A to IAF',
    primarySource: {
      id: 'src-1',
      title: 'HAL delivers Tejas',
      url: 'https://pib.gov.in/news/1',
      sourceName: 'PIB India',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T10:00:00Z'
    },
    relatedCoverage: [
      {
        id: 'src-2',
        title: 'Tejas Mk1A delivery starts',
        url: 'https://thehindu.com/news/2',
        sourceName: 'The Hindu',
        sourceDomain: 'thehindu.com',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-08-30T09:30:00Z'
      }
    ],
    discussions: [],
    categories: ['airforce'],
    entities: ['Tejas Mk1A'],
    defenceScore: 88,
    isLeadStory: false,
    createdAt: '2026-08-30T10:00:00Z',
    updatedAt: '2026-08-30T10:00:00Z'
  };

  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    newsVm = new NewsViewModel([mockCluster], []);
    authService = new AuthService();
    publishService = new CuratorPublishService();
    editorVm = new EditorViewModel(newsVm, authService, publishService);
    editorVm.setOpen(true);
    const noopFetch = (async () => ({ ok: true, json: async () => ({ success: true, data: [] }) })) as unknown as typeof fetch;
    supplierCandidatesVm = new SupplierCandidatesPanelViewModel(new CuratorSupplierCandidateSyncService(noopFetch));
  });

  it('renders Zero Trust access gate modal when unauthenticated', () => {
    const el = renderEditorDashboard(editorVm, supplierCandidatesVm);
    expect(el.textContent).toContain(STRINGS.editor.authTitle);
    expect(el.textContent).toContain(STRINGS.editor.zeroTrustLoginBtn);

    const btn = el.querySelector('.dw-editor-btn--promote');
    expect(btn).not.toBeNull();
  });

  it('renders full curator desk and action bar after authentication', async () => {
    authService.setAuthenticated(true);

    const el = renderEditorDashboard(editorVm, supplierCandidatesVm);
    expect(el.textContent).toContain(STRINGS.editor.dashboardTitle);
    expect(el.textContent).toContain(STRINGS.editor.publishToProduction);
    expect(el.textContent).toContain(STRINGS.editor.rollbackLastPublish);
    expect(el.textContent).toContain(STRINGS.editor.exportJson);
    expect(el.textContent).toContain(STRINGS.editor.copyJson);
    expect(el.textContent).toContain(STRINGS.editor.lockDesk);
    expect(el.textContent).toContain('HAL Delivers First Batch of Tejas Mk1A to IAF');
    expect(el.textContent).toContain('88');
  });

  it('handles promote button click and updates lead status when authenticated', async () => {
    authService.setAuthenticated(true);

    const el = renderEditorDashboard(editorVm, supplierCandidatesVm);
    const promoteBtn = el.querySelector('.dw-editor-btn--promote') as HTMLButtonElement | null;
    expect(promoteBtn).not.toBeNull();

    promoteBtn?.click();
    expect(editorVm.getClusterById('cluster-mod-1')?.isLeadStory).toBe(true);
  });

  it('handles ignore button click and toggles ignored status', async () => {
    authService.setAuthenticated(true);

    const el = renderEditorDashboard(editorVm, supplierCandidatesVm);
    const ignoreBtn = el.querySelector('.dw-editor-btn--ignore') as HTMLButtonElement | null;
    expect(ignoreBtn).not.toBeNull();

    ignoreBtn?.click();
    expect(editorVm.getClusterById('cluster-mod-1')?.isIgnored).toBe(true);
  });

  it('switches filter mode tabs when clicked in authenticated view', async () => {
    authService.setAuthenticated(true);

    const el = renderEditorDashboard(editorVm, supplierCandidatesVm);
    const filterTabs = el.querySelectorAll('.dw-editor-filter-tab');
    expect(filterTabs.length).toBe(3);

    (filterTabs[1] as HTMLElement).click();
    expect(editorVm.getFilterMode()).toBe('active');

    (filterTabs[2] as HTMLElement).click();
    expect(editorVm.getFilterMode()).toBe('ignored');
  });

  it('locks the desk when lock button is clicked', async () => {
    authService.setAuthenticated(true);
    expect(editorVm.isAuthenticated()).toBe(true);

    const el = renderEditorDashboard(editorVm, supplierCandidatesVm);
    const lockBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(STRINGS.editor.lockDesk)
    );
    expect(lockBtn).toBeDefined();

    lockBtn?.click();
    expect(editorVm.isAuthenticated()).toBe(false);
  });
});
