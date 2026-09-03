/**
 * Application Entry Point for DefenceWire.in
 * Bootstraps MVVM Architecture, Theme, News Feeds, Curator Desk, Storage & PWA.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from './resources/strings.js';
import { ThemeViewModel } from './viewmodels/ThemeViewModel.js';
import { NewsViewModel } from './viewmodels/NewsViewModel.js';
import { EditorViewModel } from './viewmodels/EditorViewModel.js';
import { ArchiveViewModel } from './viewmodels/ArchiveViewModel.js';
import { ProgramsViewModel } from './viewmodels/ProgramsViewModel.js';
import { SuppliersViewModel } from './viewmodels/SuppliersViewModel.js';
import { defaultStorageService } from './services/storageService.js';
import { defaultAuthService } from './services/authService.js';
import { defaultPwaService } from './services/pwaService.js';
import { defaultFeedSyncService } from './services/feedSyncService.js';
import { renderHeader } from './components/Header.js';
import { renderNavigationBar } from './components/NavigationBar.js';
import { renderMainFeedContent } from './components/MainFeedRouter.js';
import { renderRiverRail } from './components/RiverRailView.js';
import { renderEcosystemRail } from './components/EcosystemRail.js';
import { renderFooter } from './components/FooterView.js';
import { renderEditorDashboard } from './components/EditorDashboard.js';
import { openProgramDetailModal } from './components/ProgramDetailModal.js';
import { openSupplierDetailModal } from './components/suppliers/SupplierDetailModal.js';
import { getProgramById, findProgramByAlias } from './data/strategicPrograms.js';
import { deepLinkToStoryFromLocation } from './services/permalinkService.js';
import { initSummaryAutoCollapse } from './services/summaryAutoCollapseService.js';

export function initializeApp(): void {
  const appElement = document.getElementById('app');
  if (!appElement) return;

  // 1. Initialize ViewModels
  const themeVm = new ThemeViewModel();
  const newsVm = new NewsViewModel();
  const editorVm = new EditorViewModel(newsVm);
  const archiveVm = new ArchiveViewModel();
  const programsVm = new ProgramsViewModel(newsVm);
  const suppliersVm = new SuppliersViewModel();

  // Initialize summary auto-collapse listener
  initSummaryAutoCollapse(newsVm);

  // Set document title
  document.title = `${STRINGS.app.name} — ${STRINGS.app.shortTagline}`;

  // 2. Storage Initialization, Offline Cache & Remote Hydration
  defaultStorageService
    .init()
    .then(async () => {
      try {
        const res = await fetch('/data/news.json');
        if (res.ok) {
          const data = (await res.json()) as {
            clusters?: import('./types/news.js').StoryCluster[];
            river?: import('./types/news.js').StorySourceItem[];
            generatedAt?: string;
          };
          if (data.generatedAt) defaultFeedSyncService.setLastGeneratedAt(data.generatedAt);
          if (data.clusters && data.clusters.length > 0) newsVm.setClusters(data.clusters);
          if (data.river && data.river.length > 0) newsVm.setRiverItems(data.river);
        }
        deepLinkToStoryFromLocation(newsVm);
      } catch {
        // Default seed is retained
      }
      await defaultStorageService.saveClusters(newsVm.getAllClusters(true));
      await defaultStorageService.saveRiverItems(newsVm.getFilteredRiverItems());
      await defaultStorageService.pruneOldEntries(7);
    })
    .catch(() => {
      // Graceful fallback
    });

  // 3. PWA & Service Worker Initialization
  defaultPwaService.registerServiceWorker('/sw.js');

  // 4. Build Base Static Layout
  appElement.innerHTML = '';

  const header = renderHeader(themeVm, newsVm, editorVm, defaultFeedSyncService);
  const nav = renderNavigationBar(newsVm);
  appElement.appendChild(header);
  appElement.appendChild(nav);

  const container = document.createElement('div');
  container.className = 'dw-container';

  const layoutGrid = document.createElement('div');
  layoutGrid.className = 'dw-layout-grid';

  const mainFeed = document.createElement('main');
  mainFeed.className = 'dw-main-feed';

  const sidebar = document.createElement('div');
  sidebar.className = 'dw-sidebar-rail';

  layoutGrid.appendChild(mainFeed);
  layoutGrid.appendChild(sidebar);
  container.appendChild(layoutGrid);

  appElement.appendChild(container);
  appElement.appendChild(renderFooter());

  // Modal Container for Editor Desk
  const editorContainer = document.createElement('div');
  editorContainer.id = 'dw-editor-container';
  appElement.appendChild(editorContainer);

  // Network Status Notification Banner Container
  const bannerContainer = document.createElement('div');
  bannerContainer.id = 'dw-banner-container';
  appElement.appendChild(bannerContainer);

  // Install Banner Container
  const installContainer = document.createElement('div');
  installContainer.id = 'dw-pwa-container';
  appElement.appendChild(installContainer);

  // 5. PWA Listeners
  defaultPwaService.onNetworkStatusChange((isOnline) => {
    newsVm.setOffline(!isOnline);
    bannerContainer.innerHTML = '';
    const banner = defaultPwaService.renderNetworkStatusBanner(!isOnline);
    bannerContainer.appendChild(banner);
    if (isOnline) {
      setTimeout(() => {
        banner.remove();
      }, 4000);
    }
  });

  defaultPwaService.onInstallableChange((canInstall) => {
    installContainer.innerHTML = '';
    if (canInstall) {
      const banner = defaultPwaService.renderInstallBanner(() => {
        installContainer.innerHTML = '';
      });
      if (banner) installContainer.appendChild(banner);
    }
  });

  // 6. Dynamic Feed & Sidebar Renderer
  const updateFeedAndSidebar = () => {
    // Update active tab in navigation
    const activeCat = newsVm.getActiveCategory();
    const navTabs = nav.querySelectorAll('.dw-nav-tab');
    navTabs.forEach((tab) => {
      const isSelected = tab.textContent === (STRINGS.nav as Record<string, string>)[activeCat];
      tab.classList.toggle('active', isSelected);
      tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });

    // Update search input if out of sync
    const searchInput = header.querySelector('input.dw-search-input') as HTMLInputElement | null;
    if (searchInput && searchInput.value !== newsVm.getSearchQuery()) {
      searchInput.value = newsVm.getSearchQuery();
    }

    // Re-render Main Feed
    mainFeed.innerHTML = '';
    renderMainFeedContent(mainFeed, activeCat, newsVm, archiveVm, programsVm, suppliersVm);

    // Re-render Sidebar Rail
    sidebar.innerHTML = '';
    sidebar.appendChild(renderEcosystemRail());
    sidebar.appendChild(renderRiverRail(newsVm, 10));
  };

  // 7. Dynamic Editor Desk Renderer
  const updateEditorDesk = () => {
    editorContainer.innerHTML = '';
    if (editorVm.isOpen()) {
      editorContainer.appendChild(renderEditorDashboard(editorVm));
    }
  };

  // 8. Hash Routing & Global Shortcuts
  const checkHashRoutes = () => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash === '#curator' || hash === '#/curator' || search.includes('mode=curator')) {
      editorVm.setOpen(true);
      defaultAuthService.checkSession();
      return;
    }
    if (hash.startsWith('#program/') || hash.startsWith('#/program/')) {
      const rawId = hash.replace(/^#\/?program\//, '').trim();
      if (rawId) {
        const decoded = decodeURIComponent(rawId);
        const prog = getProgramById(decoded) ?? findProgramByAlias(decoded);
        if (prog) {
          openProgramDetailModal(prog, {
            relatedClusters: programsVm.getProgramRelatedClusters(prog.id)
          });
        }
      }
      return;
    }
    if (hash.startsWith('#supplier/') || hash.startsWith('#/supplier/')) {
      const rawSlug = hash.replace(/^#\/?supplier\//, '').trim();
      if (rawSlug) {
        const decoded = decodeURIComponent(rawSlug);
        const supplier = suppliersVm.getCachedSupplier(decoded);
        if (supplier) {
          openSupplierDetailModal(supplier);
        }
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', checkHashRoutes);
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        editorVm.toggleOpen();
        if (editorVm.isOpen()) {
          defaultAuthService.checkSession();
        }
      }
      if (e.key === 'Escape' && editorVm.isOpen()) {
        editorVm.setOpen(false);
      }
    });
  }

  // Subscriptions
  newsVm.subscribe(() => {
    updateFeedAndSidebar();
  });

  programsVm.subscribe(() => {
    updateFeedAndSidebar();
  });

  suppliersVm.subscribe(() => {
    updateFeedAndSidebar();
  });

  editorVm.subscribe(() => {
    updateEditorDesk();
  });

  archiveVm.subscribe(() => {
    updateFeedAndSidebar();
  });

  defaultFeedSyncService.onFeedUpdated(async (payload) => {
    if (payload.clusters && payload.clusters.length > 0) {
      newsVm.setClusters(payload.clusters);
      await defaultStorageService.saveClusters(newsVm.getAllClusters(true));
    }
    if (payload.river && payload.river.length > 0) {
      newsVm.setRiverItems(payload.river);
      await defaultStorageService.saveRiverItems(newsVm.getFilteredRiverItems());
    }
  });
  defaultFeedSyncService.start();

  // Initial renders
  updateFeedAndSidebar();
  updateEditorDesk();
  checkHashRoutes();
  deepLinkToStoryFromLocation(newsVm);
}

// Auto-bootstrap on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
}
