/**
 * Application Entry Point for DefenceWire.in
 * Bootstraps MVVM Architecture, Theme, News Feeds, Curator Desk, Storage & PWA.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from './resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from './utils/security.js';
import { formatTimeAgo } from './utils/dateUtils.js';
import { ThemeViewModel } from './viewmodels/ThemeViewModel.js';
import { NewsViewModel } from './viewmodels/NewsViewModel.js';
import { EditorViewModel } from './viewmodels/EditorViewModel.js';
import { defaultStorageService } from './services/storageService.js';
import { defaultPwaService } from './services/pwaService.js';
import { renderHeader } from './components/Header.js';
import { renderNavigationBar } from './components/NavigationBar.js';
import { renderStoryCluster } from './components/StoryClusterView.js';
import { renderRiverRail } from './components/RiverRailView.js';
import { renderEcosystemRail } from './components/EcosystemRail.js';
import { renderFooter } from './components/FooterView.js';
import { renderEditorDashboard } from './components/EditorDashboard.js';
import { deepLinkToStoryFromLocation } from './services/permalinkService.js';

export function initializeApp(): void {
  const appElement = document.getElementById('app');
  if (!appElement) return;

  // 1. Initialize ViewModels
  const themeVm = new ThemeViewModel();
  const newsVm = new NewsViewModel();
  const editorVm = new EditorViewModel(newsVm);

  // Set document title
  document.title = `${STRINGS.app.name} — ${STRINGS.app.shortTagline}`;

  // 2. Storage Initialization, Offline Cache & Remote Hydration
  defaultStorageService
    .init()
    .then(async () => {
      try {
        const res = await fetch('/data/news.json');
        if (res.ok) {
          const data = (await res.json()) as { clusters?: import('./types/news.js').StoryCluster[]; river?: import('./types/news.js').StorySourceItem[] };
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

  const header = renderHeader(themeVm, newsVm, editorVm);
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
    const searchQuery = newsVm.getSearchQuery();

    if (searchQuery) {
      const searchInfo = document.createElement('div');
      searchInfo.style.marginBottom = '16px';
      searchInfo.style.fontSize = '0.82rem';
      searchInfo.style.color = 'var(--dw-text-secondary)';
      searchInfo.style.fontWeight = '600';
      searchInfo.textContent = `🔍 Results for "${searchQuery}"`;
      mainFeed.appendChild(searchInfo);
    }

    if (activeCat === 'river') {
      // Full River View
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
      } else {
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
          meta.textContent = `${item.sourceName} • ${formatTimeAgo(item.publishedAt)}`;

          row.appendChild(link);
          if (item.snippet) {
            const snip = document.createElement('p');
            snip.className = 'dw-snippet';
            snip.style.margin = '4px 0';
            snip.textContent = sanitizePlainText(item.snippet);
            row.appendChild(snip);
          }
          row.appendChild(meta);
          fullRiverList.appendChild(row);
        }
        mainFeed.appendChild(fullRiverList);
      }
    } else {
      // Story Clusters View
      const { leadStory, regularClusters, totalMatchingStories } = newsVm.getFilteredClusters();

      if (totalMatchingStories === 0) {
        const empty = document.createElement('div');
        empty.className = 'dw-cluster';
        const p = document.createElement('p');
        p.className = 'dw-snippet';
        p.textContent = searchQuery ? STRINGS.search.noResults : STRINGS.errors.emptyCluster;
        empty.appendChild(p);
        mainFeed.appendChild(empty);
      } else {
        // Render Lead Story
        if (leadStory) {
          mainFeed.appendChild(renderStoryCluster(leadStory, newsVm, true));
        }

        // Render Regular Stories
        for (const cluster of regularClusters) {
          mainFeed.appendChild(renderStoryCluster(cluster, newsVm, false));
        }
      }
    }

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

  // 8. Stealth Hash Routing & Global Shortcuts for Human Curator
  const checkCuratorRoute = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash === '#curator' || hash === '#/curator' || search.includes('mode=curator')) {
        editorVm.setOpen(true);
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', checkCuratorRoute);
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        editorVm.toggleOpen();
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

  editorVm.subscribe(() => {
    updateEditorDesk();
  });

  // Initial renders
  updateFeedAndSidebar();
  updateEditorDesk();
  checkCuratorRoute();
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
