/**
 * Curator Desk — Tab 7: Knowledge Base View for DefenceWire.in (Phase 5)
 * Read-only, paginated/sortable/filterable table view over the D1 tables
 * built up by Phases 1-4: discovered entities, source reputation, supplier
 * candidates, and the curator/publish audit trail.
 * Hard limit: <= 300 LOC.
 */

import { CuratorKnowledgeBaseViewModel, KnowledgeBaseTableKey } from '../../viewmodels/CuratorKnowledgeBaseViewModel.js';
import knowledgeBaseStrings from '../../resources/knowledgeBaseStrings.js';
import { sanitizePlainText } from '../../utils/security.js';

const TABLE_OPTIONS: Array<{ key: KnowledgeBaseTableKey; label: string }> = [
  { key: 'discovered_entities', label: knowledgeBaseStrings.tableDiscoveredEntities },
  { key: 'source_reputation', label: knowledgeBaseStrings.tableSourceReputation },
  { key: 'supplier_candidates', label: knowledgeBaseStrings.tableSupplierCandidates },
  { key: 'curator_overrides', label: knowledgeBaseStrings.tableCuratorOverrides },
  { key: 'published_snapshots', label: knowledgeBaseStrings.tablePublishedSnapshots }
];

function formatHeaderLabel(column: string): string {
  return column.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  return sanitizePlainText(String(value));
}

export function renderKnowledgeBaseView(vm: CuratorKnowledgeBaseViewModel): HTMLElement {
  vm.ensureLoaded();

  const container = document.createElement('div');
  container.className = 'dw-curator-workstation-panel';

  const contentArea = document.createElement('div');
  contentArea.className = 'dw-curator-tab-content';

  const heading = document.createElement('h3');
  heading.style.margin = '0';
  heading.textContent = knowledgeBaseStrings.heading;
  contentArea.appendChild(heading);

  const sub = document.createElement('p');
  sub.className = 'dw-supplier-candidates-subheading';
  sub.textContent = knowledgeBaseStrings.subheading;
  contentArea.appendChild(sub);

  // Toolbar: table selector + filter input
  const toolbar = document.createElement('div');
  toolbar.className = 'dw-editor-toolbar';

  const select = document.createElement('select');
  select.className = 'dw-kb-select';
  select.setAttribute('aria-label', knowledgeBaseStrings.tableSelectLabel);
  for (const opt of TABLE_OPTIONS) {
    const optionEl = document.createElement('option');
    optionEl.value = opt.key;
    optionEl.textContent = opt.label;
    optionEl.selected = vm.getTable() === opt.key;
    select.appendChild(optionEl);
  }
  select.onchange = (e) => vm.setTable((e.target as HTMLSelectElement).value as KnowledgeBaseTableKey);

  const filterInput = document.createElement('input');
  filterInput.type = 'search';
  filterInput.className = 'dw-editor-search';
  filterInput.placeholder = knowledgeBaseStrings.filterPlaceholder;
  filterInput.value = vm.getFilter();
  filterInput.oninput = (e) => vm.setFilter((e.target as HTMLInputElement).value);

  toolbar.appendChild(select);
  toolbar.appendChild(filterInput);
  contentArea.appendChild(toolbar);

  // Status: loading / error
  if (vm.getIsLoading()) {
    const loading = document.createElement('p');
    loading.style.color = 'var(--dw-text-muted)';
    loading.textContent = knowledgeBaseStrings.loading;
    contentArea.appendChild(loading);
  } else if (vm.getError()) {
    const errorEl = document.createElement('p');
    errorEl.style.color = 'var(--dw-text-accent)';
    errorEl.style.fontWeight = '600';
    errorEl.textContent = `${knowledgeBaseStrings.errorPrefix}${vm.getError()}`;
    contentArea.appendChild(errorEl);
  } else {
    const rows = vm.getRows();
    if (rows.length === 0) {
      const empty = document.createElement('p');
      empty.style.color = 'var(--dw-text-muted)';
      empty.textContent = knowledgeBaseStrings.noRows;
      contentArea.appendChild(empty);
    } else {
      const columns = Object.keys(rows[0]!);

      const tableWrapper = document.createElement('div');
      tableWrapper.className = 'dw-scorecard-table-wrapper';

      const table = document.createElement('table');
      table.className = 'dw-curator-table';

      const thead = document.createElement('thead');
      const trHead = document.createElement('tr');
      for (const col of columns) {
        const th = document.createElement('th');
        th.className = 'dw-kb-table-th-sortable';
        const isActiveSort = vm.getSortBy() === col;
        th.textContent = isActiveSort ? `${formatHeaderLabel(col)} ${vm.getSortDir() === 'ASC' ? '▲' : '▼'}` : formatHeaderLabel(col);
        th.onclick = () => vm.setSort(col);
        trHead.appendChild(th);
      }
      thead.appendChild(trHead);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (const row of rows) {
        const tr = document.createElement('tr');
        for (const col of columns) {
          const td = document.createElement('td');
          td.textContent = formatCellValue(row[col]);
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      tableWrapper.appendChild(table);
      contentArea.appendChild(tableWrapper);

      // Pagination
      const pagination = document.createElement('div');
      pagination.className = 'dw-kb-pagination';

      const totalPages = Math.max(1, Math.ceil(vm.getTotalCount() / vm.getPageSize()));
      const currentPage = vm.getPage() + 1;

      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'dw-editor-btn';
      prevBtn.textContent = knowledgeBaseStrings.prevPage;
      prevBtn.disabled = vm.getPage() === 0;
      prevBtn.onclick = () => vm.prevPage();

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'dw-editor-btn';
      nextBtn.textContent = knowledgeBaseStrings.nextPage;
      nextBtn.disabled = currentPage >= totalPages;
      nextBtn.onclick = () => vm.nextPage();

      const pageInfo = document.createElement('span');
      pageInfo.textContent = `${knowledgeBaseStrings.pageInfoPrefix} ${currentPage} ${knowledgeBaseStrings.ofLabel} ${totalPages} (${vm.getTotalCount()} ${knowledgeBaseStrings.rowsSuffix})`;

      pagination.appendChild(prevBtn);
      pagination.appendChild(pageInfo);
      pagination.appendChild(nextBtn);
      contentArea.appendChild(pagination);
    }
  }

  container.appendChild(contentArea);
  return container;
}
