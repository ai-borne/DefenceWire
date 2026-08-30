/**
 * Application Entry Point for DefenceWire.in
 * Bootstraps MVVM Architecture, Theme, News Feeds, and Layout.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from './resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from './utils/security.js';
import { formatTimeAgo } from './utils/dateUtils.js';
import { ThemeViewModel } from './viewmodels/ThemeViewModel.js';
import { NewsViewModel } from './viewmodels/NewsViewModel.js';
import { renderHeader } from './components/Header.js';
import { renderNavigationBar } from './components/NavigationBar.js';
import { renderStoryCluster } from './components/StoryClusterView.js';
import { renderRiverRail } from './components/RiverRailView.js';
import { renderEcosystemRail } from './components/EcosystemRail.js';
import { renderFooter } from './components/FooterView.js';

export function initializeApp(): void {
  const appElement = document.getElementById('app');
  if (!appElement) return;

  // 1. Initialize ViewModels
  const themeVm = new ThemeViewModel();
  const newsVm = new NewsViewModel();

  // Set document title
  document.title = `${STRINGS.app.name} — ${STRINGS.app.shortTagline}`;

  // 2. Build Base Static Layout Once
  appElement.innerHTML = '';

  const header = renderHeader(themeVm, newsVm);
  let nav = renderNavigationBar(newsVm);
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

  // 3. Dynamic Feed & Sidebar Renderer
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

  // Subscribe to news ViewModel changes
  newsVm.subscribe(() => {
    updateFeedAndSidebar();
  });

  // Initial render
  updateFeedAndSidebar();
}

// Auto-bootstrap on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
}
