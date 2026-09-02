/**
 * Program Detail Dossier Modal Component for DefenceWire.in
 * Full-fidelity strategic intelligence dossier modal for sovereign Indian defence platforms.
 * Hard limit: <= 300 LOC.
 */

import { StrategicProgram } from '../types/programs.js';
import { StoryCluster } from '../types/news.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';
import { formatTimeAgo } from '../utils/dateUtils.js';
import { renderProgramStageBar } from './ProgramStageBar.js';
import { formatProgramBudget } from './ProgramLifecycleCard.js';

export interface ProgramDetailModalOptions {
  relatedClusters?: StoryCluster[];
  onClose?: () => void;
}

export function openProgramDetailModal(
  program: StrategicProgram,
  options: ProgramDetailModalOptions = {}
): HTMLElement {
  const existingModal = document.getElementById('dw-program-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const backdrop = document.createElement('div');
  backdrop.id = 'dw-program-modal';
  backdrop.className = 'dw-modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', `${STRINGS.programs.heading}: ${program.name}`);

  const modal = document.createElement('div');
  modal.className = 'dw-modal-content dw-program-modal-content';

  const closeModal = () => {
    backdrop.classList.add('dw-modal-closing');
    setTimeout(() => {
      backdrop.remove();
      if (typeof window !== 'undefined' && window.location.hash.startsWith('#program/')) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      options.onClose?.();
    }, 150);
  };

  // 1. Header
  const header = document.createElement('div');
  header.className = 'dw-modal-header dw-program-modal-header';

  const titleMeta = document.createElement('div');
  titleMeta.className = 'dw-program-modal-title-meta';

  const domainBadge = document.createElement('span');
  domainBadge.className = `dw-program-domain-badge dw-domain--${program.domain}`;
  domainBadge.textContent = sanitizePlainText(program.domain.toUpperCase());
  titleMeta.appendChild(domainBadge);

  const title = document.createElement('h2');
  title.className = 'dw-modal-title dw-program-modal-title';
  title.textContent = sanitizePlainText(program.name);
  titleMeta.appendChild(title);

  if (program.officialDesignation && program.officialDesignation !== program.name) {
    const desig = document.createElement('div');
    desig.className = 'dw-program-designation';
    desig.textContent = sanitizePlainText(program.officialDesignation);
    titleMeta.appendChild(desig);
  }

  header.appendChild(titleMeta);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'dw-modal-close-btn';
  closeBtn.type = 'button';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', STRINGS.programs.modalCloseAria);
  closeBtn.addEventListener('click', closeModal);
  header.appendChild(closeBtn);

  modal.appendChild(header);

  // 2. Body Container
  const body = document.createElement('div');
  body.className = 'dw-modal-body dw-program-modal-body';

  // Sub-header agency & branches row
  const agencyRow = document.createElement('div');
  agencyRow.className = 'dw-program-modal-agency-row';
  const agencyText = [
    `${STRINGS.programs.leadAgencyLabel}: ${program.leadAgency}`,
    program.foreignOem ? `${STRINGS.programs.foreignOemPrefix}: ${program.foreignOem}` : null,
    `${STRINGS.programs.serviceBranchPrefix}: ${program.serviceBranch.join(', ')}`
  ].filter(Boolean).join(' • ');
  agencyRow.textContent = sanitizePlainText(agencyText);
  body.appendChild(agencyRow);

  // Stage Progression Bar
  const stageBar = renderProgramStageBar(program.stage, { compact: false });
  body.appendChild(stageBar);

  // Metrics Grid
  const metricsGrid = document.createElement('div');
  metricsGrid.className = 'dw-program-metrics-grid dw-program-modal-metrics';

  const budgetBlock = document.createElement('div');
  budgetBlock.className = 'dw-program-metric';
  budgetBlock.innerHTML = `<span class="dw-program-metric-label">${STRINGS.programs.budgetLabel}</span><span class="dw-program-metric-value">${formatProgramBudget(program.sanctionedBudgetCrores ?? program.estimatedTotalCrores)}</span>`;
  metricsGrid.appendChild(budgetBlock);

  const targetBlock = document.createElement('div');
  targetBlock.className = 'dw-program-metric';
  targetBlock.innerHTML = `<span class="dw-program-metric-label">${STRINGS.programs.targetLabel}</span><span class="dw-program-metric-value">${sanitizePlainText(String(program.targetInductionYear ?? STRINGS.programs.notAvailable))}</span>`;
  metricsGrid.appendChild(targetBlock);

  const unitsBlock = document.createElement('div');
  unitsBlock.className = 'dw-program-metric';
  unitsBlock.innerHTML = `<span class="dw-program-metric-label">${STRINGS.programs.plannedUnitsLabel}</span><span class="dw-program-metric-value">${sanitizePlainText(String(program.plannedUnits ?? STRINGS.programs.notAvailable))}</span>`;
  metricsGrid.appendChild(unitsBlock);

  const iddmBlock = document.createElement('div');
  iddmBlock.className = 'dw-program-metric';
  iddmBlock.innerHTML = `<span class="dw-program-metric-label">${STRINGS.programs.iddmLabel}</span><span class="dw-program-metric-value">🇮🇳 ${program.indigenousPercentage}%</span>`;
  metricsGrid.appendChild(iddmBlock);

  body.appendChild(metricsGrid);

  // Strategic Summary
  const summaryBlock = document.createElement('p');
  summaryBlock.className = 'dw-program-modal-summary';
  summaryBlock.textContent = sanitizePlainText(program.summary);
  body.appendChild(summaryBlock);

  // Platform Technical Specifications
  if (program.specifications && Object.keys(program.specifications).length > 0) {
    const specsHeading = document.createElement('h3');
    specsHeading.className = 'dw-timeline-heading';
    specsHeading.textContent = STRINGS.programs.specificationsHeading;
    body.appendChild(specsHeading);

    const specsGrid = document.createElement('div');
    specsGrid.className = 'dw-program-specs-grid';
    for (const [key, val] of Object.entries(program.specifications)) {
      const specItem = document.createElement('div');
      specItem.className = 'dw-program-spec-item';
      specItem.innerHTML = `<span class="dw-spec-key">${sanitizePlainText(key)}</span><span class="dw-spec-val">${sanitizePlainText(val)}</span>`;
      specsGrid.appendChild(specItem);
    }
    body.appendChild(specsGrid);
  }

  // Key Subsystems & Sensors
  if (program.keySubsystems && program.keySubsystems.length > 0) {
    const subsHeading = document.createElement('h3');
    subsHeading.className = 'dw-timeline-heading';
    subsHeading.textContent = STRINGS.programs.subsystemsHeading;
    body.appendChild(subsHeading);

    const subsList = document.createElement('div');
    subsList.className = 'dw-program-subs-list';
    program.keySubsystems.forEach((sub) => {
      const subCard = document.createElement('div');
      subCard.className = 'dw-program-sub-card';
      const indBadge = sub.indigenous ? '🇮🇳 Indigenous' : '🌐 Sourced';
      subCard.innerHTML = `
        <div class="dw-sub-head"><strong>${sanitizePlainText(sub.name)}</strong> <span class="dw-sub-type">${sanitizePlainText(sub.type)}</span></div>
        <div class="dw-sub-body">${sanitizePlainText(sub.supplier)} • <span class="dw-sub-status">${sanitizePlainText(sub.status)}</span> <span class="dw-sub-badge">${indBadge}</span></div>
      `;
      subsList.appendChild(subCard);
    });
    body.appendChild(subsList);
  }

  // Program Milestones & Roadmap
  if (program.keyMilestones && program.keyMilestones.length > 0) {
    const mileHeading = document.createElement('h3');
    mileHeading.className = 'dw-timeline-heading';
    mileHeading.textContent = STRINGS.programs.milestonesHeading;
    body.appendChild(mileHeading);

    const mileList = document.createElement('ol');
    mileList.className = 'dw-program-mile-list';
    program.keyMilestones.forEach((m) => {
      const li = document.createElement('li');
      li.className = `dw-mile-item dw-mile--${m.status}`;
      const statusIcon = m.status === 'completed' ? '✓' : m.status === 'in_progress' ? '⏳' : '📅';
      li.innerHTML = `
        <div class="dw-mile-meta"><span class="dw-mile-date">${sanitizePlainText(m.date)}</span> <span class="dw-mile-status">${statusIcon} ${sanitizePlainText(m.status.replace('_', ' '))}</span></div>
        <div class="dw-mile-title"><strong>${sanitizePlainText(m.title)}</strong></div>
        ${m.description ? `<div class="dw-mile-desc">${sanitizePlainText(m.description)}</div>` : ''}
      `;
      mileList.appendChild(li);
    });
    body.appendChild(mileList);
  }

  // Corroborated Wire News Pulse
  const wireHeading = document.createElement('h3');
  wireHeading.className = 'dw-timeline-heading';
  wireHeading.textContent = STRINGS.programs.relatedWireLabel;
  body.appendChild(wireHeading);

  const clusters = options.relatedClusters ?? [];
  if (clusters.length > 0) {
    const wireList = document.createElement('ul');
    wireList.className = 'dw-dossier-story-list';
    clusters.forEach((story) => {
      const li = document.createElement('li');
      li.className = 'dw-dossier-story-item';

      const link = document.createElement('a');
      const safeAttrs = getSafeLinkAttributes(story.primarySource.url);
      link.href = safeAttrs.href;
      link.target = safeAttrs.target;
      link.rel = safeAttrs.rel;
      link.textContent = sanitizePlainText(story.synthesizedHeadline);

      const meta = document.createElement('div');
      meta.className = 'dw-river-meta';
      meta.textContent = `${sanitizePlainText(story.primarySource.sourceName)} • ${formatTimeAgo(story.primarySource.publishedAt)}`;

      li.appendChild(link);
      li.appendChild(meta);
      wireList.appendChild(li);
    });
    body.appendChild(wireList);
  } else {
    const emptyWatch = document.createElement('div');
    emptyWatch.className = 'dw-dossier-no-stories';
    emptyWatch.innerHTML = `🛡️ <strong>${STRINGS.programs.noWirePulseTitle}:</strong> ${STRINGS.programs.noWirePulseBody}`;
    body.appendChild(emptyWatch);
  }

  modal.appendChild(body);
  backdrop.appendChild(modal);

  // Listeners
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }

  document.body.appendChild(backdrop);
  return backdrop;
}
