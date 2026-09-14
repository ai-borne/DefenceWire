/**
 * Curator Desk — Topic Governance View (Phase 13 Stage 4).
 * Review-queue tabs, a quick suppress/restore action for auto-promoted
 * topics, and a detail panel for evidence/independence/assignment-history
 * lookups. Hard limit: <= 300 LOC.
 */
import { TopicGovernanceViewModel } from '../../viewmodels/TopicGovernanceViewModel.js';
import { QueueName } from '../../services/topicGovernanceReadHandler.js';
import { TOPIC_GOVERNANCE_STRINGS as STRINGS } from '../../resources/topicGovernanceStrings.js';
import { sanitizePlainText } from '../../utils/security.js';
import { renderGovernanceRow } from './TopicGovernanceRow.js';

const QUEUE_TABS: Array<{ id: QueueName; label: string }> = [
  { id: 'pendingCandidates', label: STRINGS.queues.pendingCandidates },
  { id: 'provisionalTopics', label: STRINGS.queues.provisionalTopics },
  { id: 'aliasCollisions', label: STRINGS.queues.aliasCollisions },
  { id: 'nearDuplicateCandidates', label: STRINGS.queues.nearDuplicateCandidates },
  { id: 'assignmentDisagreements', label: STRINGS.queues.assignmentDisagreements }
];

function renderQuickSuppressTool(vm: TopicGovernanceViewModel): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.border = '1px solid var(--dw-border-secondary)';
  wrap.style.borderRadius = '6px';
  wrap.style.padding = '10px 12px';
  wrap.style.marginBottom = '12px';
  wrap.style.display = 'flex';
  wrap.style.gap = '8px';
  wrap.style.alignItems = 'center';
  wrap.style.flexWrap = 'wrap';

  const label = document.createElement('span');
  label.style.fontSize = '0.82rem';
  label.style.color = 'var(--dw-text-muted)';
  label.textContent = 'Suppress or restore an already-promoted topic by id:';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'topic id';
  input.style.fontSize = '0.82rem';
  input.style.padding = '3px 6px';

  const suppressBtn = document.createElement('button');
  suppressBtn.type = 'button';
  suppressBtn.className = 'dw-editor-btn dw-editor-btn--rollback';
  suppressBtn.textContent = STRINGS.suppress;
  suppressBtn.disabled = vm.getIsSubmitting();
  suppressBtn.onclick = () => {
    const topicId = input.value.trim();
    if (!topicId || !window.confirm(STRINGS.confirmSuppress)) return;
    void vm.submit({ action: 'suppress', topicId });
  };

  const restoreBtn = document.createElement('button');
  restoreBtn.type = 'button';
  restoreBtn.className = 'dw-editor-btn dw-editor-btn--copy';
  restoreBtn.textContent = STRINGS.restore;
  restoreBtn.disabled = vm.getIsSubmitting();
  restoreBtn.onclick = () => {
    const topicId = input.value.trim();
    if (!topicId || !window.confirm(STRINGS.confirmRestore)) return;
    void vm.submit({ action: 'restore', topicId });
  };

  wrap.append(label, input, suppressBtn, restoreBtn);
  return wrap;
}

