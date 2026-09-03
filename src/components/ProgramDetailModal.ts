/**
 * Program Detail Dossier Modal Component for DefenceWire.in
 * Sovereign strategic intelligence dossier modal with accessible tabbed navigation.
 * Hard limit: <= 300 LOC. Target: < 280 LOC.
 */

import { StrategicProgram } from '../types/programs.js';
import { StoryCluster } from '../types/news.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';
import { formatTimeAgo } from '../utils/dateUtils.js';
import { renderProgramStageBar } from './ProgramStageBar.js';
import { formatProgramBudget } from './ProgramLifecycleCard.js';
import { renderProgramSpecsView } from './programs/ProgramSpecsView.js';
import { renderProgramOrderBookView } from './programs/ProgramOrderBookView.js';
import { renderProgramIdexView } from './programs/ProgramIdexView.js';
import { getChallengesByProgramId } from '../data/idexProgramMapper.js';
import { getLinksForProgram, getSupplierBySlug } from '../data/suppliers/programSupplierMapper.js';
import { openSupplierDetailModal } from './suppliers/SupplierDetailModal.js';
import { buildDossierTabs } from './DossierTabController.js';

export interface ProgramDetailModalOptions {
  relatedClusters?: StoryCluster[];
  getSupplierRelatedClusters?: (supplierId: string) => StoryCluster[];
  onClose?: () => void;
}

