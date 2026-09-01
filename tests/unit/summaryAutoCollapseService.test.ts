/**
 * Unit Tests for Summary Auto-Collapse Service
 * Tests out-of-view detection, zero-jump scroll compensation, focus restoration, and event listener lifecycle.
 * Hard limit: <= 300 LOC.
 */

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkAndAutoCollapseSummaries, initSummaryAutoCollapse } from '../../src/services/summaryAutoCollapseService.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { renderStoryCluster } from '../../src/components/StoryClusterView.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('summaryAutoCollapseService', () => {
  const createMockCluster = (id: string, headline: string): StoryCluster => ({
    id,
    synthesizedHeadline: headline,
    primarySource: {
      id: `src-${id}`,
      title: headline,
      url: `https://example.com/${id}`,
      sourceName: 'Defence Source',
      sourceDomain: 'example.com',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-09-01T06:00:00Z'
    },
    relatedCoverage: [],
    discussions: [],
    ssbIntel: {
      whyItMatters: 'Key tactical advancement.',
      strategicAngle: 'Deterrence capability.',
      defenceTechTakeaway: {
        platformOrSystem: 'Tejas Mk1A',
        indigenousContentPercentage: 65,
        specifications: ['AESA Radar'],
        keySignificance: 'Air superiority'
      }
    },
    categories: ['tech'],
    entities: ['Tejas'],
    defenceScore: 90,
    isLeadStory: false,
    createdAt: '2026-09-01T06:00:00Z',
    updatedAt: '2026-09-01T06:00:00Z'
  });

  let newsVm: NewsViewModel;
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.className = 'dw-main-feed';
    document.body.appendChild(container);

    newsVm = new NewsViewModel();
    window.innerHeight = 800;
    window.scrollBy = vi.fn();
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('bails out immediately and returns 0 when no drawers are expanded', () => {
    const collapsed = checkAndAutoCollapseSummaries(newsVm);
    expect(collapsed).toBe(0);
  });

  it('silently cleans up ViewModel state if expanded drawer DOM element is missing', () => {
    newsVm.setSSBExpanded('non-existent-cluster', true, false);
    expect(newsVm.isSSBExpanded('non-existent-cluster')).toBe(true);

    const collapsed = checkAndAutoCollapseSummaries(newsVm);
    expect(collapsed).toBe(0);
    expect(newsVm.isSSBExpanded('non-existent-cluster')).toBe(false);
  });

  it('retains open state when summary drawer is partially or fully visible in viewport', () => {
    const cluster = createMockCluster('cluster-in-view', 'Tejas Squadron Commissioned');
    newsVm.setSSBExpanded(cluster.id, true, false);

    const articleEl = renderStoryCluster(cluster, newsVm);
    container.appendChild(articleEl);

    const drawer = articleEl.querySelector('.dw-ssb-drawer') as HTMLElement;
    expect(drawer).not.toBeNull();

    vi.spyOn(drawer, 'getBoundingClientRect').mockReturnValue({
      top: 150, bottom: 450, left: 0, right: 500, width: 500, height: 300, x: 0, y: 150, toJSON: () => ({})
    });

    const collapsed = checkAndAutoCollapseSummaries(newsVm);
    expect(collapsed).toBe(0);
    expect(newsVm.isSSBExpanded(cluster.id)).toBe(true);
    expect(articleEl.querySelector('.dw-ssb-drawer')).not.toBeNull();
  });

  it('collapses summary drawer when scrolled out above screen and applies zero-jump scroll compensation', () => {
    const cluster = createMockCluster('cluster-above', 'Carrier Air Wing Trials Complete');
    const cluster2 = createMockCluster('cluster-anchor', 'Next Gen Frigate Delivered');

    newsVm.setSSBExpanded(cluster.id, true, false);

    const articleEl1 = renderStoryCluster(cluster, newsVm);
    const articleEl2 = renderStoryCluster(cluster2, newsVm);
    container.appendChild(articleEl1);
    container.appendChild(articleEl2);

    const drawer = articleEl1.querySelector('.dw-ssb-drawer') as HTMLElement;
    expect(drawer).not.toBeNull();

    vi.spyOn(drawer, 'getBoundingClientRect').mockReturnValue({
      top: -350, bottom: -50, left: 0, right: 500, width: 500, height: 300, x: 0, y: -350, toJSON: () => ({})
    });
    Object.defineProperty(drawer, 'offsetHeight', { value: 300, configurable: true });

    let anchorTop = 200;
    vi.spyOn(articleEl2, 'getBoundingClientRect').mockImplementation(() => ({
      top: anchorTop, bottom: anchorTop + 150, left: 0, right: 500, width: 500, height: 150, x: 0, y: anchorTop, toJSON: () => ({})
    }));

    const originalRemove = drawer.remove.bind(drawer);
    vi.spyOn(drawer, 'remove').mockImplementation(() => {
      anchorTop = -100;
      originalRemove();
    });

    const collapsed = checkAndAutoCollapseSummaries(newsVm);
    expect(collapsed).toBe(1);
    expect(newsVm.isSSBExpanded(cluster.id)).toBe(false);
    expect(articleEl1.querySelector('.dw-ssb-drawer')).toBeNull();

    const toggleBtn = articleEl1.querySelector('.dw-ssb-toggle-btn');
    expect(toggleBtn?.textContent).toBe('▼');
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
    expect(toggleBtn?.getAttribute('aria-label')).toBe(STRINGS.story.expandSummaryAriaLabel);
    expect(window.scrollBy).toHaveBeenCalledWith(0, -300);
  });

  it('uses drawer height fallback when no anchor element is found after collapsing drawer', () => {
    const cluster = createMockCluster('cluster-no-anchor', 'Air Defense Missile Tested');
    newsVm.setSSBExpanded(cluster.id, true, false);

    const articleEl = renderStoryCluster(cluster, newsVm);
    container.appendChild(articleEl);

    const drawer = articleEl.querySelector('.dw-ssb-drawer') as HTMLElement;
    vi.spyOn(drawer, 'getBoundingClientRect').mockReturnValue({
      top: -400, bottom: -100, left: 0, right: 500, width: 500, height: 250, x: 0, y: -400, toJSON: () => ({})
    });
    Object.defineProperty(drawer, 'offsetHeight', { value: 250, configurable: true });

    const collapsed = checkAndAutoCollapseSummaries(newsVm);
    expect(collapsed).toBe(1);
    expect(window.scrollBy).toHaveBeenCalledWith(0, -250);
  });

  it('collapses summary drawer when scrolled out below screen without triggering scroll jumps', () => {
    const cluster = createMockCluster('cluster-below', 'Deep Submergence Rescue Vessel Tested');
    newsVm.setSSBExpanded(cluster.id, true, false);

    const articleEl = renderStoryCluster(cluster, newsVm);
    container.appendChild(articleEl);

    const drawer = articleEl.querySelector('.dw-ssb-drawer') as HTMLElement;
    vi.spyOn(drawer, 'getBoundingClientRect').mockReturnValue({
      top: 950, bottom: 1250, left: 0, right: 500, width: 500, height: 300, x: 0, y: 950, toJSON: () => ({})
    });

    const collapsed = checkAndAutoCollapseSummaries(newsVm);
    expect(collapsed).toBe(1);
    expect(newsVm.isSSBExpanded(cluster.id)).toBe(false);
    expect(articleEl.querySelector('.dw-ssb-drawer')).toBeNull();
    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it('restores focus safely to toggle button if active element is inside collapsing drawer', () => {
    const cluster = createMockCluster('cluster-focus', 'Hypersonic Glider Wind Tunnel Tests');
    newsVm.setSSBExpanded(cluster.id, true, false);

    const articleEl = renderStoryCluster(cluster, newsVm);
    container.appendChild(articleEl);

    const drawer = articleEl.querySelector('.dw-ssb-drawer') as HTMLElement;
    const toggleBtn = articleEl.querySelector('.dw-ssb-toggle-btn') as HTMLButtonElement;

    const insideLink = document.createElement('a');
    insideLink.href = '#';
    drawer.appendChild(insideLink);
    insideLink.focus();
    expect(document.activeElement).toBe(insideLink);

    vi.spyOn(drawer, 'getBoundingClientRect').mockReturnValue({
      top: -200, bottom: -10, left: 0, right: 500, width: 500, height: 190, x: 0, y: -200, toJSON: () => ({})
    });

    const focusSpy = vi.spyOn(toggleBtn, 'focus');
    checkAndAutoCollapseSummaries(newsVm);
    expect(focusSpy).toHaveBeenCalled();
  });

  it('handles multiple open summaries and collapses only the ones out of view', () => {
    const clusterAbove = createMockCluster('cluster-multi-1', 'Story 1 Above');
    const clusterInView = createMockCluster('cluster-multi-2', 'Story 2 In View');

    newsVm.setSSBExpanded(clusterAbove.id, true, false);
    newsVm.setSSBExpanded(clusterInView.id, true, false);

    const el1 = renderStoryCluster(clusterAbove, newsVm);
    const el2 = renderStoryCluster(clusterInView, newsVm);
    container.appendChild(el1);
    container.appendChild(el2);

    const d1 = el1.querySelector('.dw-ssb-drawer') as HTMLElement;
    const d2 = el2.querySelector('.dw-ssb-drawer') as HTMLElement;

    vi.spyOn(d1, 'getBoundingClientRect').mockReturnValue({
      top: -300, bottom: -20, left: 0, right: 500, width: 500, height: 200, x: 0, y: -300, toJSON: () => ({})
    });
    vi.spyOn(d2, 'getBoundingClientRect').mockReturnValue({
      top: 200, bottom: 400, left: 0, right: 500, width: 500, height: 200, x: 0, y: 200, toJSON: () => ({})
    });

    const collapsed = checkAndAutoCollapseSummaries(newsVm);
    expect(collapsed).toBe(1);
    expect(newsVm.isSSBExpanded(clusterAbove.id)).toBe(false);
    expect(newsVm.isSSBExpanded(clusterInView.id)).toBe(true);
    expect(el1.querySelector('.dw-ssb-drawer')).toBeNull();
    expect(el2.querySelector('.dw-ssb-drawer')).not.toBeNull();
  });

  it('attaches passive scroll listener and throttles with requestAnimationFrame in initSummaryAutoCollapse', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 123;
    });

    const teardown = initSummaryAutoCollapse(newsVm);
    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });

    window.dispatchEvent(new Event('scroll'));
    expect(rafSpy).not.toHaveBeenCalled();

    newsVm.setSSBExpanded('cluster-1', true, false);
    window.dispatchEvent(new Event('scroll'));
    expect(rafSpy).toHaveBeenCalled();

    teardown();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
