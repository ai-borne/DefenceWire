/**
 * Unit Tests for SSBDrawer Component & Bottom Collapse Interaction
 * Hard limit: <= 300 LOC.
 */

// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderSSBDrawer } from '../../src/components/SSBDrawer.js';
import { renderStoryCluster } from '../../src/components/StoryClusterView.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { SSBIntelligence, StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('SSBDrawer Component & Bottom Collapse Button', () => {
  const mockIntel: SSBIntelligence = {
    whyItMatters: 'Massive boost to tactical interception capability.',
    strategicAngle: 'Deterrence against hostile airspace incursions.',
    defenceTechTakeaway: {
      platformOrSystem: 'Patriot PAC-3 MSE',
      indigenousContentPercentage: 0,
      specifications: ['Hit-to-kill interceptor', 'Range: 60km+'],
      keySignificance: 'Deep-magazine capacity for theater air defence.'
    },
    gdLecturettePoints: ['Air defence modernization in the subcontinent'],
    potentialInterviewQuestions: ['What is the difference between BMD and theater AD?']
  };

  const mockCluster: StoryCluster = {
    id: 'cluster-test-1',
    synthesizedHeadline: 'Framework Deal Reached for Air Defence Interceptors',
    primarySource: {
      id: 'src-1',
      title: 'Framework Deal Reached for Air Defence Interceptors',
      url: 'https://defencenews.com/patriot',
      sourceName: 'Defense News',
      sourceDomain: 'defencenews.com',
      tier: SourceTier.TIER_3_SPECIALIZED,
      publishedAt: '2026-09-01T04:00:00Z'
    },
    relatedCoverage: [],
    discussions: [],
    ssbIntel: mockIntel,
    categories: ['tech'],
    entities: ['Patriot', 'THAAD'],
    defenceScore: 85,
    isLeadStory: true,
    createdAt: '2026-09-01T04:00:00Z',
    updatedAt: '2026-09-01T04:00:00Z'
  };

  it('renders all summary sections and header without bottom collapse button or footer', () => {
    const el = renderSSBDrawer(mockIntel, 'cluster-test-1', false);
    expect(el.classList.contains('dw-ssb-drawer')).toBe(true);
    expect(el.textContent).toContain(STRINGS.summary.drawerTitle);
    expect(el.textContent).toContain(STRINGS.summary.whyItMattersHeading);
    expect(el.textContent).toContain(STRINGS.summary.strategicAngleHeading);
    expect(el.textContent).toContain(STRINGS.summary.techTakeawayHeading);
    expect(el.querySelector('.dw-ssb-bottom-collapse-btn')).toBeNull();
    expect(el.querySelector('.dw-ssb-footer')).toBeNull();
  });

  it('renders inline metadata and action buttons inside card footer', () => {
    const newsVm = new NewsViewModel();
    const articleEl = renderStoryCluster(mockCluster, newsVm);

    const footerEl = articleEl.querySelector('.dw-cluster-footer');
    expect(footerEl).not.toBeNull();

    const sourceLine = footerEl?.querySelector('.dw-source-line');
    const actionsGroup = footerEl?.querySelector('.dw-cluster-actions');

    expect(sourceLine).not.toBeNull();
    expect(actionsGroup).not.toBeNull();

    const toggleBtn = actionsGroup?.querySelector('.dw-ssb-toggle-btn');
    const permalinkBtn = actionsGroup?.querySelector('.dw-permalink-btn');

    expect(toggleBtn).not.toBeNull();
    expect(permalinkBtn).not.toBeNull();
    expect(toggleBtn?.textContent).toContain('▼');
    expect(toggleBtn?.textContent).toContain(STRINGS.summary.summaryToggleText);

    // Verify permalinkBtn comes before toggleBtn in action group
    expect(permalinkBtn?.compareDocumentPosition(toggleBtn!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('integrates with StoryClusterView and NewsViewModel to expand and collapse summary via base footer toggle', () => {
    const newsVm = new NewsViewModel();
    // Expand drawer for cluster
    newsVm.toggleSSBDrawer(mockCluster.id);
    expect(newsVm.isSSBExpanded(mockCluster.id)).toBe(true);

    const articleEl = renderStoryCluster(mockCluster, newsVm);
    const drawerEl = articleEl.querySelector('.dw-ssb-drawer');
    expect(drawerEl).not.toBeNull();

    const toggleBtn = articleEl.querySelector('.dw-ssb-toggle-btn') as HTMLButtonElement | null;
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn?.textContent).toContain('▲');
    expect(toggleBtn?.textContent).toContain(STRINGS.summary.summaryCollapseText);
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('true');

    // Click toggle button to collapse
    toggleBtn?.click();

    // ViewModel should now have closed the summary drawer
    expect(newsVm.isSSBExpanded(mockCluster.id)).toBe(false);
  });

  it('renders permalink share button with subtle text label, tooltip and handles click', async () => {
    const newsVm = new NewsViewModel();
    const articleEl = renderStoryCluster(mockCluster, newsVm);

    const permalinkBtn = articleEl.querySelector('.dw-permalink-btn') as HTMLButtonElement | null;
    expect(permalinkBtn).not.toBeNull();
    expect(permalinkBtn?.textContent).toContain(STRINGS.story.permalinkIcon);
    expect(permalinkBtn?.textContent).toContain(STRINGS.story.shareBtnText);
    expect(permalinkBtn?.getAttribute('title')).toBe(STRINGS.story.permalinkTooltip);
    expect(permalinkBtn?.getAttribute('aria-label')).toBe(STRINGS.story.shareAriaLabel);

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });

    permalinkBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(permalinkBtn?.textContent).toContain(STRINGS.story.permalinkCopiedIcon);
    expect(permalinkBtn?.textContent).toContain(STRINGS.story.shareBtnCopiedText);
    expect(permalinkBtn?.getAttribute('title')).toBe(STRINGS.story.permalinkCopiedTooltip);
    expect(permalinkBtn?.classList.contains('dw-permalink-btn--copied')).toBe(true);
  });
});