function renderOverviewPanel(program: StrategicProgram, options: ProgramDetailModalOptions): HTMLElement {
  const panel = document.createElement('div');
  panel.id = 'dw-tabpanel-overview';
  panel.className = 'dw-program-tabpanel active';
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', 'dw-tab-overview');

  const agencyRow = document.createElement('div');
  agencyRow.className = 'dw-program-modal-agency-row';
  const agencyText = [
    `${STRINGS.programs.leadAgencyLabel}: ${program.leadAgency}`,
    program.foreignOem ? `${STRINGS.programs.foreignOemPrefix}: ${program.foreignOem}` : null,
    `${STRINGS.programs.serviceBranchPrefix}: ${program.serviceBranch.join(', ')}`
  ].filter(Boolean).join(' • ');
  agencyRow.textContent = sanitizePlainText(agencyText);
  panel.appendChild(agencyRow);

  panel.appendChild(renderProgramStageBar(program.stage, { compact: false }));

  const metricsGrid = document.createElement('div');
  metricsGrid.className = 'dw-program-metrics-grid dw-program-modal-metrics';
  metricsGrid.innerHTML = `
    <div class="dw-program-metric"><span class="dw-program-metric-label">${STRINGS.programs.budgetLabel}</span><span class="dw-program-metric-value">${formatProgramBudget(program.sanctionedBudgetCrores ?? program.estimatedTotalCrores)}</span></div>
    <div class="dw-program-metric"><span class="dw-program-metric-label">${STRINGS.programs.targetLabel}</span><span class="dw-program-metric-value">${sanitizePlainText(String(program.targetInductionYear ?? STRINGS.programs.notAvailable))}</span></div>
    <div class="dw-program-metric"><span class="dw-program-metric-label">${STRINGS.programs.plannedUnitsLabel}</span><span class="dw-program-metric-value">${sanitizePlainText(String(program.plannedUnits ?? STRINGS.programs.notAvailable))}</span></div>
    <div class="dw-program-metric"><span class="dw-program-metric-label">${STRINGS.programs.iddmLabel}</span><span class="dw-program-metric-value">🇮🇳 ${program.indigenousPercentage}%</span></div>
  `;
  panel.appendChild(metricsGrid);

  const summary = document.createElement('p');
  summary.className = 'dw-program-modal-summary';
  summary.textContent = sanitizePlainText(program.summary);
  panel.appendChild(summary);

  if (program.keySubsystems && program.keySubsystems.length > 0) {
    const subH = document.createElement('h3');
    subH.className = 'dw-timeline-heading';
    subH.textContent = STRINGS.programs.subsystemsHeading;
    panel.appendChild(subH);

    const subsList = document.createElement('div');
    subsList.className = 'dw-program-subs-list';
    const subsystemLinks = getLinksForProgram(program.id);
    program.keySubsystems.forEach((sub) => {
      const card = document.createElement('div');
      card.className = 'dw-program-sub-card';
      const indBadge = sub.indigenous ? '🇮🇳 Indigenous' : '🌐 Sourced';
      card.innerHTML = `<div class="dw-sub-head"><strong>${sanitizePlainText(sub.name)}</strong> <span class="dw-sub-type">${sanitizePlainText(sub.type)}</span></div><div class="dw-sub-body"></div>`;
      const subBody = card.querySelector('.dw-sub-body') as HTMLElement;

      const matchedLink = subsystemLinks.find(
        (l) => l.subsystemName.toLowerCase() === sub.name.toLowerCase()
      );
      const matchedSupplier = matchedLink ? getSupplierBySlug(matchedLink.supplierId) : undefined;
      if (matchedSupplier) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'dw-sub-supplier-chip';
        chip.textContent = sanitizePlainText(matchedSupplier.name);
        chip.setAttribute('aria-label', `${STRINGS.suppliers.cardAriaLabel} ${matchedSupplier.name}`);
        chip.addEventListener('click', () =>
          openSupplierDetailModal(matchedSupplier, {
            relatedClusters: options.getSupplierRelatedClusters?.(matchedSupplier.id)
          })
        );
        subBody.appendChild(chip);
      } else {
        const supplierText = document.createElement('span');
        supplierText.textContent = sanitizePlainText(sub.supplier);
        subBody.appendChild(supplierText);
      }

      const rest = document.createElement('span');
      rest.innerHTML = ` • <span class="dw-sub-status">${sanitizePlainText(sub.status)}</span> <span class="dw-sub-badge">${indBadge}</span>`;
      subBody.appendChild(rest);

      subsList.appendChild(card);
    });
    panel.appendChild(subsList);
  }

  if (program.keyMilestones && program.keyMilestones.length > 0) {
    const mileH = document.createElement('h3');
    mileH.className = 'dw-timeline-heading';
    mileH.textContent = STRINGS.programs.milestonesHeading;
    panel.appendChild(mileH);

    const mileList = document.createElement('ol');
    mileList.className = 'dw-program-mile-list';
    program.keyMilestones.forEach((m) => {
      const li = document.createElement('li');
      li.className = `dw-mile-item dw-mile--${m.status}`;
      const icon = m.status === 'completed' ? '✓' : m.status === 'in_progress' ? '⏳' : '📅';
      li.innerHTML = `<div class="dw-mile-meta"><span class="dw-mile-date">${sanitizePlainText(m.date)}</span> <span class="dw-mile-status">${icon} ${sanitizePlainText(m.status.replace('_', ' '))}</span></div><div class="dw-mile-title"><strong>${sanitizePlainText(m.title)}</strong></div>${m.description ? `<div class="dw-mile-desc">${sanitizePlainText(m.description)}</div>` : ''}`;
      mileList.appendChild(li);
    });
    panel.appendChild(mileList);
  }

  const wireH = document.createElement('h3');
  wireH.className = 'dw-timeline-heading';
  wireH.textContent = STRINGS.programs.relatedWireLabel;
  panel.appendChild(wireH);

  const clusters = options.relatedClusters ?? [];
  if (clusters.length > 0) {
    const wireList = document.createElement('ul');
    wireList.className = 'dw-dossier-story-list';
    clusters.forEach((s) => {
      const li = document.createElement('li');
      li.className = 'dw-dossier-story-item';
      const safe = getSafeLinkAttributes(s.primarySource.url);
      li.innerHTML = `<a href="${safe.href}" target="${safe.target}" rel="${safe.rel}">${sanitizePlainText(s.synthesizedHeadline)}</a><div class="dw-river-meta">${sanitizePlainText(s.primarySource.sourceName)} • ${formatTimeAgo(s.primarySource.publishedAt)}</div>`;
      wireList.appendChild(li);
    });
    panel.appendChild(wireList);
  } else {
    const emptyWatch = document.createElement('div');
    emptyWatch.className = 'dw-dossier-no-stories';
    emptyWatch.innerHTML = `🛡️ <strong>${STRINGS.programs.noWirePulseTitle}:</strong> ${STRINGS.programs.noWirePulseBody}`;
    panel.appendChild(emptyWatch);
  }

  return panel;
}

