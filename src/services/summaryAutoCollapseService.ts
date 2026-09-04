/**
 * Summary Auto-Collapse Service for DefenceWire.in
 * Automatically detects when expanded article summaries scroll out of view,
 * collapses them cleanly, and synchronously adjusts scroll position via
 * zero-jump relative anchor tracking.
 * Hard limit: <= 300 LOC.
 */

import { NewsViewModel } from '../viewmodels/NewsViewModel.js';
import { STRINGS } from '../resources/strings.js';

export interface AutoCollapseOptions {
  aboveThresholdPx?: number;
  belowThresholdPx?: number;
}

/**
 * Finds the first visible anchor element below the collapsing element in the viewport
 * to track visual layout shift.
 */
function findVisibleAnchorElement(afterElement?: HTMLElement | null): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const candidates = document.querySelectorAll<HTMLElement>(
    '.dw-cluster, .dw-headline, .dw-river-card, .dw-footer'
  );

  for (let i = 0; i < candidates.length; i++) {
    const el = candidates[i];
    if (!el) continue;
    if (afterElement) {
      const isFollowing = (afterElement.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      if (!isFollowing) continue;
    }
    const rect = el.getBoundingClientRect();
    if (rect.top >= 0 && rect.top < viewportHeight) {
      return el;
    }
  }
  return null;
}

interface CollapseDrawerParams {
  clusterId: string;
  drawerType: 'ssb' | 'sources';
  newsVm: NewsViewModel;
  aboveThreshold: number;
  belowThreshold: number;
}

/**
 * Collapses a single drawer (SSB or sources), restores focus if necessary,
 * resets the toggle button state, removes the DOM node, updates the ViewModel,
 * and applies zero-jump scroll compensation if collapsed above viewport.
 */
function collapseSingleDrawer(params: CollapseDrawerParams): boolean {
  const { clusterId, drawerType, newsVm, aboveThreshold, belowThreshold } = params;
  const drawerId = drawerType === 'ssb' ? `ssb-drawer-${clusterId}` : `sources-drawer-${clusterId}`;
  const drawer = document.getElementById(drawerId);

  if (!drawer) {
    if (drawerType === 'ssb') {
      newsVm.setSSBExpanded(clusterId, false, false);
    } else {
      newsVm.setSourcesExpanded(clusterId, false, false);
    }
    return false;
  }

  const drawerRect = drawer.getBoundingClientRect();
  const isAbove = drawerRect.bottom <= aboveThreshold;
  const isBelow = drawerRect.top >= belowThreshold;

  if (!isAbove && !isBelow) {
    return false;
  }

  // Zero-Jump Relative Anchor: Capture position of visible element below drawer before collapse
  let anchorEl: HTMLElement | null = null;
  let anchorTopBefore = 0;

  if (isAbove) {
    anchorEl = findVisibleAnchorElement(drawer);
    if (anchorEl) {
      anchorTopBefore = anchorEl.getBoundingClientRect().top;
    }
  }

  // Accessible focus restoration if focus was inside collapsing drawer
  if (typeof document !== 'undefined' && drawer.contains(document.activeElement)) {
    const clusterEl = document.getElementById(`cluster-${clusterId}`);
    if (clusterEl) {
      const toggleBtn = clusterEl.querySelector<HTMLElement>(
        drawerType === 'ssb' ? '.dw-ssb-toggle-btn' : '.dw-sources-toggle-btn'
      );
      const headlineLink = clusterEl.querySelector<HTMLElement>('.dw-headline a');
      if (toggleBtn) {
        toggleBtn.focus();
      } else if (headlineLink) {
        headlineLink.focus();
      }
    }
  }

  // Surgically reset toggle button on the story cluster
  const clusterEl = document.getElementById(`cluster-${clusterId}`);
  if (clusterEl) {
    if (drawerType === 'ssb') {
      const toggleBtn = clusterEl.querySelector<HTMLButtonElement>('.dw-ssb-toggle-btn');
      if (toggleBtn) {
        toggleBtn.classList.remove('is-expanded');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-label', STRINGS.story.expandSummaryAriaLabel);
        toggleBtn.setAttribute('title', STRINGS.summary.drawerTitle);
        toggleBtn.textContent = '▼';
      }
    } else {
      const toggleBtn = clusterEl.querySelector<HTMLButtonElement>('.dw-sources-toggle-btn');
      if (toggleBtn) {
        toggleBtn.classList.remove('is-expanded');
        toggleBtn.setAttribute('aria-expanded', 'false');
        const cluster = newsVm.getClusterById(clusterId);
        const total = (cluster?.relatedCoverage?.length || 0) + (cluster?.discussions?.length ? 1 : 0);
        const pillLabel = total > 0
          ? `${STRINGS.story.sourcesTogglePrefix}${total} ${
              total === 1 ? STRINGS.story.sourcesSingular : STRINGS.story.sourcesToggleSuffix
            }`
          : STRINGS.story.sourcesCollapse;
        toggleBtn.setAttribute('aria-label', pillLabel);
        toggleBtn.textContent = pillLabel;
      }
    }
  }

  // Capture height before removing DOM node
  const drawerHeight = drawer.offsetHeight || drawerRect.height;
  const wrapper = drawer.closest(
    drawerType === 'ssb' ? '.dw-ssb-drawer-wrapper' : '.dw-sources-drawer-wrapper'
  );

  // Remove drawer DOM element (and its accordion wrapper if present)
  drawer.remove();
  if (wrapper) {
    wrapper.remove();
  }

  // Synchronize ViewModel state silently without triggering full feed re-render
  if (drawerType === 'ssb') {
    newsVm.setSSBExpanded(clusterId, false, false);
  } else {
    newsVm.setSourcesExpanded(clusterId, false, false);
  }

  // Apply zero-jump scroll offset compensation for elements collapsed above viewport
  if (isAbove && typeof window !== 'undefined') {
    if (anchorEl && typeof anchorEl.getBoundingClientRect === 'function') {
      const anchorTopAfter = anchorEl.getBoundingClientRect().top;
      const shiftDelta = anchorTopAfter - anchorTopBefore;
      if (shiftDelta !== 0) {
        if (typeof window.scrollBy === 'function') {
          window.scrollBy(0, shiftDelta);
        } else if (typeof window.scrollTo === 'function') {
          window.scrollTo(0, (window.scrollY || 0) + shiftDelta);
        }
      }
    } else if (drawerHeight > 0) {
      if (typeof window.scrollBy === 'function') {
        window.scrollBy(0, -drawerHeight);
      } else if (typeof window.scrollTo === 'function') {
        window.scrollTo(0, (window.scrollY || 0) - drawerHeight);
      }
    }
  }

  return true;
}

