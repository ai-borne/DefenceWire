/**
 * Archive View Component for DefenceWire.in
 * Date-grouped, infinitely-scrolling browse view over the D1-backed story
 * archive, with an FTS keyword search that narrows the same paginated list.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';
import { ArchiveViewModel } from '../viewmodels/ArchiveViewModel.js';
import { NewsViewModel } from '../viewmodels/NewsViewModel.js';
import { renderStoryCluster } from './StoryClusterView.js';
import { groupStoriesByDate } from '../archive/archiveDateGrouping.js';

function submitSearch(input: HTMLInputElement, archiveVm: ArchiveViewModel): void {
  void archiveVm.search(input.value);
}

function renderSearchBar(archiveVm: ArchiveViewModel): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'dw-archive-search-bar';

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'dw-archive-search-input';
  input.placeholder = STRINGS.archive.searchPlaceholder;
  input.setAttribute('aria-label', STRINGS.archive.searchAriaLabel);
  input.value = archiveVm.getSearchQuery();
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitSearch(input, archiveVm);
  });

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dw-archive-search-btn';
  button.textContent = STRINGS.archive.searchButton;
  button.addEventListener('click', () => submitSearch(input, archiveVm));

  bar.appendChild(input);
  bar.appendChild(button);
  return bar;
}

function renderInfoMessage(text: string): HTMLElement {
  const p = document.createElement('p');
  p.className = 'dw-snippet';
  p.textContent = text;
  return p;
}

function attachInfiniteScroll(sentinel: HTMLElement, archiveVm: ArchiveViewModel): void {
  if (typeof IntersectionObserver === 'undefined') return;

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      void archiveVm.loadMore();
    }
  });
  observer.observe(sentinel);
}

function renderResultsSection(archiveVm: ArchiveViewModel, newsVm: NewsViewModel): HTMLElement {
  const section = document.createElement('div');
  section.className = 'dw-archive-results';

  if (archiveVm.getErrorMessage()) {
    section.appendChild(renderInfoMessage(STRINGS.archive.error));
    return section;
  }

  if (archiveVm.isLoading()) {
    section.appendChild(renderInfoMessage(STRINGS.archive.loading));
    return section;
  }

  const results = archiveVm.getResults();
  if (results.length === 0) {
    section.appendChild(renderInfoMessage(archiveVm.getSearchQuery().trim() ? STRINGS.archive.noResults : STRINGS.archive.emptyArchive));
    return section;
  }

  for (const group of groupStoriesByDate(results)) {
    const heading = document.createElement('h3');
    heading.className = 'dw-archive-date-heading';
    heading.textContent = group.dateLabel;
    section.appendChild(heading);

    for (const cluster of group.stories) {
      section.appendChild(renderStoryCluster(cluster, newsVm, false));
    }
  }

  if (archiveVm.hasMore()) {
    if (archiveVm.isLoadingMore()) {
      section.appendChild(renderInfoMessage(STRINGS.archive.loadingMore));
    } else {
      const sentinel = document.createElement('div');
      sentinel.className = 'dw-archive-scroll-sentinel';
      section.appendChild(sentinel);
      attachInfiniteScroll(sentinel, archiveVm);
    }
  }

  return section;
}

export function renderArchiveView(archiveVm: ArchiveViewModel, newsVm: NewsViewModel): HTMLElement {
  archiveVm.ensureBrowseLoaded();

  const container = document.createElement('div');
  container.className = 'dw-archive-view';

  const heading = document.createElement('h2');
  heading.className = 'dw-headline--lead';
  heading.style.marginBottom = '4px';
  heading.textContent = `🗄️ ${STRINGS.archive.heading}`;

  const subheading = document.createElement('p');
  subheading.className = 'dw-snippet';
  subheading.textContent = STRINGS.archive.subheading;

  container.appendChild(heading);
  container.appendChild(subheading);
  container.appendChild(renderSearchBar(archiveVm));
  container.appendChild(renderResultsSection(archiveVm, newsVm));

  return container;
}
