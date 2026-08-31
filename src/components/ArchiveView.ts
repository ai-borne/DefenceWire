/**
 * Archive View Component for DefenceWire.in
 * Search UI for the D1-backed story archive: every cluster that has ever
 * aged out of the live feed, kept searchable indefinitely.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';
import { ArchiveViewModel } from '../viewmodels/ArchiveViewModel.js';
import { NewsViewModel } from '../viewmodels/NewsViewModel.js';
import { renderStoryCluster } from './StoryClusterView.js';

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

function renderResultsSection(archiveVm: ArchiveViewModel, newsVm: NewsViewModel): HTMLElement {
  const section = document.createElement('div');
  section.className = 'dw-archive-results';

  if (archiveVm.isLoading()) {
    const p = document.createElement('p');
    p.className = 'dw-snippet';
    p.textContent = STRINGS.archive.loading;
    section.appendChild(p);
    return section;
  }

  if (archiveVm.getErrorMessage()) {
    const p = document.createElement('p');
    p.className = 'dw-snippet';
    p.textContent = STRINGS.archive.error;
    section.appendChild(p);
    return section;
  }

  if (!archiveVm.getSearchQuery().trim()) {
    const p = document.createElement('p');
    p.className = 'dw-snippet';
    p.textContent = STRINGS.archive.emptyPrompt;
    section.appendChild(p);
    return section;
  }

  const results = archiveVm.getResults();
  if (results.length === 0) {
    const p = document.createElement('p');
    p.className = 'dw-snippet';
    p.textContent = STRINGS.archive.noResults;
    section.appendChild(p);
    return section;
  }

  for (const cluster of results) {
    section.appendChild(renderStoryCluster(cluster, newsVm, false));
  }
  return section;
}

export function renderArchiveView(archiveVm: ArchiveViewModel, newsVm: NewsViewModel): HTMLElement {
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
