/**
 * Program ORBAT & Deployments View Component for DefenceWire
 * On-demand lazy-loaded component presenting operational military units and citations.
 * Hard limit: <= 300 LOC. Target: < 200 LOC.
 */

import { StrategicProgram } from '../../types/programs.js';
import { OrbatDeploymentStatus, OrbatUnit } from '../../types/orbat.js';
import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText } from '../../utils/security.js';

function getStatusBadgeLabel(status: OrbatDeploymentStatus): string {
  switch (status) {
    case 'operational':
      return STRINGS.programs.orbatStatusOperational;
    case 'forming':
      return STRINGS.programs.orbatStatusForming;
    case 'slated':
      return STRINGS.programs.orbatStatusSlated;
    case 'upgrading':
      return STRINGS.programs.orbatStatusUpgrading;
    case 'evaluating':
      return STRINGS.programs.orbatStatusEvaluating;
    default:
      return status;
  }
}

function renderOrbatCard(unit: OrbatUnit): HTMLElement {
  const card = document.createElement('div');
  card.className = 'dw-orbat-card';

  const statusLabel = getStatusBadgeLabel(unit.status);

  // Card Header
  const header = document.createElement('div');
  header.className = 'dw-orbat-card-header';
  header.innerHTML = `
    <div class="dw-orbat-unit-title-group">
      <span class="dw-orbat-unit-title">${sanitizePlainText(unit.unitDesignation)}</span>
      ${unit.nickname ? `<span class="dw-orbat-nickname">"${sanitizePlainText(unit.nickname)}"</span>` : ''}
    </div>
    <span class="dw-orbat-badge dw-orbat-badge--${sanitizePlainText(unit.status)}">
      ● ${sanitizePlainText(statusLabel)}
    </span>
  `;
  card.appendChild(header);

  // Meta Grid
  const metaGrid = document.createElement('div');
  metaGrid.className = 'dw-orbat-meta-grid';
  metaGrid.innerHTML = `
    <div class="dw-orbat-meta-item">
      <span class="dw-orbat-meta-label">${STRINGS.programs.serviceBranchPrefix}</span>
      <span class="dw-orbat-meta-val">${sanitizePlainText(unit.serviceBranch)}</span>
    </div>
    <div class="dw-orbat-meta-item">
      <span class="dw-orbat-meta-label">${STRINGS.programs.orbatBaseCol}</span>
      <span class="dw-orbat-meta-val">${sanitizePlainText(unit.baseLocation)} (${sanitizePlainText(unit.command)})</span>
    </div>
    ${unit.allocatedUnits ? `
      <div class="dw-orbat-meta-item">
        <span class="dw-orbat-meta-label">${STRINGS.programs.orbatUnitsCol}</span>
        <span class="dw-orbat-meta-val">${sanitizePlainText(String(unit.allocatedUnits))}</span>
      </div>
    ` : ''}
    ${unit.inductionDate ? `
      <div class="dw-orbat-meta-item">
        <span class="dw-orbat-meta-label">${STRINGS.programs.targetLabel}</span>
        <span class="dw-orbat-meta-val">${sanitizePlainText(unit.inductionDate)}</span>
      </div>
    ` : ''}
  `;
  card.appendChild(metaGrid);

  // Operational Role
  if (unit.operationalRole) {
    const roleP = document.createElement('div');
    roleP.className = 'dw-orbat-role';
    roleP.innerHTML = `<strong>${STRINGS.programs.orbatOperationalRoleLabel}</strong> ${sanitizePlainText(unit.operationalRole)}`;
    card.appendChild(roleP);
  }

  // Citation Box
  const citeBox = document.createElement('div');
  citeBox.className = 'dw-orbat-citation-box';
  citeBox.innerHTML = `
    <div class="dw-orbat-citation-header">
      <span>📜 ${STRINGS.programs.orbatCitationPrefix}</span>
      <span class="dw-orbat-citation-title">${sanitizePlainText(unit.citation.sourceTitle)}</span>
    </div>
    ${unit.citation.documentNumber ? `<div>${sanitizePlainText(unit.citation.documentNumber)} • ${sanitizePlainText(unit.citation.date)}</div>` : `<div>${sanitizePlainText(unit.citation.date)}</div>`}
    ${unit.citation.relevantExcerpt ? `<div class="dw-orbat-citation-excerpt">“${sanitizePlainText(unit.citation.relevantExcerpt)}”</div>` : ''}
  `;
  card.appendChild(citeBox);

  return card;
}

export function renderProgramOrbatView(program: StrategicProgram): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-orbat-container';

  // Section Header
  const header = document.createElement('div');
  header.className = 'dw-orbat-header';
  header.innerHTML = `
    <h3 class="dw-orbat-heading">${STRINGS.programs.orbatHeading}</h3>
    <p class="dw-orbat-subheading">${STRINGS.programs.orbatSubheading}</p>
  `;
  container.appendChild(header);

  // Content wrapper with initial loading state
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'dw-orbat-content-wrapper';
  contentWrapper.innerHTML = `<div class="dw-orbat-loading">⏳ ${STRINGS.programs.orbatLoading}</div>`;
  container.appendChild(contentWrapper);

  // On-demand chunked dynamic import of the ORBAT dataset
  import('../../data/orbat/programOrbatData.js')
    .then(({ getOrbatByProgramId }) => {
      const units = getOrbatByProgramId(program.id);
      contentWrapper.innerHTML = '';

      if (units.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'dw-orbat-empty';
        empty.textContent = STRINGS.programs.orbatNoUnits;
        contentWrapper.appendChild(empty);
        return;
      }

      const list = document.createElement('div');
      list.className = 'dw-orbat-list';
      units.forEach((unit) => {
        list.appendChild(renderOrbatCard(unit));
      });
      contentWrapper.appendChild(list);
    })
    .catch((err) => {
      contentWrapper.innerHTML = `<div class="dw-orbat-empty">${STRINGS.programs.orbatNoUnits}</div>`;
      console.error('[ORBAT LOAD ERROR]', err);
    });

  return container;
}
