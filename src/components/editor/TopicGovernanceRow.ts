/**
 * Curator Desk — Topic Governance review-queue row rendering (Phase 13 Stage 4).
 * One row per queue item; action buttons vary by queue since each queue's
 * rows come from a different table shape. Hard limit: <= 300 LOC.
 */
import { TopicGovernanceViewModel } from '../../viewmodels/TopicGovernanceViewModel.js';
import { QueueName } from '../../services/topicGovernanceReadHandler.js';
import { TOPIC_GOVERNANCE_STRINGS as STRINGS } from '../../resources/topicGovernanceStrings.js';
import { sanitizePlainText } from '../../utils/security.js';

function field(label: string, value: unknown): HTMLElement {
  const row = document.createElement('div');
  row.style.fontSize = '0.82rem';
  row.style.display = 'flex';
  row.style.gap = '6px';
  const l = document.createElement('span');
  l.style.color = 'var(--dw-text-muted)';
  l.textContent = `${label}:`;
  const v = document.createElement('span');
  v.textContent = sanitizePlainText(String(value ?? ''));
  row.append(l, v);
  return row;
}

function actionButton(label: string, onClick: () => void, disabled: boolean): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dw-editor-btn dw-editor-btn--copy';
  btn.textContent = label;
  btn.disabled = disabled;
  btn.onclick = onClick;
  return btn;
}

function card(): HTMLElement {
  const el = document.createElement('div');
  el.style.border = '1px solid var(--dw-border-secondary)';
  el.style.borderRadius = '6px';
  el.style.padding = '10px 12px';
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.gap = '4px';
  return el;
}

function renderCandidateRow(row: Record<string, unknown>, vm: TopicGovernanceViewModel, allowDuplicateReject: boolean): HTMLElement {
  const el = card();
  el.append(
    field('Candidate', row.proposed_display_name),
    field('Normalized', row.normalized_name),
    field('Type', row.proposed_topic_type),
    field('Evidence', row.evidence_count ?? '—')
  );
  if (allowDuplicateReject && row.matches_topic_id) el.appendChild(field('Matches existing topic', row.matches_topic_id));

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '6px';
  actions.style.flexWrap = 'wrap';
  actions.style.marginTop = '4px';

  actions.appendChild(actionButton(STRINGS.viewEvidence, () => void vm.loadEvidence(String(row.id)), vm.getIsSubmitting()));

  if (!allowDuplicateReject) {
    const topicIdInput = document.createElement('input');
    topicIdInput.type = 'text';
    topicIdInput.placeholder = 'topic id to link';
    topicIdInput.value = row.resolved_topic_id ? String(row.resolved_topic_id) : '';
    topicIdInput.style.fontSize = '0.8rem';
    topicIdInput.style.padding = '2px 6px';
    actions.appendChild(topicIdInput);

    actions.appendChild(actionButton(STRINGS.approve, () => {
      if (!window.confirm(STRINGS.confirmApproveCandidate)) return;
      void vm.submit({ action: 'candidate', candidateId: String(row.id), decision: 'approve', topicId: topicIdInput.value.trim() });
    }, vm.getIsSubmitting() || !topicIdInput.value.trim()));
  }

  actions.appendChild(actionButton(STRINGS.reject, () => {
    if (!window.confirm(STRINGS.confirmRejectCandidate)) return;
    void vm.submit({ action: 'candidate', candidateId: String(row.id), decision: 'reject' });
  }, vm.getIsSubmitting()));

  el.appendChild(actions);
  return el;
}

function renderProvisionalTopicRow(row: Record<string, unknown>, vm: TopicGovernanceViewModel): HTMLElement {
  const el = card();
  el.append(
    field('Topic', row.display_name),
    field('Type', row.topic_type),
    field('Registry version', row.registry_version),
    field('Last seen', row.last_seen_at)
  );
  const actions = document.createElement('div');
  actions.appendChild(actionButton(STRINGS.independenceTitle, () => void vm.loadSourceIndependence(String(row.id)), false));
  el.appendChild(actions);
  return el;
}

function renderAliasCollisionRow(row: Record<string, unknown>): HTMLElement {
  const el = card();
  el.append(
    field('Alias', row.normalized_alias),
    field('Topics sharing it', row.topic_ids),
    field('Count', row.topic_count)
  );
  return el;
}

function renderAssignmentDisagreementRow(row: Record<string, unknown>, vm: TopicGovernanceViewModel): HTMLElement {
  const el = card();
  el.append(
    field('Cluster', row.cluster_id),
    field('Topic', row.topic_id),
    field('Accepted role', row.accepted_role),
    field('Shadow role', row.shadow_role),
    field('Decided at', row.decided_at)
  );
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '6px';
  actions.appendChild(actionButton(STRINGS.assignmentDiffTitle, () => void vm.loadAssignmentDiff(String(row.cluster_id), String(row.topic_id)), false));
  actions.appendChild(actionButton('Adopt shadow role', () => {
    void vm.submit({ action: 'assignment', clusterId: String(row.cluster_id), topicId: String(row.topic_id), role: row.shadow_role as never });
  }, vm.getIsSubmitting()));
  el.appendChild(actions);
  return el;
}

export function renderGovernanceRow(row: Record<string, unknown>, queue: QueueName, vm: TopicGovernanceViewModel): HTMLElement {
  if (queue === 'pendingCandidates') return renderCandidateRow(row, vm, false);
  if (queue === 'nearDuplicateCandidates') return renderCandidateRow(row, vm, true);
  if (queue === 'provisionalTopics') return renderProvisionalTopicRow(row, vm);
  if (queue === 'aliasCollisions') return renderAliasCollisionRow(row);
  return renderAssignmentDisagreementRow(row, vm);
}