function renderDetailPanel(vm: TopicGovernanceViewModel): HTMLElement | null {
  const evidence = vm.getSelectedEvidence();
  const independence = vm.getSelectedIndependence();
  const diff = vm.getSelectedAssignmentDiff();
  if (!evidence && !independence && !diff) return null;

  const panel = document.createElement('div');
  panel.style.border = '1px solid var(--dw-border-secondary)';
  panel.style.borderRadius = '6px';
  panel.style.padding = '10px 12px';
  panel.style.marginTop = '12px';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'dw-editor-btn dw-editor-btn--copy';
  closeBtn.textContent = STRINGS.cancel;
  closeBtn.style.float = 'right';
  closeBtn.onclick = () => vm.clearDetail();
  panel.appendChild(closeBtn);

  if (evidence) {
    const title = document.createElement('h4');
    title.textContent = STRINGS.evidenceTitle;
    panel.appendChild(title);
    for (const row of evidence) {
      const line = document.createElement('div');
      line.style.fontSize = '0.8rem';
      line.textContent = sanitizePlainText(`${row.title ?? ''} — ${STRINGS.evidenceSpan} ${row.evidence_start}-${row.evidence_end} — ${STRINGS.evidenceSource} ${row.source_owner_key ?? ''}`);
      panel.appendChild(line);
    }
    if (evidence.length === 0) panel.appendChild(document.createTextNode(STRINGS.empty));
  }

  if (independence) {
    const title = document.createElement('h4');
    title.textContent = STRINGS.independenceTitle;
    panel.appendChild(title);
    const row = independence[0];
    const line = document.createElement('div');
    line.style.fontSize = '0.8rem';
    line.textContent = row
      ? sanitizePlainText(`${STRINGS.mentionCount}: ${row.mention_count} — ${STRINGS.independentSourceCount}: ${row.independent_source_count}`)
      : STRINGS.empty;
    panel.appendChild(line);
  }

  if (diff) {
    const title = document.createElement('h4');
    title.textContent = STRINGS.assignmentDiffTitle;
    panel.appendChild(title);
    for (const row of diff) {
      const line = document.createElement('div');
      line.style.fontSize = '0.8rem';
      line.textContent = sanitizePlainText(`${row.decided_at} — role=${row.role} state=${row.decision_state} source=${row.assignment_source} ${STRINGS.classifierVersion}=${row.classifier_version}`);
      panel.appendChild(line);
    }
    if (diff.length === 0) panel.appendChild(document.createTextNode(STRINGS.empty));
  }

  return panel;
}

export function renderTopicGovernanceView(vm: TopicGovernanceViewModel): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-curator-workstation-panel';

  const contentArea = document.createElement('div');
  contentArea.className = 'dw-curator-tab-content';
  container.appendChild(contentArea);

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '12px';

  const heading = document.createElement('h3');
  heading.textContent = STRINGS.tabLabel;
  header.appendChild(heading);

  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'dw-editor-btn dw-editor-btn--copy';
  refreshBtn.textContent = `🔄 ${STRINGS.refresh}`;
  refreshBtn.onclick = () => void vm.loadQueue();
  header.appendChild(refreshBtn);
  contentArea.appendChild(header);

  contentArea.appendChild(renderQuickSuppressTool(vm));

  const tabsRow = document.createElement('div');
  tabsRow.className = 'dw-editor-filters';
  tabsRow.style.marginBottom = '14px';
  for (const tab of QUEUE_TABS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dw-editor-filter-tab ${vm.getActiveQueue() === tab.id ? 'active' : ''}`;
    btn.textContent = tab.label;
    btn.onclick = () => void vm.setActiveQueue(tab.id);
    tabsRow.appendChild(btn);
  }
  contentArea.appendChild(tabsRow);

  const error = vm.getError();
  if (error) {
    const banner = document.createElement('div');
    banner.style.padding = '8px 12px';
    banner.style.marginBottom = '12px';
    banner.style.background = 'var(--dw-badge-amber-bg)';
    banner.style.color = 'var(--dw-badge-amber-text)';
    banner.style.border = '1px solid var(--dw-border-secondary)';
    banner.style.borderRadius = '4px';
    banner.style.fontSize = '0.82rem';
    banner.textContent = `${STRINGS.errorPrefix}${sanitizePlainText(error)}`;
    contentArea.appendChild(banner);
  }

  if (vm.getIsLoading()) {
    const loader = document.createElement('div');
    loader.style.padding = '24px';
    loader.style.textAlign = 'center';
    loader.style.color = 'var(--dw-text-muted)';
    loader.textContent = STRINGS.loading;
    contentArea.appendChild(loader);
    return container;
  }

  const rows = vm.getRows();
  if (rows.length === 0) {
    const empty = document.createElement('div');
    empty.style.padding = '32px 16px';
    empty.style.textAlign = 'center';
    empty.style.color = 'var(--dw-text-muted)';
    empty.textContent = STRINGS.empty;
    contentArea.appendChild(empty);
  } else {
    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '10px';
    for (const row of rows) list.appendChild(renderGovernanceRow(row, vm.getActiveQueue(), vm));
    contentArea.appendChild(list);
  }

  const detail = renderDetailPanel(vm);
  if (detail) contentArea.appendChild(detail);

  return container;
}