/**
 * Checks all currently expanded SSB summary and corroborating sources drawers,
 * collapsing any that have scrolled entirely out of the viewport, compensating
 * for visual layout shifts.
 */
export function checkAndAutoCollapseSummaries(
  newsVm: NewsViewModel,
  options?: AutoCollapseOptions
): number {
  if (
    (!newsVm.hasExpandedSSBDrawers() && !newsVm.hasExpandedSourcesDrawers()) ||
    typeof document === 'undefined'
  ) {
    return 0;
  }

  const aboveThreshold = options?.aboveThresholdPx ?? 0;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const belowThreshold = viewportHeight + (options?.belowThresholdPx ?? 100);

  let collapsedCount = 0;

  if (newsVm.hasExpandedSSBDrawers()) {
    for (const clusterId of newsVm.getExpandedSSBClusterIds()) {
      if (collapseSingleDrawer({ clusterId, drawerType: 'ssb', newsVm, aboveThreshold, belowThreshold })) {
        collapsedCount++;
      }
    }
  }

  if (newsVm.hasExpandedSourcesDrawers()) {
    for (const clusterId of newsVm.getExpandedSourcesClusterIds()) {
      if (collapseSingleDrawer({ clusterId, drawerType: 'sources', newsVm, aboveThreshold, belowThreshold })) {
        collapsedCount++;
      }
    }
  }

  return collapsedCount;
}

/**
 * Initializes passive scroll listener with requestAnimationFrame throttling
 * to automatically collapse out-of-view summaries and sources drawers. Returns a teardown function.
 */
export function initSummaryAutoCollapse(
  newsVm: NewsViewModel,
  options?: AutoCollapseOptions
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let rafId: number | null = null;

  const requestFrame =
    typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number;

  const cancelFrame =
    typeof window.cancelAnimationFrame === 'function'
      ? window.cancelAnimationFrame.bind(window)
      : (id: number) => clearTimeout(id);

  const onScroll = () => {
    // O(1) fast bailout if neither summaries nor sources drawers are currently open
    if (!newsVm.hasExpandedSSBDrawers() && !newsVm.hasExpandedSourcesDrawers()) {
      return;
    }

    if (rafId !== null) return;

    rafId = requestFrame(() => {
      rafId = null;
      checkAndAutoCollapseSummaries(newsVm, options);
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', onScroll);
    if (rafId !== null) {
      cancelFrame(rafId);
      rafId = null;
    }
  };
}
