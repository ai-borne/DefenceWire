/**
 * Curator Desk — Pattern Hypothesis Card Component (Phase 5)
 * Renders an individual emergent pattern candidate with confidence badges,
 * 2-sentence situational hypothesis, entity signals, and review actions.
 * Hard limit: <= 300 LOC.
 */

import { PatternReviewViewModel } from '../../viewmodels/PatternReviewViewModel.js';
import { EmergentPattern } from '../../types/patterns.js';
import { PATTERN_STRINGS } from '../../resources/patternStrings.js';

export function renderPatternCard(pattern: EmergentPattern, vm: PatternReviewViewModel): HTMLElement {
  const card = document.createElement('div');
  card.className = 'dw-editor-card';
  card.style.padding = '14px 16px';
  card.style.background = 'var(--dw-bg-card)';
  card.style.border = '1px solid var(--dw-border-secondary)';
  card.style.borderRadius = '6px';

  const isEditing = vm.getEditingPatternId() === pattern.id;

  // Header Row
  const cardHeader = document.createElement('div');
  cardHeader.style.display = 'flex';
  cardHeader.style.justifyContent = 'space-between';
  cardHeader.style.alignItems = 'center';
  cardHeader.style.marginBottom = '8px';
  cardHeader.style.flexWrap = 'wrap';
  cardHeader.style.gap = '6px';

  const titleBadgeGroup = document.createElement('div');
  titleBadgeGroup.style.display = 'flex';
  titleBadgeGroup.style.alignItems = 'center';
  titleBadgeGroup.style.gap = '8px';

  const titleEl = document.createElement('h4');
  titleEl.style.margin = '0';
  titleEl.style.fontSize = '0.95rem';
  titleEl.style.color = 'var(--dw-text-primary)';
  titleEl.textContent = pattern.title;
  titleBadgeGroup.appendChild(titleEl);

  // Confidence Badge
  const confBadge = document.createElement('span');
  confBadge.style.fontSize = '0.72rem';
  confBadge.style.fontWeight = '700';
  confBadge.style.padding = '2px 6px';
  confBadge.style.borderRadius = '3px';
  confBadge.style.background = pattern.confidence >= 0.75 ? 'var(--dw-status-online-bg)' : 'var(--dw-badge-amber-bg)';
  confBadge.style.color = pattern.confidence >= 0.75 ? 'var(--dw-status-online-text)' : 'var(--dw-badge-amber-text)';
  confBadge.textContent = `${Math.round(pattern.confidence * 100)}% ${PATTERN_STRINGS.confidenceLabel}`;
  titleBadgeGroup.appendChild(confBadge);

  cardHeader.appendChild(titleBadgeGroup);

  // Status Pill
  const statusPill = document.createElement('span');
  statusPill.style.fontSize = '0.72rem';
  statusPill.style.textTransform = 'uppercase';
  statusPill.style.fontWeight = '600';
  statusPill.style.color = pattern.status === 'approved' ? 'var(--dw-status-online-text)' : 'var(--dw-text-muted)';
  statusPill.textContent =
    pattern.status === 'approved'
      ? PATTERN_STRINGS.statusApproved
      : pattern.status === 'rejected'
      ? PATTERN_STRINGS.statusRejected
      : PATTERN_STRINGS.statusDraft;
  cardHeader.appendChild(statusPill);
  card.appendChild(cardHeader);

  // Synthesis / Editing
  if (isEditing) {
    const editGroup = document.createElement('div');
    editGroup.style.display = 'flex';
    editGroup.style.flexDirection = 'column';
    editGroup.style.gap = '8px';
    editGroup.style.marginTop = '8px';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'dw-editor-input';
    titleInput.value = vm.getEditTitle();
    titleInput.placeholder = PATTERN_STRINGS.editTitlePlaceholder;
    titleInput.oninput = (e) => vm.setEditTitle((e.target as HTMLInputElement).value);
    editGroup.appendChild(titleInput);

    const synthTextarea = document.createElement('textarea');
    synthTextarea.className = 'dw-editor-textarea';
    synthTextarea.rows = 3;
    synthTextarea.value = vm.getEditSynthesis();
    synthTextarea.placeholder = PATTERN_STRINGS.editSynthesisPlaceholder;
    synthTextarea.oninput = (e) => vm.setEditSynthesis((e.target as HTMLTextAreaElement).value);
    editGroup.appendChild(synthTextarea);

    const editActions = document.createElement('div');
    editActions.style.display = 'flex';
    editActions.style.gap = '8px';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'dw-editor-btn dw-editor-btn--publish';
    saveBtn.textContent = `💾 ${PATTERN_STRINGS.btnSave}`;
    saveBtn.onclick = () => void vm.saveEdit(pattern.id);
    editActions.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'dw-editor-btn dw-editor-btn--copy';
    cancelBtn.textContent = PATTERN_STRINGS.btnCancel;
    cancelBtn.onclick = () => vm.cancelEditing();
    editActions.appendChild(cancelBtn);

    editGroup.appendChild(editActions);
    card.appendChild(editGroup);
  } else {
    // 2-Sentence Situational Assessment Block
    const synthBox = document.createElement('div');
    synthBox.style.padding = '8px 12px';
    synthBox.style.marginTop = '6px';
    synthBox.style.background = 'var(--dw-bg-secondary)';
    synthBox.style.borderLeft = '3px solid var(--dw-border-secondary)';
    synthBox.style.borderRadius = '3px';
    synthBox.style.fontSize = '0.85rem';
    synthBox.style.lineHeight = '1.45';
    synthBox.style.color = 'var(--dw-text-primary)';
    synthBox.textContent = pattern.synthesis;
    card.appendChild(synthBox);

    // Connected Entities & Signal Indicators
    const detailsRow = document.createElement('div');
    detailsRow.style.display = 'flex';
    detailsRow.style.gap = '6px';
    detailsRow.style.flexWrap = 'wrap';
    detailsRow.style.marginTop = '10px';
    detailsRow.style.alignItems = 'center';

    const signalLabel = document.createElement('span');
    signalLabel.style.fontSize = '0.75rem';
    signalLabel.style.color = 'var(--dw-text-muted)';
    signalLabel.textContent = `${pattern.clusterIds.length} ${PATTERN_STRINGS.sourceTracksLabel}:`;
    detailsRow.appendChild(signalLabel);

    for (const nodeId of pattern.nodeIds.slice(0, 5)) {
      const pill = document.createElement('span');
      pill.style.fontSize = '0.72rem';
      pill.style.padding = '1px 6px';
      pill.style.borderRadius = '3px';
      pill.style.background = 'var(--dw-bg-tertiary)';
      pill.style.color = 'var(--dw-text-secondary)';
      pill.textContent = nodeId.replace(/^node_/, '').replace(/-/g, ' ');
      detailsRow.appendChild(pill);
    }
    card.appendChild(detailsRow);

    // Curator Action Buttons
    const actionsRow = document.createElement('div');
    actionsRow.style.display = 'flex';
    actionsRow.style.gap = '8px';
    actionsRow.style.marginTop = '12px';

    if (pattern.status !== 'approved') {
      const approveBtn = document.createElement('button');
      approveBtn.type = 'button';
      approveBtn.className = 'dw-editor-btn dw-editor-btn--publish';
      approveBtn.textContent = `✅ ${PATTERN_STRINGS.btnApprove}`;
      approveBtn.onclick = () => void vm.approvePattern(pattern.id);
      actionsRow.appendChild(approveBtn);
    }

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'dw-editor-btn dw-editor-btn--copy';
    editBtn.textContent = `✏️ ${PATTERN_STRINGS.btnEdit}`;
    editBtn.onclick = () => vm.startEditing(pattern);
    actionsRow.appendChild(editBtn);

    if (pattern.status !== 'rejected') {
      const rejectBtn = document.createElement('button');
      rejectBtn.type = 'button';
      rejectBtn.className = 'dw-editor-btn dw-editor-btn--lock';
      rejectBtn.textContent = `✕ ${PATTERN_STRINGS.btnReject}`;
      rejectBtn.onclick = () => void vm.rejectPattern(pattern.id);
      actionsRow.appendChild(rejectBtn);
    }

    card.appendChild(actionsRow);
  }

  return card;
}
