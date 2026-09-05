/**
 * Candidate Cluster Card and Edit Dialog Components for Editor Desk
 * Provides promote/demote, ignore/restore, headline editing, and SSB brief editing.
 * Hard limit: <= 300 LOC.
 */

import { EditorViewModel } from '../viewmodels/EditorViewModel.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from '../utils/security.js';
import { StoryCluster } from '../types/news.js';

export function renderCandidateCard(cluster: StoryCluster, editorVm: EditorViewModel): HTMLElement {
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

  const formContainer = document.createElement('div');
  card.appendChild(formContainer);

  const actions = document.createElement('div');
  actions.className = 'dw-editor-actions';

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

  const editHeadBtn = document.createElement('button');
  editHeadBtn.type = 'button';
  editHeadBtn.className = 'dw-editor-btn';
  editHeadBtn.textContent = STRINGS.editor.editHeadline;
  editHeadBtn.onclick = () => {
    renderHeadlineEditor(formContainer, cluster, editorVm);
  };
  actions.appendChild(editHeadBtn);

  const editSsbBtn = document.createElement('button');
  editSsbBtn.type = 'button';
  editSsbBtn.className = 'dw-editor-btn';
  editSsbBtn.textContent = STRINGS.editor.editSSBBrief;
  editSsbBtn.onclick = () => {
    renderSSBEditor(formContainer, cluster, editorVm);
  };
  actions.appendChild(editSsbBtn);

  const ignoreBtn = document.createElement('button');
  ignoreBtn.type = 'button';
  ignoreBtn.className = 'dw-editor-btn dw-editor-btn--ignore';
  ignoreBtn.textContent = cluster.isIgnored ? STRINGS.editor.restoreCluster : STRINGS.editor.ignoreCluster;
  ignoreBtn.onclick = () => editorVm.toggleIgnore(cluster.id);
  actions.appendChild(ignoreBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'dw-editor-btn dw-editor-btn--delete';
  deleteBtn.textContent = STRINGS.editor.deleteStory;
  deleteBtn.onclick = () => {
    renderDeleteConfirm(formContainer, cluster, editorVm);
  };
  actions.appendChild(deleteBtn);

  card.appendChild(actions);
  return card;
}

export function renderDeleteConfirm(container: HTMLElement, cluster: StoryCluster, editorVm: EditorViewModel): void {
  container.innerHTML = '';
  const form = document.createElement('div');
  form.className = 'dw-editor-edit-dialog';

  const prompt = document.createElement('p');
  prompt.textContent = STRINGS.editor.deleteConfirmPrompt;
  form.appendChild(prompt);

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '6px';

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'dw-editor-btn dw-editor-btn--delete';
  confirmBtn.textContent = STRINGS.editor.confirmDelete;
  confirmBtn.onclick = () => {
    editorVm.deleteStory(cluster.id);
    container.innerHTML = '';
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'dw-editor-btn';
  cancelBtn.textContent = STRINGS.editor.cancel;
  cancelBtn.onclick = () => {
    container.innerHTML = '';
  };

  btnRow.appendChild(confirmBtn);
  btnRow.appendChild(cancelBtn);
  form.appendChild(btnRow);
  container.appendChild(form);
}

export function renderHeadlineEditor(container: HTMLElement, cluster: StoryCluster, editorVm: EditorViewModel): void {
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

export function renderSSBEditor(container: HTMLElement, cluster: StoryCluster, editorVm: EditorViewModel): void {
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