export function openProgramDetailModal(program: StrategicProgram, options: ProgramDetailModalOptions = {}): HTMLElement {
  const existing = document.getElementById('dw-program-modal');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'dw-program-modal';
  backdrop.className = 'dw-modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', `${STRINGS.programs.heading}: ${program.name}`);

  const modal = document.createElement('div');
  modal.className = 'dw-modal-content dw-program-modal-content';

  let handleKeyDown: ((e: KeyboardEvent) => void) | null = null;
  const closeModal = () => {
    if (typeof window !== 'undefined' && handleKeyDown) {
      window.removeEventListener('keydown', handleKeyDown);
      handleKeyDown = null;
    }
    backdrop.classList.add('dw-modal-closing');
    setTimeout(() => {
      backdrop.remove();
      if (typeof window !== 'undefined' && window.location.hash.startsWith('#program/')) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      options.onClose?.();
    }, 150);
  };

  // Header
  const header = document.createElement('div');
  header.className = 'dw-modal-header dw-program-modal-header';
  const titleMeta = document.createElement('div');
  titleMeta.className = 'dw-program-modal-title-meta';
  titleMeta.innerHTML = `
    <span class="dw-program-domain-badge dw-domain--${program.domain}">${sanitizePlainText(program.domain.toUpperCase())}</span>
    <h2 class="dw-modal-title dw-program-modal-title">${sanitizePlainText(program.name)}</h2>
    ${program.officialDesignation && program.officialDesignation !== program.name ? `<div class="dw-program-designation">${sanitizePlainText(program.officialDesignation)}</div>` : ''}
  `;
  header.appendChild(titleMeta);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'dw-modal-close-btn';
  closeBtn.type = 'button';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', STRINGS.programs.modalCloseAria);
  closeBtn.addEventListener('click', closeModal);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Tabs setup
  const idexCount = (program.idexChallenges ?? getChallengesByProgramId(program.id)).length;
  const tabDefs = [
    { id: 'overview', label: STRINGS.programs.tabOverview },
    { id: 'specs', label: STRINGS.programs.tabSpecifications },
    { id: 'orderbook', label: STRINGS.programs.tabOrderBook },
    { id: 'idex', label: idexCount > 0 ? `${STRINGS.programs.tabIdex} (${idexCount})` : STRINGS.programs.tabIdex }
  ];

  const tabList = document.createElement('div');
  tabList.className = 'dw-program-modal-tabs';

  const body = document.createElement('div');
  body.className = 'dw-modal-body dw-program-modal-body';

  const panels: Record<string, HTMLElement> = {
    overview: renderOverviewPanel(program, options),
    specs: renderProgramSpecsView(program),
    orderbook: renderProgramOrderBookView(program),
    idex: renderProgramIdexView(program)
  };
  Object.entries(panels).forEach(([id, panel]) => {
    panel.id = `dw-tabpanel-${id}`;
    panel.className = `dw-program-tabpanel ${id === 'overview' ? 'active' : ''}`;
  });

  buildDossierTabs(tabList, body, tabDefs, panels, {
    tabIdPrefix: 'dw-tab',
    tabBtnClass: 'dw-program-tab-btn',
    ariaLabel: STRINGS.programs.tabAriaLabel,
    defaultId: 'overview'
  });

  modal.appendChild(tabList);
  modal.appendChild(body);
  backdrop.appendChild(modal);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
  };
  if (typeof window !== 'undefined') window.addEventListener('keydown', handleKeyDown);

  document.body.appendChild(backdrop);
  return backdrop;
}
