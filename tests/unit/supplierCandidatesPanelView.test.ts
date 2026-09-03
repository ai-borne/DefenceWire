/**
 * Unit Tests for SupplierCandidatesPanelView + EditorDashboard desk-tab wiring (Phase 2.7)
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import { renderSupplierCandidatesPanelView } from '../../src/components/SupplierCandidatesPanelView.js';
import { SupplierCandidatesPanelViewModel } from '../../src/viewmodels/SupplierCandidatesPanelViewModel.js';
import { CuratorSupplierCandidateSyncService } from '../../src/services/curatorSupplierCandidateSyncService.js';
import { SupplierCandidateRow } from '../../src/services/curatorSupplierCandidateHandler.js';
import { renderEditorDashboard } from '../../src/components/EditorDashboard.js';
import { EditorViewModel } from '../../src/viewmodels/EditorViewModel.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { AuthService } from '../../src/services/authService.js';
import { STRINGS } from '../../src/resources/strings.js';

const ROW: SupplierCandidateRow = {
  id: 'new_link:bel:tejas-mk2',
  candidate_type: 'new_link',
  supplier_id: 'bel',
  supplier_name: 'Bharat Electronics Limited',
  program_id: 'tejas-mk2',
  subsystem_name: 'Needs reviewer input',
  source_story_id: 'story-1',
  source_domains: '["idrw.org"]',
  mention_count: 2,
  source_count: 1,
  confidence: 0.55,
  status: 'pending',
  first_seen_at: '2026-09-01T00:00:00.000Z',
  last_seen_at: '2026-09-02T00:00:00.000Z'
};

function makeSyncServiceMock(candidates: SupplierCandidateRow[] = [ROW]) {
  return {
    fetchPendingCandidates: vi.fn().mockResolvedValue({ candidates }),
    reviewCandidate: vi.fn().mockResolvedValue({ success: true })
  } as unknown as CuratorSupplierCandidateSyncService;
}

describe('SupplierCandidatesPanelView', () => {
  it('auto-loads on first render and shows a loading state before candidates arrive', () => {
    const vm = new SupplierCandidatesPanelViewModel(makeSyncServiceMock());
    const el = renderSupplierCandidatesPanelView(vm);
    expect(el.textContent).toContain(STRINGS.editorSupplierCandidates.loading);
  });

  it('renders each pending candidate with Approve/Reject actions once loaded', async () => {
    const vm = new SupplierCandidatesPanelViewModel(makeSyncServiceMock());
    await vm.load();
    const el = renderSupplierCandidatesPanelView(vm);

    expect(el.textContent).toContain('Bharat Electronics Limited');
    expect(el.textContent).toContain('tejas-mk2');
    const approveBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(STRINGS.editorSupplierCandidates.approveBtn)
    );
    expect(approveBtn).toBeDefined();
  });

  it('shows the empty state when there are no pending candidates', async () => {
    const vm = new SupplierCandidatesPanelViewModel(makeSyncServiceMock([]));
    await vm.load();
    const el = renderSupplierCandidatesPanelView(vm);
    expect(el.textContent).toContain(STRINGS.editorSupplierCandidates.empty);
  });

  it('clicking Approve calls reviewCandidate with the correct id and action', async () => {
    const sync = makeSyncServiceMock();
    const vm = new SupplierCandidatesPanelViewModel(sync);
    await vm.load();
    const el = renderSupplierCandidatesPanelView(vm);
    const approveBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(STRINGS.editorSupplierCandidates.approveBtn)
    ) as HTMLButtonElement;
    approveBtn.click();
    expect(sync.reviewCandidate).toHaveBeenCalledWith(ROW.id, 'approve');
  });
});

describe('EditorDashboard desk-tab wiring', () => {
  it('switches to the Ecosystem Candidates panel and back when its tabs are clicked', async () => {
    const newsVm = new NewsViewModel([], []);
    const authService = new AuthService();
    authService.setAuthenticated(true);
    const editorVm = new EditorViewModel(newsVm, authService);
    editorVm.setOpen(true);
    const supplierVm = new SupplierCandidatesPanelViewModel(makeSyncServiceMock([]));

    const el = renderEditorDashboard(editorVm, supplierVm);
    expect(el.textContent).toContain(STRINGS.editor.dashboardTitle);

    const candidatesTab = Array.from(el.querySelectorAll('.dw-editor-desk-tab')).find((b) =>
      b.textContent?.includes(STRINGS.editorSupplierCandidates.panelTabLabel)
    ) as HTMLButtonElement;
    expect(candidatesTab).toBeDefined();
    candidatesTab.click();
    expect(editorVm.getActiveDeskPanel()).toBe('supplierCandidates');
  });
});
