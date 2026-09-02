/**
 * Tender Detail Dossier Modal Component for DefenceWire.in
 * Full-fidelity tender/RFP (or iDEX/TDF grant) detail modal, mirroring
 * ProgramDetailModal.ts's shape exactly.
 * Hard limit: <= 300 LOC.
 */

import { Tender } from '../types/tenders.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';
import { formatTimeUntil } from '../utils/dateUtils.js';
import { getProgramById } from '../data/strategicPrograms.js';

export interface TenderDetailModalOptions {
  onClose?: () => void;
}

function formatEmd(amount: number | null): string {
  if (amount == null) return STRINGS.tenders.notAvailable;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function openTenderDetailModal(
  tender: Tender,
  options: TenderDetailModalOptions = {}
): HTMLElement {
  const existingModal = document.getElementById('dw-tender-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const backdrop = document.createElement('div');
  backdrop.id = 'dw-tender-modal';
  backdrop.className = 'dw-modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', `${STRINGS.tenders.heading}: ${tender.title}`);

  const modal = document.createElement('div');
  modal.className = 'dw-modal-content dw-tender-modal-content';

  let handleKeyDown: ((e: KeyboardEvent) => void) | null = null;

  const closeModal = () => {
    if (typeof window !== 'undefined' && handleKeyDown) {
      window.removeEventListener('keydown', handleKeyDown);
      handleKeyDown = null;
    }
    backdrop.classList.add('dw-modal-closing');
    setTimeout(() => {
      backdrop.remove();
      if (typeof window !== 'undefined' && window.location.hash.startsWith('#tender/')) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      options.onClose?.();
    }, 150);
  };

  // 1. Header
  const header = document.createElement('div');
  header.className = 'dw-modal-header dw-tender-modal-header';

  const titleMeta = document.createElement('div');
  titleMeta.className = 'dw-tender-modal-title-meta';

  const statusBadge = document.createElement('span');
  statusBadge.className = `dw-tender-status-badge dw-tender-status--${tender.status}`;
  statusBadge.textContent = sanitizePlainText(tender.status.toUpperCase());
  titleMeta.appendChild(statusBadge);

  const title = document.createElement('h2');
  title.className = 'dw-modal-title dw-tender-modal-title';
  title.textContent = sanitizePlainText(tender.title);
  titleMeta.appendChild(title);

  header.appendChild(titleMeta);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'dw-modal-close-btn';
  closeBtn.type = 'button';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', STRINGS.tenders.modalCloseAria);
  closeBtn.addEventListener('click', closeModal);
  header.appendChild(closeBtn);

  modal.appendChild(header);

  // 2. Body
  const body = document.createElement('div');
  body.className = 'dw-modal-body dw-tender-modal-body';

  const orgRow = document.createElement('div');
  orgRow.className = 'dw-tender-modal-org-row';
  orgRow.textContent = sanitizePlainText(tender.organisationChain);
  body.appendChild(orgRow);

  // Metrics Grid
  const metricsGrid = document.createElement('div');
  metricsGrid.className = 'dw-program-metrics-grid dw-tender-modal-metrics';

  const closingBlock = document.createElement('div');
  closingBlock.className = 'dw-program-metric';
  const closingText = tender.closingAt ? formatTimeUntil(tender.closingAt) : STRINGS.tenders.closingNotAvailable;
  closingBlock.innerHTML = `<span class="dw-program-metric-label">${STRINGS.tenders.closingLabel}</span><span class="dw-program-metric-value">${sanitizePlainText(closingText)}</span>`;
  metricsGrid.appendChild(closingBlock);

  const emdBlock = document.createElement('div');
  emdBlock.className = 'dw-program-metric';
  emdBlock.innerHTML = `<span class="dw-program-metric-label">${STRINGS.tenders.emdLabel}</span><span class="dw-program-metric-value">${formatEmd(tender.emdAmount)}</span>`;
  metricsGrid.appendChild(emdBlock);

  if (tender.category) {
    const categoryBlock = document.createElement('div');
    categoryBlock.className = 'dw-program-metric';
    categoryBlock.innerHTML = `<span class="dw-program-metric-label">${STRINGS.tenders.categoryLabel}</span><span class="dw-program-metric-value">${sanitizePlainText(tender.category)}</span>`;
    metricsGrid.appendChild(categoryBlock);
  }

  if (tender.iddmPercent != null) {
    const iddmBlock = document.createElement('div');
    iddmBlock.className = 'dw-program-metric';
    iddmBlock.innerHTML = `<span class="dw-program-metric-label">${STRINGS.tenders.iddmLabel}</span><span class="dw-program-metric-value">🇮🇳 ${tender.iddmPercent}%</span>`;
    metricsGrid.appendChild(iddmBlock);
  }

  body.appendChild(metricsGrid);

  if (tender.referenceNumber) {
    const refRow = document.createElement('div');
    refRow.className = 'dw-tender-modal-ref-row';
    refRow.textContent = `${STRINGS.tenders.referenceLabel}: ${sanitizePlainText(tender.referenceNumber)}`;
    body.appendChild(refRow);
  }

  // Linked Strategic Programs
  const linkedPrograms = tender.programIds
    .map((id) => getProgramById(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  if (linkedPrograms.length > 0) {
    const linkedHeading = document.createElement('h3');
    linkedHeading.className = 'dw-timeline-heading';
    linkedHeading.textContent = STRINGS.tenders.linkedProgramsHeading;
    body.appendChild(linkedHeading);

    const linkedList = document.createElement('ul');
    linkedList.className = 'dw-dossier-story-list';
    linkedPrograms.forEach((program) => {
      const li = document.createElement('li');
      li.className = 'dw-dossier-story-item';
      const link = document.createElement('a');
      link.href = `#program/${encodeURIComponent(program.id)}`;
      link.textContent = sanitizePlainText(program.name);
      li.appendChild(link);
      linkedList.appendChild(li);
    });
    body.appendChild(linkedList);
  }

  // Official Listing Link
  const linkRow = document.createElement('div');
  linkRow.className = 'dw-tender-modal-link-row';
  const officialLink = document.createElement('a');
  const safeAttrs = getSafeLinkAttributes(tender.detailUrl);
  officialLink.href = safeAttrs.href;
  officialLink.target = safeAttrs.target;
  officialLink.rel = safeAttrs.rel;
  officialLink.className = 'dw-tender-official-link';
  officialLink.textContent = STRINGS.tenders.viewOfficialListing;
  linkRow.appendChild(officialLink);
  body.appendChild(linkRow);

  modal.appendChild(body);
  backdrop.appendChild(modal);

  // Listeners
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }

  document.body.appendChild(backdrop);
  return backdrop;
}
