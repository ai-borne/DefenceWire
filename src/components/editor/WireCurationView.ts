/**
 * Curator Desk — Tab 1: Wire Curation View for DefenceWire.in
 * Displays filtered candidate story clusters with 1-click promote, demote, headline, and ignore controls.
 * Hard limit: <= 300 LOC.
 */

import { EditorViewModel, EditorFilterMode } from '../../viewmodels/EditorViewModel.js';
import { STRINGS } from '../../resources/strings.js';
import { renderCandidateCard } from '../EditorCandidateCard.js';

export function renderWireCurationView(editorVm: EditorViewModel): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-curator-workstation-panel';

  // 1. Toolbar (Filters & Search)
  const toolbar = document.createElement('div');
  toolbar.className = 'dw-editor-toolbar';

  const filters = document.createElement('div');
  filters.className = 'dw-editor-filters';

  const currentMode = editorVm.getFilterMode();
  const filterTabs: Array<{ mode: EditorFilterMode; label: string }> = [
    { mode: 'all', label: STRINGS.editor.filterAll },
    { mode: 'active', label: STRINGS.editor.filterActive },
    { mode: 'ignored', label: STRINGS.editor.filterIgnored }
  ];

  for (const tab of filterTabs) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dw-editor-filter-tab ${currentMode === tab.mode ? 'active' : ''}`;
    btn.textContent = tab.label;
    btn.onclick = () => editorVm.setFilterMode(tab.mode);
    filters.appendChild(btn);
  }

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'dw-editor-search';
  searchInput.placeholder = STRINGS.editor.headlinePlaceholder;
  searchInput.value = editorVm.getSearchQuery();
  searchInput.oninput = (e) => {
    editorVm.setSearchQuery((e.target as HTMLInputElement).value);
  };

  toolbar.appendChild(filters);
  toolbar.appendChild(searchInput);
  container.appendChild(toolbar);

  // 2. Candidate Cluster List
  const list = document.createElement('div');
  list.className = 'dw-editor-cluster-list';

  const candidates = editorVm.getCandidateClusters();
  if (candidates.length === 0) {
    const empty = document.createElement('p');
    empty.style.color = 'var(--dw-text-muted)';
    empty.style.fontSize = '0.85rem';
    empty.textContent = STRINGS.editor.noClustersFound;
    list.appendChild(empty);
  } else {
    for (const cluster of candidates) {
      list.appendChild(renderCandidateCard(cluster, editorVm));
    }
  }

  container.appendChild(list);
  return container;
}
