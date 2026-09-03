/**
 * Unit & Integration Tests: Modular 5-Tab Curator Workstation & Edge Security
 * Verifies Phase 3.4 tabs (Wire, Intel, Ecosystem, Crawler, Scorecard) and edge 401 rejection.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderEditorDashboard } from '../../src/components/EditorDashboard.js';
import { renderWireCurationView } from '../../src/components/editor/WireCurationView.js';
import { renderIntelReviewView } from '../../src/components/editor/IntelReviewView.js';
import { renderCrawlerHealthView } from '../../src/components/editor/CrawlerHealthView.js';
import { renderSourceScorecardView } from '../../src/components/editor/SourceScorecardView.js';
import { EditorViewModel } from '../../src/viewmodels/EditorViewModel.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { SupplierCandidatesPanelViewModel } from '../../src/viewmodels/SupplierCandidatesPanelViewModel.js';
import { AuthService } from '../../src/services/authService.js';
import { STRINGS } from '../../src/resources/strings.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { onRequestPost as onPostOverrides, onRequestDelete as onDeleteOverrides } from '../../functions/api/curator/overrides.js';
import { onRequestPost as onPostCandidates } from '../../functions/api/curator/supplier-candidates.js';

describe('Modular 5-Tab Curator Workstation', () => {
  let newsVm: NewsViewModel;
  let authService: AuthService;
  let editorVm: EditorViewModel;
  let supplierCandidatesVm: SupplierCandidatesPanelViewModel;

  const sampleCluster: StoryCluster = {
    id: 'cluster-test-1',
    synthesizedHeadline: 'HAL Delivers First Batch of Tejas Mk1A to IAF',
    primarySource: {
      id: 'src-1',
      title: 'Tejas Mk1A inducted',
      url: 'https://pib.gov.in/news/1',
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T10:00:00Z'
    },
    relatedCoverage: [],
    discussions: [],
    categories: ['airforce'],
    entities: ['Tejas Mk1A'],
    defenceScore: 88,
    isLeadStory: false,
    createdAt: '2026-08-30T10:00:00Z',
    updatedAt: '2026-08-30T10:00:00Z',
    ssbIntel: {
      whyItMatters: 'Accelerates IAF squadron induction timelines.',
      strategicAngle: 'Boosts Western Border combat air readiness.',
      defenceTechTakeaway: {
        platformOrSystem: 'Tejas Mk1A',
        specifications: ['Uttam AESA Radar', 'Software Defined Radio'],
        keySignificance: 'Equipped with Uttam AESA Radar and SDR.'
      },
      gdLecturettePoints: ['Indigenous aerospace base', 'Engine certification'],
      potentialInterviewQuestions: ['What are the key avionics upgrades?']
    }
  };

  beforeEach(() => {
    newsVm = new NewsViewModel([sampleCluster], []);
    authService = new AuthService();
    authService.setAuthenticated(true);
    editorVm = new EditorViewModel(newsVm, authService);
    editorVm.setOpen(true);
    supplierCandidatesVm = new SupplierCandidatesPanelViewModel({
      fetchPendingCandidates: vi.fn().mockResolvedValue({ candidates: [] }),
      reviewCandidate: vi.fn().mockResolvedValue({ success: true })
    } as any);
  });

  it('renders all 5 tabs in the workstation navigation bar', () => {
    const el = renderEditorDashboard(editorVm, supplierCandidatesVm);
    const tabs = el.querySelectorAll('.dw-editor-desk-tab');
    expect(tabs.length).toBe(5);

    const labels = Array.from(tabs).map((t) => t.textContent?.trim());
    expect(labels).toContain(STRINGS.curatorDesk.tabWire);
    expect(labels).toContain(STRINGS.curatorDesk.tabIntel);
    expect(labels).toContain(STRINGS.editorSupplierCandidates.panelTabLabel);
    expect(labels).toContain(STRINGS.curatorDesk.tabCrawler);
    expect(labels).toContain(STRINGS.curatorDesk.tabScorecard);
  });

  it('switches between all 5 workstation tabs correctly', () => {
    const el = renderEditorDashboard(editorVm, supplierCandidatesVm);
    const tabs = Array.from(el.querySelectorAll('.dw-editor-desk-tab')) as HTMLButtonElement[];

    // 1. Tab 1: Wire (Default)
    expect(editorVm.isPanelActive('wire')).toBe(true);

    // 2. Tab 2: Intel Review
    const intelTab = tabs.find((t) => t.textContent?.includes(STRINGS.curatorDesk.tabIntel));
    intelTab?.click();
    expect(editorVm.isPanelActive('intel')).toBe(true);

    // 3. Tab 3: Ecosystem Pipeline
    const ecoTab = tabs.find((t) => t.textContent?.includes(STRINGS.editorSupplierCandidates.panelTabLabel));
    ecoTab?.click();
    expect(editorVm.isPanelActive('supplierCandidates')).toBe(true);

    // 4. Tab 4: Crawler Health
    const crawlerTab = tabs.find((t) => t.textContent?.includes(STRINGS.curatorDesk.tabCrawler));
    crawlerTab?.click();
    expect(editorVm.isPanelActive('crawler')).toBe(true);

    // 5. Tab 5: Source Scorecard
    const scorecardTab = tabs.find((t) => t.textContent?.includes(STRINGS.curatorDesk.tabScorecard));
    scorecardTab?.click();
    expect(editorVm.isPanelActive('scorecard')).toBe(true);
  });

  it('Tab 1 (WireCurationView) renders cluster cards and filters', () => {
    const view = renderWireCurationView(editorVm);
    expect(view.textContent).toContain('HAL Delivers First Batch of Tejas Mk1A to IAF');
    expect(view.querySelector('.dw-editor-search')).toBeDefined();
    expect(view.querySelectorAll('.dw-editor-filter-tab').length).toBe(3);
  });

  it('Tab 2 (IntelReviewView) renders intelligence briefs and takeaways', () => {
    const view = renderIntelReviewView(editorVm);
    expect(view.textContent).toContain('HAL Delivers First Batch of Tejas Mk1A to IAF');
    expect(view.textContent).toContain('Accelerates IAF squadron induction timelines.');
    expect(view.textContent).toContain('Boosts Western Border combat air readiness.');
    expect(view.textContent).toContain('Equipped with Uttam AESA Radar and SDR.');

    const editBriefBtn = Array.from(view.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(STRINGS.curatorDesk.editBriefBtn)
    );
    expect(editBriefBtn).toBeDefined();
  });

  it('Tab 4 (CrawlerHealthView) renders telemetry metrics and circuit-breaker states', () => {
    const view = renderCrawlerHealthView(editorVm);
    expect(view.textContent).toContain(STRINGS.curatorDesk.crawlerHealthHeading);
    expect(view.textContent).toContain(STRINGS.curatorDesk.totalFeedsLabel);
    expect(view.textContent).toContain(STRINGS.curatorDesk.healthyFeedsLabel);
    expect(view.querySelectorAll('.dw-circuit-badge').length).toBeGreaterThan(0);
  });

  it('Tab 5 (SourceScorecardView) renders source tiers and multipliers', () => {
    const view = renderSourceScorecardView(editorVm);
    expect(view.textContent).toContain(STRINGS.curatorDesk.scorecardHeading);
    expect(view.textContent).toContain('Press Information Bureau (PIB MoD)');
    expect(view.textContent).toContain('pib.gov.in');
    expect(view.textContent).toContain('100%');
    expect(view.textContent).toContain('1.00x');
  });
});

describe('Edge Security: Cryptographic HMAC Rejection (Refinement 8)', () => {
  const dummyDb: any = {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({}),
      all: vi.fn().mockResolvedValue({ results: [] })
    })
  };

  it('rejects unauthenticated POST to /api/curator/overrides with HTTP 401', async () => {
    const req = new Request('https://defencewire.in/api/curator/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'test-1', overrideType: 'promote', payload: {} })
    });
    const res = await onPostOverrides({ request: req, env: { DB: dummyDb, CURATOR_SESSION_SECRET: 'test-secret' } });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Unauthorized');
  });

  it('rejects unauthenticated DELETE to /api/curator/overrides with HTTP 401', async () => {
    const req = new Request('https://defencewire.in/api/curator/overrides?id=test-1', {
      method: 'DELETE'
    });
    const res = await onDeleteOverrides({ request: req, env: { DB: dummyDb, CURATOR_SESSION_SECRET: 'test-secret' } });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Unauthorized');
  });

  it('rejects unauthenticated POST to /api/curator/supplier-candidates with HTTP 401', async () => {
    const req = new Request('https://defencewire.in/api/curator/supplier-candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'cand-1', action: 'approve' })
    });
    const res = await onPostCandidates({ request: req, env: { DB: dummyDb, CURATOR_SESSION_SECRET: 'test-secret' } });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Unauthorized');
  });

  it('rejects tampered or forged HMAC session cookie with HTTP 401', async () => {
    const forgedCookie = 'dw_curator_session=v1.1725000000000.baddeadbeefsig';
    const req = new Request('https://defencewire.in/api/curator/overrides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: forgedCookie
      },
      body: JSON.stringify({ id: 'test-1', overrideType: 'promote', payload: {} })
    });
    const res = await onPostOverrides({ request: req, env: { DB: dummyDb, CURATOR_SESSION_SECRET: 'real-secret-2026' } });
    expect(res.status).toBe(401);
  });
});
