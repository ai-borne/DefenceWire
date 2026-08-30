/**
 * Editorial Curator Dashboard Component for DefenceWire.in
 * Human-in-the-loop candidate cluster manager with 1-click promote, demote, headline, and SSB curation.
 * Hard limit: <= 300 LOC.
 */

import { EditorViewModel, EditorFilterMode } from '../viewmodels/EditorViewModel.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from '../utils/security.js';
import { StoryCluster } from '../types/news.js';

export function renderEditorDashboard(editorVm: EditorViewModel): HTMLElement {
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

  // 2. Toolbar
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

  // 3. Cluster List
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

function renderCandidateCard(cluster: StoryCluster, editorVm: EditorViewModel): HTMLElement {
  const card = document.createElement('div');
  card.className = `dw-editor-cluster-card ${cluster.isIgnored ? 'ignored' : ''}`;

  const headerRow = document.createElement('div');
  headerRow.className = 'dw-editor-card-header';

  const headline = document.createElement('h3');
  headline.className = 'dw-editor-headline';
  headline.textContent = sanitizePlainText(cluster.synthesizedHeadline);

  const badges = document.createElement('div');
  badges.className = 'dw-editor-meta-badges';

  if (cluster.isLeadStory || cluster.isEditorPromoted) {
    const leadBadge = document.createElement('span');
    leadBadge.className = 'dw-editor-promoted-badge';
    leadBadge.textContent = STRINGS.editor.statusPromoted;
    badges.appendChild(leadBadge);
  }

  const scoreBadge = document.createElement('span');
  scoreBadge.className = 'dw-editor-score-badge';
  scoreBadge.textContent = `${STRINGS.editor.scoreLabel}: ${Math.round(cluster.defenceScore)}`;
  badges.appendChild(scoreBadge);

  headerRow.appendChild(headline);
  headerRow.appendChild(badges);
  card.appendChild(headerRow);

  const totalSources = 1 + (cluster.relatedCoverage?.length || 0);
  const info = document.createElement('div');
  info.className = 'dw-editor-card-info';
  info.textContent = `${STRINGS.story.primarySourcePrefix} ${cluster.primarySource.sourceName} • ${totalSources} ${STRINGS.editor.sourcesCountLabel}`;
  card.appendChild(info);

  // Edit forms container
  const formContainer = document.createElement('div');
  card.appendChild(formContainer);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'dw-editor-actions';

  // Promote / Demote
  const promoteBtn = document.createElement('button');
  promoteBtn.type = 'button';
  promoteBtn.className = 'dw-editor-btn dw-editor-btn--promote';
  promoteBtn.textContent = cluster.isLeadStory || cluster.isEditorPromoted ? STRINGS.editor.demoteStory : STRINGS.editor.promoteToLead;
  promoteBtn.onclick = () => {
    if (cluster.isLeadStory || cluster.isEditorPromoted) {
      editorVm.demoteStory(cluster.id);
    } else {
      editorVm.promoteToLead(cluster.id);
    }
  };
  actions.appendChild(promoteBtn);

  // Edit Headline Button
  const editHeadBtn = document.createElement('button');
  editHeadBtn.type = 'button';
  editHeadBtn.className = 'dw-editor-btn';
  editHeadBtn.textContent = STRINGS.editor.editHeadline;
  editHeadBtn.onclick = () => {
    renderHeadlineEditor(formContainer, cluster, editorVm);
  };
  actions.appendChild(editHeadBtn);

  // Edit SSB Button
  const editSsbBtn = document.createElement('button');
  editSsbBtn.type = 'button';
  editSsbBtn.className = 'dw-editor-btn';
  editSsbBtn.textContent = STRINGS.editor.editSSBBrief;
  editSsbBtn.onclick = () => {
    renderSSBEditor(formContainer, cluster, editorVm);
  };
  actions.appendChild(editSsbBtn);

  // Ignore / Restore Button
  const ignoreBtn = document.createElement('button');
  ignoreBtn.type = 'button';
  ignoreBtn.className = 'dw-editor-btn dw-editor-btn--ignore';
  ignoreBtn.textContent = cluster.isIgnored ? STRINGS.editor.restoreCluster : STRINGS.editor.ignoreCluster;
  ignoreBtn.onclick = () => editorVm.toggleIgnore(cluster.id);
  actions.appendChild(ignoreBtn);

  card.appendChild(actions);
  return card;
}

function renderHeadlineEditor(container: HTMLElement, cluster: StoryCluster, editorVm: EditorViewModel): void {
  container.innerHTML = '';
  const form = document.createElement('div');
  form.className = 'dw-editor-edit-dialog';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'dw-editor-input';
  input.value = cluster.synthesizedHeadline;

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '6px';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'dw-editor-btn dw-editor-btn--promote';
  saveBtn.textContent = STRINGS.editor.saveChanges;
  saveBtn.onclick = () => {
    if (input.value.trim()) {
      editorVm.editHeadline(cluster.id, input.value.trim());
      container.innerHTML = '';
    }
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'dw-editor-btn';
  cancelBtn.textContent = STRINGS.editor.cancel;
  cancelBtn.onclick = () => {
    container.innerHTML = '';
  };

  btnRow.appendChild(saveBtn);
  btnRow.appendChild(cancelBtn);
  form.appendChild(input);
  form.appendChild(btnRow);
  container.appendChild(form);
}

function renderSSBEditor(container: HTMLElement, cluster: StoryCluster, editorVm: EditorViewModel): void {
  container.innerHTML = '';
  const form = document.createElement('div');
  form.className = 'dw-editor-edit-dialog';

  const label = document.createElement('label');
  label.style.fontSize = '0.74rem';
  label.style.fontWeight = '600';
  label.textContent = STRINGS.editor.whyItMattersLabel;

  const textarea = document.createElement('textarea');
  textarea.className = 'dw-editor-textarea';
  textarea.value = cluster.ssbIntel?.whyItMatters || '';

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '6px';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'dw-editor-btn dw-editor-btn--promote';
  saveBtn.textContent = STRINGS.editor.saveChanges;
  saveBtn.onclick = () => {
    const existing = cluster.ssbIntel || {
      whyItMatters: '',
      gdLecturettePoints: [],
      potentialInterviewQuestions: []
    };
    editorVm.editSSBBrief(cluster.id, {
      ...existing,
      whyItMatters: textarea.value.trim()
    });
    container.innerHTML = '';
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'dw-editor-btn';
  cancelBtn.textContent = STRINGS.editor.cancel;
  cancelBtn.onclick = () => {
    container.innerHTML = '';
  };

  btnRow.appendChild(saveBtn);
  btnRow.appendChild(cancelBtn);
  form.appendChild(label);
  form.appendChild(textarea);
  form.appendChild(btnRow);
  container.appendChild(form);
}
