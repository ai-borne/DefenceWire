/**
 * Curator Desk — Tab 5: Source Scorecard View for DefenceWire.in
 * Displays source tiers, base authority weights, and rolling dynamic multipliers.
 * Hard limit: <= 300 LOC.
 */

import { EditorViewModel } from '../../viewmodels/EditorViewModel.js';
import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText } from '../../utils/security.js';
import { SOURCE_REGISTRY, TIER_WEIGHTS } from '../../data/sources.js';
import { getSourceMultiplier } from '../../engine/sourceReputation.js';
import { SourceTier } from '../../types/source.js';

export function renderSourceScorecardView(_editorVm?: EditorViewModel): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-curator-workstation-panel';

  let searchQuery = '';

  const toolbar = document.createElement('div');
  toolbar.className = 'dw-editor-toolbar';

  const titleGroup = document.createElement('div');
  const heading = document.createElement('h3');
  heading.style.margin = '0';
  heading.textContent = STRINGS.curatorDesk.scorecardHeading;
  titleGroup.appendChild(heading);

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'dw-editor-search';
  searchInput.placeholder = STRINGS.curatorDesk.searchSourcesPlaceholder;

  toolbar.appendChild(titleGroup);
  toolbar.appendChild(searchInput);
  container.appendChild(toolbar);

  const contentArea = document.createElement('div');
  contentArea.className = 'dw-curator-tab-content';

  const sub = document.createElement('p');
  sub.className = 'dw-supplier-candidates-subheading';
  sub.textContent = STRINGS.curatorDesk.scorecardSubheading;
  contentArea.appendChild(sub);

  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'dw-scorecard-table-wrapper';

  const table = document.createElement('table');
  table.className = 'dw-curator-table';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  const cols = [
    STRINGS.curatorDesk.colSource,
    STRINGS.curatorDesk.colTier,
    STRINGS.curatorDesk.colWeight,
    STRINGS.curatorDesk.colMultiplier,
    STRINGS.curatorDesk.colStatus
  ];
  for (const c of cols) {
    const th = document.createElement('th');
    th.textContent = c;
    trHead.appendChild(th);
  }
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  const renderRows = () => {
    tbody.innerHTML = '';
    const query = searchQuery.trim().toLowerCase();

    const filtered = SOURCE_REGISTRY.filter((s) => {
      if (!query) return true;
      return s.name.toLowerCase().includes(query) || s.domain.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.style.textAlign = 'center';
      td.style.color = 'var(--dw-text-muted)';
      td.textContent = STRINGS.curatorDesk.noSourcesFound;
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    for (const src of filtered) {
      const tr = document.createElement('tr');
      const baseWeight = TIER_WEIGHTS[src.tier]?.authorityWeight ?? 0.5;
      const multiplier = getSourceMultiplier(src.domain);

      // 1. Source & Domain
      const tdSource = document.createElement('td');
      tdSource.innerHTML = `<strong>${sanitizePlainText(src.name)}</strong><br/><span style="font-size:0.72rem;color:var(--dw-text-muted);">${sanitizePlainText(src.domain)}</span>`;

      // 2. Tier
      const tdTier = document.createElement('td');
      const tierBadge = document.createElement('span');
      tierBadge.className = `dw-tier-badge dw-tier-${src.tier}`;
      tierBadge.textContent = src.tier;
      tdTier.appendChild(tierBadge);

      // 3. Base Weight
      const tdWeight = document.createElement('td');
      tdWeight.style.fontFamily = 'monospace';
      tdWeight.textContent = `${(baseWeight * 100).toFixed(0)}%`;

      // 4. Dynamic Multiplier
      const tdMultiplier = document.createElement('td');
      const multBadge = document.createElement('span');
      multBadge.className = 'dw-editor-score-badge';
      multBadge.style.fontFamily = 'monospace';
      multBadge.textContent = `${multiplier.toFixed(2)}x`;
      tdMultiplier.appendChild(multBadge);

      // 5. Signal Type
      const tdStatus = document.createElement('td');
      const signalText = src.isOfficialGov
        ? `🏛️ ${STRINGS.curatorDesk.officialBadge}`
        : src.tier === SourceTier.TIER_2_NATIONAL
        ? `📡 ${STRINGS.curatorDesk.wireBadge}`
        : src.tier === SourceTier.TIER_3_SPECIALIZED
        ? `🎯 ${STRINGS.curatorDesk.specializedBadge}`
        : `🔍 ${STRINGS.curatorDesk.osintBadge}`;
      tdStatus.textContent = signalText;

      tr.appendChild(tdSource);
      tr.appendChild(tdTier);
      tr.appendChild(tdWeight);
      tr.appendChild(tdMultiplier);
      tr.appendChild(tdStatus);
      tbody.appendChild(tr);
    }
  };

  searchInput.oninput = (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    renderRows();
  };

  renderRows();
  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  contentArea.appendChild(tableWrapper);
  container.appendChild(contentArea);

  return container;
}
