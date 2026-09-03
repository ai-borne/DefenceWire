/**
 * Curator Desk — Tab 4: Crawler Health View for DefenceWire.in
 * Monitors 40+ Indian defence feeds, Fowler Half-Open circuit breaker states, and failover status.
 * Hard limit: <= 300 LOC.
 */

import { EditorViewModel } from '../../viewmodels/EditorViewModel.js';
import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText } from '../../utils/security.js';
import { SOURCE_REGISTRY } from '../../data/sources.js';
import { SourceTier } from '../../types/source.js';
import { defaultFeedSyncService } from '../../services/feedSyncService.js';
import { formatTimeAgo } from '../../utils/dateUtils.js';
import { getSourceCircuitState } from '../../engine/sourceReputation.js';

export type CircuitBreakerState = 'CLOSED' | 'HALF-OPEN' | 'OPEN';

export interface FeedHealthItem {
  id: string;
  name: string;
  domain: string;
  tier: SourceTier;
  state: CircuitBreakerState;
  consecutiveFailures: number;
  lastSuccessAt?: string;
  statusText: string;
}

export function renderCrawlerHealthView(editorVm: EditorViewModel): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-curator-workstation-panel';

  const contentArea = document.createElement('div');
  contentArea.className = 'dw-curator-tab-content';

  // Compute feed health list from registered sources and live Fowler circuit registry
  const feedItems: FeedHealthItem[] = SOURCE_REGISTRY.map((src) => {
    const circuitInfo = getSourceCircuitState(src.domain) || getSourceCircuitState(src.id);
    const failures = circuitInfo?.consecutiveFailures ?? 0;
    const state: CircuitBreakerState = (circuitInfo?.state as CircuitBreakerState) ?? (failures >= 5 ? 'OPEN' : failures > 0 ? 'HALF-OPEN' : 'CLOSED');
    const statusText = state === 'OPEN' ? 'Quarantined' : state === 'HALF-OPEN' ? 'Probing' : 'Online';

    return {
      id: src.id,
      name: src.name,
      domain: src.domain,
      tier: src.tier,
      state,
      consecutiveFailures: failures,
      statusText
    };
  });

  const totalCount = feedItems.length;
  const quarantinedCount = feedItems.filter((f) => f.state === 'OPEN').length;
  const healthyCount = totalCount - quarantinedCount;
  const lastSyncStr = defaultFeedSyncService.getLastGeneratedAt();
  const lastSyncFormatted = lastSyncStr ? formatTimeAgo(lastSyncStr) : 'Live';

  // 1. Header Toolbar
  const header = document.createElement('div');
  header.className = 'dw-supplier-candidates-header';
  const heading = document.createElement('h3');
  heading.style.margin = '0';
  heading.textContent = STRINGS.curatorDesk.crawlerHealthHeading;

  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'dw-editor-btn';
  refreshBtn.textContent = STRINGS.curatorDesk.refreshHealthBtn;
  refreshBtn.onclick = () => {
    // Re-render
    container.innerHTML = '';
    container.appendChild(renderCrawlerHealthView(editorVm));
  };

  header.appendChild(heading);
  header.appendChild(refreshBtn);
  contentArea.appendChild(header);

  const sub = document.createElement('p');
  sub.className = 'dw-supplier-candidates-subheading';
  sub.textContent = STRINGS.curatorDesk.crawlerHealthSubheading;
  contentArea.appendChild(sub);

  // 2. Health Metrics Grid
  const grid = document.createElement('div');
  grid.className = 'dw-crawler-health-grid';

  const metrics = [
    { label: STRINGS.curatorDesk.totalFeedsLabel, value: String(totalCount) },
    { label: STRINGS.curatorDesk.healthyFeedsLabel, value: String(healthyCount) },
    { label: STRINGS.curatorDesk.quarantinedFeedsLabel, value: String(quarantinedCount) },
    { label: STRINGS.curatorDesk.lastCrawlLabel, value: lastSyncFormatted }
  ];

  for (const m of metrics) {
    const card = document.createElement('div');
    card.className = 'dw-crawler-metric-card';
    const l = document.createElement('span');
    l.className = 'dw-crawler-metric-label';
    l.textContent = m.label;
    const v = document.createElement('span');
    v.className = 'dw-crawler-metric-value';
    v.textContent = m.value;
    card.appendChild(l);
    card.appendChild(v);
    grid.appendChild(card);
  }
  contentArea.appendChild(grid);

  // 3. Alert Banner if any feed is quarantined
  const banner = document.createElement('div');
  banner.className = `dw-crawler-banner ${quarantinedCount > 0 ? 'alert' : ''}`;
  banner.textContent = quarantinedCount > 0
    ? `⚠️ ${STRINGS.curatorDesk.quarantinedBanner}`
    : `✅ ${STRINGS.curatorDesk.statusStable}`;
  contentArea.appendChild(banner);

  // 4. Feeds Health Table
  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'dw-crawler-table-wrapper';

  const table = document.createElement('table');
  table.className = 'dw-curator-table';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  const cols = [
    STRINGS.curatorDesk.feedNameCol,
    STRINGS.curatorDesk.colSource,
    STRINGS.curatorDesk.feedTierCol,
    STRINGS.curatorDesk.feedStateCol,
    STRINGS.curatorDesk.feedStatusCol
  ];
  for (const col of cols) {
    const th = document.createElement('th');
    th.textContent = col;
    trHead.appendChild(th);
  }
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const feed of feedItems) {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.innerHTML = `<strong>${sanitizePlainText(feed.name)}</strong>`;

    const tdDomain = document.createElement('td');
    tdDomain.textContent = feed.domain;

    const tdTier = document.createElement('td');
    tdTier.textContent = feed.tier;

    const tdState = document.createElement('td');
    const badge = document.createElement('span');
    const stateClass = feed.state === 'CLOSED'
      ? 'dw-circuit-closed'
      : feed.state === 'HALF-OPEN'
      ? 'dw-circuit-halfopen'
      : 'dw-circuit-open';
    badge.className = `dw-circuit-badge ${stateClass}`;
    badge.textContent = feed.state === 'CLOSED'
      ? STRINGS.curatorDesk.circuitClosed
      : feed.state === 'HALF-OPEN'
      ? STRINGS.curatorDesk.halfOpenProbe
      : STRINGS.curatorDesk.circuitOpen;
    tdState.appendChild(badge);

    const tdStatus = document.createElement('td');
    tdStatus.textContent = feed.statusText;

    tr.appendChild(tdName);
    tr.appendChild(tdDomain);
    tr.appendChild(tdTier);
    tr.appendChild(tdState);
    tr.appendChild(tdStatus);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  contentArea.appendChild(tableWrapper);

  container.appendChild(contentArea);
  return container;
}
