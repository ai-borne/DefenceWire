/**
 * Program Lifecycle Card Component for DefenceWire.in
 * Displays sovereign platform metadata, IDDM %, budget metrics, embedded stage tracker, and wire links.
 * Hard limit: <= 300 LOC.
 */

import { StrategicProgram } from '../types/programs.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from '../utils/security.js';
import { renderProgramStageBar } from './ProgramStageBar.js';

export interface ProgramCardOptions {
  newsCount?: number;
  onSelect?: (program: StrategicProgram) => void;
  compact?: boolean;
}

export function formatProgramBudget(budget?: number): string {
  if (budget === undefined || budget === null || isNaN(budget) || budget <= 0) {
    return STRINGS.programs.notAvailable;
  }
  return `${STRINGS.programs.croresPrefix}${budget.toLocaleString('en-IN')} ${STRINGS.programs.croresSuffix}`;
}

export function renderProgramLifecycleCard(
  program: StrategicProgram,
  options: ProgramCardOptions = {}
): HTMLElement {
  const card = document.createElement('article');
  card.className = `dw-program-card dw-program-card--${program.domain} ${options.compact ? 'dw-program-card--compact' : ''}`;
  card.setAttribute('data-program-id', program.id);
  card.setAttribute('data-domain', program.domain);
  card.setAttribute('data-stage', program.stage);

  // 1. Header Meta Bar (Domain Badge, Service Branches, IDDM Pill)
  const headerMeta = document.createElement('div');
  headerMeta.className = 'dw-program-card-meta';

  const domainBadge = document.createElement('span');
  domainBadge.className = `dw-program-domain-badge dw-domain--${program.domain}`;
  domainBadge.textContent = sanitizePlainText(program.domain.toUpperCase());
  headerMeta.appendChild(domainBadge);

  const branchesContainer = document.createElement('div');
  branchesContainer.className = 'dw-program-branches';
  program.serviceBranch.forEach((branch) => {
    const branchPill = document.createElement('span');
    branchPill.className = 'dw-program-branch-pill';
    branchPill.textContent = sanitizePlainText(branch);
    branchesContainer.appendChild(branchPill);
  });
  headerMeta.appendChild(branchesContainer);

  const iddmPill = document.createElement('span');
  const iddmVal = Math.min(100, Math.max(0, program.indigenousPercentage));
  iddmPill.className = 'dw-iddm-pill';
  iddmPill.title = `${STRINGS.programs.iddmLabel}: ${iddmVal}%`;
  iddmPill.textContent = `🇮🇳 ${iddmVal}% IDDM`;
  headerMeta.appendChild(iddmPill);

  card.appendChild(headerMeta);

  // 2. Program Name & Designation
  const titleBlock = document.createElement('div');
  titleBlock.className = 'dw-program-card-title-block';

  const title = document.createElement('h3');
  title.className = 'dw-program-title';

  const targetUrl = `#program/${encodeURIComponent(program.id)}`;

  const titleLink = document.createElement('a');
  titleLink.href = targetUrl;
  titleLink.setAttribute('aria-label', `${STRINGS.programs.cardAriaLabel} ${sanitizePlainText(program.name)}`);
  titleLink.textContent = sanitizePlainText(program.name);

  if (options.onSelect) {
    titleLink.addEventListener('click', (e) => {
      e.preventDefault();
      options.onSelect!(program);
    });
  }

  title.appendChild(titleLink);
  titleBlock.appendChild(title);

  if (program.officialDesignation && program.officialDesignation !== program.name) {
    const designation = document.createElement('div');
    designation.className = 'dw-program-designation';
    designation.textContent = sanitizePlainText(program.officialDesignation);
    titleBlock.appendChild(designation);
  }

  const agencyRow = document.createElement('div');
  agencyRow.className = 'dw-program-agency';
  const agencyParts = [program.leadAgency];
  if (program.foreignOem) {
    agencyParts.push(`OEM: ${program.foreignOem}`);
  }
  agencyRow.textContent = sanitizePlainText(agencyParts.join(' • '));
  titleBlock.appendChild(agencyRow);

  card.appendChild(titleBlock);

  // 3. Stage Progress Bar
  const stageBar = renderProgramStageBar(program.stage, { compact: true });
  card.appendChild(stageBar);

  // 4. Key Metrics Grid (Budget, Timeline, Units)
  const metricsGrid = document.createElement('div');
  metricsGrid.className = 'dw-program-metrics-grid';

  const budgetBlock = document.createElement('div');
  budgetBlock.className = 'dw-program-metric';
  const budgetLabel = document.createElement('span');
  budgetLabel.className = 'dw-program-metric-label';
  budgetLabel.textContent = STRINGS.programs.budgetLabel;
  const budgetVal = document.createElement('span');
  budgetVal.className = 'dw-program-metric-value';
  budgetVal.textContent = formatProgramBudget(program.sanctionedBudgetCrores ?? program.estimatedTotalCrores);
  budgetBlock.appendChild(budgetLabel);
  budgetBlock.appendChild(budgetVal);
  metricsGrid.appendChild(budgetBlock);

  const targetBlock = document.createElement('div');
  targetBlock.className = 'dw-program-metric';
  const targetLabel = document.createElement('span');
  targetLabel.className = 'dw-program-metric-label';
  targetLabel.textContent = STRINGS.programs.targetLabel;
  const targetVal = document.createElement('span');
  targetVal.className = 'dw-program-metric-value';
  targetVal.textContent = sanitizePlainText(String(program.targetInductionYear ?? STRINGS.programs.notAvailable));
  targetBlock.appendChild(targetLabel);
  targetBlock.appendChild(targetVal);
  metricsGrid.appendChild(targetBlock);

  const unitsBlock = document.createElement('div');
  unitsBlock.className = 'dw-program-metric';
  const unitsLabel = document.createElement('span');
  unitsLabel.className = 'dw-program-metric-label';
  unitsLabel.textContent = STRINGS.programs.plannedUnitsLabel;
  const unitsVal = document.createElement('span');
  unitsVal.className = 'dw-program-metric-value';
  unitsVal.textContent = sanitizePlainText(String(program.plannedUnits ?? STRINGS.programs.notAvailable));
  unitsBlock.appendChild(unitsLabel);
  unitsBlock.appendChild(unitsVal);
  metricsGrid.appendChild(unitsBlock);

  card.appendChild(metricsGrid);

  // 5. Summary Overview Snippet
  const summaryEl = document.createElement('p');
  summaryEl.className = 'dw-program-summary dw-snippet';
  summaryEl.textContent = sanitizePlainText(program.summary);
  card.appendChild(summaryEl);

  // 6. Key Subsystems Preview (top 3)
  if (program.keySubsystems && program.keySubsystems.length > 0) {
    const subContainer = document.createElement('div');
    subContainer.className = 'dw-program-subsystems-preview';
    const subLabel = document.createElement('span');
    subLabel.className = 'dw-program-subsystems-label';
    subLabel.textContent = `${STRINGS.programs.subsystemsPreview}:`;
    subContainer.appendChild(subLabel);

    const subTags = document.createElement('div');
    subTags.className = 'dw-program-subsystems-tags';
    program.keySubsystems.slice(0, 3).forEach((sub) => {
      const tag = document.createElement('span');
      tag.className = 'dw-subsystem-tag';
      tag.textContent = sanitizePlainText(`${sub.name} (${sub.supplier})`);
      subTags.appendChild(tag);
    });
    subContainer.appendChild(subTags);
    card.appendChild(subContainer);
  }

  // 7. Footer Action Row (Pulse updates count & View Dossier CTA)
  const footerRow = document.createElement('div');
  footerRow.className = 'dw-program-card-footer';

  const pulseSpan = document.createElement('span');
  const count = options.newsCount ?? 0;
  if (count > 0) {
    pulseSpan.className = 'dw-program-wire-pulse';
    pulseSpan.textContent = `⚡ ${count} ${STRINGS.programs.wireUpdates}`;
  } else {
    pulseSpan.className = 'dw-program-wire-pulse dw-program-wire-pulse--watch';
    pulseSpan.textContent = `🛡️ ${STRINGS.programs.activeWatch}`;
  }
  footerRow.appendChild(pulseSpan);

  const dossierBtn = document.createElement('a');
  dossierBtn.className = 'dw-program-dossier-btn';
  dossierBtn.href = targetUrl;
  dossierBtn.textContent = STRINGS.programs.viewDossier;

  if (options.onSelect) {
    dossierBtn.addEventListener('click', (e) => {
      e.preventDefault();
      options.onSelect!(program);
    });
  }

  footerRow.appendChild(dossierBtn);
  card.appendChild(footerRow);

  return card;
}
