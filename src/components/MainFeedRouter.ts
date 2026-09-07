/**
 * Main Feed Router for DefenceWire.in
 * Renders the mainFeed subtree for the active nav tab (River, Archive, or
 * the default Story Clusters view). Extracted from main.ts so the app's
 * composition root stays a thin bootstrapper as new tabs are added.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';
import { NewsViewModel } from '../viewmodels/NewsViewModel.js';
import { renderStoryCluster } from './StoryClusterView.js';
import { renderRiverView } from './RiverView.js';
import { createLazyViewModelLoader, LazyAccessor } from '../services/lazyViewModelFactory.js';
import type { ArchiveViewModel } from '../viewmodels/ArchiveViewModel.js';
import type { ProgramsViewModel } from '../viewmodels/ProgramsViewModel.js';
import type { SuppliersViewModel } from '../viewmodels/SuppliersViewModel.js';
import type { EditorViewModel } from '../viewmodels/EditorViewModel.js';
import type { SupplierCandidatesPanelViewModel } from '../viewmodels/SupplierCandidatesPanelViewModel.js';

// Module-scoped: caches the dynamically-imported view-render function
// alongside main.ts's lazily-loaded ViewModels.
const loadArchiveView = createLazyViewModelLoader(() => import('./ArchiveView.js'), (m) => m);
const loadProgramsExplorerView = createLazyViewModelLoader(() => import('./ProgramsExplorerView.js'), (m) => m);
const loadSuppliersExplorerView = createLazyViewModelLoader(() => import('./suppliers/SuppliersExplorerView.js'), (m) => m);
const loadKnowledgeGraphView = createLazyViewModelLoader(() => import('./graph/KnowledgeGraphView.js'), (m) => m);
const loadKnowledgeGraphVm = createLazyViewModelLoader(
  () => import('../viewmodels/KnowledgeGraphViewModel.js'),
  ({ KnowledgeGraphViewModel }) => new KnowledgeGraphViewModel()
);
const loadThreadExplorerView = createLazyViewModelLoader(() => import('./threads/ThreadExplorerView.js'), (m) => m);
const loadThreadExplorerVm = createLazyViewModelLoader(
  () => import('../viewmodels/ThreadExplorerViewModel.js'),
  ({ ThreadExplorerViewModel }) => new ThreadExplorerViewModel()
);
const loadPublicPatternBanner = createLazyViewModelLoader(() => import('./patterns/PublicPatternBanner.js'), (m) => m);
const loadPublicPatternVm = createLazyViewModelLoader(
  () => import('../viewmodels/PublicPatternViewModel.js'),
  ({ PublicPatternViewModel }) => {
    const vm = new PublicPatternViewModel();
    vm.loadPatterns();
    return vm;
  }
);

function renderSearchInfoBanner(mainFeed: HTMLElement, searchQuery: string): void {
  const searchInfo = document.createElement('div');
  searchInfo.style.cssText = 'margin-bottom:16px;font-size:0.82rem;color:var(--dw-text-secondary);font-weight:600;';
  searchInfo.textContent = `🔍 Results for "${searchQuery}"`;
  mainFeed.appendChild(searchInfo);
}

function renderStoryClustersView(mainFeed: HTMLElement, newsVm: NewsViewModel, searchQuery: string): void {
  // Mount PublicPatternBanner at top of feed if not filtering by search query
  if (!searchQuery) {
    const bannerContainer = document.createElement('div');
    bannerContainer.className = 'dw-pattern-banner-container';
    mainFeed.appendChild(bannerContainer);

    const patternVm = loadPublicPatternVm.peek();
    const patternView = loadPublicPatternBanner.peek();

    const mountBanner = (vm: import('../viewmodels/PublicPatternViewModel.js').PublicPatternViewModel, viewMod: typeof import('./patterns/PublicPatternBanner.js')) => {
      const bannerEl = viewMod.renderPublicPatternBanner(vm, {
        onInspectInGraph: (nodeIds) => {
          newsVm.setActiveCategory('graph');
          loadKnowledgeGraphVm().then((gVm) => gVm.focusNodes(nodeIds));
        },
        onEntityClick: (entityId) => {
          import('./threads/ThreadDetailModal.js')
            .then(({ openThreadDetailModal }) => openThreadDetailModal(entityId))
            .catch(() => {
              newsVm.setActiveCategory('graph');
              loadKnowledgeGraphVm().then((gVm) => gVm.focusNodes([entityId]));
            });
        }
      });
      bannerContainer.appendChild(bannerEl);
    };

    if (patternVm && patternView) {
      mountBanner(patternVm, patternView);
    } else {
      Promise.all([loadPublicPatternVm(), loadPublicPatternBanner()]).then(([vm, viewMod]) => {
        mountBanner(vm, viewMod);
      });
    }
  }

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
 * Renders a lazy-loaded route. If every dependency is already warm, renders synchronously.
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

  if (searchQuery && activeCat !== 'archive' && activeCat !== 'programs' && activeCat !== 'suppliers' && activeCat !== 'graph' && activeCat !== 'threads' && activeCat !== 'curator' && activeCat !== 'editor') {
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
  } else if (activeCat === 'graph') {
    renderLazyRoute(
      mainFeed,
      newsVm,
      activeCat,
      STRINGS.graph.loadingGraph,
      () => {
        const vm = loadKnowledgeGraphVm.peek();
        const mod = loadKnowledgeGraphView.peek();
        return vm && mod ? ([vm, mod] as const) : undefined;
      },
      () => Promise.all([loadKnowledgeGraphVm(), loadKnowledgeGraphView()]),
      ([graphVm, { renderKnowledgeGraphView }]) => renderKnowledgeGraphView(graphVm)
    );
  } else if (activeCat === 'threads') {
    renderLazyRoute(
      mainFeed,
      newsVm,
      activeCat,
      STRINGS.threads.loadingThreads,
      () => {
        const vm = loadThreadExplorerVm.peek();
        const mod = loadThreadExplorerView.peek();
        return vm && mod ? ([vm, mod] as const) : undefined;
      },
      () => Promise.all([loadThreadExplorerVm(), loadThreadExplorerView()]),
      ([threadsVm, { renderThreadExplorerView }]) => renderThreadExplorerView(threadsVm)
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
