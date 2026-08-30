/**
 * Editorial Curator Dashboard Component for DefenceWire.in
 * Human-in-the-loop candidate cluster manager with 1-click promote, demote, headline, SSB curation, and Git publishing.
 * Hard limit: <= 300 LOC.
 */

import { EditorViewModel, EditorFilterMode } from '../viewmodels/EditorViewModel.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from '../utils/security.js';
import { renderEditorAuthModal } from './EditorAuthModal.js';
import { renderCandidateCard } from './EditorCandidateCard.js';
import { defaultCuratorSyncService } from '../services/curatorSyncService.js';

export function renderEditorDashboard(editorVm: EditorViewModel): HTMLElement {
  if (!editorVm.isAuthenticated()) {
    return renderEditorAuthModal(editorVm);
  }

  const overlay = document.createElement('div');
  overlay.className = 'dw-editor-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', STRINGS.editor.dashboardTitle);

  const panel = document.createElement('div');
  panel.className = 'dw-editor-panel';

  // 1. Header
  const header = document.createElement('div');
  header.className = 'dw-editor-header';

  const title = document.createElement('h2');
  title.className = 'dw-editor-title';
  title.textContent = `🎯 ${STRINGS.editor.dashboardTitle}`;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'dw-editor-close';
  closeBtn.setAttribute('aria-label', STRINGS.editor.closeDashboard);
  closeBtn.textContent = '✕';
  closeBtn.onclick = () => editorVm.setOpen(false);

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // 2. Action Bar (Publish, Export, Copy, Lock)
  const actionBar = document.createElement('div');
  actionBar.className = 'dw-editor-action-bar';
  actionBar.style.padding = '8px 18px';
  actionBar.style.background = 'var(--dw-bg-secondary)';
  actionBar.style.borderBottom = '1px solid var(--dw-border-secondary)';
  actionBar.style.display = 'flex';
  actionBar.style.justifyContent = 'space-between';
  actionBar.style.alignItems = 'center';
  actionBar.style.flexWrap = 'wrap';
  actionBar.style.gap = '8px';

  const actionGroup = document.createElement('div');
  actionGroup.style.display = 'flex';
  actionGroup.style.gap = '6px';
  actionGroup.style.flexWrap = 'wrap';

  // Publish to Production Button
  const publishBtn = document.createElement('button');
  publishBtn.type = 'button';
  publishBtn.className = 'dw-editor-btn dw-editor-btn--publish';
  publishBtn.textContent = editorVm.getIsPublishing() ? `⏳ ${STRINGS.editor.publishing}` : `🚀 ${STRINGS.editor.publishToProduction}`;
  publishBtn.disabled = editorVm.getIsPublishing();
  publishBtn.onclick = async () => {
    let token = defaultCuratorSyncService.getStoredToken() || '';
    if (!token) {
      const entered = window.prompt(STRINGS.editor.githubTokenPlaceholder);
      if (!entered) return;
      token = entered.trim();
    }
    await editorVm.publishToProduction(token);
  };
  actionGroup.appendChild(publishBtn);

  // Export JSON Button
  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'dw-editor-btn dw-editor-btn--export';
  exportBtn.textContent = `💾 ${STRINGS.editor.exportJson}`;
  exportBtn.onclick = () => {
    const jsonStr = editorVm.exportCuratedJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'news.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  actionGroup.appendChild(exportBtn);

  // Copy JSON Button
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'dw-editor-btn dw-editor-btn--copy';
  copyBtn.textContent = `📋 ${STRINGS.editor.copyJson}`;
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(editorVm.exportCuratedJson());
      alert(STRINGS.editor.copiedToClipboard);
    } catch {
      // Fallback
    }
  };
  actionGroup.appendChild(copyBtn);

  // Lock Desk Button
  const lockBtn = document.createElement('button');
  lockBtn.type = 'button';
  lockBtn.className = 'dw-editor-btn dw-editor-btn--lock';
  lockBtn.textContent = `🔒 ${STRINGS.editor.lockDesk}`;
  lockBtn.onclick = () => editorVm.logout();

  actionBar.appendChild(actionGroup);
  actionBar.appendChild(lockBtn);
  panel.appendChild(actionBar);

  // Status message banner if any
  const statusMsg = editorVm.getPublishStatusMessage();
  if (statusMsg) {
    const banner = document.createElement('div');
    banner.style.padding = '6px 18px';
    banner.style.fontSize = '0.78rem';
    banner.style.fontWeight = '600';
    banner.style.background = 'var(--dw-bg-card)';
    banner.style.borderBottom = '1px solid var(--dw-border-secondary)';
    banner.style.color = statusMsg.includes('Error') || statusMsg.includes('Failed') || statusMsg.includes('required')
      ? 'var(--dw-text-accent)'
      : 'var(--dw-badge-text)';
    banner.textContent = sanitizePlainText(statusMsg);
    panel.appendChild(banner);
  }

  // 3. Toolbar (Filters & Search)
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
  panel.appendChild(toolbar);

  // 4. Candidate Cluster List
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

  panel.appendChild(list);
  overlay.appendChild(panel);
  return overlay;
}
