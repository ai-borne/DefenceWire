/**
 * Program iDEX & ADITI Challenges View Component for DefenceWire.in
 * Folded-in defence innovation problem statements, grants & R&D pipelines.
 * Hard limit: <= 300 LOC.
 */

import { StrategicProgram, IdexChallenge } from '../../types/programs.js';
import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../../utils/security.js';
import { getChallengesByProgramId } from '../../data/idexProgramMapper.js';

function renderChallengeCard(c: IdexChallenge): HTMLElement {
  const card = document.createElement('div');
  card.className = 'dw-idex-card';

  const head = document.createElement('div');
  head.className = 'dw-idex-card-header';
  head.innerHTML = `
    <div class="dw-idex-meta-badges">
      <span class="dw-idex-badge dw-idex-edition">${sanitizePlainText(c.edition)} • ${sanitizePlainText(c.psNumber)}</span>
      <span class="dw-idex-badge dw-idex-agency">${sanitizePlainText(c.nodalAgency)}</span>
    </div>
    <span class="dw-idex-badge dw-idex-grant">💰 ${sanitizePlainText(c.grantAmount)}</span>
  `;
  card.appendChild(head);

  const title = document.createElement('h4');
  title.className = 'dw-idex-title';
  title.textContent = sanitizePlainText(c.title);
  card.appendChild(title);

  const descBlock = document.createElement('div');
  descBlock.className = 'dw-idex-block';
  descBlock.innerHTML = `
    <span class="dw-idex-label">${STRINGS.programs.idexProblemStatement}:</span>
    <span class="dw-idex-text">${sanitizePlainText(c.problemDescription)}</span>
  `;
  card.appendChild(descBlock);

  const capBlock = document.createElement('div');
  capBlock.className = 'dw-idex-block';
  capBlock.innerHTML = `
    <span class="dw-idex-label">${STRINGS.programs.idexTargetCapability}:</span>
    <span class="dw-idex-text">${sanitizePlainText(c.targetCapability)}</span>
  `;
  card.appendChild(capBlock);

  const footer = document.createElement('div');
  footer.className = 'dw-idex-card-footer';

  const statusBadge = document.createElement('span');
  statusBadge.className = `dw-idex-status dw-idex-status--${c.status}`;
  const statusLabel = c.status === 'open' ? STRINGS.programs.idexStatusOpen : c.status === 'awarded' ? STRINGS.programs.idexStatusAwarded : c.status;
  statusBadge.textContent = sanitizePlainText(statusLabel);
  footer.appendChild(statusBadge);

  if (c.officialPdfUrl) {
    const pdfLink = document.createElement('a');
    const safeAttrs = getSafeLinkAttributes(c.officialPdfUrl);
    pdfLink.href = safeAttrs.href;
    pdfLink.target = safeAttrs.target;
    pdfLink.rel = safeAttrs.rel;
    pdfLink.className = 'dw-idex-pdf-btn';
    pdfLink.setAttribute('aria-label', `${STRINGS.programs.idexDownloadPdfAria}: ${c.title}`);
    pdfLink.textContent = `📄 ${STRINGS.programs.idexOfficialPdf} ↗`;
    footer.appendChild(pdfLink);
  }

  card.appendChild(footer);
  return card;
}

export function renderProgramIdexView(program: StrategicProgram): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-program-idex-view';

  const heading = document.createElement('h3');
  heading.className = 'dw-timeline-heading';
  heading.textContent = STRINGS.programs.idexHeading;
  container.appendChild(heading);

  const subheading = document.createElement('p');
  subheading.className = 'dw-idex-subheading';
  subheading.textContent = STRINGS.programs.idexSubheading;
  container.appendChild(subheading);

  const challenges: IdexChallenge[] = program.idexChallenges ?? getChallengesByProgramId(program.id);

  if (challenges.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dw-idex-empty';
    empty.innerHTML = `💡 <strong>${STRINGS.programs.tabIdex}:</strong> ${STRINGS.programs.idexEmpty}`;
    container.appendChild(empty);
    return container;
  }

  const list = document.createElement('div');
  list.className = 'dw-idex-cards-list';
  for (const c of challenges) {
    list.appendChild(renderChallengeCard(c));
  }
  container.appendChild(list);

  return container;
}
