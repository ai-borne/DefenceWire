/**
 * Curator Desk — Supplier Candidates Panel (Phase 2.7)
 * Click-through review UI over the Phase 2.6 growth pipeline: lists pending
 * candidates and lets a curator approve (promotes into program_suppliers)
 * or reject with one click, instead of the scripts/review-supplier-candidates.mjs CLI.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from '../utils/security.js';
import { SupplierCandidatesPanelViewModel } from '../viewmodels/SupplierCandidatesPanelViewModel.js';
import { SupplierCandidateRow } from '../services/curatorSupplierCandidateHandler.js';

function renderCandidateRow(candidate: SupplierCandidateRow, vm: SupplierCandidatesPanelViewModel): HTMLElement {
  const row = document.createElement('div');
  row.className = 'dw-supplier-candidate-row';

  const isReviewing = vm.getReviewingId() === candidate.id;
  const domains = (() => {
    try {
      return (JSON.parse(candidate.source_domains) as string[]).join(', ');
    } catch {
      return candidate.source_domains;
    }
  })();

  row.innerHTML = `
    <div class="dw-supplier-candidate-main">
      <strong>${sanitizePlainText(candidate.supplier_name)}</strong>
      <span class="dw-supplier-candidate-arrow"> → </span>
      <span>${sanitizePlainText(candidate.program_id)}</span>
    </div>
    <div class="dw-supplier-candidate-meta">
      ${sanitizePlainText(STRINGS.editorSupplierCandidates.subsystemPrefix)}: ${sanitizePlainText(candidate.subsystem_name)} ·
      ${sanitizePlainText(STRINGS.editorSupplierCandidates.confidencePrefix)}: ${candidate.confidence} ·
      ${candidate.mention_count} ${sanitizePlainText(STRINGS.editorSupplierCandidates.mentionsLabel)} ·
      ${candidate.source_count} ${sanitizePlainText(STRINGS.editorSupplierCandidates.sourcesLabel)} (${sanitizePlainText(domains)})
    </div>
  `;

  const actions = document.createElement('div');
  actions.className = 'dw-supplier-candidate-actions';

  const approveBtn = document.createElement('button');
  approveBtn.type = 'button';
  approveBtn.className = 'dw-editor-btn dw-editor-btn--publish';
  approveBtn.textContent = isReviewing ? STRINGS.editorSupplierCandidates.reviewing : STRINGS.editorSupplierCandidates.approveBtn;
  approveBtn.disabled = isReviewing;
  approveBtn.onclick = () => vm.review(candidate.id, 'approve');

  const rejectBtn = document.createElement('button');
  rejectBtn.type = 'button';
  rejectBtn.className = 'dw-editor-btn';
  rejectBtn.textContent = isReviewing ? STRINGS.editorSupplierCandidates.reviewing : STRINGS.editorSupplierCandidates.rejectBtn;
  rejectBtn.disabled = isReviewing;
  rejectBtn.onclick = () => vm.review(candidate.id, 'reject');

  actions.appendChild(approveBtn);
  actions.appendChild(rejectBtn);
  row.appendChild(actions);

  return row;
}

export function renderSupplierCandidatesPanelView(vm: SupplierCandidatesPanelViewModel): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'dw-supplier-candidates-panel';

  if (!vm.hasLoadedOnce() && !vm.getIsLoading()) {
    vm.load();
  }

  const header = document.createElement('div');
  header.className = 'dw-supplier-candidates-header';
  const heading = document.createElement('h3');
  heading.textContent = STRINGS.editorSupplierCandidates.heading;
  const sub = document.createElement('p');
  sub.className = 'dw-supplier-candidates-subheading';
  sub.textContent = STRINGS.editorSupplierCandidates.subheading;
  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'dw-editor-btn';
  refreshBtn.textContent = STRINGS.editorSupplierCandidates.refreshBtn;
  refreshBtn.onclick = () => vm.load();
  header.appendChild(heading);
  header.appendChild(refreshBtn);
  panel.appendChild(header);
  panel.appendChild(sub);

  if (vm.getError()) {
    const errEl = document.createElement('p');
    errEl.className = 'dw-supplier-candidates-error';
    errEl.textContent = sanitizePlainText(vm.getError() || '');
    panel.appendChild(errEl);
  }

  if (vm.getIsLoading() && !vm.hasLoadedOnce()) {
    const loading = document.createElement('p');
    loading.textContent = STRINGS.editorSupplierCandidates.loading;
    panel.appendChild(loading);
    return panel;
  }

  const candidates = vm.getCandidates();
  if (candidates.length === 0) {
    const empty = document.createElement('p');
    empty.style.color = 'var(--dw-text-muted)';
    empty.textContent = STRINGS.editorSupplierCandidates.empty;
    panel.appendChild(empty);
  } else {
    const list = document.createElement('div');
    list.className = 'dw-supplier-candidates-list';
    candidates.forEach((c) => list.appendChild(renderCandidateRow(c, vm)));
    panel.appendChild(list);
  }

  return panel;
}
