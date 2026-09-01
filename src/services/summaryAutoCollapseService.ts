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

/**
 * Checks all currently expanded SSB summary drawers and collapses any that
 * have scrolled entirely out of the viewport, compensating for layout shifts.
 */
export function checkAndAutoCollapseSummaries(
  newsVm: NewsViewModel,
  options?: AutoCollapseOptions
): number {
  if (!newsVm.hasExpandedSSBDrawers() || typeof document === 'undefined') {
    return 0;
  }

  const expandedClusterIds = newsVm.getExpandedSSBClusterIds();
  if (expandedClusterIds.size === 0) {
    return 0;
  }

  const aboveThreshold = options?.aboveThresholdPx ?? 0;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const belowThreshold = viewportHeight + (options?.belowThresholdPx ?? 100);

  let collapsedCount = 0;

  for (const clusterId of expandedClusterIds) {
    const drawer = document.getElementById(`ssb-drawer-${clusterId}`);
    if (!drawer) {
      newsVm.setSSBExpanded(clusterId, false, false);
      continue;
    }

    const drawerRect = drawer.getBoundingClientRect();
    const isAbove = drawerRect.bottom <= aboveThreshold;
    const isBelow = drawerRect.top >= belowThreshold;

    if (!isAbove && !isBelow) {
      continue;
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
        const toggleBtn = clusterEl.querySelector<HTMLElement>('.dw-ssb-toggle-btn');
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
      const toggleBtn = clusterEl.querySelector<HTMLButtonElement>('.dw-ssb-toggle-btn');
      if (toggleBtn) {
        toggleBtn.classList.remove('is-expanded');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-label', STRINGS.story.expandSummaryAriaLabel);
        toggleBtn.setAttribute('title', STRINGS.summary.drawerTitle);
        toggleBtn.textContent = '▼';
      }
    }

    // Capture height before removing DOM node
    const drawerHeight = drawer.offsetHeight || drawerRect.height;

    // Remove drawer DOM element
    drawer.remove();

    // Synchronize ViewModel state silently without triggering full feed re-render
    newsVm.setSSBExpanded(clusterId, false, false);
    collapsedCount++;

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
  }

  return collapsedCount;
}

/**
 * Initializes passive scroll listener with requestAnimationFrame throttling
 * to automatically collapse out-of-view summaries. Returns a teardown function.
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
    // O(1) fast bailout if no summaries are currently open
    if (!newsVm.hasExpandedSSBDrawers()) {
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
