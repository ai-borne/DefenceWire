/**
 * Story Thread Explorer Container View Component (Phase 4)
 * Two-pane responsive explorer displaying master list of active/dormant
 * defence intelligence threads on the left and chronological git-style
 * event evolution branch on the right.
 * Hard limit: <= 300 LOC.
 */

import type { ThreadStatus } from '../../types/threads.js';
import threadStrings from '../../resources/threadStrings.js';
import { sanitizePlainText } from '../../utils/security.js';
import { formatDateOnly } from '../../utils/dateUtils.js';
import { ThreadExplorerViewModel } from '../../viewmodels/ThreadExplorerViewModel.js';
import { renderThreadTimelineCard } from './ThreadTimelineCard.js';

interface StatusFilterTab {
  id: ThreadStatus | 'all';
  label: string;
}

const STATUS_TABS: readonly StatusFilterTab[] = [
  { id: 'all', label: threadStrings.filterAllStatuses },
  { id: 'active', label: threadStrings.statusActive },
  { id: 'dormant', label: threadStrings.filterDormant },
  { id: 'concluded', label: threadStrings.filterConcluded }
] as const;

export function renderThreadExplorerView(vm: ThreadExplorerViewModel): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-thread-explorer';

  // 1. Header Block
  const header = document.createElement('div');
  header.className = 'dw-thread-header';

  const titleRow = document.createElement('div');
  titleRow.className = 'dw-thread-title-row';

  const title = document.createElement('h2');
  title.className = 'dw-thread-title';
  title.textContent = `${threadStrings.badgePrefix} ${threadStrings.tabTitle}`;

  const subtitle = document.createElement('p');
  subtitle.className = 'dw-thread-subtitle';
  subtitle.textContent = threadStrings.tabSubtitle;

  titleRow.appendChild(title);
  header.appendChild(titleRow);
  header.appendChild(subtitle);

  // 2. Filter Controls & Search Bar
  const controls = document.createElement('div');
  controls.className = 'dw-thread-controls';

  const statusFilterBar = document.createElement('div');
  statusFilterBar.className = 'dw-thread-status-bar';
  statusFilterBar.setAttribute('role', 'tablist');

  STATUS_TABS.forEach((tab) => {
    const btn = document.createElement('button');
    btn.className = `dw-thread-tab ${vm.getStatusFilter() === tab.id ? 'active' : ''}`;
    btn.setAttribute('type', 'button');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', vm.getStatusFilter() === tab.id ? 'true' : 'false');
    btn.textContent = tab.label;

    btn.addEventListener('click', () => {
      vm.setStatusFilter(tab.id);
      statusFilterBar.querySelectorAll('.dw-thread-tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
    });
    statusFilterBar.appendChild(btn);
  });

  const searchInput = document.createElement('input');
  searchInput.className = 'dw-thread-search';
  searchInput.type = 'search';
  searchInput.placeholder = threadStrings.searchPlaceholder;
  searchInput.setAttribute('aria-label', threadStrings.searchPlaceholder);
  searchInput.value = vm.getSearchQuery();
  searchInput.addEventListener('input', (e) => {
    vm.setSearchQuery((e.target as HTMLInputElement).value);
  });

  controls.appendChild(statusFilterBar);
  controls.appendChild(searchInput);
  header.appendChild(controls);
  container.appendChild(header);

  // 3. Two-Pane Split Layout
  const layout = document.createElement('div');
  layout.className = 'dw-threads-layout';

  // 3a. Master List Column
  const masterPane = document.createElement('div');
  masterPane.className = 'dw-threads-list-pane';

  // 3b. Detail Timeline Column
  const detailPane = document.createElement('div');
  detailPane.className = 'dw-threads-timeline-pane';

  layout.appendChild(masterPane);
  layout.appendChild(detailPane);
  container.appendChild(layout);

  function renderMasterList(): void {
    masterPane.innerHTML = '';

    if (vm.getIsLoadingThreads()) {
      const loading = document.createElement('div');
      loading.className = 'dw-thread-empty';
      loading.textContent = threadStrings.loadingThreads;
      masterPane.appendChild(loading);
      return;
    }

    const filtered = vm.getFilteredThreads();
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dw-thread-empty';
      const emptyTitle = document.createElement('h4');
      emptyTitle.textContent = threadStrings.emptyThreadsHeading;
      const emptyDesc = document.createElement('p');
      emptyDesc.textContent = threadStrings.emptyThreadsDescription;
      empty.appendChild(emptyTitle);
      empty.appendChild(emptyDesc);
      masterPane.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'dw-threads-list';

    filtered.forEach((thread) => {
      const isSelected = vm.getSelectedThreadId() === thread.id;
      const item = document.createElement('article');
      item.className = `dw-thread-item ${isSelected ? 'is-selected' : ''}`;
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

      const titleEl = document.createElement('h3');
      titleEl.className = 'dw-thread-item-title';
      titleEl.textContent = sanitizePlainText(thread.title);

      const meta = document.createElement('div');
      meta.className = 'dw-thread-item-meta';

      const entityBadge = document.createElement('span');
      entityBadge.className = 'dw-thread-entity-badge';
      entityBadge.textContent = sanitizePlainText(thread.canonicalEntity);

      const statusBadge = document.createElement('span');
      statusBadge.className = `dw-thread-status-badge dw-status-${thread.status}`;
      statusBadge.textContent = thread.status.toUpperCase();

      const countBadge = document.createElement('span');
      countBadge.className = 'dw-thread-count-badge';
      countBadge.textContent = `${thread.eventCount} ${threadStrings.milestonesCount}`;

      meta.appendChild(entityBadge);
      meta.appendChild(statusBadge);
      meta.appendChild(countBadge);

      const dateEl = document.createElement('span');
      dateEl.className = 'dw-thread-item-date';
      dateEl.textContent = `${threadStrings.latestUpdate}: ${formatDateOnly(thread.lastEventAt)}`;

      item.appendChild(titleEl);
      item.appendChild(meta);
      item.appendChild(dateEl);

      item.addEventListener('click', () => {
        void vm.selectThread(thread.id);
      });
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          void vm.selectThread(thread.id);
        }
      });

      list.appendChild(item);
    });

    masterPane.appendChild(list);
  }

  function renderDetailPane(): void {
    detailPane.innerHTML = '';

    const selected = vm.getSelectedThread();
    if (!selected) {
      const placeholder = document.createElement('div');
      placeholder.className = 'dw-thread-detail-empty';
      placeholder.innerHTML = `<span class="dw-thread-empty-icon">🔗</span><p>${threadStrings.selectThreadPrompt}</p>`;
      detailPane.appendChild(placeholder);
      return;
    }

    // Detail Header
    const detailHeader = document.createElement('div');
    detailHeader.className = 'dw-thread-detail-header';

    const headerTitle = document.createElement('h3');
    headerTitle.className = 'dw-thread-detail-title';
    headerTitle.textContent = sanitizePlainText(selected.title);

    const headerMeta = document.createElement('div');
    headerMeta.className = 'dw-thread-detail-meta';

    const entityPill = document.createElement('span');
    entityPill.className = 'dw-thread-entity-badge';
    entityPill.textContent = sanitizePlainText(selected.canonicalEntity);

    const statusPill = document.createElement('span');
    statusPill.className = `dw-thread-status-badge dw-status-${selected.status}`;
    statusPill.textContent = selected.status.toUpperCase();

    const dates = document.createElement('span');
    dates.className = 'dw-thread-detail-dates';
    dates.textContent = `${threadStrings.firstReported}: ${formatDateOnly(selected.firstEventAt)} • ${threadStrings.latestUpdate}: ${formatDateOnly(selected.lastEventAt)}`;

    headerMeta.appendChild(entityPill);
    headerMeta.appendChild(statusPill);
    headerMeta.appendChild(dates);

    detailHeader.appendChild(headerTitle);
    detailHeader.appendChild(headerMeta);

    if (selected.summary) {
      const summaryP = document.createElement('p');
      summaryP.className = 'dw-thread-detail-summary';
      summaryP.textContent = sanitizePlainText(selected.summary);
      detailHeader.appendChild(summaryP);
    }

    detailPane.appendChild(detailHeader);

    // Timeline Events Branch
    const timelineBranch = document.createElement('div');
    timelineBranch.className = 'dw-timeline-branch';

    if (vm.getIsLoadingEvents()) {
      const loadingEvents = document.createElement('div');
      loadingEvents.className = 'dw-thread-empty';
      loadingEvents.textContent = threadStrings.loadingThreads;
      timelineBranch.appendChild(loadingEvents);
    } else {
      const events = vm.getEvents();
      events.forEach((event, idx) => {
        const isLatest = idx === events.length - 1;
        const card = renderThreadTimelineCard(event, { isLatest });
        timelineBranch.appendChild(card);
      });
    }

    detailPane.appendChild(timelineBranch);
  }

  function updateView(): void {
    renderMasterList();
    renderDetailPane();
  }

  const unsubscribe = vm.subscribe(updateView);
  updateView();

  // Trigger initial fetch
  void vm.loadThreads();

  // Cleanup
  (container as HTMLElement & { __cleanup?: () => void }).__cleanup = () => {
    unsubscribe();
    vm.destroy();
  };

  return container;
}
