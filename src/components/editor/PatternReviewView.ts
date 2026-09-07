/**
 * Curator Desk — Emergent Pattern & Hypothesis Review View (Phase 5)
 * Workstation tab allowing human curators to review, approve, edit,
 * or reject autonomously synthesized situational hypotheses.
 * Hard limit: <= 300 LOC.
 */

import { PatternReviewViewModel } from '../../viewmodels/PatternReviewViewModel.js';
import { PatternStatus } from '../../types/patterns.js';
import { PATTERN_STRINGS } from '../../resources/patternStrings.js';
import { sanitizePlainText } from '../../utils/security.js';
import { renderPatternCard } from './PatternCard.js';

export function renderPatternReviewView(vm: PatternReviewViewModel): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-curator-workstation-panel';

  const contentArea = document.createElement('div');
  contentArea.className = 'dw-curator-tab-content';
  container.appendChild(contentArea);

  // 1. Header
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'flex-start';
  header.style.marginBottom = '12px';
  header.style.flexWrap = 'wrap';
  header.style.gap = '8px';

  const titleGroup = document.createElement('div');
  const heading = document.createElement('h3');
  heading.textContent = PATTERN_STRINGS.heading;
  titleGroup.appendChild(heading);

  const subheading = document.createElement('p');
  subheading.style.color = 'var(--dw-text-muted)';
  subheading.style.fontSize = '0.82rem';
  subheading.textContent = PATTERN_STRINGS.subheading;
  titleGroup.appendChild(subheading);
  header.appendChild(titleGroup);

  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'dw-editor-btn dw-editor-btn--copy';
  refreshBtn.textContent = `🔄 ${PATTERN_STRINGS.refreshBtn}`;
  refreshBtn.onclick = () => void vm.loadPatterns();
  header.appendChild(refreshBtn);
  contentArea.appendChild(header);

  // 2. Filter Navigation Pills
  const filterRow = document.createElement('div');
  filterRow.className = 'dw-editor-filters';
  filterRow.style.marginBottom = '14px';

  const filters: Array<{ id: PatternStatus | 'all'; label: string }> = [
    { id: 'draft', label: PATTERN_STRINGS.filterDraft },
    { id: 'approved', label: PATTERN_STRINGS.filterApproved },
    { id: 'rejected', label: PATTERN_STRINGS.filterRejected },
    { id: 'all', label: PATTERN_STRINGS.filterAll }
  ];

  for (const f of filters) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dw-editor-filter-tab ${vm.getFilter() === f.id ? 'active' : ''}`;
    btn.textContent = f.label;
    btn.onclick = () => void vm.setFilter(f.id);
    filterRow.appendChild(btn);
  }
  contentArea.appendChild(filterRow);

  // 3. Status or Error Banner
  const error = vm.getErrorMessage();
  if (error) {
    const errorBanner = document.createElement('div');
    errorBanner.style.padding = '8px 12px';
    errorBanner.style.marginBottom = '12px';
    errorBanner.style.background = 'var(--dw-badge-amber-bg)';
    errorBanner.style.color = 'var(--dw-badge-amber-text)';
    errorBanner.style.border = '1px solid var(--dw-border-secondary)';
    errorBanner.style.borderRadius = '4px';
    errorBanner.style.fontSize = '0.82rem';
    errorBanner.textContent = `${PATTERN_STRINGS.errorPrefix}${sanitizePlainText(error)}`;
    contentArea.appendChild(errorBanner);
  }

  // 4. Loading State
  if (vm.getIsLoading()) {
    const loader = document.createElement('div');
    loader.style.padding = '24px';
    loader.style.textAlign = 'center';
    loader.style.color = 'var(--dw-text-muted)';
    loader.textContent = PATTERN_STRINGS.loading;
    contentArea.appendChild(loader);
    return container;
  }

  // 5. Pattern List or Empty State
  const patterns = vm.getPatterns();
  if (patterns.length === 0) {
    const empty = document.createElement('div');
    empty.style.padding = '32px 16px';
    empty.style.textAlign = 'center';
    empty.style.color = 'var(--dw-text-muted)';

    const emptyTitle = document.createElement('h4');
    emptyTitle.textContent = PATTERN_STRINGS.emptyTitle;
    empty.appendChild(emptyTitle);

    const emptyMsg = document.createElement('p');
    emptyMsg.style.fontSize = '0.85rem';
    emptyMsg.textContent = PATTERN_STRINGS.emptyMessage;
    empty.appendChild(emptyMsg);

    contentArea.appendChild(empty);
    return container;
  }

  const listContainer = document.createElement('div');
  listContainer.style.display = 'flex';
  listContainer.style.flexDirection = 'column';
  listContainer.style.gap = '12px';

  for (const pattern of patterns) {
    listContainer.appendChild(renderPatternCard(pattern, vm));
  }
  contentArea.appendChild(listContainer);

  return container;
}
