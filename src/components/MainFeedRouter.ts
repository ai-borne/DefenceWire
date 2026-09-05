/**
 * Main Feed Router for DefenceWire.in
 * Renders the mainFeed subtree for the active nav tab (River, Archive, or
 * the default Story Clusters view). Extracted from main.ts so the app's
 * composition root stays a thin bootstrapper as new tabs are added.
 * Hard limit: <= 300 LOC.
 */

import { SourceTier } from '../types/source.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';
import { cleanStorySnippet } from '../utils/snippetCleaner.js';
import { formatTimeAgo } from '../utils/dateUtils.js';
import { NewsViewModel } from '../viewmodels/NewsViewModel.js';
import { renderStoryCluster } from './StoryClusterView.js';
import { createLazyViewModelLoader, LazyAccessor } from '../services/lazyViewModelFactory.js';
import type { ArchiveViewModel } from '../viewmodels/ArchiveViewModel.js';
import type { ProgramsViewModel } from '../viewmodels/ProgramsViewModel.js';
import type { SuppliersViewModel } from '../viewmodels/SuppliersViewModel.js';
import type { EditorViewModel } from '../viewmodels/EditorViewModel.js';
import type { SupplierCandidatesPanelViewModel } from '../viewmodels/SupplierCandidatesPanelViewModel.js';

// Module-scoped: caches the dynamically-imported view-render function
// alongside main.ts's lazily-loaded ViewModels, so once a route has loaded
// once, subsequent re-renders (e.g. a filter click inside Programs) take
// the synchronous fast-path in renderLazyRoute instead of re-showing the
// loading placeholder for an already-warm module.
const loadArchiveView = createLazyViewModelLoader(() => import('./ArchiveView.js'), (m) => m);
const loadProgramsExplorerView = createLazyViewModelLoader(() => import('./ProgramsExplorerView.js'), (m) => m);
const loadSuppliersExplorerView = createLazyViewModelLoader(() => import('./suppliers/SuppliersExplorerView.js'), (m) => m);

function renderSearchInfoBanner(mainFeed: HTMLElement, searchQuery: string): void {
  const searchInfo = document.createElement('div');
  searchInfo.style.cssText = 'margin-bottom:16px;font-size:0.82rem;color:var(--dw-text-secondary);font-weight:600;';
  searchInfo.textContent = `🔍 Results for "${searchQuery}"`;
  mainFeed.appendChild(searchInfo);
}

function renderRiverView(mainFeed: HTMLElement, newsVm: NewsViewModel): void {
  const riverTitle = document.createElement('h2');
  riverTitle.className = 'dw-headline--lead';
  riverTitle.style.marginBottom = '12px';
  riverTitle.textContent = `⚡ ${STRINGS.river.heading}`;

  const riverSub = document.createElement('p');
  riverSub.className = 'dw-snippet';
  riverSub.textContent = STRINGS.river.subheading;

  mainFeed.appendChild(riverTitle);
  mainFeed.appendChild(riverSub);

  const items = newsVm.getFilteredRiverItems();
  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dw-snippet';
    empty.textContent = STRINGS.search.noResults;
    mainFeed.appendChild(empty);
    return;
  }

  const fullRiverList = document.createElement('div');
  fullRiverList.style.marginTop = '16px';

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'dw-river-item';
    row.style.padding = '10px 0';

    const link = document.createElement('a');
    const safeAttrs = getSafeLinkAttributes(item.url);
    link.href = safeAttrs.href;
    link.target = safeAttrs.target;
    link.rel = safeAttrs.rel;
    link.style.fontWeight = '600';
    link.textContent = sanitizePlainText(item.title);

    const meta = document.createElement('div');
    meta.className = 'dw-river-meta';

    const sourceSpan = document.createElement('span');
    sourceSpan.textContent = sanitizePlainText(item.sourceName);
    meta.appendChild(sourceSpan);

    if (item.tier === SourceTier.TIER_1_SOCIAL) {
      const badge = document.createElement('span');
      badge.className = 'dw-tier-badge dw-tier-TIER_1_SOCIAL';
      badge.style.marginLeft = '4px';
      badge.style.marginRight = '4px';
      badge.textContent = STRINGS.story.officialSignalBadge;
      meta.appendChild(badge);
    }

    const timeSpan = document.createElement('span');
    timeSpan.textContent = ` • ${formatTimeAgo(item.publishedAt)}`;
    meta.appendChild(timeSpan);

    row.appendChild(link);
    if (item.snippet) {
      const snip = document.createElement('p');
      snip.className = 'dw-snippet';
      snip.style.margin = '4px 0';
      snip.textContent = cleanStorySnippet(item.snippet);
      row.appendChild(snip);
    }
    row.appendChild(meta);
    fullRiverList.appendChild(row);
  }
  mainFeed.appendChild(fullRiverList);
}

function renderStoryClustersView(mainFeed: HTMLElement, newsVm: NewsViewModel, searchQuery: string): void {
  const { leadStory, regularClusters, totalMatchingStories } = newsVm.getFilteredClusters();

  if (totalMatchingStories === 0) {
    const empty = document.createElement('div');
    empty.className = 'dw-cluster';
    const p = document.createElement('p');
    p.className = 'dw-snippet';
    p.textContent = searchQuery ? STRINGS.search.noResults : STRINGS.errors.emptyCluster;
    empty.appendChild(p);
    mainFeed.appendChild(empty);
    return;
  }

  if (leadStory) {
    mainFeed.appendChild(renderStoryCluster(leadStory, newsVm, true));
  }
  for (const cluster of regularClusters) {
    mainFeed.appendChild(renderStoryCluster(cluster, newsVm, false));
  }
}

