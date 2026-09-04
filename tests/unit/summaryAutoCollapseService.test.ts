/**
 * Unit Tests for Summary & Sources Auto-Collapse Service
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

describe('summaryAutoCollapseService', () => {
  const mockRect = (top: number, bottom: number, height = 300) => ({
    top, bottom, left: 0, right: 500, width: 500, height, x: 0, y: top, toJSON: () => ({})
  });

  const createMockCluster = (id: string, headline: string, relatedCount = 0): StoryCluster => ({
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
    relatedCoverage: Array.from({ length: relatedCount }, (_, i) => ({
      id: `rel-${id}-${i}`,
      title: `Related coverage ${i + 1}`,
      url: `https://example.com/rel-${i}`,
      sourceName: 'ANI',
      sourceDomain: 'aninews.in',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-09-01T06:00:00Z'
    })),
    discussions: [],
    ssbIntel: { whyItMatters: 'Tactical advancement.', strategicAngle: 'Deterrence capability.' },
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
    expect(checkAndAutoCollapseSummaries(newsVm)).toBe(0);
  });

  it('silently cleans up ViewModel state if expanded drawer DOM element is missing', () => {
    newsVm.setSSBExpanded('non-existent-cluster', true, false);
    newsVm.setSourcesExpanded('non-existent-cluster-2', true, false);
    expect(checkAndAutoCollapseSummaries(newsVm)).toBe(0);
    expect(newsVm.isSSBExpanded('non-existent-cluster')).toBe(false);
    expect(newsVm.isSourcesExpanded('non-existent-cluster-2')).toBe(false);
  });

  it('retains open state when summary drawer is partially or fully visible in viewport', () => {
    const cluster = createMockCluster('cluster-in-view', 'Tejas Squadron Commissioned');
    newsVm.setSSBExpanded(cluster.id, true, false);
    const articleEl = renderStoryCluster(cluster, newsVm);
    container.appendChild(articleEl);

    const drawer = articleEl.querySelector('.dw-ssb-drawer') as HTMLElement;
    expect(drawer).not.toBeNull();
    vi.spyOn(drawer, 'getBoundingClientRect').mockReturnValue(mockRect(150, 450, 300));

    expect(checkAndAutoCollapseSummaries(newsVm)).toBe(0);
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
    vi.spyOn(drawer, 'getBoundingClientRect').mockReturnValue(mockRect(-350, -50, 300));
    Object.defineProperty(drawer, 'offsetHeight', { value: 300, configurable: true });

    let anchorTop = 200;
    vi.spyOn(articleEl2, 'getBoundingClientRect').mockImplementation(() => mockRect(anchorTop, anchorTop + 150, 150));
    const originalRemove = drawer.remove.bind(drawer);
    vi.spyOn(drawer, 'remove').mockImplementation(() => {
      anchorTop = -100;
      originalRemove();
    });

    expect(checkAndAutoCollapseSummaries(newsVm)).toBe(1);
    expect(newsVm.isSSBExpanded(cluster.id)).toBe(false);
    expect(articleEl1.querySelector('.dw-ssb-drawer')).toBeNull();

    const toggleBtn = articleEl1.querySelector('.dw-ssb-toggle-btn');
    expect(toggleBtn?.textContent).toBe('▼');
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
    expect(window.scrollBy).toHaveBeenCalledWith(0, -300);
  });

  it('collapses sources drawer when scrolled out above screen and applies zero-jump scroll compensation', () => {
    const cluster = createMockCluster('cluster-sources-above', 'Aircraft Carrier Upgrades', 2);
    newsVm.setClusters([cluster]);
    newsVm.setSourcesExpanded(cluster.id, true, false);

    const articleEl = renderStoryCluster(cluster, newsVm);
    container.appendChild(articleEl);

    const drawer = articleEl.querySelector('.dw-sources-drawer') as HTMLElement;
    vi.spyOn(drawer, 'getBoundingClientRect').mockReturnValue(mockRect(-300, -40, 260));
    Object.defineProperty(drawer, 'offsetHeight', { value: 260, configurable: true });

    expect(checkAndAutoCollapseSummaries(newsVm)).toBe(1);
    expect(newsVm.isSourcesExpanded(cluster.id)).toBe(false);
    expect(articleEl.querySelector('.dw-sources-drawer')).toBeNull();

    const toggleBtn = articleEl.querySelector('.dw-sources-toggle-btn');
    expect(toggleBtn?.classList.contains('is-expanded')).toBe(false);
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
    expect(toggleBtn?.textContent).toBe('+2 sources');
    expect(window.scrollBy).toHaveBeenCalledWith(0, -260);
  });

  it('collapses sources drawer when scrolled out below screen without scroll jumps', () => {
    const cluster = createMockCluster('cluster-sources-below', 'Submarine Trials', 1);
    newsVm.setClusters([cluster]);
    newsVm.setSourcesExpanded(cluster.id, true, false);

    const articleEl = renderStoryCluster(cluster, newsVm);
    container.appendChild(articleEl);

    const drawer = articleEl.querySelector('.dw-sources-drawer') as HTMLElement;
    vi.spyOn(drawer, 'getBoundingClientRect').mockReturnValue(mockRect(920, 1200, 280));

    expect(checkAndAutoCollapseSummaries(newsVm)).toBe(1);
    expect(newsVm.isSourcesExpanded(cluster.id)).toBe(false);
    expect(articleEl.querySelector('.dw-sources-drawer')).toBeNull();
    const toggleBtn = articleEl.querySelector('.dw-sources-toggle-btn');
    expect(toggleBtn?.textContent).toBe('+1 source');
    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it('uses drawer height fallback when no anchor element is found after collapsing drawer', () => {
    const cluster = createMockCluster('cluster-no-anchor', 'Air Defense Missile Tested');
    newsVm.setSSBExpanded(cluster.id, true, false);

    const articleEl = renderStoryCluster(cluster, newsVm);
    container.appendChild(articleEl);

    const drawer = articleEl.querySelector('.dw-ssb-drawer') as HTMLElement;
    vi.spyOn(drawer, 'getBoundingClientRect').mockReturnValue(mockRect(-400, -100, 250));
    Object.defineProperty(drawer, 'offsetHeight', { value: 250, configurable: true });

    expect(checkAndAutoCollapseSummaries(newsVm)).toBe(1);
    expect(window.scrollBy).toHaveBeenCalledWith(0, -250);
  });

  it('collapses summary drawer when scrolled out below screen without triggering scroll jumps', () => {
    const cluster = createMockCluster('cluster-below', 'Deep Submergence Rescue Vessel Tested');
    newsVm.setSSBExpanded(cluster.id, true, false);

    const articleEl = renderStoryCluster(cluster, newsVm);
    container.appendChild(articleEl);

    const drawer = articleEl.querySelector('.dw-ssb-drawer') as HTMLElement;
    vi.spyOn(drawer, 'getBoundingClientRect').mockReturnValue(mockRect(950, 1250, 300));

    expect(checkAndAutoCollapseSummaries(newsVm)).toBe(1);
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

    vi.spyOn(drawer, 'getBoundingClientRect').mockReturnValue(mockRect(-200, -10, 190));
    const focusSpy = vi.spyOn(toggleBtn, 'focus');
    checkAndAutoCollapseSummaries(newsVm);
    expect(focusSpy).toHaveBeenCalled();
  });

  it('handles multiple open drawers and collapses only the ones out of view', () => {
    const clusterAbove = createMockCluster('cluster-multi-1', 'Story 1 Above', 2);
    const clusterInView = createMockCluster('cluster-multi-2', 'Story 2 In View', 1);
    newsVm.setClusters([clusterAbove, clusterInView]);

    newsVm.setSSBExpanded(clusterAbove.id, true, false);
    newsVm.setSourcesExpanded(clusterInView.id, true, false);

    const el1 = renderStoryCluster(clusterAbove, newsVm);
    const el2 = renderStoryCluster(clusterInView, newsVm);
    container.appendChild(el1);
    container.appendChild(el2);

    const d1 = el1.querySelector('.dw-ssb-drawer') as HTMLElement;
    const d2 = el2.querySelector('.dw-sources-drawer') as HTMLElement;

    vi.spyOn(d1, 'getBoundingClientRect').mockReturnValue(mockRect(-300, -20, 200));
    vi.spyOn(d2, 'getBoundingClientRect').mockReturnValue(mockRect(200, 400, 200));

    expect(checkAndAutoCollapseSummaries(newsVm)).toBe(1);
    expect(newsVm.isSSBExpanded(clusterAbove.id)).toBe(false);
    expect(newsVm.isSourcesExpanded(clusterInView.id)).toBe(true);
    expect(el1.querySelector('.dw-ssb-drawer')).toBeNull();
    expect(el2.querySelector('.dw-sources-drawer')).not.toBeNull();
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

    newsVm.setSourcesExpanded('cluster-sources', true, false);
    window.dispatchEvent(new Event('scroll'));
    expect(rafSpy).toHaveBeenCalled();

    teardown();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
