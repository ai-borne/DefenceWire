/**
 * Unit Tests for MainFeedRouter's tenders/idex routing branches (MOAT3 Phase 5)
 * Verifies the 'tenders' and 'idex' nav categories both render the same
 * TendersExplorerView, scoped to the correct source tab (DRY: no separate
 * iDEX view), per the MOAT3 plan.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderMainFeedContent } from '../../src/components/MainFeedRouter.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { ArchiveViewModel } from '../../src/viewmodels/ArchiveViewModel.js';
import { TendersViewModel } from '../../src/viewmodels/TendersViewModel.js';

function makeMainFeed(): HTMLElement {
  return document.createElement('main');
}

describe('renderMainFeedContent — tenders/idex routing', () => {
  it('renders the tenders explorer scoped to "mod" for the tenders category', () => {
    const mainFeed = makeMainFeed();
    const newsVm = new NewsViewModel();
    const archiveVm = new ArchiveViewModel();
    const tendersVm = new TendersViewModel(vi.fn().mockResolvedValue({ tenders: [], nextCursor: null }));

    renderMainFeedContent(mainFeed, 'tenders', newsVm, archiveVm, undefined, tendersVm);

    expect(tendersVm.getSourceScope()).toBe('mod');
    expect(mainFeed.querySelector('.dw-tenders-explorer')).not.toBeNull();
  });

  it('renders the same explorer scoped to "idex" for the idex category', () => {
    const mainFeed = makeMainFeed();
    const newsVm = new NewsViewModel();
    const archiveVm = new ArchiveViewModel();
    const tendersVm = new TendersViewModel(vi.fn().mockResolvedValue({ tenders: [], nextCursor: null }));

    renderMainFeedContent(mainFeed, 'idex', newsVm, archiveVm, undefined, tendersVm);

    expect(tendersVm.getSourceScope()).toBe('idex');
    expect(mainFeed.querySelector('.dw-tenders-explorer')).not.toBeNull();
  });

  it('does not render the search info banner over the tenders/idex tabs', () => {
    const mainFeed = makeMainFeed();
    const newsVm = new NewsViewModel();
    newsVm.setSearchQuery('radar');
    const archiveVm = new ArchiveViewModel();
    const tendersVm = new TendersViewModel(vi.fn().mockResolvedValue({ tenders: [], nextCursor: null }));

    renderMainFeedContent(mainFeed, 'tenders', newsVm, archiveVm, undefined, tendersVm);

    expect(mainFeed.textContent).not.toContain('Results for');
  });
});