/**
 * Renders a lazy-loaded route. If every dependency is already warm (checked
 * via `peekReady`), renders synchronously — this matters because a Promise's
 * `.then()` always defers to a microtask even when already resolved, so
 * without this fast-path every state change within an already-loaded route
 * (e.g. a Programs domain-filter click) would flash the loading placeholder
 * on each re-render. Only a genuinely cold load shows the placeholder.
 */
function renderLazyRoute<T>(
  mainFeed: HTMLElement,
  newsVm: NewsViewModel,
  activeCat: string,
  loadingText: string,
  peekReady: () => T | undefined,
  load: () => Promise<T>,
  render: (resolved: T) => HTMLElement
): void {
  const ready = peekReady();
  if (ready !== undefined) {
    mainFeed.appendChild(render(ready));
    return;
  }

  const placeholder = document.createElement('p');
  placeholder.className = 'dw-snippet';
  placeholder.textContent = loadingText;
  mainFeed.appendChild(placeholder);

  load()
    .then((resolved) => {
      if (newsVm.getActiveCategory() !== activeCat || !mainFeed.contains(placeholder)) return;
      placeholder.remove();
      mainFeed.appendChild(render(resolved));
    })
    .catch(() => {
      placeholder.textContent = STRINGS.errors.feedLoadFailed;
    });
}

export function renderMainFeedContent(
  mainFeed: HTMLElement,
  activeCat: string,
  newsVm: NewsViewModel,
  ensureArchiveVm: LazyAccessor<ArchiveViewModel>,
  ensureProgramsVm: LazyAccessor<ProgramsViewModel>,
  ensureSuppliersVm: LazyAccessor<SuppliersViewModel>,
  editorVm?: EditorViewModel,
  supplierCandidatesVm?: SupplierCandidatesPanelViewModel
): void {
  const searchQuery = newsVm.getSearchQuery();

  if (searchQuery && activeCat !== 'archive' && activeCat !== 'programs' && activeCat !== 'suppliers' && activeCat !== 'curator' && activeCat !== 'editor') {
    renderSearchInfoBanner(mainFeed, searchQuery);
  }

  if (activeCat === 'river') {
    renderRiverView(mainFeed, newsVm);
  } else if (activeCat === 'archive') {
    renderLazyRoute(
      mainFeed,
      newsVm,
      activeCat,
      STRINGS.archive.loading,
      () => {
        const vm = ensureArchiveVm.peek();
        const mod = loadArchiveView.peek();
        return vm && mod ? ([vm, mod] as const) : undefined;
      },
      () => Promise.all([ensureArchiveVm(), loadArchiveView()]),
      ([archiveVm, { renderArchiveView }]) => renderArchiveView(archiveVm, newsVm)
    );
  } else if (activeCat === 'programs') {
    renderLazyRoute(
      mainFeed,
      newsVm,
      activeCat,
      STRINGS.programs.loadingExplorer,
      () => {
        const pVm = ensureProgramsVm.peek();
        const sVm = ensureSuppliersVm.peek();
        const mod = loadProgramsExplorerView.peek();
        return pVm && sVm && mod ? ([pVm, sVm, mod] as const) : undefined;
      },
      () => Promise.all([ensureProgramsVm(), ensureSuppliersVm(), loadProgramsExplorerView()]),
      ([programsVm, suppliersVm, { renderProgramsExplorerView }]) => renderProgramsExplorerView(programsVm, suppliersVm)
    );
  } else if (activeCat === 'suppliers') {
    renderLazyRoute(
      mainFeed,
      newsVm,
      activeCat,
      STRINGS.suppliers.loadingExplorer,
      () => {
        const vm = ensureSuppliersVm.peek();
        const mod = loadSuppliersExplorerView.peek();
        return vm && mod ? ([vm, mod] as const) : undefined;
      },
      () => Promise.all([ensureSuppliersVm(), loadSuppliersExplorerView()]),
      ([suppliersVm, { renderSuppliersExplorerView }]) => renderSuppliersExplorerView(suppliersVm)
    );
  } else if (activeCat === 'curator' || activeCat === 'editor') {
    const curatorContainer = document.createElement('div');
    curatorContainer.className = 'dw-curator-route-container';
    curatorContainer.textContent = STRINGS.editorSupplierCandidates.loading;
    mainFeed.appendChild(curatorContainer);
    import('./EditorDashboard.js')
      .then(({ renderEditorDashboard }) => {
        curatorContainer.innerHTML = '';
        if (editorVm && supplierCandidatesVm) {
          curatorContainer.appendChild(renderEditorDashboard(editorVm, supplierCandidatesVm));
        }
      })
      .catch(() => {
        curatorContainer.textContent = STRINGS.errors.feedLoadFailed;
      });
  } else {
    renderStoryClustersView(mainFeed, newsVm, searchQuery);
  }
}
